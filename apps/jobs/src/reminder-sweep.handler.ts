/**
 * reminder-sweep.handler.ts
 * =========================
 * AWS Lambda entry point for the daily reminder sweep job.
 *
 * ─── Local development (Phase 0 / Phase 1) ───────────────────────────────────
 * Locally, the reminder business logic lives in `apps/api` as
 * `ReminderService.runSweep()`. That service is wired to an in-process cron job
 * managed by `@nestjs/schedule` inside the NestJS process. The cron fires daily
 * (or on-demand via a dev/admin endpoint) without any AWS infrastructure.
 *
 *   NestJS process
 *   └─ @Cron('0 8 * * *')  →  ReminderService.runSweep()
 *
 * ─── AWS production (Deployment milestone) ───────────────────────────────────
 * When the app moves to AWS, the *trigger* is swapped from the in-process cron
 * to an Amazon EventBridge Scheduler rule (daily at a configured time). That
 * rule invokes this Lambda function. The handler's job is simply to bootstrap
 * whatever is needed and then call the same `ReminderService.runSweep()` logic.
 *
 *   EventBridge Scheduler (daily cron)
 *   └─ Lambda (this file)
 *      └─ ReminderService.runSweep()  ← identical business logic
 *
 * ─── Cutover: only the trigger changes ───────────────────────────────────────
 * Because the business logic (`ReminderService.runSweep`) is a plain service
 * with no framework coupling to the NestJS HTTP lifecycle, it can be imported
 * here and called directly once a minimal DI context (Prisma, MailerService,
 * etc.) is wired up. No feature code needs to change; the CDK stack simply
 * creates the EventBridge rule and points it at this Lambda ARN.
 *
 * See `apps/api/src/notifications/reminder.service.ts` (Phase 1) for the
 * implementation of `runSweep()`. See `plan/08-local-dev-and-deployment.md`
 * for the full cutover checklist.
 *
 * ─── Phase 0 status ──────────────────────────────────────────────────────────
 * This file is a PLACEHOLDER. `ReminderService` does not exist yet (Phase 1).
 * The handler logs a diagnostic message and returns a typed OK response so that:
 *   1. The package builds cleanly as part of the monorepo.
 *   2. A unit test can assert the contract (returns { ok: true }).
 *   3. The Lambda bootstrap and EventBridge wiring can be authored/tested
 *      independently of the reminder feature work.
 *
 * When Phase 1 ships, replace the placeholder body with the real invocation:
 *
 *   import { bootstrapReminderContext } from './bootstrap';
 *   export async function handler(event?: unknown) {
 *     const { reminderService } = await bootstrapReminderContext();
 *     await reminderService.runSweep();
 *     return { ok: true };
 *   }
 */

export interface SweepResult {
  ok: boolean;
  note?: string;
}

/**
 * AWS Lambda handler — invoked by EventBridge Scheduler in production.
 *
 * @param event - The EventBridge event payload (unused in Phase 0).
 * @returns A simple acknowledgement object.
 */
export async function handler(event?: unknown): Promise<SweepResult> {
  console.log('[jobs] reminder-sweep placeholder invoked', {
    event,
    phase: 0,
    timestamp: new Date().toISOString(),
  });

  // Phase 0 placeholder.
  // In production (Phase 1+) this will instantiate a minimal context and call:
  //   await reminderService.runSweep();
  // See module-level JSDoc above for the migration path.

  return {
    ok: true,
    note: 'Phase 0 placeholder — see apps/api ReminderService.runSweep()',
  };
}
