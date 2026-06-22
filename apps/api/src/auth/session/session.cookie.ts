import * as jwt from 'jsonwebtoken';
import type { CookieOptions } from 'express';

export const COOKIE_NAME = 'pt_session';

const SESSION_TTL_DAYS_DEFAULT = 7;
const SECONDS_PER_DAY = 86400;

export interface SessionPayload {
  sub: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Sign a new session JWT (HS256).
 * @param payload  Must include sub (userId) and role.
 * @param secret   SESSION_SECRET env value.
 * @param ttlDays  Days until expiry (defaults to SESSION_TTL_DAYS_DEFAULT).
 */
export function signSession(
  payload: { sub: string; role: string },
  secret: string,
  ttlDays: number = SESSION_TTL_DAYS_DEFAULT,
): string {
  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: ttlDays * SECONDS_PER_DAY,
  });
}

/**
 * Verify and decode a session JWT.
 * Returns the decoded payload on success, or null if the token is invalid/expired.
 */
export function verifySession(token: string, secret: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    return decoded as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Build Express cookie options for the session cookie.
 * @param secure  Set to true in production (HTTPS). Driven by COOKIE_SECURE env.
 * @param ttlDays Cookie max-age in days (should match the JWT ttl).
 */
export function cookieOptions(
  secure: boolean,
  ttlDays: number = SESSION_TTL_DAYS_DEFAULT,
): CookieOptions {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: ttlDays * SECONDS_PER_DAY * 1000, // Express expects milliseconds
  };
}
