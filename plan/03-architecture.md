# 03 — Architecture

## Monorepo layout

A single repo with shared types is the backbone of the "one TypeScript codebase" benefit.

```
performance-tracker/
├─ apps/
│  ├─ web/          # React (Vite) SPA
│  ├─ api/          # NestJS API (REST + OpenAPI)
│  └─ jobs/         # Lambda handlers: reminder sweep (P1); AD sync (P2)
├─ packages/
│  └─ shared/       # Shared TS types + Zod schemas (single source of truth)
├─ infra/           # AWS CDK (TypeScript) — all cloud resources
└─ (tooling: pnpm workspaces or Turborepo, ESLint, Prettier, tsconfig base)
```

`packages/shared` holds the DTO/Zod schemas used by **both** the API (validation) and the SPA
(forms + typed responses). Change a field once; both sides see it.

## Backend module boundaries (NestJS)

Each module has one clear responsibility, a well-defined API, and is independently testable.

| Module | Responsibility |
|---|---|
| `AuthModule` | Login/logout, session issuance, password hashing; pluggable strategy (password → Entra OIDC). `AuthGuard` + `RolesGuard`. |
| `UsersModule` | Users, roles, profiles, **mentor relationships** (time-bounded edges), `manager_id`. |
| `MetricsModule` | The 5 `MetricDefinition`s + rating-scale config. |
| `GoalsModule` | CRUD + progress for user goals; mentor/admin read access. |
| `ReviewCycleModule` | The **state machine**: create (org-wide/individual), transitions, deadlines, snapshots. |
| `ReviewFormModule` | The two `ReviewSubmission`s per cycle (4 questions + 5 ratings); **lock-before-reveal**; comparison view. |
| `FeedbackModule` | Feedback requests from anyone + responses; anonymity rules. |
| `AppreciationModule` | The public wall (posts, reactions, moderation). |
| `NotificationModule` | Notification creation, **SSE stream**, email dispatch (SES), digest batching, prefs. |
| `MeetingModule` | 1:1 review-call scheduling (in-app MVP → Graph meeting later). |
| `AdminModule` | All-goals view, cycle-completion, rating-distribution roll-ups, user/pairing management. |
| `IntegrationModule` | **Microsoft Graph** boundary (Phase 2/3): SSO token validation helpers, directory sync, Teams meeting creation. Isolated so MS concerns don't leak elsewhere. |
| `AuditModule` (cross-cutting) | Writes `AuditLog` entries for sensitive changes. |

## Core request flow

```
Browser (SPA)
  → CloudFront (Amplify) ─ static assets
  → HTTPS /api/* → App Runner (NestJS API)
       AuthGuard (session cookie) → RolesGuard → Controller → Service → Prisma → Aurora
  ← JSON (typed via packages/shared)
```

- AuthN: session cookie validated per request. AuthZ: `RolesGuard` + per-resource **visibility
  checks in services** (never trust the client). See the visibility matrix in `05`.

## Real-time flow (notifications)

```
Domain event (e.g. feedback requested)
  → NotificationModule writes Notification row (Postgres)
  → pushes to the recipient's open SSE connection  (GET /notifications/stream)
  → (if email-eligible) enqueues an SES send (respecting digest/prefs)
Browser keeps an EventSource open; renders the bell/badge live.
```

## Background-jobs flow (review reminders)

```
EventBridge Scheduler (daily)  →  Lambda (apps/jobs: reminder-sweep)
   for each active cycle:
     compute days-until(menteeCycleEnd) and days-until(each dueDate)
     if matches T-30/14/7/3 or cycle-end → create Notification + SES email (mentor)
     if a due date is ~3 days out and the actor hasn't submitted → nudge that actor only
```

Idempotent: the sweep records what it sent (dedupe key per cycle+threshold) so re-runs don't
double-send.

## Local development topology (MVP / testing)

MVP + testing run entirely on the developer machine. Docker Compose provides the backing services;
the app and SPA run via dev servers.

```
Browser ──► Vite dev server (SPA, :5173)
        ──► NestJS API (:3000) ── Prisma ──► Postgres (Docker :5432)
                                  ├─ MailerService ─► Mailpit (SMTP :1025 / inbox UI :8025)
                                  ├─ StorageService ─► local disk (or MinIO :9000, S3-compatible)
                                  └─ cron (@nestjs/schedule) ─► ReminderService.runSweep()
              Config from .env (ConfigModule). SSE works as-is (plain HTTP).
```

**Provider-interface principle:** the few cloud-specific concerns (email, file storage, the
scheduler *trigger*, secrets/config) sit behind small interfaces with a local impl and an AWS impl;
everything else is identical. This is what makes the AWS cutover a config/adapter swap rather than a
rewrite — see [08-local-dev-and-deployment.md](./08-local-dev-and-deployment.md).

## AWS deployment topology (production)

```
                         ┌─────────────── CloudFront (CDN) ───────────────┐
   Users ── HTTPS ──►     │  Amplify Hosting (S3) = React SPA              │
                         └───────────────────────┬────────────────────────┘
                                                  │  /api/*
                                                  ▼
                                   ┌─────────────────────────────┐
                                   │  App Runner  (NestJS API)    │
                                   │  AuthGuard/RolesGuard + SSE  │
                                   └───────┬───────────────┬──────┘
                                           │               │
                                  (private)│               │ presigned
                                           ▼               ▼
                              ┌────────────────────┐   ┌──────────┐
                              │ Aurora PG          │   │   S3     │
                              │ Serverless v2      │   │ (files)  │
                              └────────────────────┘   └──────────┘
        EventBridge Scheduler ──► Lambda (reminders / P2 AD sync) ──► Aurora + SES
        Secrets Manager / SSM ──► (App Runner, Lambda)        SES ──► email
```

All of the above is defined in **CDK** (`infra/`). Environments: **dev**, **staging**, **prod**
(separate stacks/accounts or per-stage config).

## Microsoft integration boundary (Phase 2/3)

Three Entra **app identities**, all confined to `IntegrationModule` / `apps/jobs`:

1. **SPA** — public client; delegated sign-in via **auth-code + PKCE** (MSAL React). Registered
   under the **Single-page application** platform type.
2. **API** — validates Entra access tokens (audience = the API, issuer = tenant v2.0, signature
   via cached **JWKS**); exposes a delegated scope `access_as_user`.
3. **Sync worker (Lambda)** — app-only **client-credentials with a certificate** (key in
   KMS/Secrets Manager); reads directory via Graph **delta** queries.

This isolation means Phase 1 (basic auth) has zero Microsoft coupling, and Phases 2–3 plug in
without touching feature modules. Detail in `05` / `06` and the integration notes.

## Security architecture (summary)

- **AuthN:** session cookie (httpOnly/Secure/SameSite) → Entra OIDC later.
- **AuthZ:** role guard + per-resource visibility checks in services.
- **Network:** DB in private subnets; API the only public compute; least-privilege IAM.
- **Secrets:** Secrets Manager + SSM; nothing in the repo.
- **Data protection:** TLS in transit; encryption at rest (Aurora/S3 defaults); `AuditLog` on
  sensitive changes; explicit `released_to_employee` gate so ratings can't leak early.
