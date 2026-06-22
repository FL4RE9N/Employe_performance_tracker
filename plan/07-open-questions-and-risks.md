# 07 — Open Questions & Risks

## Open questions (decide before/within the relevant phase — none block planning)

| # | Question | Recommendation | Decide by |
|---|---|---|---|
| 1 | **Entra tenancy** — single vs multi-tenant? | **Single-tenant** (internal app; issuer is a constant) | Before Phase 2 |
| 2 | **Peer-feedback anonymity default** | **Attributed by default**, with optional confidentiality; suppress sole-responder display | Phase 1 (Feedback) |
| 3 | **Calibration** in scope? | Lightweight **admin distribution view** in MVP; formal calibration committee deferred to Phase 3 | Phase 1 vs 3 |
| 4 | **Data retention** for historical cycles/ratings | Define a retention + archival policy (compliance) | Before Phase 1 launch |
| 5 | **App name / branding** | Placeholder for now | Anytime |
| 6 | **Org-wide cycle granularity** — calendar year vs configurable period? | Configurable `periodLabel` + window offsets (data, not code) | Phase 1 |
| 7 | **Mentor defaulting** — when AD sync lands, auto-default mentor = manager? | Default but **overridable** | Phase 2 |
| 8 | **Self-rating visibility post-reveal** — does the mentee always see their own first? | Yes; mentee always sees own; mentor's hidden until release | Phase 1 |
| 9 | **Email-from identity / domain** for SES | Pick a verified sending domain early (DKIM/DMARC) | Phase 0 |
| 10 | **Reactions/comments on appreciation** — MVP or later? | Reactions in MVP; threaded comments later | Phase 1 |

## Assumptions log

- "10x.team" means a **10x performance culture**, not the literal product (which is a talent
  marketplace). The design follows the CPM blueprint (Lattice/15Five/Leapsome/Culture Amp).
- The organization uses **Microsoft 365** (so Entra/Graph/Teams integration is viable later), but
  the app is **hosted on AWS** and integrates over public Graph APIs.
- Org scale is hundreds to low-thousands of users (informs scale-to-zero infra choices).
- One internal tenant; not sold to external customers.

## Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Premature disclosure of ratings** | Trust/legal | Explicit cycle states + server-side visibility + `released_to_employee` gate; verify in integration tests |
| **Recency bias** | Unfair reviews | Build reviews from accumulated feedback/appreciation; surface evidence next to ratings |
| **Rating inflation / central tendency** | Scale becomes meaningless | Behavioral anchors + admin distribution dashboard; **no forced curve** |
| **Notification fatigue** | Users mute, miss deadlines | Digest batching, priority routing, nudge only non-actors, per-user prefs |
| **AD / identity drift after reorgs** | Corrupted history | Snapshot mentor on the cycle; time-bounded mentor edges; mirror AD locally; nullable `entra_object_id` |
| **Rating-scale instability across years** | Breaks comparisons | Version-stamp each rating; keep the 1–5 scale + definitions stable |
| **Fairness disputes** | Compliance | `AuditLog` on rating/visibility/calibration changes |
| **App-only Teams meeting blocked** | Phase 3 feature fails | MVP uses delegated `/me/onlineMeetings`; app-only needs an **application access policy** (≤30-min propagation) |
| **SES sandbox limits** | Email blocked at launch | Verify domain (SPF/DKIM/DMARC) + request **production access early** |
| **O365 connector retirement (2026)** | Teams cards break | Use Graph **activity feed** / Power Automate **Workflows**, not incoming webhooks |
| **Anonymity illusion (small teams)** | Re-identification | Suppress sole-responder display; be transparent about who sees what |
| **Missing audit trail** | Disputes unresolvable | `AuditLog` from day one |
| **Scope creep into full HRIS** | Delivery risk | Hold the line on non-goals (`00-overview.md`); phase aggressively |

## Microsoft integration — gotchas to remember (Phase 2/3)

- Admin consent needed for all `*.All` and most directory scopes.
- `/me/*` endpoints are **delegated-only**; app-only must use `/users/{id}`.
- `/users/{id}/manager` has **no application permission** in v1.0 — read manager via
  `$expand=manager` (with `ConsistencyLevel: eventual` for `$levels`).
- Prefer **app roles** over group claims (tenant-portable; avoids groups-overage).
- Use a **certificate** (not a secret) for the app-only sync worker; store the key in KMS/Secrets
  Manager; **cache JWKS keys and tokens**.
- Teams meeting creation requires the organizer to hold a **Teams license**.
- Graph `sendMail` (app permission `Mail.Send`) can send as **any** mailbox — scope it tightly if
  ever used; default to **SES** for transactional mail.
