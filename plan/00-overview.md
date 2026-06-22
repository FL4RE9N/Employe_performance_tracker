# 00 — Overview

## What we're building

An internal web application for **employee performance & progress tracking**. Employees set
their own goals, track achievement across **5 fixed metrics**, give and request feedback, and
go through a **yearly mentor/mentee review cycle** that culminates in a 1-on-1 review call.
Admins get full visibility across the organization.

The product belongs to the **Continuous Performance Management (CPM)** category. Its closest
real-world analogues are **Lattice, 15Five, Leapsome, and Culture Amp**, which all converge on
the same blueprint:

> Goals + Reviews (self & manager) + Continuous Feedback + a Praise/Appreciation wall + 1-on-1s +
> Notifications, with directory/SSO integration and (for Microsoft shops) Teams touchpoints.

Every requirement from the senior maps directly onto this blueprint.

## Framing note

The brief said *"similar to 10x.team."* Research found the actual product at `https://10x.team/`
is **not** a performance-tracking tool — it's a European fractional-talent / AI-readiness
marketplace. So **"10x" is being used to mean a *10x performance culture***, not that specific
product. We design against the CPM blueprint above. If the senior actually meant the literal
10x.team product, the requirements would need to be revisited — but the detailed feature list
(goals, metrics, mentor/mentee reviews, appreciation, feedback) is unambiguously CPM.

## Goals (what success looks like)

1. Every employee can set goals against the 5 metrics and see their own progress.
2. Mentors and mentees complete a structured yearly review with **no surprises** (evidence-based,
   symmetric self vs. mentor assessment, revealed only after both submit).
3. Recognition and feedback flow continuously, not just at year-end.
4. Admins can see all goals and track review-cycle completion across the org.
5. The system is **trustworthy with sensitive data** — ratings are visible only to the right
   people, always enforced server-side.

## Non-goals (for now)

- Full HRIS / payroll / compensation management.
- Free-form OKRs beyond the 5 fixed metric categories (can be added later).
- Deep people-analytics / sentiment dashboards (MVP ships a lightweight admin roll-up only).
- A native mobile app (responsive web only).
- Multi-tenant SaaS for external customers (single internal tenant).

## Personas

| Persona | Who | Primary needs |
|---|---|---|
| **Employee (mentee)** | Any staff member | Set goals, track 5 metrics, request/give feedback, post & read appreciation, complete the yearly self-assessment, see released review + acknowledge |
| **Mentor** | An employee assigned to mentor others (may also be a manager) | Get reminded of mentees' cycle ends, complete the mentor assessment, schedule/run the review call, see mentees' goals & progress |
| **Admin** | HR / People-ops / system owner | Manage users & roles, assign mentor↔mentee pairings, launch review cycles (org-wide or individual), see all goals, monitor completion & rating distribution |

> A person can be both an employee and a mentor. Mentor is a relationship, not a separate account type.

## Scope summary

**In scope (across phases):** authentication & roles; org + mentor structure; goals; 5-metric
tracking; yearly review cycle with symmetric forms & lock-before-reveal; 1-on-1 review-call
scheduling; feedback requests from anyone; company-wide appreciation wall; notifications
(in-app + email, later Teams); admin dashboard; Microsoft Entra SSO + AD org sync (later);
real Teams meeting creation (later).

**Phased delivery** (full detail in `06-roadmap.md`):

- **Phase 0 — Foundations:** infra, scaffolding, auth skeleton, schema + seed.
- **Phase 1 — MVP (basic auth):** all core features with admin-managed users/pairings and
  in-app Teams-link scheduling.
- **Phase 2 — Microsoft identity:** Entra SSO + AD directory/manager sync + app-role mapping.
- **Phase 3 — Teams & advanced:** real Graph Teams meetings, Teams notifications, optional
  calibration, deeper analytics.

## Glossary

| Term | Meaning |
|---|---|
| **Metric** | One of the 5 fixed performance dimensions (see `01-requirements.md`). |
| **Goal** | An employee-defined objective tied to a metric (and optionally a cycle). |
| **Mentor / Mentee** | The reviewing relationship. The mentor reviews the mentee in the cycle. |
| **Manager** | The org-chart supervisor from Active Directory (Phase 2). May or may not be the mentor. |
| **Review cycle** | A time-boxed review for one mentee, ending in a review call. Has a state machine. |
| **Submission** | One side's filled-in review (4 questions + 5 metric ratings). Two per cycle: self + mentor. |
| **Lock-before-reveal** | A submission becomes immutable when submitted; neither side sees the other until both are submitted. |
| **Acknowledgement** | The employee confirming they've *seen* the released review (not necessarily that they agree). |
| **Appreciation / kudos** | A public shout-out on the company-wide wall. |
