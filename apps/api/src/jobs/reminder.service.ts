/**
 * ReminderService — review-deadline reminder logic.
 *
 * LOCAL trigger: @nestjs/schedule cron (dailySweep below) calls runSweep() at 2 AM.
 *
 * AWS trigger: An EventBridge Scheduler → Lambda invokes the SAME runSweep() method.
 * Only the trigger differs; this business logic is identical in both environments.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

export interface SweepResult {
  ranAt: string;
  activeCycles: number;
}

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * runSweep — Phase-0 placeholder implementation.
   *
   * Counts active ReviewCycles and logs the result. In Phase 1+ this will:
   *  - Compute days-until(dueDate) for each cycle
   *  - Send nudge notifications at T-30/14/7/3 thresholds
   *  - Record what was sent (idempotent dedupe key per cycle+threshold)
   *
   * This SAME runSweep() is the method an AWS EventBridge → Lambda will invoke;
   * only the trigger differs.
   */
  async runSweep(): Promise<SweepResult> {
    const activeCycles = await this.prisma.reviewCycle.count({
      where: {
        status: {
          notIn: ['closed', 'acknowledged'],
        },
      },
    });

    this.logger.log(`[reminder-sweep] ran; active cycles: ${activeCycles}`);

    return {
      ranAt: new Date().toISOString(),
      activeCycles,
    };
  }

  /**
   * Scheduled daily at 2 AM (local / container timezone).
   * In AWS, EventBridge Scheduler fires the Lambda that calls runSweep() directly.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async dailySweep(): Promise<void> {
    await this.runSweep();
  }
}
