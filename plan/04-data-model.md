# 04 — Data Model

Relational (PostgreSQL via Prisma). Designed **Entra-ready** from day one so SSO/AD sync is purely
additive. Field types below are conceptual (Prisma/PG mapping noted where useful).

## Entity-relationship overview

```
User 1──* Goal *──1 MetricDefinition
User 1──* MentorRelationship *──1 User        (mentee ── mentor edge, time-bounded)
User 1──* ReviewCycle (as mentee)             ReviewCycle *──1 User (mentor, snapshot)
ReviewCycle 1──2 ReviewSubmission             (self + mentor)
ReviewSubmission 1──* QuestionAnswer (4)
ReviewSubmission 1──* MetricRating (5) *──1 MetricDefinition
ReviewCycle 0..1── Meeting
User 1──* FeedbackRequest (as requester) ──1 User (target)  ; FeedbackRequest 1──* FeedbackResponse
User 1──* Appreciation (author)  *──* User (recipients)
User 1──* Notification
* AuditLog, DirectorySyncState, RatingScale/config tables
```

## Enums

| Enum | Values |
|---|---|
| `Role` | `admin`, `user` |
| `AuthSource` | `local`, `entra` |
| `RelationshipType` | `mentor` (Phase 2 may add `manager`) |
| `MetricKey` | `customer_satisfaction`, `public_speaking`, `deliverables`, `mentoring_activity`, `tech_community_events` |
| `GoalStatus` | `draft`, `active`, `at_risk`, `done`, `dropped` |
| `Visibility` | `public`, `restricted` (entity-specific rules in `05`) |
| `CycleScope` | `org_wide`, `individual` |
| `CycleStatus` | `not_started`, `goals_set`, `self_assessment_open`, `self_submitted`, `mentor_assessment_open`, `mentor_submitted`, `calibration`, `meeting_scheduled`, `meeting_held`, `released_to_employee`, `acknowledged`, `closed` |
| `AuthorSide` | `self`, `mentor` |
| `SubmissionStatus` | `draft`, `submitted` |
| `QuestionKey` | `overall_achievement`, `what_went_well`, `areas_to_improve`, `plan_next_year` |
| `FeedbackStatus` | `pending`, `completed`, `declined` |
| `NotificationChannel` | `in_app`, `email`, `teams` |
| `NotificationStatus` | `unread`, `read` |
| `MeetingStatus` | `scheduled`, `held`, `cancelled` |

## Entities

### User
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| entra_object_id | string? unique | Entra `oid`; null until SSO linked |
| tenant_id | string? | Entra `tid` |
| upn | string? | User principal name (Entra) |
| email | string unique | Login id for basic auth |
| displayName | string | |
| role | Role | enforced server-side |
| auth_source | AuthSource | `local` (MVP) → `entra` |
| passwordHash | string? | Argon2id; null for Entra-only |
| isActive | boolean | |
| manager_id | uuid? (FK→User) | AD manager (Phase 2); nullable |
| createdAt/updatedAt | timestamp | |

> Keep a **local mirror of AD attributes** so the app still works during brief AD/SSO downtime.

### MentorRelationship  *(the reviewing edge)*
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| menteeId | uuid (FK→User) | |
| mentorId | uuid (FK→User) | |
| type | RelationshipType | `mentor` |
| effectiveFrom | date | |
| effectiveTo | date? | null = current; **time-bounded** so reorgs don't rewrite history |

### MetricDefinition  *(seeded; the 5 metrics)*
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| key | MetricKey unique | |
| label | string | editable display name |
| description | string | |
| active | boolean | |

### Goal
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| ownerUserId | uuid (FK→User) | |
| metricId | uuid (FK→MetricDefinition) | |
| title / description | string | |
| target | string? | target value/text |
| cycleId | uuid? (FK→ReviewCycle) | optional tie to a cycle |
| status | GoalStatus | |
| visibility | Visibility | owner+mentor+admin (see `05`) |
| createdAt/updatedAt | timestamp | |

### ReviewCycle
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| scope | CycleScope | `org_wide` or `individual` |
| periodLabel | string | e.g. "2026" |
| menteeId | uuid (FK→User) | |
| mentorId | uuid (FK→User) | **snapshot of mentor at creation** |
| status | CycleStatus | drives the state machine |
| goalsDueDate / selfDueDate / mentorDueDate | date | self due before mentor due |
| meetingId | uuid? (FK→Meeting) | |
| openedAt / closedAt | timestamp? | |

> One cycle = one mentee/mentor pairing for one period. `mentorId` is snapshotted so a later
> reorg doesn't corrupt a past review.

### ReviewSubmission  *(two per cycle)*
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| cycleId | uuid (FK→ReviewCycle) | |
| authorUserId | uuid (FK→User) | |
| authorSide | AuthorSide | `self` or `mentor` |
| status | SubmissionStatus | |
| submittedAt | timestamp? | |
| lockedAt | timestamp? | set on submit → **immutable** |

Unique constraint: `(cycleId, authorSide)`.

### QuestionAnswer  *(4 per submission)*
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| submissionId | uuid (FK) | |
| questionKey | QuestionKey | the 4 fixed questions |
| answerText | text | |

Unique: `(submissionId, questionKey)`.

### MetricRating  *(5 per submission)*
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| submissionId | uuid (FK) | |
| metricId | uuid (FK→MetricDefinition) | |
| score | int (1–5) | |
| comment | text? | |
| scaleVersion | string | which rating-scale definition applied |

Unique: `(submissionId, metricId)`. Self vs mentor scores live in separate submissions →
**gap analysis** by joining on `(cycleId, metricId)`.

### FeedbackRequest / FeedbackResponse
**FeedbackRequest:** id, requesterUserId (FK), targetUserId (FK, "from anyone"), cycleId?,
prompt, status (FeedbackStatus), dueDate?, anonymity (bool), createdAt.
**FeedbackResponse:** id, requestId (FK), authorUserId (FK), body (text), visibility,
createdAt. *(Suppress display when a sole responder could be re-identified.)*

### Appreciation
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| authorUserId | uuid (FK→User) | |
| message | text | |
| metricTag | MetricKey? | optional link to a metric |
| visibility | Visibility | `public` |
| createdAt | timestamp | |

**AppreciationRecipient** join: `(appreciationId, recipientUserId)`.
**AppreciationReaction** (optional): `(appreciationId, userId, type)`.

### Notification
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| recipientUserId | uuid (FK→User) | |
| type | string | event type (see `05` catalog) |
| channel | NotificationChannel | `in_app`/`email`/`teams` |
| entityRef | json/string | what it points to (cycle/feedback/etc.) |
| status | NotificationStatus | |
| digestBatchId | uuid? | for batched emails |
| createdAt / readAt | timestamp | |

### Meeting (1:1 review call)
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| cycleId | uuid (FK→ReviewCycle) | |
| organizerUserId | uuid (FK→User) | the mentor |
| scheduledStart / scheduledEnd | timestamp | |
| teamsJoinUrl | string? | MVP: manual link; Phase 3: Graph `joinWebUrl` |
| onlineMeetingId | string? | Phase 3: Graph meeting id |
| status | MeetingStatus | |

### AuditLog
id, actorUserId (FK), action, entityType, entityId, timestamp, metadata(json). Written on rating
changes, visibility changes, releases, and admin actions.

### DirectorySyncState  *(Phase 2)*
id, deltaLink (string), lastSyncAt (timestamp). Stores the Graph `users/delta` token for
incremental sync.

### Config tables
- **RatingScale**: version, definitions(json of the 5 levels + anchors). Each `MetricRating`
  stores its `scaleVersion`.
- **CycleConfig** (optional): default window offsets so deadlines are data, not code.

## Constraints, indexes & integrity notes
- Unique: `User.email`, `User.entra_object_id`, `(ReviewSubmission cycleId, authorSide)`,
  `(QuestionAnswer submissionId, questionKey)`, `(MetricRating submissionId, metricId)`.
- Index foreign keys used in hot paths: `Goal.ownerUserId`, `ReviewCycle.menteeId/mentorId/status`,
  `Notification.recipientUserId+status`, `MentorRelationship.menteeId` (current = `effectiveTo IS NULL`).
- **Immutability:** once `ReviewSubmission.status = submitted` (lockedAt set), its answers/ratings
  are read-only — enforced in the service layer (and ideally a DB trigger/check).
- **Visibility** is enforced in services per the matrix in `05` — never client-only.
