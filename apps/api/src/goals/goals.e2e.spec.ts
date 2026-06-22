import { describe, it, beforeAll, afterAll, vi } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { GoalsModule } from './goals.module';
import {
  bootstrapTestApp,
  sessionCookie,
  authMutationCookie,
  csrfHeader,
} from '../test/e2e.helper';

/**
 * Server-side authorization e2e for /goals.
 * Proves that GET /goals/:id and PATCH /goals/:id enforce canViewGoal /
 * assertCanEditGoal on the server — not just in the UI.
 */

// ---------------------------------------------------------------------------
// User fixtures
// ---------------------------------------------------------------------------

const ADMIN_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OWNER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const MENTOR_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const OTHER_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const USERS: Record<string, any> = {
  [ADMIN_ID]: {
    id: ADMIN_ID,
    email: 'admin@perf-tracker.local',
    displayName: 'Admin',
    role: 'admin',
    isActive: true,
  },
  [OWNER_ID]: {
    id: OWNER_ID,
    email: 'owner@perf-tracker.local',
    displayName: 'Owner',
    role: 'user',
    isActive: true,
  },
  [MENTOR_ID]: {
    id: MENTOR_ID,
    email: 'mentor@perf-tracker.local',
    displayName: 'Mentor',
    role: 'user',
    isActive: true,
  },
  [OTHER_ID]: {
    id: OTHER_ID,
    email: 'other@perf-tracker.local',
    displayName: 'Other',
    role: 'user',
    isActive: true,
  },
};

// ---------------------------------------------------------------------------
// Goal fixture
// ---------------------------------------------------------------------------

const GOAL_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const METRIC_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

const GOAL_ROW = {
  id: GOAL_ID,
  ownerUserId: OWNER_ID,
  metricId: METRIC_ID,
  title: 'Test Goal',
  description: 'A test goal',
  target: null,
  cycleId: null,
  status: 'draft',
  visibility: 'restricted',
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  metric: { key: 'deliverables', label: 'Deliverables' },
  owner: { displayName: 'Owner' },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Goals authorization (server-side e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const prisma = {
      user: {
        findUnique: vi.fn(({ where }: { where: { id?: string } }) =>
          Promise.resolve(where.id ? (USERS[where.id] ?? null) : null),
        ),
      },
      goal: {
        findUnique: vi.fn(({ where }: { where: { id: string } }) =>
          Promise.resolve(where.id === GOAL_ID ? GOAL_ROW : null),
        ),
        findMany: vi.fn(() => Promise.resolve([GOAL_ROW])),
        update: vi.fn(
          ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) =>
            Promise.resolve({ ...GOAL_ROW, ...data, id: where.id }),
        ),
        create: vi.fn(),
        delete: vi.fn(() => Promise.resolve(GOAL_ROW)),
      },
      metricDefinition: {
        findUnique: vi.fn(() => Promise.resolve({ id: METRIC_ID, key: 'deliverables', label: 'Deliverables' })),
      },
      mentorRelationship: {
        findFirst: vi.fn(
          ({ where }: { where: { mentorId: string; menteeId: string } }) =>
            Promise.resolve(
              where.mentorId === MENTOR_ID && where.menteeId === OWNER_ID
                ? { id: 'edge-uuid' }
                : null,
            ),
        ),
        findMany: vi.fn(() => Promise.resolve([])),
      },
    };

    app = await bootstrapTestApp({ modules: [GoalsModule], prisma });
  });

  afterAll(async () => {
    await app?.close();
  });

  // --- GET /goals/:id --------------------------------------------------------

  describe('GET /goals/:id', () => {
    it('returns 401 for an unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get(`/goals/${GOAL_ID}`)
        .expect(401);
    });

    it('returns 200 for the goal owner', async () => {
      await request(app.getHttpServer())
        .get(`/goals/${GOAL_ID}`)
        .set('Cookie', sessionCookie(OWNER_ID))
        .expect(200);
    });

    it('returns 200 for an admin', async () => {
      await request(app.getHttpServer())
        .get(`/goals/${GOAL_ID}`)
        .set('Cookie', sessionCookie(ADMIN_ID, 'admin'))
        .expect(200);
    });

    it('returns 200 for a mentor of the goal owner', async () => {
      await request(app.getHttpServer())
        .get(`/goals/${GOAL_ID}`)
        .set('Cookie', sessionCookie(MENTOR_ID))
        .expect(200);
    });

    it('returns 403 for an unrelated user', async () => {
      await request(app.getHttpServer())
        .get(`/goals/${GOAL_ID}`)
        .set('Cookie', sessionCookie(OTHER_ID))
        .expect(403);
    });
  });

  // --- PATCH /goals/:id ------------------------------------------------------

  describe('PATCH /goals/:id', () => {
    it('returns 200 for the goal owner (with valid CSRF)', async () => {
      await request(app.getHttpServer())
        .patch(`/goals/${GOAL_ID}`)
        .set('Cookie', authMutationCookie(OWNER_ID))
        .set(csrfHeader)
        .send({ title: 'Updated Title' })
        .expect(200);
    });

    it('returns 403 for an unrelated user attempting to patch', async () => {
      await request(app.getHttpServer())
        .patch(`/goals/${GOAL_ID}`)
        .set('Cookie', authMutationCookie(OTHER_ID))
        .set(csrfHeader)
        .send({ title: 'Hacked Title' })
        .expect(403);
    });
  });
});
