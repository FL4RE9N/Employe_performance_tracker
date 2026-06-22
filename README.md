# Performance Tracker

Internal employee **performance & progress tracking** app (the "10x performance culture" tool).
This repository contains **Phase 0 — the local-first foundation**: a pnpm monorepo with a NestJS
API, a React/Vite SPA, shared types, a complete Prisma schema, email/password auth, and a
Docker Compose dev stack.

> **Local-first:** everything runs on your machine via Docker Compose. Cloud concerns (email,
> file storage, the reminder-sweep trigger, secrets) sit behind small provider interfaces, so the
> later AWS cutover is a config/adapter swap — **no AWS or CDK is required to run this**. See
> [`plan/08-local-dev-and-deployment.md`](plan/08-local-dev-and-deployment.md).

## Stack

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces |
| Web (`apps/web`) | React 18 + Vite + TypeScript + MUI + TanStack Query + React Hook Form + Zod |
| API (`apps/api`) | NestJS 11 + Prisma 6 (PostgreSQL) |
| Jobs (`apps/jobs`) | reminder-sweep placeholder (in-process cron locally → EventBridge→Lambda on AWS) |
| Shared (`packages/shared`) | TS types + Zod schemas + constants — single source of truth |
| Auth | Argon2id + signed-JWT httpOnly session cookie + double-submit CSRF + login rate-limit; pluggable strategy (Entra OIDC later) |
| Dev infra | Docker Compose: Postgres + Mailpit (+ optional MinIO) |

## Prerequisites

- **Node.js ≥ 20** (developed on 24)
- **pnpm 9** — `npm install -g pnpm@9` (or `corepack enable pnpm`)
- **Docker Desktop** running (provides Postgres + Mailpit)
- **A local `.env`** — copy it from the template: `cp .env.example .env` (PowerShell: `Copy-Item .env.example .env`). `.env` is gitignored and holds the DB URL, session secret, and seed admin credentials; the `scripts/dev.*` launcher auto-creates it if missing.

## Quickstart

Run everything **from the repository root**.

```bash
# 1. Create your local .env from the template (gitignored — DB URL, session secret, admin creds)
#    bash:  cp .env.example .env        PowerShell:  Copy-Item .env.example .env
cp .env.example .env

# 2. Install all workspace dependencies
pnpm install

# 3. Build the shared package (the API and web import it)
pnpm build:shared

# 4. Start the backing services (Postgres + Mailpit). Wait until healthy.
docker compose up -d
#    Optional S3-compatible storage (not required locally):
#    docker compose --profile minio up -d

# 5. Apply database migrations + seed (5 metrics, rating scale v1, admin user)
pnpm db:migrate     # applies migrations and runs the seed
pnpm db:seed        # (optional) re-run the seed anytime — it is idempotent

# 6. Start the API (terminal 1) → http://localhost:3000/api
pnpm dev:api

# 7. Start the web app (terminal 2) → http://localhost:5173
pnpm dev:web
```

Then open **http://localhost:5173** and sign in:

| Field | Value |
|---|---|
| Email | `admin@perf-tracker.local` |
| Password | `ChangeMe123!` |

(Credentials come from `.env` — `ADMIN_EMAIL` / `ADMIN_PASSWORD`.)

## Verify it works

**In the browser:** logging in lands you on the task-driven Home with the nav rail (the **Admin**
item shows only for admins) and your avatar in the top-right.

**Backing services:**
- Mailpit web inbox (notification emails will land here in Phase 1): **http://localhost:8025**
- Postgres: `localhost:5432` (db `perf_tracker`, user `perf` / `perf`)

**Headless API check** (proves auth end-to-end without a browser):

```bash
# health
curl -s http://localhost:3000/api/health        # {"status":"ok",...}
curl -s http://localhost:3000/api/health/db      # {"db":"up"}

# login flow (CSRF double-submit + session cookie), using a cookie jar
curl -s -c cj.txt http://localhost:3000/api/auth/csrf            # sets pt_csrf cookie, returns {"csrfToken":"..."}
TOKEN=$(curl -s -c cj.txt http://localhost:3000/api/auth/csrf | sed -n 's/.*"csrfToken":"\([^"]*\)".*/\1/p')
curl -s -b cj.txt -c cj.txt -X POST http://localhost:3000/api/auth/login \
  -H "content-type: application/json" -H "x-csrf-token: $TOKEN" \
  -d '{"email":"admin@perf-tracker.local","password":"ChangeMe123!"}'   # {"user":{...,"role":"admin"}}
curl -s -b cj.txt http://localhost:3000/api/auth/me                     # {...,"role":"admin"}
```

> On **Windows PowerShell**, pass JSON via a file to avoid quote mangling:
> `curl.exe ... -d "@body.json"` where `body.json` holds the JSON. (`curl` in PowerShell is an
> alias for `Invoke-WebRequest`; use `curl.exe` for the real curl.)

## Available scripts (root)

| Command | Description |
|---|---|
| `pnpm build` | Build every package |
| `pnpm test` | Run all unit tests (Vitest) |
| `pnpm lint` | ESLint across the repo |
| `pnpm typecheck` | Typecheck every package |
| `pnpm dev:api` / `pnpm dev:web` | Start the API / web dev servers |
| `pnpm db:migrate` / `pnpm db:seed` / `pnpm db:generate` | Prisma migrate / seed / generate client |

## Project layout

```
apps/
  api/        NestJS 11 API — auth, Prisma, providers, jobs, health
    prisma/   schema.prisma (all entities) + migrations + seed
  web/        React + Vite SPA — routing, login, app shell, dashboard
  jobs/       reminder-sweep Lambda placeholder (local cron lives in apps/api)
packages/
  shared/     enums, Zod schemas, constants (5 metrics, 4 questions, rating scale v1)
docker-compose.yml   Postgres + Mailpit (+ optional MinIO profile)
plan/         the approved product & technical plan (00–08)
```

### Provider seams (the AWS-cutover points)

These are deliberately isolated so production swaps to AWS are adapter changes, not rewrites:

| Concern | Local (now) | AWS (later) |
|---|---|---|
| Email | `MailerService` → Mailpit (SMTP) | SES |
| File storage | `StorageService` → local disk / MinIO | S3 |
| Reminder trigger | `@nestjs/schedule` cron → `ReminderService.runSweep()` | EventBridge → Lambda → same `runSweep()` |
| Secrets/config | `.env` via `ConfigModule` | Secrets Manager / SSM |

## CI

`.github/workflows/ci.yml` runs install → build shared → `prisma generate` → build → lint →
typecheck → unit tests on every push/PR to `main` (no database needed; integration/E2E tests and
AWS CDK arrive in later phases).

## Status

**Phase 0 complete and verified end-to-end:** `docker compose up` + Prisma migrate + seed + admin
email/password login all work. Next is **Phase 1 (MVP)** — see [`plan/06-roadmap.md`](plan/06-roadmap.md).

### Notes
- On first run, `pnpm db:migrate` applies the committed `init` migration (no prompt). When you
  later change `schema.prisma`, create a migration with an explicit name:
  `pnpm --filter @perf-tracker/api exec prisma migrate dev --name <change>`.
- Booting the API logs a one-line `LegacyRouteConverter` warning for the CSRF middleware's `*`
  route — NestJS 11 auto-converts it for Express 5; it is harmless.
