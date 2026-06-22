import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PasswordAuthStrategy } from './strategy/password.strategy';
import { AUTH_STRATEGY } from './strategy/auth-strategy.interface';
import { SessionGuard } from './guards/session.guard';
import { RolesGuard } from './guards/roles.guard';
import { CsrfMiddleware } from './csrf/csrf.middleware';

/**
 * AuthModule
 *
 * - Registers global APP_GUARD providers: SessionGuard (AuthN) then RolesGuard (AuthZ).
 * - Applies CsrfMiddleware to all routes (double-submit cookie pattern).
 * - PrismaService and ConfigService are injected directly (globally provided by PrismaModule
 *   and ConfigModule — both are @Global()).
 * - To swap in Entra OIDC: provide an alternate IAuthStrategy bound to AUTH_STRATEGY
 *   and override the useExisting here; AuthService and AuthController stay unchanged.
 */
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordAuthStrategy,
    {
      provide: AUTH_STRATEGY,
      useExisting: PasswordAuthStrategy,
    },
    SessionGuard,
    RolesGuard,
    {
      provide: APP_GUARD,
      useClass: SessionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [AuthService, SessionGuard, RolesGuard],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CsrfMiddleware).forRoutes('*');
  }
}
