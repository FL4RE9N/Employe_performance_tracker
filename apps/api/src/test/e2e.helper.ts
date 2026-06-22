/**
 * Reusable e2e test harness for server-side authorization tests.
 *
 * Boots a real NestJS app wired with the SAME global guards as production
 * (SessionGuard → RolesGuard, registered as APP_GUARD in AuthModule) plus
 * cookie-parser, so HTTP-level authorization is exercised end-to-end — proving
 * enforcement is server-side, not just UI gating (critical invariant #3).
 *
 * PrismaService is replaced with a caller-supplied mock; no real DB is touched.
 * SessionGuard reloads the user from `prisma.user.findUnique({ where: { id } })`,
 * so the mock decides the acting user's role/isActive — the JWT role is ignored
 * by the guards (only `sub` matters), exactly as in production.
 */
import { Test } from '@nestjs/testing';
import type { INestApplication, Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { signSession, COOKIE_NAME } from '../auth/session/session.cookie';

export const TEST_SESSION_SECRET =
  'test-session-secret-do-not-use-in-prod-0123456789';

export interface BootstrapOptions {
  /** Feature modules under test (e.g. [AdminModule]). */
  modules: Array<Type<unknown> | unknown>;
  /** A mock PrismaService. Must implement at least user.findUnique for the guard. */
  prisma: unknown;
}

/**
 * Build and initialize a Nest app for authz e2e tests. Caller is responsible
 * for `await app.close()` in afterAll.
 */
export async function bootstrapTestApp(
  opts: BootstrapOptions,
): Promise<INestApplication> {
  process.env.SESSION_SECRET = TEST_SESSION_SECRET;

  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
      PrismaModule,
      AuthModule,
      ...(opts.modules as Type<unknown>[]),
    ],
  })
    .overrideProvider(PrismaService)
    .useValue(opts.prisma)
    .compile();

  const app = moduleRef.createNestApplication({ logger: false });
  app.use(cookieParser());
  await app.init();
  return app;
}

/**
 * Build a `Cookie` header value carrying a valid signed session for `userId`.
 * The role embedded here is irrelevant to authorization (guards reload the user
 * from the DB mock) — it only needs to be a syntactically valid token.
 */
export function sessionCookie(userId: string, role = 'user'): string {
  const token = signSession({ sub: userId, role }, TEST_SESSION_SECRET);
  return `${COOKIE_NAME}=${token}`;
}
