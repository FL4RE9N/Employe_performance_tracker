import { describe, it, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { SubmissionsModule } from './submissions.module';
import { bootstrapTestApp, sessionCookie } from '../test/e2e.helper';

/**
 * HTTP-level proof of the review-cycle visibility invariants (#2 & #3), flowing
 * through the real SessionGuard + PolicyService + ComparisonService/SubmissionService.
 */

const ADMIN = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const MENTEE = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const MENTOR = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const OTHER = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const CYCLE_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

const USERS: Record<string, any> = {
  [ADMIN]: { id: ADMIN, email: 'a@x', displayName: 'Admin', role: 'admin', isActive: true },
  [MENTEE]: { id: MENTEE, email: 'm@x', displayName: 'Mentee', role: 'user', isActive: true },
  [MENTOR]: { id: MENTOR, email: 'r@x', displayName: 'Mentor', role: 'user', isActive: true },
  [OTHER]: { id: OTHER, email: 'o@x', displayName: 'Other', role: 'user', isActive: true },
};

const SUBMISSION_ROW = {
  id: 'sub-1',
  cycleId: CYCLE_ID,
  authorSide: 'mentor',
  status: 'submitted',
  submittedAt: new Date('2026-06-10T00:00:00.000Z'),
  lockedAt: new Date('2026-06-10T00:00:00.000Z'),
  answers: [{ questionKey: 'overall_achievement', answerText: 'a' }],
  ratings: [
    { metric: { key: 'deliverables', label: 'Deliverables' }, score: 4, comment: null, scaleVersion: 'v1' },
  ],
};

// Mutated per-test to set the cycle status + which sides are submitted.
let cycleState: { status: string; submissions: Array<{ id: string; authorSide: string; status: string }> };

describe('Cycle visibility (server-side e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const prisma = {
      user: {
        findUnique: vi.fn(({ where }: any) => Promise.resolve(where.id ? USERS[where.id] ?? null : null)),
      },
      reviewCycle: {
        findUnique: vi.fn(() =>
          Promise.resolve({
            id: CYCLE_ID,
            menteeId: MENTEE,
            mentorId: MENTOR,
            status: cycleState.status,
            submissions: cycleState.submissions,
          }),
        ),
      },
      reviewSubmission: {
        findUnique: vi.fn(() => Promise.resolve(SUBMISSION_ROW)),
      },
    };
    app = await bootstrapTestApp({ modules: [SubmissionsModule], prisma });
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    cycleState = {
      status: 'mentor_submitted',
      submissions: [
        { id: 'sub-self', authorSide: 'self', status: 'submitted' },
        { id: 'sub-mentor', authorSide: 'mentor', status: 'submitted' },
      ],
    };
  });

  const comparison = () => request(app.getHttpServer()).get(`/cycles/${CYCLE_ID}/comparison`);

  it('401 for an unauthenticated comparison request', async () => {
    await comparison().expect(401);
  });

  it('403 for an unrelated user', async () => {
    await comparison().set('Cookie', sessionCookie(OTHER)).expect(403);
  });

  it('403 (locked) for the mentor until BOTH sides submit (#2)', async () => {
    cycleState = {
      status: 'self_submitted',
      submissions: [
        { id: 'sub-self', authorSide: 'self', status: 'submitted' },
        { id: 'sub-mentor', authorSide: 'mentor', status: 'draft' },
      ],
    };
    await comparison().set('Cookie', sessionCookie(MENTOR)).expect(403);
  });

  it('200 with both sides for the mentor once both submitted', async () => {
    await comparison()
      .set('Cookie', sessionCookie(MENTOR))
      .expect(200)
      .expect((res) => {
        if (res.body.self === null || res.body.mentor === null) {
          throw new Error('expected both sides revealed to mentor');
        }
        if (res.body.releaseGated !== false) throw new Error('mentor must not be release-gated');
      });
  });

  it('withholds the mentor side from the employee until release (#3)', async () => {
    await comparison()
      .set('Cookie', sessionCookie(MENTEE))
      .expect(200)
      .expect((res) => {
        if (res.body.mentor !== null) throw new Error('mentor side must be hidden pre-release');
        if (res.body.releaseGated !== true) throw new Error('expected releaseGated=true');
      });
  });

  it('reveals the mentor side to the employee after release', async () => {
    cycleState = {
      status: 'released_to_employee',
      submissions: [
        { id: 'sub-self', authorSide: 'self', status: 'submitted' },
        { id: 'sub-mentor', authorSide: 'mentor', status: 'submitted' },
      ],
    };
    await comparison()
      .set('Cookie', sessionCookie(MENTEE))
      .expect(200)
      .expect((res) => {
        if (res.body.mentor === null) throw new Error('mentor side must be visible post-release');
      });
  });

  it('GET /submissions/mentor: 403 for the employee pre-release, 200 post-release', async () => {
    await request(app.getHttpServer())
      .get(`/cycles/${CYCLE_ID}/submissions/mentor`)
      .set('Cookie', sessionCookie(MENTEE))
      .expect(403);

    cycleState = {
      status: 'released_to_employee',
      submissions: [
        { id: 'sub-self', authorSide: 'self', status: 'submitted' },
        { id: 'sub-mentor', authorSide: 'mentor', status: 'submitted' },
      ],
    };
    await request(app.getHttpServer())
      .get(`/cycles/${CYCLE_ID}/submissions/mentor`)
      .set('Cookie', sessionCookie(MENTEE))
      .expect(200);
  });
});
