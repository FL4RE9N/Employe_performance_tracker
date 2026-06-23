import { describe, it, expect, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import type { EntityRef } from '@perf-tracker/shared';

const REF: EntityRef = { entity: 'cycle', id: 'c1', cycleId: 'c1' };

function makeService(opts: { pref?: any; createManyCount?: number } = {}) {
  const prisma: any = {
    notification: {
      create: vi.fn(({ data }: any) =>
        Promise.resolve({ id: 'n1', status: 'unread', createdAt: new Date(), readAt: null, ...data }),
      ),
      createMany: vi.fn(() => Promise.resolve({ count: opts.createManyCount ?? 1 })),
      findUnique: vi.fn(() =>
        Promise.resolve({
          id: 'n1',
          type: 'cycle_ending',
          channel: 'in_app',
          entityRef: REF,
          status: 'unread',
          createdAt: new Date(),
          readAt: null,
        }),
      ),
      findMany: vi.fn(() => Promise.resolve([])),
      updateMany: vi.fn(() => Promise.resolve({ count: 1 })),
      count: vi.fn(() => Promise.resolve(0)),
    },
    notificationPreference: {
      findUnique: vi.fn(() => Promise.resolve(opts.pref ?? null)),
      upsert: vi.fn(),
    },
    user: { findUnique: vi.fn(() => Promise.resolve({ email: 'u@x.local' })) },
  };
  const bus: any = { publish: vi.fn() };
  const mailer: any = { sendMail: vi.fn(() => Promise.resolve()) };
  return { svc: new NotificationService(prisma, bus, mailer), prisma, bus, mailer };
}

describe('NotificationService.create — routing', () => {
  it('critical event: persists in-app, publishes to the bus, and emails immediately', async () => {
    const { svc, prisma, bus, mailer } = makeService();
    await svc.create({ recipientUserId: 'u', type: 'review_released', entityRef: REF });
    expect(prisma.notification.create).toHaveBeenCalledOnce();
    expect(bus.publish).toHaveBeenCalledOnce();
    expect(mailer.sendMail).toHaveBeenCalledOnce();
  });

  it('low in-app-only event (feedback_submitted): no email', async () => {
    const { svc, bus, mailer } = makeService();
    await svc.create({ recipientUserId: 'u', type: 'feedback_submitted', entityRef: { entity: 'feedbackRequest', id: 'f' } });
    expect(bus.publish).toHaveBeenCalledOnce();
    expect(mailer.sendMail).not.toHaveBeenCalled();
  });

  it('low + daily pref (appreciation_received): queues a digest email row, does not send now', async () => {
    const { svc, prisma, mailer } = makeService({ pref: { emailEnabled: true, digestFrequency: 'daily' } });
    await svc.create({ recipientUserId: 'u', type: 'appreciation_received', entityRef: { entity: 'appreciation', id: 'a' } });
    expect(mailer.sendMail).not.toHaveBeenCalled();
    // an email row was queued for the digest (channel email)
    const queuedEmail = prisma.notification.createMany.mock.calls.some(
      (c: any) => c[0].data[0].channel === 'email',
    );
    expect(queuedEmail).toBe(true);
  });

  it('respects emailEnabled=false even for critical events', async () => {
    const { svc, mailer } = makeService({ pref: { emailEnabled: false, digestFrequency: 'immediate' } });
    await svc.create({ recipientUserId: 'u', type: 'review_released', entityRef: REF });
    expect(mailer.sendMail).not.toHaveBeenCalled();
  });

  it('is idempotent for reminders: when the in-app row already exists, nothing is re-sent', async () => {
    const { svc, prisma, bus, mailer } = makeService({ createManyCount: 0 });
    await svc.create({ recipientUserId: 'u', type: 'cycle_ending', entityRef: REF, reminderKey: 'cycle_ending:T-7:c1' });
    expect(prisma.notification.createMany).toHaveBeenCalledOnce(); // the in-app attempt
    expect(bus.publish).not.toHaveBeenCalled();
    expect(mailer.sendMail).not.toHaveBeenCalled();
  });

  it('still delivers the in-app notification if the email send throws', async () => {
    const { svc, prisma, bus, mailer } = makeService();
    mailer.sendMail.mockRejectedValueOnce(new Error('smtp down'));
    await expect(
      svc.create({ recipientUserId: 'u', type: 'review_released', entityRef: REF }),
    ).resolves.toBeUndefined();
    expect(prisma.notification.create).toHaveBeenCalledOnce();
    expect(bus.publish).toHaveBeenCalledOnce();
  });
});

describe('NotificationService reads (recipient-only)', () => {
  it('markRead on a notification the user does not own throws NotFound', async () => {
    const { svc, prisma } = makeService();
    prisma.notification.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(svc.markRead('u', 'n-other')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('sendDailyDigests batches a user’s queued email rows into one send', async () => {
    const { svc, prisma, mailer } = makeService();
    prisma.notification.findMany.mockResolvedValueOnce([
      { id: 'e1', recipientUserId: 'u', type: 'appreciation_received', entityRef: { entity: 'appreciation', id: 'a' } },
      { id: 'e2', recipientUserId: 'u', type: 'feedback_submitted', entityRef: { entity: 'feedbackRequest', id: 'f' } },
    ]);
    const res = await svc.sendDailyDigests(new Date('2026-06-01T02:00:00Z'));
    expect(mailer.sendMail).toHaveBeenCalledOnce();
    expect(res).toEqual({ usersEmailed: 1, itemsBatched: 2 });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ digestBatchId: expect.any(String) }) }),
    );
  });
});
