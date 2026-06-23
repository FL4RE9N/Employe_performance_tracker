import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PolicyService } from '../policy/policy.service';
import { NotificationService } from '../notifications/notification.service';
import {
  findTransition,
  nextAutoTransition,
  availableTransitions,
  QUESTION_KEY_VALUES,
  METRIC_KEY_VALUES,
} from '@perf-tracker/shared';
import type {
  SessionUser,
  CycleStatus,
  CycleActorKind,
  CreateCycleInput,
  LaunchOrgWideInput,
  ScheduleMeetingInput,
  CycleDto,
  MeetingDto,
  NotificationType,
  EntityRef,
} from '@perf-tracker/shared';

interface NotificationIntent {
  recipientUserId: string;
  type: NotificationType;
  entityRef: EntityRef;
}

export interface TransitionOptions {
  meeting?: ScheduleMeetingInput;
  comment?: string;
}

// Prisma transaction client (loose typing — strict:false base).
type Tx = any;
type CycleRow = any;

const CYCLE_RELATIONS = {
  mentee: { select: { displayName: true } },
  mentor: { select: { displayName: true } },
  meeting: true,
} as const;

@Injectable()
export class CycleService {
  private readonly logger = new Logger(CycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
    private readonly notifications: NotificationService,
  ) {}

  // --- Creation --------------------------------------------------------------

  async createCycle(input: CreateCycleInput): Promise<CycleDto> {
    const cycle = await this.prisma.reviewCycle.create({
      data: {
        scope: 'individual',
        periodLabel: input.periodLabel,
        menteeId: input.menteeId,
        mentorId: input.mentorId,
        status: 'not_started',
        goalsDueDate: input.goalsDueDate,
        selfDueDate: input.selfDueDate,
        mentorDueDate: input.mentorDueDate,
        cycleEndDate: input.cycleEndDate ?? input.mentorDueDate,
      },
      include: CYCLE_RELATIONS,
    });
    return this.toCycleDto(cycle, null);
  }

  /** Fan out one cycle per CURRENT mentor↔mentee edge (org-wide launch). */
  async launchOrgWide(
    input: LaunchOrgWideInput,
  ): Promise<{ created: number; skipped: number; cycleIds: string[] }> {
    const now = new Date();
    const edges = await this.prisma.mentorRelationship.findMany({
      where: {
        type: 'mentor',
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
      select: { menteeId: true, mentorId: true },
    });

    const cycleIds: string[] = [];
    let skipped = 0;
    for (const edge of edges) {
      const existing = await this.prisma.reviewCycle.findFirst({
        where: {
          menteeId: edge.menteeId,
          mentorId: edge.mentorId,
          periodLabel: input.periodLabel,
        },
        select: { id: true },
      });
      if (existing) {
        skipped += 1;
        continue;
      }
      const created = await this.prisma.reviewCycle.create({
        data: {
          scope: 'org_wide',
          periodLabel: input.periodLabel,
          menteeId: edge.menteeId,
          mentorId: edge.mentorId,
          status: 'not_started',
          goalsDueDate: input.goalsDueDate,
          selfDueDate: input.selfDueDate,
          mentorDueDate: input.mentorDueDate,
          cycleEndDate: input.cycleEndDate ?? input.mentorDueDate,
        },
        select: { id: true },
      });
      cycleIds.push(created.id);
    }
    return { created: cycleIds.length, skipped, cycleIds };
  }

  // --- Reads -----------------------------------------------------------------

  async listCycles(
    actor: SessionUser,
    scope?: 'mine' | 'mentee' | 'all',
  ): Promise<CycleDto[]> {
    let where: Record<string, unknown>;
    if (scope === 'all') {
      if (actor.role !== 'admin') {
        throw new ForbiddenException('Only admins may list all cycles');
      }
      where = {};
    } else if (scope === 'mentee') {
      where = { mentorId: actor.id };
    } else {
      where = { OR: [{ menteeId: actor.id }, { mentorId: actor.id }] };
    }
    const cycles = await this.prisma.reviewCycle.findMany({
      where,
      include: CYCLE_RELATIONS,
      orderBy: { periodLabel: 'desc' },
    });
    return cycles.map((c: CycleRow) =>
      this.toCycleDto(c, this.policy.resolveCycleActorKind(actor, c)),
    );
  }

  async getCycle(actor: SessionUser, id: string): Promise<CycleDto> {
    const cycle = await this.prisma.reviewCycle.findUnique({
      where: { id },
      include: CYCLE_RELATIONS,
    });
    if (!cycle) throw new NotFoundException(`Cycle not found: ${id}`);
    this.policy.assertCanViewCycle(actor, cycle);
    return this.toCycleDto(cycle, this.policy.resolveCycleActorKind(actor, cycle));
  }

  // --- The transition choke-point --------------------------------------------

  /**
   * The ONE place cycle status changes. Validates the edge + the actor, applies
   * side effects and auto-chained system edges atomically, writes an AuditLog,
   * and flushes notifications after commit.
   */
  async transition(
    cycleId: string,
    to: CycleStatus,
    actor: SessionUser,
    opts: TransitionOptions = {},
  ): Promise<CycleDto> {
    const intents: NotificationIntent[] = [];

    await this.prisma.$transaction(async (tx: Tx) => {
      const cycle = await tx.reviewCycle.findUnique({ where: { id: cycleId } });
      if (!cycle) throw new NotFoundException(`Cycle not found: ${cycleId}`);

      const actorKind = this.policy.resolveCycleActorKind(actor, cycle);
      if (!actorKind) {
        throw new ForbiddenException('You are not part of this cycle');
      }

      const def = findTransition(cycle.status, to);
      if (!def) {
        throw new ConflictException(
          `Illegal transition: ${cycle.status} -> ${to}`,
        );
      }
      // Auto/system-only edges (allowedActors=['system']) are never callable from HTTP.
      if (!def.allowedActors.includes(actorKind)) {
        throw new ForbiddenException(
          `A ${actorKind} may not perform ${cycle.status} -> ${to}`,
        );
      }

      await this.applyChain(tx, cycle, def.to, actor, opts, intents);
    });

    // Post-commit: deliver notifications (best-effort — never fail the transition).
    for (const intent of intents) {
      try {
        await this.notifications.create(intent);
      } catch (err) {
        this.logger.warn(
          `notification dispatch failed (${intent.type} -> ${intent.recipientUserId}): ${String(err)}`,
        );
      }
    }

    return this.getCycle(actor, cycleId);
  }

  /** Apply `to` then auto-chain any subsequent system edges, all in one tx. */
  private async applyChain(
    tx: Tx,
    cycle: CycleRow,
    to: CycleStatus,
    actor: SessionUser,
    opts: TransitionOptions,
    intents: NotificationIntent[],
  ): Promise<void> {
    const from = cycle.status as CycleStatus;
    await this.applyOne(tx, cycle, to, actor, opts, intents);
    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: 'cycle.transition',
        entityType: 'ReviewCycle',
        entityId: cycle.id,
        metadata: { from, to },
      },
    });
    const auto = nextAutoTransition(to);
    if (auto) {
      await this.applyChain(tx, { ...cycle, status: to }, auto.to, actor, opts, intents);
    }
  }

  /** Side effects + the status write for a single edge. */
  private async applyOne(
    tx: Tx,
    cycle: CycleRow,
    to: CycleStatus,
    actor: SessionUser,
    opts: TransitionOptions,
    intents: NotificationIntent[],
  ): Promise<void> {
    const id: string = cycle.id;
    const ref = (extra?: Partial<EntityRef>): EntityRef => ({
      entity: 'cycle',
      id,
      cycleId: id,
      ...extra,
    });
    const data: Record<string, unknown> = { status: to };
    const now = new Date();

    switch (to) {
      case 'goals_set':
        break;

      case 'self_assessment_open': {
        if (!cycle.openedAt) data.openedAt = now;
        // Create both submission rows so drafts can be saved by either side.
        await tx.reviewSubmission.createMany({
          data: [
            { cycleId: id, authorUserId: cycle.menteeId, authorSide: 'self' },
            { cycleId: id, authorUserId: cycle.mentorId, authorSide: 'mentor' },
          ],
          skipDuplicates: true,
        });
        intents.push({
          recipientUserId: cycle.menteeId,
          type: 'self_assessment_due',
          entityRef: ref(),
        });
        break;
      }

      case 'self_submitted':
        await this.lockSubmission(tx, id, 'self', now);
        break;

      case 'mentor_assessment_open':
        intents.push({
          recipientUserId: cycle.mentorId,
          type: 'mentor_assessment_open',
          entityRef: ref(),
        });
        break;

      case 'mentor_submitted':
        await this.lockSubmission(tx, id, 'mentor', now);
        break;

      case 'calibration':
        // Admin no-op pass-through (audited via applyChain). Never employee-visible.
        break;

      case 'meeting_scheduled': {
        if (!opts.meeting) {
          throw new BadRequestException(
            'meeting details required to schedule the review call',
          );
        }
        const meeting = await tx.meeting.create({
          data: {
            organizerUserId: cycle.mentorId,
            scheduledStart: opts.meeting.scheduledStart,
            scheduledEnd: opts.meeting.scheduledEnd,
            teamsJoinUrl: opts.meeting.teamsJoinUrl,
            status: 'scheduled',
          },
        });
        data.meetingId = meeting.id;
        for (const uid of [cycle.menteeId, cycle.mentorId]) {
          intents.push({
            recipientUserId: uid,
            type: 'meeting_scheduled',
            entityRef: { entity: 'meeting', id: meeting.id, cycleId: id },
          });
        }
        break;
      }

      case 'meeting_held':
        if (cycle.meetingId) {
          await tx.meeting.update({
            where: { id: cycle.meetingId },
            data: { status: 'held' },
          });
        }
        break;

      case 'released_to_employee':
        data.releasedAt = now;
        intents.push({
          recipientUserId: cycle.menteeId,
          type: 'review_released',
          entityRef: ref(),
        });
        break;

      case 'acknowledged':
        data.acknowledgedAt = now;
        if (opts.comment !== undefined) data.acknowledgementComment = opts.comment;
        break;

      case 'closed':
        data.closedAt = now;
        break;

      default:
        break;
    }

    await tx.reviewCycle.update({ where: { id }, data });
  }

  /** Lock a side's submission on submit (immutable thereafter). Requires it complete. */
  private async lockSubmission(
    tx: Tx,
    cycleId: string,
    side: 'self' | 'mentor',
    now: Date,
  ): Promise<void> {
    const submission = await tx.reviewSubmission.findUnique({
      where: { cycleId_authorSide: { cycleId, authorSide: side } },
      include: { _count: { select: { answers: true, ratings: true } } },
    });
    if (!submission) {
      throw new ConflictException(`No ${side} submission to submit`);
    }
    if (submission.status === 'submitted') {
      throw new ConflictException(`The ${side} submission is already submitted`);
    }
    if (
      submission._count.answers !== QUESTION_KEY_VALUES.length ||
      submission._count.ratings !== METRIC_KEY_VALUES.length
    ) {
      throw new BadRequestException(
        `The ${side} submission must have all ${QUESTION_KEY_VALUES.length} answers and ${METRIC_KEY_VALUES.length} ratings before submitting`,
      );
    }
    await tx.reviewSubmission.update({
      where: { id: submission.id },
      data: { status: 'submitted', submittedAt: now, lockedAt: now },
    });
  }

  // --- Mapping ---------------------------------------------------------------

  private toCycleDto(cycle: CycleRow, actorKind: CycleActorKind | null): CycleDto {
    const iso = (d: Date | null | undefined): string | null =>
      d ? new Date(d).toISOString() : null;

    const meeting: MeetingDto | null = cycle.meeting
      ? {
          id: cycle.meeting.id,
          scheduledStart: new Date(cycle.meeting.scheduledStart).toISOString(),
          scheduledEnd: new Date(cycle.meeting.scheduledEnd).toISOString(),
          teamsJoinUrl: cycle.meeting.teamsJoinUrl ?? null,
          status: cycle.meeting.status,
        }
      : null;

    const available = actorKind
      ? availableTransitions(cycle.status as CycleStatus)
          .filter((t) => t.allowedActors.includes(actorKind))
          .map((t) => t.to)
      : [];

    return {
      id: cycle.id,
      scope: cycle.scope,
      periodLabel: cycle.periodLabel,
      menteeId: cycle.menteeId,
      menteeName: cycle.mentee?.displayName,
      mentorId: cycle.mentorId,
      mentorName: cycle.mentor?.displayName,
      status: cycle.status,
      goalsDueDate: new Date(cycle.goalsDueDate).toISOString(),
      selfDueDate: new Date(cycle.selfDueDate).toISOString(),
      mentorDueDate: new Date(cycle.mentorDueDate).toISOString(),
      cycleEndDate: iso(cycle.cycleEndDate),
      openedAt: iso(cycle.openedAt),
      closedAt: iso(cycle.closedAt),
      releasedAt: iso(cycle.releasedAt),
      acknowledgedAt: iso(cycle.acknowledgedAt),
      acknowledgementComment: cycle.acknowledgementComment ?? null,
      meeting,
      availableTransitions: available,
    };
  }
}
