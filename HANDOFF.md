# Performance Tracker — Session Handoff

_Last updated: 2026-07-01 • Phase 0 + Phase 1 (MVP) **and the V1.3 UI uplift** are complete and verified. **Next step: integrate the marketing landing page → then Phase 2.** Latest commit: `76f6f7e`._

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
- **Phase 1 (MVP) is done:** admin users/roles/pairings, Goals, the **review-cycle state machine
  with lock-before-reveal**, symmetric review forms + comparison + release/acknowledge, notifications
  (live **SSE** + email via Mailpit) + the **reminder sweep**, appreciation wall, feedback requests,
  1-on-1 meetings, and the admin rating-distribution dashboard. **203 unit/integration tests pass**.
  A committed, re-runnable real-DB smoke (`scripts/integration-smoke.ps1`, run against the live stack)
  drives the full cycle and reports **29/29** invariant checks passing with emails delivered to Mailpit;
  the authenticated SPA was also confirmed in a real browser (zero console errors).
- **UI uplift to the V1.3 design is done:** token-based MUI theme with **light + dark mode**
  (persisted toggle) in `apps/web/src/theme.ts` + `theme-mode.tsx`; every screen restyled — shell,
  the Reviews hero (stepper rail, ScorePills, sealed→reveal, comparison score bars), appreciation
  wall, admin self-vs-mentor histograms, etc. Restyle-only (behavior/tests unchanged); independently
  browser-verified (~98% design fidelity, 0 console errors).
- **No AWS/CDK** — cloud concerns sit behind provider interfaces for a later cutover.
- **Immediate next step: integrate the 3D marketing landing page** — a standalone HTML already designed
  + exported (see "🚀 Next step — landing page" below) becomes the app's public front door.
- **After that**, the next milestone is **Phase 2 (Microsoft Entra ID SSO + directory sync)** — see `plan/06-roadmap.md`.

---

## 💡 The idea (what we're building)

An internal **employee performance & growth** platform (a "10x performance culture" tool in the
Lattice / 15Five / Leapsome vein) for a mid-size tech org. The heart is a **fair, anti-bias review
cycle**: an employee and their assigned mentor each complete the same review (4 fixed questions + 5
metric ratings, 1–5 with anchors) **privately** — **neither side sees the other's until both submit**
(lock-before-reveal) — then it reveals side-by-side for a calibrated 1-on-1, is released to the
employee, and acknowledged. Around that core: goals tracking (5 metrics), an appreciation wall, peer
feedback (with anonymity), 1-on-1 meetings, live SSE + email notifications with a reminder sweep, and
an admin analytics dashboard (self-vs-mentor rating distribution, no forced curve). Built local-first
(Docker + Postgres) with all cloud concerns behind provider seams. Roles/visibility are enforced
**server-side**. Microsoft Entra SSO + AD directory sync land in **Phase 2**; AWS deployment later.
Full product/tech plan lives in `plan/`.

The **public front door** is a cinematic, 3D-animated marketing landing page (see "🚀 Next step" below)
that sells the fairness story to unauthenticated visitors and routes "Sign in" into the app.

---

## ▶️ Start the servers

> Prereqs: **Docker Desktop running**, **Node ≥ 20**, **pnpm 9**. Run everything from the repo root:
> `C:\Users\RahulVenkatSaravanan\Desktop\performance_tracker`
>
> **First run / fresh clone:** create your local env file → `Copy-Item .env.example .env`
> (bash: `cp .env.example .env`). `.env` is gitignored (holds DB URL, session secret, admin creds);
> the `scripts/dev.*` launcher creates it automatically if missing.

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
Copy-Item .env.example .env  # first time only: create your local .env (gitignored)
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

> ⚠️ **Note for the next session:** dev servers may be left running in the background. If
> `pnpm dev:api`/`dev:web` report "port in use", stop them via the kill-by-port command above, then
> start fresh. **Demo accounts** (besides admin), created at runtime, password `ChangeMe123!`:
> `mentor@perf-tracker.local` (Demo Mentor) mentors `mentee@perf-tracker.local` (Demo Mentee).
> If they're missing (fresh DB), recreate via Admin → Users + a pairing, or just run
> `scripts/integration-smoke.ps1` (it creates its own throwaway users + a full cycle).

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

## ✅ Phase 1 (MVP) — what shipped

**API modules** (`apps/api/src/`): `admin` (users/roles + `MentorRelationship` pairings + `directory`),
`policy` (the reusable **server-side visibility** layer — mentor-ness derived from time-bounded edges,
no "mentor" role), `goals`, `cycles` (the **state-machine engine**: one `transition()` choke-point in a
single transaction, auto-chaining, AuditLog), `submissions` (save-draft + submit/**lock**, comparison
with reveal gating), `notifications` (RxJS SSE bus + `@Sse` stream + email routing/digest/prefs),
`appreciation`, `feedback`, `meetings`, `dashboard`. `jobs/reminder.service` rewritten (civil-date,
DST-safe `reminder.math` + idempotent sweep). Minimal NotificationService primitive emits the plan/05 events.

**Critical invariants (TDD, server-enforced):** lock-before-reveal immutability; comparison refused
until both submit; mentor ratings hidden from the employee until release; reminder-timing math; RBAC.
Proven by unit + **supertest** HTTP authz e2e (reusable harness at `apps/api/src/test/e2e.helper.ts`)
and **`scripts/integration-smoke.ps1`** — a re-runnable real-DB check that drives the full cycle (set
goals → both assess → reveal → schedule → release → acknowledge → close) against the live stack and
asserts every invariant (prints `29 passed, 0 failed`).

**Additive migrations:** `add_cycle_release_ack_fields` (ReviewCycle: `cycleEndDate`, `releasedAt`,
`acknowledgedAt`, `acknowledgementComment`); `add_notification_prefs_and_reminder_dedupe`
(`Notification.reminderKey` unique, `NotificationPreference`, `DigestFrequency`).

**Test tooling note:** `apps/api` vitest uses **`unplugin-swc`** so NestJS decorator metadata is emitted
for the DI-backed e2e tests (esbuild strips it). Don't remove it or the authz e2e tests break.

> ⚠️ **Environment note:** Docker Desktop on this machine intermittently stops its engine; if the API
> logs `P1001 Can't reach database server`, (re)start Docker Desktop (kill `Docker Desktop` +
> `com.docker.backend` processes and relaunch the exe if a plain start hangs), `docker compose up -d`,
> then restart `pnpm dev:api` (Prisma needs a fresh connection).
>
> **Other session gotchas:** (1) `prisma migrate dev` refuses in a non-interactive shell — instead
> generate SQL via `prisma migrate diff --from-url $DATABASE_URL --to-schema-datamodel prisma/schema.prisma --script`
> into a new `prisma/migrations/<timestamp>_<name>/migration.sql` (write it **BOM-less** — PowerShell
> `Out-File -Encoding utf8` adds a BOM that Postgres rejects with `syntax error at "﻿"`), then
> `prisma migrate deploy`. (2) In PowerShell, prefer **`git commit -F <file>`** over `-m @'…'@`
> here-strings (the here-string intermittently mis-parses and git treats the message text as pathspecs).

---

## 🎨 UI uplift (V1.3 design) — what shipped

Phase-1 functionality restyled to the approved V1.3 design (mockup lives in the user's Downloads as
`Performance TrackerV1.3.html`). **Restyle-only — no logic/API/behavior changes; all tests still green.**
- **Theme system:** `apps/web/src/theme.ts` exports `getTheme(mode)` + a `TOKENS` record (exact light
  **and** dark `--pt-*` values) + `BRAND_GRADIENT`. `apps/web/src/theme-mode.tsx` provides
  `ThemeModeProvider` + `useThemeMode()` with a persisted (localStorage `pt-theme`) light/dark toggle.
  For soft/surface2/shadow values not on the MUI palette, read `TOKENS[theme.palette.mode]`.
- **Screens restyled:** app shell (gradient logo, surface app bar, primary-soft active nav, top-bar
  theme toggle); Reviews hero (continuous stepper rail, ScorePills form + "Submit & lock", sealed
  state + `sealBreak`/`reveal` keyframes in `apps/web/src/reviews/animations.ts`, self/mentor comparison
  bars + colored delta chips); Home, Goals, Feedback, Appreciation (gradient avatars + reaction pills),
  1-on-1s, Notifications, Admin users + the self-vs-mentor rating histograms. Status chips use a
  soft-bg/strong-text token mapping.
- **Marketing landing page:** now designed in the design tool and **exported to a standalone HTML** —
  integrating it as the public front door is the immediate next step (see "🚀 Next step" below).

---

## 🚀 Next step (do this BEFORE Phase 2) — integrate the marketing landing page

A cinematic, 3D-animated marketing landing page was designed in the design tool and **exported as a
self-contained standalone HTML**:
- **File:** `C:\Users\RahulVenkatSaravanan\Downloads\Perf Landing Standalone.html`
  (inline CSS/JS + a WebGL/canvas 3D background; no external assets). ⚠️ It lives in Downloads,
  **outside the repo** — first bring it into the project.

**The idea:** this is the app's **public front door** — a cinematic hero over a live 3D background, a
scrollytelling "sealed → revealed" beat that dramatizes lock-before-reveal, feature highlights, and
CTAs, all in the V1.3 brand (indigo `#2563eb` → violet `#7c3aed` on near-black). Unauthenticated
visitors see this; **"Sign in / Get started" routes into the existing SPA** (`/login`).

**Integration task (the immediate next slice):**
1. Copy the HTML into the repo. **Recommended (lowest-risk):** serve it as a **static public page** —
   put it in `apps/web/public/` (e.g. `public/landing.html`) so Vite serves it verbatim, keeping the
   WebGL/JS exactly as designed. (Assets are already inlined.)
2. **Front-door routing:** today `/` is the authed dashboard behind `ProtectedRoute`. Make the landing
   the public entry — e.g. an unauthenticated visitor at `/` gets the landing; authenticated users are
   sent to the dashboard. Simplest: serve the landing at `/` (or `/welcome`) and move the app under a
   guard that redirects signed-out users there; keep existing deep links working. Wire the landing's
   "Sign in"/"Get started" buttons to `/login`.
3. **Alternative (more work):** port the landing into a React `LandingPage` component (translate the
   3D background to a React-mounted canvas/Three.js). Only if you want it fully inside the SPA;
   otherwise 1+2 is faster and keeps the design pixel-exact.
4. Keep it self-contained + performant (honor `prefers-reduced-motion`, pause the 3D offscreen), and
   confirm the "Sign in" path reaches the working login. Verify in a browser, then commit + push.

**Done when:** an unauthenticated visitor hits the app, sees the 3D landing, and can click through to
sign in; authenticated users still land in the app; typecheck / lint / build stay green.

_Only after the landing page is integrated do we start **Phase 2** below._

---

## 🔜 After the landing page — Phase 2 (Microsoft identity)

Per `plan/06-roadmap.md`: Entra ID SSO (MSAL in the SPA, API validates Entra tokens, mint the same
`pt_session` cookie via the pluggable `AUTH_STRATEGY`), directory sync (Graph `users/delta`), and
app-roles → server-side roles. The data model is already Entra-ready (nullable `entra_object_id` /
`tenant_id` / `auth_source`); Phase-1 local accounts must keep working.

### ⛔ Phase 2 prerequisites (these GATE the work — gather before starting)
Phase 2 cannot be built/verified without a real tenant. Bring:
1. An **Entra (Azure AD) tenant** with admin to create + admin-consent **3 app registrations**:
   SPA (auth-code + PKCE), API (`access_as_user`, v2 tokens), sync worker (app-only, **certificate**).
2. The resulting **tenant ID + client IDs**, the SPA **redirect URIs**, the **app roles** (`Admin`/`User`),
   and the sync worker **certificate** (private key → a secret store).
3. Two decisions (`plan/07`): **single- vs multi-tenant** (rec: single) and the **verified sending domain**.
Until these exist, SSO code is unverifiable — keep building only behind the pluggable `AUTH_STRATEGY`
seam and gate the cutover on a live tenant.

### Phase 2 first steps (after the landing page ships + SSO prerequisites are in hand)
1. `git pull`, then `pnpm install`.
2. Start Docker Desktop, then `.\scripts\dev.ps1 -Migrate`; confirm admin login at http://localhost:5173.
3. Read `plan/06-roadmap.md` (Phase 2 tasks) and the Microsoft-integration gotchas in `plan/07-open-questions-and-risks.md`.

---

## 📌 Pointers
- Remote: `origin` → https://github.com/FL4RE9N/Employe_performance_tracker.git (branch `main`)
- Run instructions & verification: **`README.md`**
- Product/tech plan: **`plan/`** (00 overview → 08 local-dev/deploy)
- Locked decisions also recorded in project memory (`perf-tracker-project.md`).
