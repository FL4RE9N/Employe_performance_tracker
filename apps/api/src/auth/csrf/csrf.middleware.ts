import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

export const CSRF_COOKIE = 'pt_csrf';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (SAFE_METHODS.has(req.method.toUpperCase())) {
      // On safe methods: ensure the CSRF cookie exists; set one if not.
      let token = req.cookies[CSRF_COOKIE] as string | undefined;
      if (!token) {
        token = randomBytes(32).toString('hex');
        res.cookie(CSRF_COOKIE, token, {
          httpOnly: false, // must be readable by JS (double-submit pattern)
          sameSite: 'lax',
          path: '/',
        });
      }
      // Expose the current token on the request so handlers (e.g. GET /auth/csrf)
      // can return it on the very first request, before the Set-Cookie round-trips.
      (req as Request & { csrfToken?: string }).csrfToken = token;
      return next();
    }

    // On state-changing methods: enforce double-submit
    const cookieToken = req.cookies[CSRF_COOKIE] as string | undefined;
    const headerToken = req.headers['x-csrf-token'] as string | undefined;

    if (!cookieToken || !headerToken || headerToken !== cookieToken) {
      throw new ForbiddenException('CSRF token mismatch');
    }

    next();
  }
}
