import { describe, it, expect } from 'vitest';
import {
  CYCLE_TRANSITIONS,
  findTransition,
  nextAutoTransition,
  availableTransitions,
  statusAtOrAfter,
  cycleStatusIndex,
} from '@perf-tracker/shared';

describe('cycle state machine (pure)', () => {
  it('has unique (from,to) edges', () => {
    const keys = CYCLE_TRANSITIONS.map((t) => `${t.from}->${t.to}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('findTransition resolves legal edges and rejects illegal ones', () => {
    expect(findTransition('self_assessment_open', 'self_submitted')).toBeDefined();
    expect(findTransition('meeting_held', 'released_to_employee')).toBeDefined();
    // illegal: cannot jump straight from not_started to released
    expect(findTransition('not_started', 'released_to_employee')).toBeUndefined();
    // illegal: self_submitted cannot go directly to mentor_submitted
    expect(findTransition('self_submitted', 'mentor_submitted')).toBeUndefined();
  });

  it('makes calibration optional: mentor_submitted has both calibration and meeting_scheduled edges', () => {
    const outs = availableTransitions('mentor_submitted').map((t) => t.to);
    expect(outs).toContain('calibration');
    expect(outs).toContain('meeting_scheduled');
  });

  it('marks the two auto edges as system-only', () => {
    const selfAuto = findTransition('self_submitted', 'mentor_assessment_open');
    const closeAuto = findTransition('acknowledged', 'closed');
    expect(selfAuto?.auto).toBe(true);
    expect(selfAuto?.allowedActors).toEqual(['system']);
    expect(closeAuto?.auto).toBe(true);
    expect(nextAutoTransition('self_submitted')?.to).toBe('mentor_assessment_open');
    expect(nextAutoTransition('acknowledged')?.to).toBe('closed');
  });

  it('does not auto-chain non-auto states', () => {
    expect(nextAutoTransition('mentor_assessment_open')).toBeUndefined();
    expect(nextAutoTransition('meeting_held')).toBeUndefined();
  });

  it('only mentee may trigger self_submitted; only mentor may trigger mentor_submitted', () => {
    expect(findTransition('self_assessment_open', 'self_submitted')?.allowedActors).toEqual(['mentee']);
    expect(findTransition('mentor_assessment_open', 'mentor_submitted')?.allowedActors).toEqual(['mentor']);
  });

  it('only mentee may acknowledge a released review', () => {
    expect(findTransition('released_to_employee', 'acknowledged')?.allowedActors).toEqual(['mentee']);
  });

  it('statusAtOrAfter is monotonic across the lifecycle', () => {
    expect(statusAtOrAfter('released_to_employee', 'released_to_employee')).toBe(true);
    expect(statusAtOrAfter('acknowledged', 'released_to_employee')).toBe(true);
    expect(statusAtOrAfter('mentor_submitted', 'released_to_employee')).toBe(false);
    expect(cycleStatusIndex('closed')).toBeGreaterThan(cycleStatusIndex('not_started'));
  });
});
