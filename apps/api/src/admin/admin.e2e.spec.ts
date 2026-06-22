import { describe, it, beforeAll, afterAll, vi } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AdminModule } from './admin.module';
import { bootstrapTestApp, sessionCookie } from '../test/e2e.helper';

/**
 * Server-side authorization (critical invariant #3): /admin/* must be admin-only,
 * enforced by the real global guards — NOT just hidden in the UI. /directory must
 * be reachable by any authenticated user.
 */

const ADMIN = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'admin@perf-tracker.local',
  displayName: 'Admin',
  role: 'admin',
  isActive: true,
};
const USER = {
  id: '22222222-2222-2222-2222-222222222222',
  email: 'user@perf-tracker.local',
  displayName: 'Regular User',
  role: 'user',
  isActive: true,
};
const usersById: Record<string, typeof ADMIN | typeof USER> = {
  [ADMIN.id]: ADMIN,
  [USER.id]: USER,
};

describe('Admin authorization (server-side e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const prisma = {
      user: {
        // Used by SessionGuard to reload the acting user, and by the service.
        findUnique: vi.fn(({ where }: { where: { id: string } }) =>
          Promise.resolve(usersById[where.id] ?? null),
        ),
        findMany: vi.fn(() => Promise.resolve([])),
      },
      mentorRelationship: {
        findMany: vi.fn(() => Promise.resolve([])),
      },
    };
    app = await bootstrapTestApp({ modules: [AdminModule], prisma });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns 401 for an unauthenticated request to /admin/users', async () => {
    await request(app.getHttpServer()).get('/admin/users').expect(401);
  });

  it('returns 403 for a non-admin (role=user) hitting /admin/users', async () => {
    await request(app.getHttpServer())
      .get('/admin/users')
      .set('Cookie', sessionCookie(USER.id))
      .expect(403);
  });

  it('returns 200 for an admin hitting /admin/users', async () => {
    await request(app.getHttpServer())
      .get('/admin/users')
      .set('Cookie', sessionCookie(ADMIN.id))
      .expect(200)
      .expect([]);
  });

  it('allows any authenticated user to read /directory (not admin-gated)', async () => {
    await request(app.getHttpServer())
      .get('/directory')
      .set('Cookie', sessionCookie(USER.id))
      .expect(200)
      .expect([]);
  });
});
