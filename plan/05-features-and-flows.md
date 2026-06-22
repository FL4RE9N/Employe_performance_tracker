# 05 — Features & Flows

## Information architecture

Top-level areas (mirrors proven CPM tools): **Home (tasks)** · **Goals** · **Reviews/Cycle** ·
**Feedback** · **Appreciation** · **1-on-1s** · **Notifications** · **Admin**.

**Task-driven Home:** surface "what's due" (review to complete, feedback requested of you, your
mentee's cycle ending) as actionable cards — don't bury them in menus.

---

## 1. Auth & roles
- **MVP:** email/password → server session cookie. Roles `admin`/`user`.
- **Flow:** sign in → land on task-driven Home scoped to role.
- **Later:** Entra SSO replaces the credential step; the rest is unchanged.

## 2. Org & mentor structure
- **MVP:** Admin creates users and assigns mentor↔mentee pairings (`MentorRelationship`).
- **Reviewer = assigned mentor** (may differ from AD manager).
- **Later:** AD sync fills `manager_id` + users; mentor can default to manager but stay overridable.

## 3. Goals
- **Flow:** user → Goals → "New goal" → pick a metric, title, description, target, (optional) cycle → save → track status.
- Owner edits own goals; **mentor** sees their mentees' goals; **admin** sees **all** goals (roll-up).

## 4. Metric tracking
- The 5 metrics are the categories for goals and for review ratings. Progress visible to owner + mentor + admin.

## 5. Review cycle (core) — the state machine

```
not_started → goals_set → self_assessment_open → self_submitted (LOCKED)
  → mentor_assessment_open → mentor_submitted → [calibration?]
  → meeting_scheduled → meeting_held → released_to_employee → acknowledged → closed
```

### Transition table

| From → To | Trigger | Side effects |
|---|---|---|
| `not_started → goals_set` | Mentee sets goals (or admin opens) | — |
| `goals_set → self_assessment_open` | `selfDueDate` window opens | Notify mentee (task: complete self-assessment) |
| `self_assessment_open → self_submitted` | **Mentee submits** | Submission **locked/immutable**; notify mentor that mentor-assessment is open |
| `self_submitted → mentor_assessment_open` | auto | Mentor task created |
| `mentor_assessment_open → mentor_submitted` | **Mentor submits** | Submission locked; **both sides now revealable** (comparison unlocked) |
| `mentor_submitted → calibration` *(optional)* | Admin runs calibration | Adjustments recorded in AuditLog; **not** visible to employee |
| `… → meeting_scheduled` | Mentor schedules the 1:1 | Create `Meeting`; notify both; (Phase 3: create Teams meeting) |
| `meeting_scheduled → meeting_held` | After the call / mentor marks held | — |
| `meeting_held → released_to_employee` | Mentor/admin releases | Employee can now **see** the mentor's ratings/review; notify employee |
| `released_to_employee → acknowledged` | **Employee acknowledges** | Store timestamp + optional comment (**acknowledgement ≠ agreement**) |
| `acknowledged → closed` | auto/admin | Cycle archived |

### Key rules
- **Mentee first, locked:** mentee completes the 4 questions + 5 metric ratings; **locked on submit**
  so the mentor isn't anchored by the self-rating.
- **Mentor independently:** same 4 questions + 5 ratings.
- **Reveal only after both submit** → side-by-side comparison; *then* schedule/hold the call.
- **No early leakage:** the mentor's ratings are hidden from the employee until `released_to_employee`
  (enforced in API responses *and* notifications).

### Reminder schedule (anchored to the mentee's cycle end)
- **Mentor escalation:** T-30, T-14, T-7, T-3, then on/after cycle end → **"Schedule review call"** CTA.
- **Due-date nudges:** ~3 days before `selfDueDate` / `mentorDueDate`, to **non-submitters only**.
- Runs from the daily EventBridge→Lambda sweep; idempotent (dedupe per cycle+threshold).

## 6. 1-on-1 review call (Teams)
- **MVP:** mentor schedules a time and pastes a Teams link → stored on `Meeting`; notifications +
  reminders sent.
- **Phase 3:** create a real Teams meeting via Graph `onlineMeetings` (delegated `/me/onlineMeetings`
  first; app-only requires an **application access policy**), store `joinWebUrl` + `onlineMeetingId`.
- The meeting view auto-pulls the 4-question + 5-metric comparison and current goals as the agenda.

## 7. Feedback from anyone
- **Flow:** user → "Request feedback" → pick **any** colleague (directory) → optional prompt + due
  date → request lands in recipient's tasks + notification → recipient submits or declines.
- Responses **attributed by default**, optional confidentiality; **suppress** display when a sole
  responder could be re-identified. Optionally tie a request to a goal/cycle so it informs the review.

## 8. Appreciation wall
- **Flow:** one box + @mention recipient(s) + message + optional metric tag → posts to a public
  reverse-chronological feed everyone sees; optional reactions; recipient notified.
- Kept **separate from formal ratings** (recognition, not a scored input — though tags can surface
  as supporting evidence). Admin can remove inappropriate posts.

## 9. Notifications
- In-app live (SSE) + email (SES). **Phase 3:** Teams (activity feed / Workflows card).
- **Anti-fatigue:** digest batching, priority routing (critical → email+in-app; low → in-app/digest),
  nudge only non-actors, per-user channel/frequency preferences.

### Notification event catalog
| Event | Recipient | Default channel |
|---|---|---|
| Self-assessment due | Mentee | in-app + email |
| Mentor-assessment open / due | Mentor | in-app + email |
| Mentee cycle ending (T-30/14/7/3/end) | Mentor | in-app + email (escalating) |
| Cycle ended → schedule call | Mentor | in-app + email |
| Meeting scheduled | Both | in-app + email |
| Review released | Mentee | in-app + email |
| Feedback requested of you | Recipient | in-app + email |
| Feedback submitted | Requester | in-app |
| Appreciation received | Recipient | in-app (+ digest) |

## 10. Admin dashboard
- All goals (org-wide), review-cycle completion status, per-metric and **rating-distribution**
  roll-ups (to spot inflation/central-tendency). **No forced curve.** User/role/pairing management
  and cycle launching live here.

---

## Visibility matrix (enforced server-side)

| Entity | Owner/Subject | Mentor (their mentees) | Other users | Admin |
|---|---|---|---|---|
| Own goals | ✅ edit | ✅ read | ❌ | ✅ read (all) |
| Self-assessment (pre-reveal) | ✅ | ❌ until both submitted | ❌ | ✅ |
| Mentor assessment (pre-release) | ❌ until released | ✅ | ❌ | ✅ |
| Released review | ✅ | ✅ | ❌ | ✅ |
| Feedback responses | requester (+subject if set) | as applicable | ❌ | ✅ |
| Appreciation | ✅ | ✅ | ✅ | ✅ |
| Notifications | recipient only | — | ❌ | own only |
| Admin dashboard | ❌ | ❌ | ❌ | ✅ |

**Rule of thumb:** a mentee's ratings/review = mentee + their mentor + admin only; goals = owner +
mentor + admin; appreciation = everyone. Self-rating hidden from mentor until the mentor submits;
mentor rating hidden from employee until release.
