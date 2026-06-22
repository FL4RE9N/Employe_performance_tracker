# Performance Tracker — Planning Docs

Planning documentation for an internal **employee performance & progress tracking** web app
(a "10x performance culture" tool, modeled on the proven Continuous Performance Management
pattern used by Lattice / 15Five / Leapsome / Culture Amp).

> **Status:** Planning complete · **No code yet** · Implementation starts at Phase 0 (see `06-roadmap.md`).

## How to read these docs

| # | File | Read it for… |
|---|---|---|
| 00 | [00-overview.md](./00-overview.md) | The vision, framing, scope, personas, and glossary. **Start here.** |
| 01 | [01-requirements.md](./01-requirements.md) | Every requirement, formalized — the 5 metrics, 4 questions, 1–5 scale, roles/permissions, NFRs |
| 02 | [02-tech-stack.md](./02-tech-stack.md) | What we're building it with and *why* |
| 03 | [03-architecture.md](./03-architecture.md) | How the system fits together (monorepo, modules, AWS topology, MS integration) |
| 04 | [04-data-model.md](./04-data-model.md) | Entities, fields, relationships, enums |
| 05 | [05-features-and-flows.md](./05-features-and-flows.md) | Each feature's flow + the review-cycle state machine + visibility matrix |
| 06 | [06-roadmap.md](./06-roadmap.md) | Phased delivery (Phase 0 → 3) with acceptance criteria |
| 07 | [07-open-questions-and-risks.md](./07-open-questions-and-risks.md) | Risks, mitigations, decisions still to make |
| 08 | [08-local-dev-and-deployment.md](./08-local-dev-and-deployment.md) | Local-first dev setup + the AWS cutover checklist |

## Decisions at a glance

| Area | Decision |
|---|---|
| Frontend | React + **TypeScript (pragmatic)** via Vite (SPA) |
| Backend | NestJS 11 (Node/TypeScript) |
| Database | PostgreSQL (Amazon Aurora Serverless v2) + Prisma |
| Hosting | **Local for MVP/testing** (Docker Compose) → **AWS for production** (Amplify + App Runner + Aurora + Lambda) |
| Auth | Basic email/password first → Microsoft Entra ID SSO later |
| Org/roles | Admin-assigned mentor pairings first → AD sync later |
| Teams 1:1 | In-app scheduling first → real Graph-created meetings later |
| Review cycles | Admin chooses org-wide **or** per-mentee individual cycles |

## One important framing note

The reference "10x.team" turned out **not** to be a performance app — it's a fractional-talent
marketplace. We interpreted "10x" as a *10x performance culture* and designed against the
established CPM blueprint, which matches every requirement the senior listed. See
[00-overview.md](./00-overview.md#framing-note) for detail.
