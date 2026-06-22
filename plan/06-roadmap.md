# 06 — Roadmap

Four phases. Each lists scope, key tasks, and acceptance criteria (Definition of Done). Phases are
sequential, but within a phase many tasks parallelize.

---

## Phase 0 — Foundations
**Goal:** a deployable skeleton with infra, auth, and schema in place.

**Tasks**
- Monorepo (pnpm/Turborepo): `apps/web`, `apps/api`, `apps/jobs`, `packages/shared`, `infra`.
- **Local dev via Docker Compose:** Postgres, Mailpit (email inbox), optional MinIO (S3-compatible);
  `.env` config. *(CDK/AWS infra is deferred to the AWS deployment milestone below — see
  `08-local-dev-and-deployment.md`.)*
- NestJS skeleton + `AuthModule` (Argon2id, session cookie, CSRF, rate limit) + `RolesGuard`.
- Prisma schema for all entities (`04-data-model.md`) + migrations.
- Seed: 5 `MetricDefinition`s, `RatingScale` v1, an initial admin user.
- React (Vite) skeleton: routing, auth screens, TanStack Query, RHF+Zod, component kit, app shell.
- CI/CD (build, test, deploy to dev); base ESLint/Prettier/tsconfig.

**Done when:** an admin can log in on the **local** environment (`docker compose up` + dev servers);
migrations + seed run; CI is green.

---

## Phase 1 — MVP (basic auth)
**Goal:** the full product working with admin-managed users/pairings and in-app Teams-link scheduling.

**Tasks**
- **Users & pairings (admin):** create users, set roles, assign mentor↔mentee relationships.
- **Goals:** user CRUD + progress; mentor read (mentees); admin read (all).
- **Appreciation wall:** post (+@mention, metric tag), feed, reactions, admin remove.
- **Feedback requests:** request from anyone, recipient submit/decline, attribution/anonymity rules.
- **Review cycle engine:** create org-wide **and** individual cycles; the full **state machine**;
  deadlines; mentor snapshot.
- **Review forms:** symmetric self + mentor submissions (4 questions + 5 ratings with anchors);
  **lock-before-reveal**; comparison view; release + employee **acknowledgement**.
- **Meetings (MVP):** schedule review call, store time + manual Teams link; agenda auto-pull.
- **Notifications:** in-app **SSE** + **SES** email; event catalog; digest batching + prefs.
- **Reminders:** EventBridge→Lambda daily sweep (T-30/14/7/3/end + due-date nudges, idempotent).
- **Admin dashboard:** all goals, completion status, rating-distribution roll-ups.
- **Tests:** lock-before-reveal, reminder math, server-side visibility, full cycle e2e (Playwright).

**Done when:** an org can run an end-to-end yearly cycle (set goals → both assess → reveal →
schedule call → release → acknowledge → close) with correct notifications, reminders, and visibility;
critical-invariant tests pass.

---

## Phase 2 — Microsoft identity
**Goal:** sign in with Entra ID and source the org/roles from Active Directory.

**Tasks**
- **Entra app registrations:** SPA (auth-code+PKCE), API (`access_as_user`, v2 tokens), sync worker
  (app-only, **certificate**).
- **SSO:** MSAL React in the SPA; API validates Entra tokens (audience/issuer/`tid`, cached **JWKS**);
  mint the same session cookie. Match/Link local users to Entra by verified email/UPN; stamp
  `entra_object_id`/`tenant_id`; flip `auth_source`.
- **Directory sync (Lambda):** Graph `users/delta` (cert client-credentials) → upsert users, resolve
  `manager_id` edges (via `$expand=manager` since `/manager` has no app permission), store `deltaLink`.
- **Roles:** Entra **app roles** (`Admin`/`User`) → token `roles` claim → server-side enforcement.
- Mentor relationships stay app-managed (AD has no "mentor"); mentor may default to manager.

**Done when:** users sign in via Entra; new/updated AD users + manager edges sync incrementally;
admin/user roles come from app roles; Phase-1 local accounts still work (nullable `entra_object_id`).

---

## Phase 3 — Teams & advanced
**Goal:** real Teams meetings, Teams notifications, and optional calibration.

**Tasks**
- **Teams meetings via Graph:** create `onlineMeeting` (delegated `/me/onlineMeetings` first; app-only
  needs an **application access policy** — ≤30-min propagation), store `joinWebUrl`/`onlineMeetingId`.
- **Teams notifications:** Graph **activity feed** (`sendActivityNotification`) and/or Power Automate
  **Workflows** Adaptive Card — **not** the retiring O365 connector/incoming webhook.
- **Calibration (optional):** admin distribution review + `CalibrationAdjustment` (audited) before release.
- **Advanced analytics:** trend views, self-vs-mentor gap reporting.

**Done when:** a scheduled review call creates a real Teams meeting with a working join link; key
events can notify in Teams; (if enabled) calibration adjustments are recorded and gated before release.

---

## Deployment milestone — AWS (when ready for production)
**Goal:** move from local-first to the AWS production target. Runs once the MVP is validated locally
(can land before or after Phase 2, as needed). Because cloud concerns are behind provider interfaces,
this is an infra + config/adapter task, **not** a rewrite.

**Tasks**
- Author **CDK** stacks (`infra/`): Aurora Serverless v2, App Runner, Amplify, S3, SES (verify
  domain + DKIM/DMARC, request production access), EventBridge Scheduler + Lambda, Secrets Manager, CloudWatch.
- Point EventBridge → Lambda at the existing `ReminderService.runSweep()`.
- Swap providers: `.env` → Secrets Manager/SSM; Mailpit → SES; disk/MinIO → S3; cron → EventBridge.
- Configure SPA API base URL + CORS; add prod (and dev) Entra redirect URIs if SSO is live.
- Full checklist in `08-local-dev-and-deployment.md`.

**Done when:** the app runs on AWS with the same behavior as local; reminders fire via
EventBridge→Lambda; email sends via SES; CI deploys via CDK.

## Cross-phase definition of done
- Tests green (units + integration + e2e on critical invariants).
- Server-side authorization verified (not just UI gating).
- No secrets in the repo; infra reproducible via CDK.
- Observability: alarms on API 5xx, Lambda errors, SES bounce/complaint.
- Docs updated (this `plan/` folder + API OpenAPI).
