/**
 * ReminderService — review-deadline reminder logic.
 *
 * LOCAL trigger: @nestjs/schedule cron (dailySweep) calls runSweep() at 2 AM.
 * AWS trigger:  EventBridge Scheduler -> Lambda invokes the SAME runSweep().
 * Only the trigger differs; the business logic is identical in both.
 *
 * Idempotency: every reminder carries a deterministic reminderKey and is written
 * via NotificationService (createMany skipDuplicates + a DB unique index), so
 * re-running the sweep on the same civil day sends nothing new.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { statusAtOrAfter } from '@perf-tracker/shared';
import { daysUntil, CYCLE_END_THRESHOLDS } from './reminder.math';

export interface SweepResult {
  ranAt: string;
  activeCycles: number;
  remindersSent: number;
  digest: { usersEmailed: number; itemsBatched: number };
}

type Row = any;

const DEFAULT_TZ = 'UTC';

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  async runSweep(opts: { now?: Date } = {}): Promise<SweepResult> {
    const now = opts.now ?? new Date();
    const tz = await this.referenceTz();

    const cycles = await this.prisma.reviewCycle.findMany({
      where: { status: { notIn: ['closed', 'acknowledged'] } },
      include: { submissions: { select: { authorSide: true, status: true } } },
    });

    let remindersSent = 0;
    for (const cycle of cycles) {
      remindersSent += await this.mentorEscalation(cycle, now, tz);
      remindersSent += await this.dueDateNudges(cycle, now, tz);
    }

    const digest = await this.notifications.sendDailyDigests(now);

    this.logger.log(
      `[reminder-sweep] cycles=${cycles.length} reminders=${remindersSent} digestUsers=${digest.usersEmailed}`,
    );
    return { ranAt: now.toISOString(), activeCycles: cycles.length, remindersSent, digest };
  }

  /** Mentor escalation anchored to the cycle end (cycleEndDate ?? mentorDueDate). */
  private async mentorEscalation(cycle: Row, now: Date, tz: string): Promise<number> {
    const end: Date = cycle.cycleEndDate ?? cycle.mentorDueDate;
    const d = daysUntil(now, end, tz);
    const meetingScheduled =
      statusAtOrAfter(cycle.status, 'meeting_scheduled') || cycle.meetingId != null;

    let sent = 0;
    for (const { threshold, days } of CYCLE_END_THRESHOLDS) {
      if (threshold !== 'T-0' && d === days) {
        await this.notifications.create({
          recipientUserId: cycle.mentorId,
          type: 'cycle_ending',
          entityRef: { entity: 'cycle', id: cycle.id, cycleId: cycle.id, threshold },
          reminderKey: `cycle_ending:${threshold}:${cycle.id}`,
        });
        sent += 1;
      }
      if (threshold === 'T-0' && d <= 0 && !meetingScheduled) {
        await this.notifications.create({
          recipientUserId: cycle.mentorId,
          type: 'schedule_call',
          entityRef: { entity: 'cycle', id: cycle.id, cycleId: cycle.id, threshold: 'T-0' },
          reminderKey: `schedule_call:T-0:${cycle.id}`,
        });
        sent += 1;
      }
    }
    return sent;
  }

  /** ~3 days before each due date, nudge only the side that has NOT submitted. */
  private async dueDateNudges(cycle: Row, now: Date, tz: string): Promise<number> {
    let sent = 0;
    if (daysUntil(now, cycle.selfDueDate, tz) === 3 && !this.submitted(cycle, 'self')) {
      await this.notifications.create({
        recipientUserId: cycle.menteeId,
        type: 'self_assessment_due',
        entityRef: { entity: 'cycle', id: cycle.id, cycleId: cycle.id, dueKind: 'self' },
        reminderKey: `self_due:T-3:${cycle.id}`,
      });
      sent += 1;
    }
    if (daysUntil(now, cycle.mentorDueDate, tz) === 3 && !this.submitted(cycle, 'mentor')) {
      await this.notifications.create({
        recipientUserId: cycle.mentorId,
        type: 'mentor_assessment_open',
        entityRef: { entity: 'cycle', id: cycle.id, cycleId: cycle.id, dueKind: 'mentor' },
        reminderKey: `mentor_due:T-3:${cycle.id}`,
      });
      sent += 1;
    }
    return sent;
  }

  private submitted(cycle: Row, side: 'self' | 'mentor'): boolean {
    return (cycle.submissions ?? []).some(
      (s: Row) => s.authorSide === side && s.status === 'submitted',
    );
  }

  private async referenceTz(): Promise<string> {
    const cfg = await this.prisma.cycleConfig.findUnique({
      where: { key: 'reminder.referenceTimeZone' },
    });
    const value = cfg?.value as { tz?: string } | undefined;
    return value?.tz ?? DEFAULT_TZ;
  }

  /**
   * Scheduled daily at 2 AM (container timezone). In AWS, EventBridge Scheduler
   * fires the Lambda that calls runSweep() directly.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async dailySweep(): Promise<void> {
    await this.runSweep();
  }
}
