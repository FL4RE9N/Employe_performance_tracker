import { describe, it, expect, vi } from 'vitest';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { SubmissionService } from './submission.service';
import type { SessionUser } from '@perf-tracker/shared';

const MENTEE = 'mentee-id';
const MENTOR = 'mentor-id';

function actor(id: string, role: SessionUser['role'] = 'user'): SessionUser {
  return { id, email: `${id}@x.local`, displayName: id, role };
}

const CYCLE = { id: 'c1', menteeId: MENTEE, mentorId: MENTOR, status: 'self_assessment_open' };

function build(submission: any) {
  const prisma: any = {
    reviewCycle: { findUnique: vi.fn(() => Promise.resolve(CYCLE)) },
    reviewSubmission: { findUnique: vi.fn(() => Promise.resolve(submission)) },
  };
  const cycles: any = { transition: vi.fn(() => Promise.resolve({})) };
  const policy: any = { canViewSubmission: vi.fn(() => true) };
  return { service: new SubmissionService(prisma, cycles, policy), prisma, cycles, policy };
}

describe('SubmissionService — lock-before-reveal immutability (invariant #1)', () => {
  it('refuses to save a draft once the submission is locked', async () => {
    const { service } = build({ id: 's', status: 'submitted', lockedAt: new Date() });
    await expect(
      service.saveDraft(actor(MENTEE), 'c1', 'self', { answers: [{ questionKey: 'what_went_well', answerText: 'x' }] }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses to submit once the submission is locked', async () => {
    const { service } = build({ id: 's', status: 'submitted', lockedAt: new Date() });
    await expect(
      service.submit(actor(MENTEE), 'c1', 'self', { answers: [], ratings: [] } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses a draft save from someone who is not the rightful author of that side', async () => {
    const { service } = build({ id: 's', status: 'draft', lockedAt: null });
    // 'self' side belongs to the mentee; the mentor must not edit it
    await expect(
      service.saveDraft(actor(MENTOR), 'c1', 'self', { ratings: [] }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses to read a submission the policy denies', async () => {
    const prisma: any = {
      reviewCycle: {
        findUnique: vi.fn(() =>
          Promise.resolve({ ...CYCLE, submissions: [{ authorSide: 'self', status: 'submitted' }] }),
        ),
      },
      reviewSubmission: { findUnique: vi.fn() },
    };
    const cycles: any = { transition: vi.fn() };
    const policy: any = { canViewSubmission: vi.fn(() => false) };
    const service = new SubmissionService(prisma, cycles, policy);
    await expect(service.getSubmission(actor('other'), 'c1', 'mentor')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
