# 02 — Tech Stack

**Principle:** one **TypeScript** codebase end-to-end — a single talent pool, shared types
across the network boundary, the strongest Microsoft Graph + AWS ecosystem, and the fastest
path for a small team. All choices verified against current (2025/2026) sources.

## Summary

| Concern | Choice |
|---|---|
| Frontend | React + **TypeScript (pragmatic)** via **Vite** (SPA) |
| Backend | **NestJS 11** (Node/TypeScript) |
| Database | **PostgreSQL** — Amazon **Aurora Serverless v2** (scale-to-zero) |
| ORM / migrations | **Prisma 7** |
| Auth (MVP → later) | **Argon2id + httpOnly session cookie** → **Entra OIDC (auth-code + PKCE)** |
| Real-time | **SSE** (→ AppSync Events later) |
| Scheduler / jobs | **EventBridge Scheduler → Lambda** |
| Email | **Amazon SES** |
| SPA hosting | **AWS Amplify Hosting** (S3 + CloudFront) |
| API hosting | **AWS App Runner** (→ ECS Fargate at scale) |
| File storage | **S3** (private, presigned URLs) |
| Secrets / config | **AWS Secrets Manager + SSM Parameter Store** |
| IaC | **AWS CDK (TypeScript)** |
| Testing | **Vitest + Supertest + Testcontainers + Playwright** |
| Observability | **CloudWatch + structured JSON logs + X-Ray** |

> **Local-first for MVP/testing:** the table above is the **production (AWS)** target. For MVP and
> testing, everything runs locally — Postgres / Mailpit / (optional MinIO) via Docker Compose, the
> API and SPA via their dev servers, reminders via an in-process cron. The core stack (Postgres,
> Prisma, NestJS, React, SSE) is **identical** in both; only email / storage / scheduler / secrets
> sit behind thin provider interfaces that swap to SES / S3 / EventBridge+Lambda / Secrets Manager
> on deploy. Full mapping + cutover checklist in
> [08-local-dev-and-deployment.md](./08-local-dev-and-deployment.md).

---

## Frontend — React + TypeScript (Vite SPA)

- **Vite** for fast dev/build; SPA is the right shape because the API is a separate service.
- **Pragmatic TypeScript:** start with relaxed compiler settings (`strict` off, `any` where
  unsure) and tighten over time. You still get shared API types and editor autocomplete, with a
  gentle ramp. *(Rationale for TS over JS is in the approved plan: this app is unusually
  state-heavy — ~11 review-cycle states, lock-before-reveal, role-based visibility — exactly where
  types prevent bugs; and the backend is TS regardless, so shared types are a major win.)*
- **Data fetching:** TanStack Query (server-state caching, retries, invalidation).
- **Forms & validation:** React Hook Form + **Zod** (the same Zod schemas are shared with the API).
- **UI kit:** shadcn/ui (Tailwind) or MUI — pick one in Phase 0; both give accessible primitives.
- **Routing:** React Router.

## Backend — NestJS 11 (Node/TypeScript)

- Structured **modules** map 1:1 onto features (see `03-architecture.md`) — keeps the
  state-machine, auth, and jobs from turning into spaghetti.
- Built-in **DI**, **Guards** (`AuthGuard`/`RolesGuard`), **interceptors**, and
  **OpenAPI/Swagger** generation.
- Input validation via **class-validator/Zod DTOs**.
- NestJS 11 ships SWC + Vitest by default (fast builds/tests) and a structured JSON logger.

## Database — PostgreSQL (Aurora Serverless v2) + Prisma 7

- **Relational is clearly correct**: heavy relationships (users↔mentors, goals↔metrics, locked
  cycle submissions, feedback, appreciation, notifications).
- **Aurora PostgreSQL Serverless v2** supports **scaling to 0 ACUs** with auto-pause → ~$0 when
  idle, auto-scales on load. (If flat/predictable cost is preferred, a small **RDS** `t4g.micro`
  is the simpler alternative.)
- **Prisma 7** for schema, migrations, and ergonomic nested-relation queries. (Drizzle is the
  lighter alternative, but Prisma's migration tooling wins for this relation-heavy schema.)

## Auth — basic now, Entra later, one pluggable module

- **MVP:** email/password. Hash with **Argon2id** (OWASP's current top recommendation). Issue a
  server-side session as an **httpOnly, Secure, SameSite cookie** — the SPA never holds a raw
  token. Add CSRF protection + auth-endpoint rate limiting.
- **Later (Phase 2):** **Entra ID OIDC, authorization-code + PKCE** (MSAL React in the SPA). The
  SPA authenticates against Entra; the backend validates the Entra token against the tenant's
  **JWKS**, then mints the **same** session cookie. Only the credential-verification step changes.
- Keep both behind a NestJS `AuthModule` with a strategy interface so password and OIDC are
  interchangeable.

## Real-time — SSE (Server-Sent Events)

- Notifications, the kudos wall, and live updates are **one-way server→client** — SSE is the
  simplest correct tool: trivial in NestJS, plain HTTP through CloudFront, auto-reconnect, no
  extra AWS service. Persist notifications in Postgres and push via SSE.
- **Upgrade path:** AWS **AppSync Events** (managed serverless pub/sub WebSockets) if real-time
  becomes a large bidirectional surface.

## Scheduler / background jobs — EventBridge Scheduler → Lambda

- The reminder nudges (T-30/T-14/T-7/T-3/cycle-end) are time-anchored, low-frequency, idempotent.
- Pattern: **one daily sweep** schedule → a small **Lambda** computes which mentees are at
  T-minus-N relative to **their own** cycle end → writes `Notification` rows + sends SES email.
  No idle worker, survives restarts, well under Lambda's 15-min limit.
- Rejected: BullMQ+Redis on ECS (overkill at this scale); in-container cron (no HA).

## Email — Amazon SES

- SES is ~$0.10 / 1,000 emails, scales freely, integrates natively with AWS (IAM, bounce/
  complaint events). Verify the domain (SPF/DKIM/DMARC) and **request production access early**
  (out of sandbox) before launch.
- Microsoft Graph `sendMail` is the wrong tool for transactional mail (per-mailbox rate caps);
  reserve it only for the rare "must send from a specific corporate mailbox" case.

## Hosting topology (AWS)

| Layer | Choice |
|---|---|
| React SPA | **Amplify Hosting** (managed CI/CD on S3 + CloudFront, preview branches) |
| API (NestJS) | **App Runner** for MVP (managed containers, scale-to-zero) → **ECS Fargate** when VPC/scaling control is needed |
| Database | Aurora Serverless v2 (scale-to-zero), private subnets |
| Jobs | EventBridge Scheduler → Lambda |
| Email | SES |
| Files | S3 (private buckets, presigned URLs) |
| Secrets | Secrets Manager (DB creds, SES, future Entra cert) + SSM for non-secret config |
| Real-time | SSE from the App Runner service |
| IaC | **AWS CDK (TypeScript)** |

**Flow:** Amplify (SPA) → CloudFront → App Runner (NestJS API) → Aurora (private) · EventBridge→Lambda for reminders · SES for email · S3 for files · Secrets Manager for secrets — all defined in CDK.

### Two upgrade decisions to revisit later
- **App Runner vs ECS Fargate:** App Runner ships faster; switch to Fargate when you need tight VPC/IAM/scaling control.
- **SSE vs AppSync Events:** SSE is the low-effort MVP; adopt AppSync Events if notifications grow into a major bidirectional surface.

## Testing
- **Vitest** (units), **Supertest** (API e2e), **Testcontainers (Postgres)** (integration),
  **Playwright** (React e2e).
- Prioritize coverage of: **lock-before-reveal** (immutable on submit; reveal only after both),
  the **reminder-timing math**, and **server-side visibility** enforcement.

## Observability & secrets
- CloudWatch Logs (NestJS structured JSON logger); alarms on API 5xx, Lambda errors, SES
  bounce/complaint rates; X-Ray (or OpenTelemetry) tracing.
- Secrets in Secrets Manager + SSM; nothing in the repo; rotate DB creds.

## Selected sources
- NestJS 11 — trilon.io/blog/announcing-nestjs-11-whats-new · docs.nestjs.com
- Aurora Serverless v2 scale-to-zero — aws.amazon.com/about-aws/whats-new/2024/11/amazon-aurora-serverless-v2-scaling-zero-capacity
- Prisma vs Drizzle (2026) — bytebase.com/blog/drizzle-vs-prisma
- Entra auth-code flow — learn.microsoft.com/entra/identity-platform/v2-oauth2-auth-code-flow
- OWASP password hashing (Argon2id) — cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- AppSync Events — aws.amazon.com/about-aws/whats-new/2025/03/appsync-events-publishing-websocket-real-time-pub-sub
- EventBridge Scheduler + Lambda — docs.aws.amazon.com/eventbridge/latest/userguide/eb-run-lambda-schedule.html
- Graph throttling/send limits — learn.microsoft.com/graph/throttling-limits
- App Runner vs ECS Fargate vs Amplify — businesscompassllc.com (comparison)
- AWS CDK vs Terraform (2025/26) — towardsthecloud.com/blog/aws-cdk-vs-terraform
