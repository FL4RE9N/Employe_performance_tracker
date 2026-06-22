# 01 — Requirements

This file formalizes the senior's raw notes into structured requirements. The traceability table
at the end shows that **every raw note is captured**.

## The 5 metrics (fixed)

These are seeded as data (`MetricDefinition`), so labels can change without code changes.

| Key | Label | What it captures |
|---|---|---|
| `customer_satisfaction` | Customer satisfaction | Quality of service to internal/external customers |
| `public_speaking` | Public speaking | Talks, presentations, demos, conference/webinar speaking |
| `deliverables` | Deliverables | Output quality & delivery against commitments |
| `mentoring_activity` | Mentee / Mentor activity | Coaching, mentoring, being a mentee — development relationships |
| `tech_community_events` | Technical community events | Participation in/organizing tech community events |

## The 4 review questions (fixed)

Answered by **both** the mentee and the mentor, independently, each cycle:

1. **Overall achievement** (`overall_achievement`)
2. **What went well** (`what_went_well`)
3. **Areas that need improvement** (`areas_to_improve`)
4. **Plan for next year** (`plan_next_year`)

## The rating scale (fixed, 1–5)

Shown in the UI with its behavioral anchor inline so raters apply it consistently. `5` is
reserved for genuinely exceptional performance. The scale is **version-stamped** on each stored
rating so historical scores stay interpretable if definitions ever change.

| Score | Label | Anchor (guidance shown to rater) |
|---|---|---|
| 1 | Poor | Consistently below expectations; significant concerns |
| 2 | Below average | Falls short of expectations in important areas |
| 3 | On track | Meets expectations reliably |
| 4 | Moving forward | Exceeds expectations; clearly growing |
| 5 | Exceeded expectations | Exceptional, rare-level impact |

---

## Functional requirements

### FR-1 Authentication & roles
- FR-1.1 Users sign in. **MVP:** email + password (Argon2id hashing, session cookie). **Later:** Microsoft Entra ID SSO.
- FR-1.2 Two roles: **admin** and **user**. Roles enforced **server-side**.
- FR-1.3 Admin manages user accounts and role assignment (MVP). **Later:** roles sourced from Entra app roles.
- FR-1.4 The data model is Entra-ready from day one (nullable `entra_object_id`, `tenant_id`, `auth_source`) so SSO is additive.

### FR-2 Organization & mentor structure
- FR-2.1 The system models a managerial structure. **MVP:** admin assigns mentor↔mentee pairings. **Later:** AD `manager`/`directReports` sync.
- FR-2.2 The **reviewer is the assigned mentor**, which may differ from the AD manager (mentor defaults to manager once AD sync exists, but can be overridden).
- FR-2.3 Mentor relationships are **time-bounded edges** (effectiveFrom/effectiveTo), so reorgs don't rewrite history.

### FR-3 Goals
- FR-3.1 A user can **set their own goals**, each tied to one of the 5 metrics (and optionally a cycle/period).
- FR-3.2 A user can edit/track progress/status on their goals.
- FR-3.3 **Admin can see ALL goals** across the org (roll-up view).
- FR-3.4 A user's mentor can see that mentee's goals.

### FR-4 Metric tracking
- FR-4.1 The 5 metrics are the fixed categories for goals and for review ratings.
- FR-4.2 Metric progress is visible to the owner, their mentor, and admin.

### FR-5 Review cycle (core)
- FR-5.1 Admin can launch a review cycle as **org-wide** (everyone, shared window) **or** **individual** (one mentee, own dates).
- FR-5.2 Each cycle has windows/deadlines: `goalsDueDate`, `selfDueDate`, `mentorDueDate` (self due before mentor due).
- FR-5.3 **Before the call**, the **mentee** answers the 4 questions **and** rates the 5 metrics; this is **locked on submit**.
- FR-5.4 **Before the call**, the **mentor** independently answers the same 4 questions **and** rates the same 5 metrics.
- FR-5.5 **Lock-before-reveal:** neither side sees the other's answers until **both** have submitted; then a side-by-side comparison is shown.
- FR-5.6 The cycle follows an explicit **state machine** (see `05-features-and-flows.md`).
- FR-5.7 After the meeting, the review is **released to the employee**, who must **acknowledge** (acknowledgement ≠ agreement; optional comment captured).
- FR-5.8 Self & mentor ratings are stored separately per metric to enable **gap analysis**.

### FR-6 Review reminders
- FR-6.1 The **mentor is reminded** as a mentee's cycle end approaches: escalating at **T-30 / T-14 / T-7 / T-3**, then on/after the cycle end.
- FR-6.2 When the cycle ends, the app presents a **"Schedule review call"** action to the mentor.
- FR-6.3 Non-submitters are nudged ~3 days before each due date; **only people who haven't acted** are nudged.

### FR-7 1-on-1 review call (Teams)
- FR-7.1 From a ready/ended cycle, the mentor can **schedule a 1-on-1 review call**.
- FR-7.2 **MVP:** store the scheduled time + a (manually pasted) Teams link on the review record; send notifications/reminders.
- FR-7.3 **Later (Phase 3):** create a real Microsoft Teams meeting via Graph and store its `joinWebUrl`.

### FR-8 Feedback from anyone
- FR-8.1 An employee can **request feedback from any colleague** (optional prompt + due date).
- FR-8.2 The request appears in the recipient's task list with a notification; recipient can submit or decline.
- FR-8.3 Responses are **attributed by default**, with an option for confidentiality; a sole-responder case is **not displayed** in a way that re-identifies the author.
- FR-8.4 (Optional) A mentor can request feedback about a mentee from peers.

### FR-9 Appreciation wall
- FR-9.1 Anyone can **post appreciation** to one or more colleagues; **everyone can see** the wall.
- FR-9.2 Posts are a reverse-chronological feed: author, recipient(s), message, optional metric tag, optional reactions.
- FR-9.3 Posting is low-friction (one box + @mention).
- FR-9.4 Admin can remove inappropriate posts (light moderation).

### FR-10 Notifications
- FR-10.1 **Notifications for everyone**, in-app (live via SSE) and by email.
- FR-10.2 Event types: review task due, your mentee's cycle ending, feedback requested of you, appreciation received, meeting scheduled, review released.
- FR-10.3 **Anti-fatigue:** digest batching, priority routing, nudge only non-actors, per-user channel/frequency preferences.
- FR-10.4 **Later (Phase 3):** Teams notifications (Graph activity feed / Power Automate Workflows card).

### FR-11 Admin dashboard
- FR-11.1 Admin sees all goals, review-cycle completion status, and per-metric / rating-distribution roll-ups.
- FR-11.2 Distribution views help spot inflation / central-tendency — **no forced curve** is imposed.

---

## Non-functional requirements

| Area | Requirement |
|---|---|
| **Security** | Argon2id password hashing; httpOnly/Secure/SameSite session cookies; CSRF protection; rate-limited auth; all authz enforced server-side. |
| **Privacy** | Per-entity visibility rules (see `05`), enforced in the API, never client-only. Ratings never leak before release. |
| **Auditability** | `AuditLog` for changes to ratings, visibility, and admin actions (fairness/compliance). |
| **Availability** | Internal-tool SLA; graceful degradation if Microsoft/AD is briefly unreachable (local AD mirror). |
| **Performance** | Typical pages < 300 ms server time; review/comparison views handle a full org. |
| **Scalability** | Designed for org-scale (hundreds–low thousands of users); scale-to-zero infra keeps idle cost ~$0. |
| **Time/zones** | Deadlines stored as end-of-day in one reference timezone with a short (~24h) grace window. |
| **Accessibility** | WCAG 2.1 AA targets (semantic HTML, keyboard nav, contrast). |
| **Observability** | Structured logs, alarms on errors and email bounce/complaint rates. |
| **Maintainability** | One TypeScript codebase, modular boundaries, shared types, tests on critical invariants. |

---

## Roles & permissions matrix

| Capability | User | Mentor (for their mentees) | Admin |
|---|---|---|---|
| Set/track own goals | ✅ | ✅ | ✅ |
| See another user's goals | ❌ | ✅ (mentees only) | ✅ (all) |
| Complete self-assessment | ✅ | ✅ | ✅ |
| Complete mentor assessment | — | ✅ (mentees only) | — |
| See a mentee's ratings/review | own only | ✅ (mentees only) | ✅ (all) |
| Request feedback from anyone | ✅ | ✅ | ✅ |
| Post/read appreciation | ✅ | ✅ | ✅ |
| Remove appreciation post | own only | own only | ✅ (any) |
| Launch review cycles | ❌ | ❌ | ✅ |
| Schedule the review call | — | ✅ | ✅ |
| Manage users/roles/pairings | ❌ | ❌ | ✅ |
| View admin dashboard | ❌ | ❌ | ✅ |

---

## Traceability — raw notes → requirements

| Raw note (senior) | Captured as |
|---|---|
| "employee progress tracking, set goals, track achievement" | FR-3, FR-4 |
| "5 metrics: Customer satisfaction, Public speaking, Deliverables, Mentee/mentor, Technical community events" | The 5 metrics |
| "2 login: admin, user login" | FR-1.2 |
| "User can set their own goals, admin can see all the goals" | FR-3.1, FR-3.3 |
| "Common appreciation place… everyone can see" | FR-9 |
| "Roles get from AD. Microsoft SSO login. Managerial structure needed." | FR-1.1/1.3, FR-2 (Phase 2) |
| "Set 1-on-1 call on Teams" | FR-7 |
| "Employee can ask feedback from anyone" | FR-8 |
| "Notification for everyone" | FR-10 |
| "Yearly rating for mentor mentee" | FR-5 |
| "Mentor reminded when mentee review cycle going to over; when over, option to schedule a call" | FR-6 |
| "Before call mentee answers 4 questions + completes 5 metrics" | FR-5.3 |
| "Before call mentor answers 4 questions + completes 5 metrics" | FR-5.4 |
| "4 questions: overall achievement / what went well / areas to improve / plan for next year" | The 4 questions |
| "For now basic auth ok" | FR-1.1 (MVP basic auth) |
| "Rating 1 poor … 5 exceeded expectation" | The rating scale |
| "Manager/mentor form" | FR-5.4, FR-2.2 |
