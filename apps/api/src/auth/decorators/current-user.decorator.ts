import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { SessionUser } from '@perf-tracker/shared';

/**
 * Parameter decorator that injects the authenticated user (set by SessionGuard)
 * into a controller method argument.
 *
 * Usage:
 *   async getMe(@CurrentUser() user: SessionUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionUser => {
    const request = ctx.switchToHttp().getRequest<Request & { user: SessionUser }>();
    return request.user;
  },
);
