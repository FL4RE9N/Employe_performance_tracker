# @perf-tracker/jobs

Lambda handlers for background jobs in the performance-tracker monorepo.

---

## What lives here

| Handler | File | Status |
|---|---|---|
| Reminder sweep | `src/reminder-sweep.handler.ts` | Phase 0 placeholder |
| AD directory sync | *(planned Phase 2)* | Not yet created |

---

## Reminder sweep: local cron vs AWS Lambda

The reminder business logic — computing which mentors/mentees need a nudge, creating
Notification rows, and dispatching emails — is a single method: `ReminderService.runSweep()`.
That method lives in `apps/api`. The only thing that differs between local development and
production is **what triggers it**.

### Local development (Phase 0 / Phase 1)

The NestJS API process runs the sweep in-process via `@nestjs/schedule`:

```
NestJS process (apps/api)
└─ @Cron('0 8 * * *')  →  ReminderService.runSweep()
```

No AWS account or Lambda deployment is required. The cron fires daily, and a
`POST /api/admin/debug/trigger-reminder-sweep` endpoint (added in Phase 1) lets you
run it on-demand for manual testing.

### AWS production (deployment milestone)

An Amazon EventBridge Scheduler rule (daily cron expression) invokes this Lambda. The
handler bootstraps a minimal context (Prisma client, SES mailer, etc.) and calls the
same `ReminderService.runSweep()` — identical business logic, different trigger.

```
EventBridge Scheduler  →  Lambda (apps/jobs: reminder-sweep)
                              └─ ReminderService.runSweep()
```

### Cutover: only the trigger changes

Because `ReminderService.runSweep()` is a plain TypeScript service with no NestJS HTTP
coupling, switching from local cron to Lambda is purely an infrastructure task:

1. Author the CDK stack in `infra/` (EventBridge rule + Lambda function resource).
2. Point the EventBridge rule at this handler's Lambda ARN.
3. Disable (or remove) the `@Cron` decorator in `apps/api` for the production build.
4. Swap the other provider adapters: `.env` → Secrets Manager, Mailpit → SES, disk → S3.

**No feature code changes.** See `plan/08-local-dev-and-deployment.md` for the complete
AWS cutover checklist.

---

## Phase 0 status

`src/reminder-sweep.handler.ts` is a **documented placeholder**. It:

- Compiles cleanly as part of the monorepo (`pnpm build`).
- Logs a diagnostic message and returns `{ ok: true }`.
- Has a unit test (`src/reminder-sweep.spec.ts`) asserting the contract.

When Phase 1 ships `ReminderService.runSweep()`, replace the placeholder body with
the real Lambda bootstrap and invocation (see the JSDoc in `reminder-sweep.handler.ts`).

---

## Scripts

```bash
pnpm build        # compile to dist/ (CommonJS via tsc)
pnpm typecheck    # type-check without emitting
pnpm test         # run unit tests with vitest
```
