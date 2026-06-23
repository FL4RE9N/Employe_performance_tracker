import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DashboardModule } from './dashboard.module';
import { bootstrapTestApp, sessionCookie } from '../test/e2e.helper';

/**
 * Server-side authorization: GET /dashboard/overview must be admin-only,
 * enforced by the real global RolesGuard — not just UI gating.
 */

const ADMIN = {
  id: '33333333-3333-3333-3333-333333333333',
  email: 'admin@perf-tracker.local',
  displayName: 'Admin',
  role: 'admin',
  isActive: true,
};

const USER = {
  id: '44444444-4444-4444-4444-444444444444',
  email: 'user@perf-tracker.local',
  displayName: 'Regular User',
  role: 'user',
  isActive: true,
};

const usersById: Record<string, typeof ADMIN | typeof USER> = {
  [ADMIN.id]: ADMIN,
  [USER.id]: USER,
};

describe('Dashboard authorization (server-side e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const prisma = {
      user: {
        // SessionGuard reloads the acting user by id
        findUnique: vi.fn(({ where }: { where: { id: string } }) =>
          Promise.resolve(usersById[where.id] ?? null),
        ),
        count: vi.fn(() => Promise.resolve(0)),
      },
      goal: {
        groupBy: vi.fn(() => Promise.resolve([])),
      },
      reviewCycle: {
        groupBy: vi.fn(() => Promise.resolve([])),
      },
      metricRating: {
        findMany: vi.fn(() => Promise.resolve([])),
      },
    };

    app = await bootstrapTestApp({ modules: [DashboardModule], prisma });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns 401 for an unauthenticated request to /dashboard/overview', async () => {
    await request(app.getHttpServer()).get('/dashboard/overview').expect(401);
  });

  it('returns 403 for a non-admin (role=user) hitting /dashboard/overview', async () => {
    await request(app.getHttpServer())
      .get('/dashboard/overview')
      .set('Cookie', sessionCookie(USER.id))
      .expect(403);
  });

  it('returns 200 with DashboardDto shape for an admin hitting /dashboard/overview', async () => {
    const res = await request(app.getHttpServer())
      .get('/dashboard/overview')
      .set('Cookie', sessionCookie(ADMIN.id))
      .expect(200);

    // Shape assertions — all 5 metrics present, counts are 0
    expect(res.body).toMatchObject({
      goalsByStatus: [],
      cyclesByStatus: [],
      totalUsers: 0,
    });
    expect(Array.isArray(res.body.metrics)).toBe(true);
    expect(res.body.metrics).toHaveLength(5);

    for (const m of res.body.metrics) {
      expect(m).toHaveProperty('metricKey');
      expect(m).toHaveProperty('metricLabel');
      expect(m.self).toMatchObject({ n: 0, average: null });
      expect(m.mentor).toMatchObject({ n: 0, average: null });
    }
  });
});
