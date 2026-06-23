import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { ComparisonService } from './comparison.service';
import type { SessionUser, ReviewSubmissionDto } from '@perf-tracker/shared';

const MENTEE = 'mentee-id';
const MENTOR = 'mentor-id';

function actor(id: string, role: SessionUser['role'] = 'user'): SessionUser {
  return { id, email: `${id}@x.local`, displayName: id, role };
}

function subDto(side: 'self' | 'mentor', score: number): ReviewSubmissionDto {
  return {
    id: `sub-${side}`,
    cycleId: 'c1',
    authorSide: side,
    status: 'submitted',
    submittedAt: '2026-06-10T00:00:00.000Z',
    lockedAt: '2026-06-10T00:00:00.000Z',
    answers: [{ questionKey: 'overall_achievement', answerText: side }],
    ratings: [
      { metricKey: 'deliverables', metricLabel: 'Deliverables', score, comment: null, scaleVersion: 'v1' },
    ],
  };
}

function build(opts: {
  status: string;
  submissions: Array<{ id: string; authorSide: string; status: string }>;
  kind: 'mentee' | 'mentor' | 'admin' | null;
  canViewReleased?: boolean;
}) {
  const cycle = { id: 'c1', menteeId: MENTEE, mentorId: MENTOR, status: opts.status, submissions: opts.submissions };
  const prisma: any = { reviewCycle: { findUnique: vi.fn(() => Promise.resolve(cycle)) } };
  const policy: any = {
    assertCanViewCycle: vi.fn(),
    resolveCycleActorKind: vi.fn(() => opts.kind),
    canViewReleasedReview: vi.fn(() => opts.canViewReleased ?? false),
  };
  const submissions: any = {
    getSubmissionDto: vi.fn((id: string) =>
      Promise.resolve(id === 'sub-self' ? subDto('self', 3) : subDto('mentor', 5)),
    ),
  };
  return { service: new ComparisonService(prisma, policy, submissions), policy };
}

describe('ComparisonService — reveal gating (invariants #2 & #3)', () => {
  it('refuses the comparison until BOTH sides have submitted (#2)', async () => {
    const { service } = build({
      status: 'self_submitted',
      submissions: [
        { id: 'sub-self', authorSide: 'self', status: 'submitted' },
        { id: 'sub-mentor', authorSide: 'mentor', status: 'draft' },
      ],
      kind: 'mentor',
    });
    await expect(service.getComparison(actor(MENTOR), 'c1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('withholds the mentor side from the employee until release (#3)', async () => {
    const { service } = build({
      status: 'mentor_submitted',
      submissions: [
        { id: 'sub-self', authorSide: 'self', status: 'submitted' },
        { id: 'sub-mentor', authorSide: 'mentor', status: 'submitted' },
      ],
      kind: 'mentee',
    });
    const cmp = await service.getComparison(actor(MENTEE), 'c1');
    expect(cmp.releaseGated).toBe(true);
    expect(cmp.self).not.toBeNull();
    expect(cmp.mentor).toBeNull();
    expect(cmp.gaps).toEqual([]);
  });

  it('reveals both sides + gaps to the mentor once both submitted', async () => {
    const { service } = build({
      status: 'mentor_submitted',
      submissions: [
        { id: 'sub-self', authorSide: 'self', status: 'submitted' },
        { id: 'sub-mentor', authorSide: 'mentor', status: 'submitted' },
      ],
      kind: 'mentor',
    });
    const cmp = await service.getComparison(actor(MENTOR), 'c1');
    expect(cmp.releaseGated).toBe(false);
    expect(cmp.self).not.toBeNull();
    expect(cmp.mentor).not.toBeNull();
    const deliverables = cmp.gaps.find((g) => g.metricKey === 'deliverables');
    expect(deliverables).toMatchObject({ selfScore: 3, mentorScore: 5, delta: 2 });
  });

  it('reveals the mentor side to the employee after release', async () => {
    const { service } = build({
      status: 'released_to_employee',
      submissions: [
        { id: 'sub-self', authorSide: 'self', status: 'submitted' },
        { id: 'sub-mentor', authorSide: 'mentor', status: 'submitted' },
      ],
      kind: 'mentee',
    });
    const cmp = await service.getComparison(actor(MENTEE), 'c1');
    expect(cmp.releaseGated).toBe(false);
    expect(cmp.mentor).not.toBeNull();
  });

  it('getReleasedReview is refused before release and allowed after', async () => {
    const denied = build({
      status: 'meeting_held',
      submissions: [
        { id: 'sub-self', authorSide: 'self', status: 'submitted' },
        { id: 'sub-mentor', authorSide: 'mentor', status: 'submitted' },
      ],
      kind: 'mentee',
      canViewReleased: false,
    });
    await expect(denied.service.getReleasedReview(actor(MENTEE), 'c1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    const allowed = build({
      status: 'released_to_employee',
      submissions: [
        { id: 'sub-self', authorSide: 'self', status: 'submitted' },
        { id: 'sub-mentor', authorSide: 'mentor', status: 'submitted' },
      ],
      kind: 'mentee',
      canViewReleased: true,
    });
    const review = await allowed.service.getReleasedReview(actor(MENTEE), 'c1');
    expect(review.self).not.toBeNull();
    expect(review.mentor).not.toBeNull();
  });
});
