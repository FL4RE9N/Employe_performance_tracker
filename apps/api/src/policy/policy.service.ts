import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { statusAtOrAfter } from '@perf-tracker/shared';
import type {
  SessionUser,
  CycleStatus,
  AuthorSide,
  CycleActorKind,
} from '@perf-tracker/shared';

/** Minimal cycle shape the visibility checks need (mentorId is the snapshot per plan/04). */
export interface CycleRef {
  menteeId: string;
  mentorId: string;
  status: CycleStatus;
}

/**
 * PolicyService — the single, reusable server-side authorization layer.
 *
 * There is NO "mentor" role: mentor-ness is DERIVED from time-bounded
 * MentorRelationship edges (effectiveTo IS NULL, or covering the date). Every
 * mentor decision flows through here, never through @Roles. UI gating is
 * advisory only — these checks are the real enforcement (critical invariant #3).
 *
 * Slice 2 covers goals + the edge primitives. Slice 3 extends this with cycle /
 * submission / released-review visibility (reusing isMentorOf / menteeIdsOf).
 */
@Injectable()
export class PolicyService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Mentor-edge derivation (the heart of "no mentor role") ----------------

  /** True iff `mentorId` is a current mentor of `menteeId` at `atDate`. */
  async isMentorOf(
    mentorId: string,
    menteeId: string,
    atDate: Date = new Date(),
  ): Promise<boolean> {
    if (mentorId === menteeId) return false;
    const edge = await this.prisma.mentorRelationship.findFirst({
      where: {
        mentorId,
        menteeId,
        type: 'mentor',
        effectiveFrom: { lte: atDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: atDate } }],
      },
      select: { id: true },
    });
    return edge !== null;
  }

  /** The distinct mentee ids `mentorId` currently mentors at `atDate`. */
  async menteeIdsOf(
    mentorId: string,
    atDate: Date = new Date(),
  ): Promise<string[]> {
    const edges = await this.prisma.mentorRelationship.findMany({
      where: {
        mentorId,
        type: 'mentor',
        effectiveFrom: { lte: atDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: atDate } }],
      },
      select: { menteeId: true },
    });
    return [...new Set(edges.map((e) => e.menteeId))];
  }

  // --- Goals visibility (per plan/05 matrix) ---------------------------------

  /** Read: owner OR admin OR a current mentor of the owner. */
  async canViewGoal(
    actor: SessionUser,
    goal: { ownerUserId: string },
  ): Promise<boolean> {
    if (actor.role === 'admin') return true;
    if (actor.id === goal.ownerUserId) return true;
    return this.isMentorOf(actor.id, goal.ownerUserId);
  }

  /** Edit: owner only (admin gets a read-only roll-up, mentors are read-only). */
  canEditGoal(actor: SessionUser, goal: { ownerUserId: string }): boolean {
    return actor.id === goal.ownerUserId;
  }

  async assertCanViewGoal(
    actor: SessionUser,
    goal: { ownerUserId: string },
  ): Promise<void> {
    if (!(await this.canViewGoal(actor, goal))) {
      throw new ForbiddenException('Not allowed to view this goal');
    }
  }

  assertCanEditGoal(actor: SessionUser, goal: { ownerUserId: string }): void {
    if (!this.canEditGoal(actor, goal)) {
      throw new ForbiddenException('Only the goal owner may modify it');
    }
  }

  // --- Review-cycle visibility & actor classification (plan/05) ---------------

  /**
   * Classify the actor's relationship to THIS cycle, most-specific first:
   * the mentee acts as 'mentee', the snapshot mentor acts as 'mentor', any other
   * admin acts as 'admin'. Returns null when the actor has no relationship.
   * 'system' is never produced here (auto edges are driven internally).
   *
   * Precedence matters: an admin who is also the cycle's mentee/mentor must act in
   * that specific role (e.g. submit their own self-assessment), not as a generic admin.
   */
  resolveCycleActorKind(actor: SessionUser, cycle: CycleRef): CycleActorKind | null {
    if (actor.id === cycle.menteeId) return 'mentee';
    if (actor.id === cycle.mentorId) return 'mentor';
    if (actor.role === 'admin') return 'admin';
    return null;
  }

  /** Cycle metadata is visible to its mentee, its (snapshot) mentor, and admins. */
  canViewCycle(actor: SessionUser, cycle: CycleRef): boolean {
    return this.resolveCycleActorKind(actor, cycle) !== null;
  }

  assertCanViewCycle(actor: SessionUser, cycle: CycleRef): void {
    if (!this.canViewCycle(actor, cycle)) {
      throw new ForbiddenException('Not allowed to view this cycle');
    }
  }

  /**
   * Can the actor read one SIDE's submission? (Invariants #2 & #3.)
   * - self side: the mentee always; the mentor only once BOTH have submitted.
   * - mentor side: the mentor always; the mentee only once the cycle is released.
   * Admins may read either side. Everyone else: no.
   */
  canViewSubmission(
    actor: SessionUser,
    cycle: CycleRef,
    side: AuthorSide,
    opts: { bothSubmitted: boolean },
  ): boolean {
    if (actor.role === 'admin') return true;
    const isMentee = actor.id === cycle.menteeId;
    const isMentor = actor.id === cycle.mentorId;
    if (side === 'self') {
      return isMentee || (isMentor && opts.bothSubmitted);
    }
    // side === 'mentor'
    return (
      isMentor ||
      (isMentee && statusAtOrAfter(cycle.status, 'released_to_employee'))
    );
  }

  /** The released-review bundle is visible to mentee/mentor/admin only at/after release. */
  canViewReleasedReview(actor: SessionUser, cycle: CycleRef): boolean {
    if (!statusAtOrAfter(cycle.status, 'released_to_employee')) return false;
    return this.canViewCycle(actor, cycle);
  }
}
