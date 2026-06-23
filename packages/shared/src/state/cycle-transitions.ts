import { CYCLE_STATUS_VALUES } from '../enums';
import type { CycleStatus } from '../enums';

/**
 * The review-cycle state machine — the single source of truth shared by the API
 * (which ENFORCES it) and the web (which uses it to show available actions; the
 * server always re-checks). See plan/05 for the canonical transition table.
 *
 * There is no "mentor" Role — `CycleActorKind` is DERIVED per cycle by the API
 * (admin / the snapshot mentor / the mentee / the system for auto edges).
 */
export type CycleActorKind = 'admin' | 'mentor' | 'mentee' | 'system';

export interface TransitionDef {
  from: CycleStatus;
  to: CycleStatus;
  /** Who may trigger this edge. 'system' = internal auto-chaining only (never a raw HTTP call). */
  allowedActors: CycleActorKind[];
  /** Auto edges are chained internally by the engine after the triggering transition. */
  auto?: boolean;
}

export const CYCLE_TRANSITIONS: readonly TransitionDef[] = [
  { from: 'not_started', to: 'goals_set', allowedActors: ['mentee', 'admin'] },
  { from: 'goals_set', to: 'self_assessment_open', allowedActors: ['admin', 'system'] },
  { from: 'self_assessment_open', to: 'self_submitted', allowedActors: ['mentee'] },
  { from: 'self_submitted', to: 'mentor_assessment_open', allowedActors: ['system'], auto: true },
  { from: 'mentor_assessment_open', to: 'mentor_submitted', allowedActors: ['mentor'] },
  // calibration is optional: mentor_submitted can also go straight to meeting_scheduled
  { from: 'mentor_submitted', to: 'calibration', allowedActors: ['admin'] },
  { from: 'mentor_submitted', to: 'meeting_scheduled', allowedActors: ['mentor', 'admin'] },
  { from: 'calibration', to: 'meeting_scheduled', allowedActors: ['mentor', 'admin'] },
  { from: 'meeting_scheduled', to: 'meeting_held', allowedActors: ['mentor', 'admin'] },
  { from: 'meeting_held', to: 'released_to_employee', allowedActors: ['mentor', 'admin'] },
  { from: 'released_to_employee', to: 'acknowledged', allowedActors: ['mentee'] },
  { from: 'acknowledged', to: 'closed', allowedActors: ['admin', 'system'], auto: true },
] as const;

/** The matching transition for from→to, or undefined if the edge is illegal. */
export function findTransition(
  from: CycleStatus,
  to: CycleStatus,
): TransitionDef | undefined {
  return CYCLE_TRANSITIONS.find((t) => t.from === from && t.to === to);
}

/** All edges leaving `from` (used by the web to render available actions). */
export function availableTransitions(from: CycleStatus): TransitionDef[] {
  return CYCLE_TRANSITIONS.filter((t) => t.from === from);
}

/** The single auto edge leaving `from`, if any (used by the engine to chain). */
export function nextAutoTransition(from: CycleStatus): TransitionDef | undefined {
  return CYCLE_TRANSITIONS.find((t) => t.from === from && t.auto === true);
}

/** Position of a status in the canonical lifecycle order. */
export function cycleStatusIndex(status: CycleStatus): number {
  return CYCLE_STATUS_VALUES.indexOf(status);
}

/** True iff `status` is at or beyond `target` in the lifecycle (monotonic; calibration is optional). */
export function statusAtOrAfter(status: CycleStatus, target: CycleStatus): boolean {
  return cycleStatusIndex(status) >= cycleStatusIndex(target);
}
