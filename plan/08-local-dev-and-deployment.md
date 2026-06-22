# 08 — Local Dev & Deployment

## Principle: local-first, AWS-ready

MVP + testing run **fully locally**; AWS is the **production target at the end**. This changes
almost nothing architecturally, because the core stack is identical in both places — only a few
"edge" services need a local stand-in. We isolate those behind thin **provider interfaces** (good
design anyway), so the cloud cutover is a config/adapter swap, not a rewrite.

## What's identical local vs AWS (no abstraction needed)

- **PostgreSQL** — Aurora is just managed Postgres; same Prisma schema, different connection string.
- **NestJS API** and **React/Vite SPA** — same code; locally `start:dev` / `vite`.
- **SSE real-time** — plain HTTP from the API; zero cloud dependency.
- **Prisma migrations & seed** — identical.

## What needs a local stand-in (behind an interface)

| Concern | Local (MVP/testing) | AWS (production) | Abstraction |
|---|---|---|---|
| Database | Postgres in Docker | Aurora Serverless v2 | none — connection string only |
| API runtime | `npm run start:dev` (or Docker) | App Runner (→ Fargate) | one Dockerfile works both places |
| SPA runtime | Vite dev server | Amplify (S3 + CloudFront) | none |
| Email | **Mailpit** (SMTP + web inbox) | SES | `MailerService` (nodemailer SMTP — same code, different host/creds) |
| Scheduler / jobs | `@nestjs/schedule` cron in-process | EventBridge Scheduler → Lambda | shared `ReminderService.runSweep()`; only the trigger differs |
| File storage | local disk (or **MinIO**, S3-compatible) | S3 | `StorageService` (disk/MinIO ↔ S3) |
| Secrets / config | `.env` via `ConfigModule` | Secrets Manager + SSM | `ConfigModule` provider |
| Logs | stdout (pretty) | CloudWatch | logger transport only |

## Local setup (Docker Compose)

A single `docker-compose.yml` brings up the backing services:

- `postgres` — the database
- `mailpit` — SMTP sink + web inbox (view notification emails at `:8025`)
- *(optional)* `minio` — S3-compatible storage if you want S3-API parity locally

```
Browser ──► Vite dev server (SPA, :5173)
        ──► NestJS API (:3000) ── Prisma ──► Postgres (Docker :5432)
                                  ├─ MailerService ─► Mailpit (SMTP :1025 / UI :8025)
                                  ├─ StorageService ─► local disk (or MinIO :9000)
                                  └─ cron (@nestjs/schedule) ─► ReminderService.runSweep()
              Config from .env (ConfigModule). SSE = plain HTTP, works as-is.
```

Run: `docker compose up` → `prisma migrate dev` + seed → API `start:dev` → SPA `dev`. The reminder
sweep runs via in-process cron, and can also be triggered manually through a dev/admin endpoint for
testing without waiting for the schedule.

## The one design rule that makes the AWS cutover trivial

Keep the **business logic of the reminder sweep, email sending, and file storage in plain
services**. Locally they're wired to cron / Mailpit / disk; in AWS the *same services* are wired to
Lambda / SES / S3. No feature code changes when you deploy.

## AWS cutover checklist (done once, near the end)

- Author the **CDK** stacks (`infra/`) — deferred from Phase 0 to here.
- Provision Aurora, App Runner, Amplify, S3, SES (verify domain + DKIM/DMARC, request production
  access), EventBridge Scheduler + Lambda, Secrets Manager, CloudWatch.
- Point the EventBridge schedule at a Lambda that calls the existing `ReminderService.runSweep()`.
- Swap providers: `.env` → Secrets Manager/SSM; Mailpit → SES (SMTP); disk/MinIO → S3; cron → EventBridge.
- Set the SPA build's API base URL; lock CORS to the Amplify domain.
- (If Entra SSO is live by then) add the production redirect URIs to the app registration.

## Testing later phases locally (no AWS needed)

- **Entra SSO (Phase 2)** — register `http://localhost:5173` (your dev port) as a SPA redirect URI
  alongside the prod one; SSO is fully testable on localhost.
- **Teams meetings (Phase 3, delegated `/me/onlineMeetings`)** — work from localhost too.

So local-first defers only the final **hosting** — it does **not** block testing any feature.
