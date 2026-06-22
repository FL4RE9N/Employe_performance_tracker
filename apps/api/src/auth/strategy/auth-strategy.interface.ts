/**
 * Pluggable authentication strategy interface.
 *
 * The current implementation (PasswordAuthStrategy) validates email/password
 * credentials against a local Prisma-backed store using Argon2id.
 *
 * Entra OIDC will provide an alternate IAuthStrategy; AuthService stays unchanged.
 * To swap in, bind a new provider to AUTH_STRATEGY in a feature module and override
 * the one registered here.
 */

export const AUTH_STRATEGY = Symbol('AUTH_STRATEGY');

export interface IAuthStrategy {
  /**
   * Verify credentials and return a normalized user if valid, or null if not.
   * Does NOT throw — callers (AuthService) decide whether to throw.
   */
  verify(credentials: {
    email: string;
    password: string;
  }): Promise<{
    id: string;
    email: string;
    displayName: string;
    role: string;
    isActive: boolean;
  } | null>;
}
