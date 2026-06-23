import type { ReminderThreshold } from '@perf-tracker/shared';

/**
 * Reminder-timing math (the critical invariant). Deadlines are DATE columns —
 * Prisma returns them as UTC-midnight instants whose UTC calendar date IS the
 * intended end-of-day date in the org's reference timezone. "Today" is the civil
 * date of `now` in that reference timezone. We compare CIVIL DATES (not raw ms),
 * so the result is independent of the hour the 2 AM sweep runs and DST-safe.
 */

interface CivilDate {
  y: number;
  m: number; // 1-12
  d: number;
}

/** The civil (calendar) date of an instant in the given IANA timezone. */
export function civilDateInTz(instant: Date, tz: string): CivilDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get('year'), m: get('month'), d: get('day') };
}

/** The calendar date encoded by a DATE column (stored at UTC midnight). */
export function civilDateFromDateColumn(d: Date): CivilDate {
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}

function toUtcDays(c: CivilDate): number {
  return Date.UTC(c.y, c.m - 1, c.d) / 86_400_000;
}

/**
 * Whole civil days from `now` (in `tz`) until the `deadline` DATE.
 * 7 means the deadline is 7 calendar days away; 0 means today; negative = past.
 */
export function daysUntil(now: Date, deadline: Date, tz: string): number {
  const today = civilDateInTz(now, tz);
  const due = civilDateFromDateColumn(deadline);
  return Math.round(toUtcDays(due) - toUtcDays(today));
}

export const CYCLE_END_THRESHOLDS: ReadonlyArray<{ threshold: ReminderThreshold; days: number }> = [
  { threshold: 'T-30', days: 30 },
  { threshold: 'T-14', days: 14 },
  { threshold: 'T-7', days: 7 },
  { threshold: 'T-3', days: 3 },
  { threshold: 'T-0', days: 0 }, // schedule-call CTA: fires on the end day and after
];

/** Does a given threshold fire for this days-until-end value? T-0 fires on/after the end. */
export function thresholdFired(daysUntilEnd: number, threshold: ReminderThreshold): boolean {
  if (threshold === 'T-0') return daysUntilEnd <= 0;
  const days = CYCLE_END_THRESHOLDS.find((t) => t.threshold === threshold)?.days;
  return days !== undefined && daysUntilEnd === days;
}
