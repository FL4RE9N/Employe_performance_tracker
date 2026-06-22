# CI Workflows

## `ci.yml` — Build and Test

Triggers on every push to `main` and on all pull requests targeting `main`.

### What it does

| Step | Purpose |
|---|---|
| Install dependencies | `pnpm install --frozen-lockfile` — fails fast if the lockfile is out of sync |
| Build shared | `@perf-tracker/shared` compiles to CJS first so downstream packages can typecheck against it |
| Generate Prisma client | Runs `prisma generate` against the schema; produces the typed client without a live database |
| Build all | Compiles `@perf-tracker/api` (NestJS) and `@perf-tracker/web` (Vite) |
| Lint | Runs ESLint across the monorepo via the root `pnpm lint` script |
| Typecheck | Runs `tsc --noEmit` in every package that declares a `typecheck` script |
| Unit tests | Runs Vitest in every package that declares a `test` script; services are tested with hand-mocked deps, no database needed |

### What it does not do (yet)

- **Integration tests** — Testcontainers (Postgres) and Playwright E2E tests are planned for Phase 1.
- **AWS CDK deploy** — infrastructure deployment is a Phase 2 / Phase 3 milestone.
- **Docker image build** — will be added when the deployment pipeline is defined.

### Local equivalent

```bash
pnpm install
pnpm --filter @perf-tracker/shared build
pnpm --filter @perf-tracker/api prisma:generate
pnpm -r build
pnpm lint
pnpm -r typecheck
pnpm -r --if-present test
```
