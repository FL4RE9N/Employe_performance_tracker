import { describe, it, expect } from 'vitest';
import { daysUntil, thresholdFired, civilDateInTz } from './reminder.math';

// DATE columns arrive as UTC-midnight instants.
const date = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('reminder.math', () => {
  describe('daysUntil — civil-date, hour-insensitive (UTC)', () => {
    it('returns the calendar-day difference regardless of the hour the sweep runs', () => {
      const deadline = date('2026-06-08');
      for (const hour of ['00:30', '13:00', '23:30']) {
        const now = new Date(`2026-06-01T${hour}:00.000Z`);
        expect(daysUntil(now, deadline, 'UTC')).toBe(7);
      }
    });

    it('returns 0 on the deadline day and negatives after', () => {
      expect(daysUntil(new Date('2026-06-08T09:00:00Z'), date('2026-06-08'), 'UTC')).toBe(0);
      expect(daysUntil(new Date('2026-06-10T09:00:00Z'), date('2026-06-08'), 'UTC')).toBe(-2);
    });

    it('respects the reference timezone when computing "today"', () => {
      // 02:00Z on 2026-06-01 is still 2026-05-31 in New York -> one extra day until the deadline
      const now = new Date('2026-06-01T02:00:00.000Z');
      expect(daysUntil(now, date('2026-06-08'), 'UTC')).toBe(7);
      expect(daysUntil(now, date('2026-06-08'), 'America/New_York')).toBe(8);
    });

    it('is DST-safe across a spring-forward boundary', () => {
      // US DST begins 2026-03-08; count from civil 2026-03-01 to 2026-03-15 = 14 days.
      const now = new Date('2026-03-01T12:00:00.000Z');
      expect(daysUntil(now, date('2026-03-15'), 'America/New_York')).toBe(14);
    });
  });

  describe('thresholdFired', () => {
    it('T-N fires only when exactly N days remain', () => {
      expect(thresholdFired(30, 'T-30')).toBe(true);
      expect(thresholdFired(29, 'T-30')).toBe(false);
      expect(thresholdFired(3, 'T-3')).toBe(true);
      expect(thresholdFired(4, 'T-3')).toBe(false);
    });
    it('T-0 fires on the end day and every day after', () => {
      expect(thresholdFired(0, 'T-0')).toBe(true);
      expect(thresholdFired(-5, 'T-0')).toBe(true);
      expect(thresholdFired(1, 'T-0')).toBe(false);
    });
  });

  it('civilDateInTz extracts the local calendar date', () => {
    expect(civilDateInTz(new Date('2026-06-01T02:00:00Z'), 'America/New_York')).toEqual({
      y: 2026,
      m: 5,
      d: 31,
    });
  });
});
