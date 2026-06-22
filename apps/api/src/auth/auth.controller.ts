import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  Body,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { loginSchema } from '@perf-tracker/shared';
import type { SessionUser } from '@perf-tracker/shared';
import { AuthService } from './auth.service';
import { COOKIE_NAME, cookieOptions } from './session/session.cookie';
import { CSRF_COOKIE } from './csrf/csrf.middleware';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

const COOKIE_SECURE = process.env['COOKIE_SECURE'] === 'true';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * GET /api/auth/csrf
   * Issues the CSRF token cookie (the CsrfMiddleware does the actual cookie set on GET).
   * Returns the token value so the SPA can read it before the first state-changing request.
   */
  @Public()
  @Get('csrf')
  getCsrf(@Req() req: Request) {
    // CsrfMiddleware sets req.csrfToken (and the pt_csrf cookie) on safe methods,
    // so the token is available on the very first request.
    const token =
      (req as Request & { csrfToken?: string }).csrfToken ??
      (req.cookies[CSRF_COOKIE] as string | undefined) ??
      null;
    return { csrfToken: token };
  }

  /**
   * POST /api/auth/login
   * Rate-limited to 5 requests per 60 seconds per IP.
   * Validates credentials; on success, sets a signed httpOnly session cookie.
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const { token, user } = await this.authService.login(parsed.data);
    res.cookie(COOKIE_NAME, token, cookieOptions(COOKIE_SECURE));
    return { user };
  }

  /**
   * POST /api/auth/logout
   * Clears the session cookie.
   */
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return { ok: true };
  }

  /**
   * GET /api/auth/me
   * Returns the currently authenticated user (populated by SessionGuard).
   */
  @Get('me')
  getMe(@CurrentUser() user: SessionUser) {
    return user;
  }
}
