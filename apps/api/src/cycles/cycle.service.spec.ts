import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CycleService } from './cycle.service';
import type { SessionUser, CycleActorKind } from '@perf-tracker/shared';

const MENTEE = 'mentee-id';
const MENTOR = 'mentor-id';

function actor(id: string, role: SessionUser['role'] = 'user'): SessionUser {
  return { id, email: `${id}@x.local`, displayName: id, role };
}

function cycleRow(status: string, overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    scope: 'individual',
    periodLabel: '2026',
    menteeId: MENTEE,
    mentorId: MENTOR,
    status,
    goalsDueDate: new Date('2026-01-01'),
    selfDueDate: new Date('2026-06-01'),
    mentorDueDate: new Date('2026-06-15'),
    cycleEndDate: null,
    openedAt: null,
    closedAt: null,
    releasedAt: null,
    acknowledgedAt: null,
    acknowledgementComment: null,
    meetingId: null,
    meeting: null,
    mentee: { displayName: 'Mentee' },
    mentor: { displayName: 'Mentor' },
    ...overrides,
  };
}

function makeDeps(opts: {
  status: string;
  kind: CycleActorKind | null;
  submission?: { status: string; answers: number; ratings: number };
  cycleOverrides?: Record<string, unknown>;
}) {
  const row = cycleRow(opts.status, opts.cycleOverrides);
  const prisma: any = {
    $transaction: vi.fn(async (cb: any) => cb(prisma)),
    reviewCycle: {
      findUnique: vi.fn(() => Promise.resolve(row)),
      update: vi.fn(() => Promise.resolve(row)),
    },
    reviewSubmission: {
      createMany: vi.fn(() => Promise.resolve({ count: 2 })),
      findUnique: vi.fn(() =>
        Promise.resolve(
          opts.submission
            ? {
                id: 'sub-1',
                status: opts.submission.status,
                _count: {
                  answers: opts.submission.answers,
                  ratings: opts.submission.ratings,
                },
              }
            : null,
        ),
      ),
      update: vi.fn(() => Promise.resolve({})),
    },
    meeting: {
      create: vi.fn(() => Promise.resolve({ id: 'meeting-1' })),
      update: vi.fn(() => Promise.resolve({})),
    },
    auditLog: { create: vi.fn(() => Promise.resolve({})) },
  };
  const policy: any = {
    resolveCycleActorKind: vi.fn(() => opts.kind),
    assertCanViewCycle: vi.fn(),
  };
  const notifications: any = { create: vi.fn(() => Promise.resolve()) };
  const service = new CycleService(prisma, policy, notifications);
  return { service, prisma, policy, notifications, row };
}

describe('CycleService.transition', () => {
  let user: SessionUser;
  beforeEach(() => {
    user = actor(MENTEE);
  });

  it('mentee submitting self locks the self submission and auto-chains to mentor_assessment_open', async () => {
    const { service, prisma, notifications } = makeDeps({
      status: 'self_assessment_open',
      kind: 'mentee',
      submission: { status: 'draft', answers: 4, ratings: 5 },
    });

    await service.transition('c1', 'self_submitted', user);

    // self submission locked
    expect(prisma.reviewSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'submitted', lockedAt: expect.any(Date) }),
      }),
    );
    // two status writes: self_submitted, then auto mentor_assessment_open
    const statuses = prisma.reviewCycle.update.mock.calls.map(
      (c: any) => c[0].data.status,
    );
    expect(statuses).toEqual(['self_submitted', 'mentor_assessment_open']);
    // mentor notified that their assessment is open
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({ recipientUserId: MENTOR, type: 'mentor_assessment_open' }),
    );
  });

  it('rejects a mentor trying to trigger self_submitted (only the mentee may)', async () => {
    const { service } = makeDeps({ status: 'self_assessment_open', kind: 'mentor' });
    await expect(service.transition('c1', 'self_submitted', actor(MENTOR))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects an actor with no relationship to the cycle', async () => {
    const { service } = makeDeps({ status: 'self_assessment_open', kind: null });
    await expect(service.transition('c1', 'self_submitted', actor('x'))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects an illegal transition with a conflict', async () => {
    const { service } = makeDeps({ status: 'not_started', kind: 'admin' });
    await expect(
      service.transition('c1', 'released_to_employee', actor('a', 'admin')),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses to submit an incomplete self submission', async () => {
    const { service } = makeDeps({
      status: 'self_assessment_open',
      kind: 'mentee',
      submission: { status: 'draft', answers: 2, ratings: 5 },
    });
    await expect(service.transition('c1', 'self_submitted', user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('requires meeting details to schedule the review call', async () => {
    const { service } = makeDeps({ status: 'mentor_submitted', kind: 'mentor' });
    await expect(
      service.transition('c1', 'meeting_scheduled', actor(MENTOR)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('release sets releasedAt and notifies the mentee', async () => {
    const { service, prisma, notifications } = makeDeps({
      status: 'meeting_held',
      kind: 'mentor',
    });
    await service.transition('c1', 'released_to_employee', actor(MENTOR));
    expect(prisma.reviewCycle.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'released_to_employee', releasedAt: expect.any(Date) }),
      }),
    );
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({ recipientUserId: MENTEE, type: 'review_released' }),
    );
  });
});
