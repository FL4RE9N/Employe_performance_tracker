import { describe, it, expect, vi } from 'vitest';
import { ReminderService } from './reminder.service';

const MENTEE = 'mentee-id';
const MENTOR = 'mentor-id';
const date = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function build(cycleOverrides: Record<string, unknown>) {
  const cycle = {
    id: 'c1',
    menteeId: MENTEE,
    mentorId: MENTOR,
    status: 'self_assessment_open',
    cycleEndDate: date('2026-09-01'),
    mentorDueDate: date('2026-08-15'),
    selfDueDate: date('2026-08-10'),
    meetingId: null,
    submissions: [] as Array<{ authorSide: string; status: string }>,
    ...cycleOverrides,
  };
  const prisma: any = {
    reviewCycle: { findMany: vi.fn(() => Promise.resolve([cycle])) },
    cycleConfig: { findUnique: vi.fn(() => Promise.resolve(null)) }, // default UTC tz
  };
  const notifications: any = {
    create: vi.fn(() => Promise.resolve()),
    sendDailyDigests: vi.fn(() => Promise.resolve({ usersEmailed: 0, itemsBatched: 0 })),
  };
  return { service: new ReminderService(prisma, notifications), notifications };
}

const created = (n: any) => n.create.mock.calls.map((c: any) => c[0]);
const typesOf = (n: any) => created(n).map((c: any) => c.type);

describe('ReminderService.runSweep — reminder-timing invariant', () => {
  it('fires cycle_ending to the mentor exactly 30 days before the cycle end', async () => {
    const { service, notifications } = build({ cycleEndDate: date('2026-07-01') });
    await service.runSweep({ now: new Date('2026-06-01T12:00:00Z') });
    const ending = created(notifications).filter((c: any) => c.type === 'cycle_ending');
    expect(ending).toHaveLength(1);
    expect(ending[0]).toMatchObject({ recipientUserId: MENTOR, reminderKey: 'cycle_ending:T-30:c1' });
    expect(ending[0].entityRef.threshold).toBe('T-30');
  });

  it('does not fire cycle_ending on an off day (T-29)', async () => {
    const { service, notifications } = build({ cycleEndDate: date('2026-07-01') });
    await service.runSweep({ now: new Date('2026-06-02T12:00:00Z') });
    expect(typesOf(notifications)).not.toContain('cycle_ending');
  });

  it('fires schedule_call on/after the end when no meeting is scheduled', async () => {
    const { service, notifications } = build({ cycleEndDate: date('2026-07-01'), status: 'mentor_submitted' });
    await service.runSweep({ now: new Date('2026-07-03T12:00:00Z') });
    const call = created(notifications).find((c: any) => c.type === 'schedule_call');
    expect(call).toMatchObject({ recipientUserId: MENTOR, reminderKey: 'schedule_call:T-0:c1' });
  });

  it('does NOT fire schedule_call once a meeting is scheduled', async () => {
    const { service, notifications } = build({
      cycleEndDate: date('2026-07-01'),
      status: 'meeting_scheduled',
      meetingId: 'm1',
    });
    await service.runSweep({ now: new Date('2026-07-03T12:00:00Z') });
    expect(typesOf(notifications)).not.toContain('schedule_call');
  });

  it('nudges only the non-submitter ~3 days before the self due date', async () => {
    const a = build({ selfDueDate: date('2026-06-04'), submissions: [] });
    await a.service.runSweep({ now: new Date('2026-06-01T12:00:00Z') });
    expect(created(a.notifications).find((c: any) => c.reminderKey === 'self_due:T-3:c1')).toMatchObject({
      recipientUserId: MENTEE,
      type: 'self_assessment_due',
    });

    const b = build({ selfDueDate: date('2026-06-04'), submissions: [{ authorSide: 'self', status: 'submitted' }] });
    await b.service.runSweep({ now: new Date('2026-06-01T12:00:00Z') });
    expect(created(b.notifications).find((c: any) => c.reminderKey === 'self_due:T-3:c1')).toBeUndefined();
  });

  it('returns activeCycles + ranAt + remindersSent + digest, and runs the digest', async () => {
    const { service, notifications } = build({ cycleEndDate: date('2026-07-01') });
    const now = new Date('2026-06-01T12:00:00Z');
    const result = await service.runSweep({ now });
    expect(result.activeCycles).toBe(1);
    expect(result.ranAt).toBe(now.toISOString());
    expect(result.remindersSent).toBeGreaterThanOrEqual(1);
    expect(notifications.sendDailyDigests).toHaveBeenCalledOnce();
  });
});
