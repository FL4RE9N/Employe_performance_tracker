# Performance Tracker — Session Handoff

_Last updated: 2026-06-22 • Phase 0 (local-first foundation) is **complete and verified end-to-end**._

This doc lets a fresh session (or a new developer) pick up immediately. For full product context
read `plan/` (the approved plan, files 00–08) and `README.md` (run instructions).

---

## TL;DR — current status

- **Phase 0 is done and proven working locally:** `docker compose up` → Prisma migrate → seed →
  NestJS API + React/Vite SPA → **admin email/password login confirmed** (via curl and a real browser).
- Stack: **pnpm monorepo** — `apps/api` (NestJS 11), `apps/web` (React 18 + Vite + MUI),
  `apps/jobs` (reminder placeholder), `packages/shared` (types + Zod + constants).
- **Committed & pushed:** the Phase 0 baseline is committed on `main` and pushed to
  **`origin`** → https://github.com/FL4RE9N/Employe_performance_tracker.git
  (clone: `git clone https://github.com/FL4RE9N/Employe_performance_tracker.git`).
- **No AWS/CDK** — cloud concerns sit behind provider interfaces for a later cutover.
- Next milestone: **Phase 1 (MVP)** — see `plan/06-roadmap.md`.

---

## ▶️ Start the servers

> Prereqs: **Docker Desktop running**, **Node ≥ 20**, **pnpm 9**. Run everything from the repo root:
> `C:\Users\RahulVenkatSaravanan\Desktop\performance_tracker`

### Easiest — the launcher script
```powershell
# Windows / PowerShell
.\scripts\dev.ps1            # docker up + build shared + open API & web in 2 windows
.\scripts\dev.ps1 -Migrate   # also run Prisma migrate + seed first (use on a fresh DB)
.\scripts\dev.ps1 -Minio     # also start the optional MinIO (S3) service
```
```bash
# macOS / Linux / Git Bash / WSL
./scripts/dev.sh             # add --migrate and/or --minio as needed
```

### Manual (equivalent steps)
```powershell
pnpm install                 # first time only
pnpm build:shared            # API imports the built shared package
docker compose up -d         # Postgres + Mailpit (add: --profile minio for MinIO)
pnpm db:migrate              # first time / after schema changes — applies migrations + seeds
pnpm dev:api                 # terminal 1  → http://localhost:3000/api
pnpm dev:web                 # terminal 2  → http://localhost:5173
```

**URLs once running**
| Service | URL |
|---|---|
| Web (SPA) | http://localhost:5173 |
| API | http://localhost:3000/api |
| Mailpit inbox | http://localhost:8025 |
| Postgres | localhost:5432 (db `perf_tracker`, user `perf` / `perf`) |

---

## ⏹️ Stop the servers

**Dev servers (API :3000, web :5173):**
- If you launched them with `scripts/dev.ps1`, just **close the two terminal windows** (or press
  `Ctrl+C` in each).
- If launched some other way, **kill by port** (PowerShell):
  ```powershell
  Get-NetTCPConnection -LocalPort 3000,5173 -State Listen |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object { Stop-Process -Id $_ -Force }
  ```

**Backing services (Docker):**
```powershell
docker compose down          # stop Postgres + Mailpit, KEEP the database data
docker compose down -v       # stop AND wipe the DB volume (next start needs migrate + seed again)
```

> ⚠️ **Note for the next session:** the API and web were left **running in the previous session's
> background** (API pid was 12480, web pid 11072 — these change). If `pnpm dev:api`/`dev:web` report
> "port in use", the old ones are still up: stop them via the kill-by-port command above, then start fresh.

---

## 🔑 Login credentials

- **Email:** `admin@perf-tracker.local`
- **Password:** `ChangeMe123!`

Set in the root **`.env`** (`ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME`). The seed
(`apps/api/prisma/seed.ts`) reads them, hashes the password with **Argon2id**, and upserts the admin
`User`. Change the password by editing `.env` then re-running `pnpm db:seed` (idempotent, keyed on email).

---

## ✅ What exists & was verified (Phase 0)

| Area | Status |
|---|---|
| pnpm monorepo + shared tsconfig/ESLint/Prettier/Vitest | ✅ |
| `docker-compose.yml`: Postgres + Mailpit (+ optional MinIO via `--profile minio`) | ✅ |
| Prisma schema — **all 19 entities** from `plan/04-data-model.md`; migration `init` applied | ✅ |
| Seed — 5 metrics, rating scale v1, admin user | ✅ |
| NestJS `AuthModule` — Argon2id, httpOnly JWT session cookie, CSRF, login rate-limit, RolesGuard, pluggable strategy | ✅ |
| React shell — routing, login (RHF + Zod), TanStack Query, MUI, app shell + dashboard | ✅ |
| Provider seams — `MailerService` (→ Mailpit), `StorageService` (→ disk) | ✅ |
| CI workflow (`.github/workflows/ci.yml`) — build + lint + typecheck + test | ✅ |
| **Verified:** `pnpm -r build` ✅ · `pnpm -r test` → **45 tests pass** ✅ · `pnpm lint` ✅ · `pnpm typecheck` ✅ · admin login (curl + browser) ✅ |

---

## 🗂️ Repo structure

```
apps/
  api/   NestJS 11 — src/{auth,prisma,providers,jobs,health,config}; prisma/{schema.prisma,migrations,seed.ts}
  web/   React + Vite — src/{pages,components,auth,lib}; vite.config.ts (proxies /api → :3000)
  jobs/  reminder-sweep Lambda placeholder (local cron lives in apps/api)
packages/
  shared/  enums, Zod schemas, constants (5 metrics, 4 questions, rating scale v1)
scripts/   dev.ps1 / dev.sh — the launcher scripts
plan/      approved product & technical plan (00–08) — READ THIS for Phase 1
docker-compose.yml · .env (gitignored) · .env.example · README.md
```

---

## ⚙️ Key commands (root)

| Command | Does |
|---|---|
| `pnpm build` / `pnpm -r build` | build all packages |
| `pnpm test` | all unit tests (Vitest) |
| `pnpm lint` / `pnpm typecheck` | lint / typecheck all |
| `pnpm db:migrate` / `pnpm db:seed` / `pnpm db:generate` | Prisma migrate / seed / generate client |
| `pnpm dev:api` / `pnpm dev:web` | start API / web |

> pnpm quirk: bare `pnpm lint` from a subfolder fails ("missing script"). Run root scripts from the
> repo root, or use `pnpm -w run <script>`.

---

## 🧭 Architecture & locked decisions (don't relitigate)

- **Monorepo = pnpm workspaces only (NO Turborepo).** UI kit = **MUI** (not shadcn).
- **Auth:** signed **JWT (jsonwebtoken)** in httpOnly cookie `pt_session`; **double-submit CSRF**
  (`pt_csrf` cookie + `x-csrf-token` header, enforced on all mutations incl. login); login
  rate-limited via `@nestjs/throttler`. Pluggable `AUTH_STRATEGY` (Entra OIDC drops in later).
- **`tsconfig.base.json` keeps `strict:false` BUT `strictNullChecks:true` is REQUIRED** — Zod infers
  all object props as optional otherwise. **Do not turn it off.**
- **`packages/shared` compiles to CommonJS** (so NestJS can `require` it). The web's `vite.config.ts`
  **aliases `@perf-tracker/shared` to its TS source** (rollup CJS named-export interop fails otherwise).
- **NestJS 11 ships Express 5** → `forRoutes('*')` logs a harmless `LegacyRouteConverter` warning.
  Web is pinned to **Vite 5** to match `vitest@2` (avoids a dual-Vite type clash).
- **Cloud seams** (swap points for AWS): Email → Mailpit/SES · Storage → disk/S3 · Reminder trigger →
  cron/EventBridge+Lambda (same `ReminderService.runSweep()`) · Config → `.env`/Secrets Manager.

---

## 🩹 Integration fixes already applied (history — don't reintroduce)

The build agents produced code that needed 6 fixes to run; all are done:
1. `main.ts`: `import cookieParser from 'cookie-parser'` (default import, not `* as`).
2. Added `strictNullChecks:true` to `tsconfig.base.json` (Zod inference).
3. `apps/api/tsconfig.json`: `rootDir:"src"`, removed `paths` mapping, `include:["src/**"]` — so
   `nest build` emits `dist/main.js` (was nesting under `dist/apps/api/src`).
4. Web pinned to Vite 5; `vite.config.ts` imports `defineConfig` from `vitest/config` + aliases shared to source.
5. `useSession.ts`: `useLogin` unwraps `{ user }` from the login response before caching `['me']`
   (was caching the envelope → `displayName` undefined → AppShell crash).
6. Removed deprecated `enableShutdownHooks` (`@ts-ignore`) from `PrismaService`; lint clean.

---

## ⚠️ Known cosmetic warnings (safe to ignore)

- `LegacyRouteConverter` warning on API boot (Express 5 wildcard auto-convert).
- `package.json#prisma is deprecated` (Prisma 6 → 7 config migration notice).
- Vite "chunks larger than 500 kB" (MUI bundle; code-split later if desired).
- `@nestjs/schedule` peer-dep warning vs NestJS 11 (works fine; bump to a Nest-11 peer later if noisy).
- Browser console: `favicon.ico 404` and a `/auth/me 401` before login (both expected).

---

## 🔜 What's next — Phase 1 (MVP)

Per `plan/06-roadmap.md`: admin user/pairing management, Goals CRUD, Appreciation wall, Feedback
requests, the **review-cycle state machine** (lock-before-reveal), review forms, meetings (manual
Teams link), notifications (SSE + email via the existing `MailerService` → Mailpit), and the daily
reminder sweep (`ReminderService.runSweep()` is stubbed in `apps/api/src/jobs/`). Critical-invariant
tests: lock-before-reveal, reminder math, server-side visibility.

### Suggested first steps for the next session
1. `git clone https://github.com/FL4RE9N/Employe_performance_tracker.git` (or `git pull`), then `pnpm install`.
2. Start the stack (above) and confirm login still works.
3. Read `plan/05-features-and-flows.md` (state machine + visibility matrix) before building Phase 1.

---

## 📌 Pointers
- Remote: `origin` → https://github.com/FL4RE9N/Employe_performance_tracker.git (branch `main`)
- Run instructions & verification: **`README.md`**
- Product/tech plan: **`plan/`** (00 overview → 08 local-dev/deploy)
- Locked decisions also recorded in project memory (`perf-tracker-project.md`).
