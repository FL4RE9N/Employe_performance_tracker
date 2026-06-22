import { describe, it, expect } from 'vitest';
import { signSession, verifySession } from './session.cookie';

const SECRET = 'test-secret-at-least-32-chars-long!!';

describe('session cookie helpers', () => {
  describe('signSession / verifySession round-trip', () => {
    it('returns the sub and role from a freshly signed token', () => {
      const token = signSession({ sub: 'user-123', role: 'admin' }, SECRET, 1);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);

      const payload = verifySession(token, SECRET);
      expect(payload).not.toBeNull();
      expect(payload!.sub).toBe('user-123');
      expect(payload!.role).toBe('admin');
    });

    it('round-trips a user role as well', () => {
      const token = signSession({ sub: 'user-456', role: 'user' }, SECRET, 7);
      const payload = verifySession(token, SECRET);
      expect(payload!.role).toBe('user');
      expect(payload!.sub).toBe('user-456');
    });
  });

  describe('verifySession — rejection cases', () => {
    it('returns null for a token signed with the wrong secret', () => {
      const token = signSession({ sub: 'user-789', role: 'user' }, SECRET, 1);
      const result = verifySession(token, 'completely-different-secret-abc');
      expect(result).toBeNull();
    });

    it('returns null for a tampered token (altered payload segment)', () => {
      const token = signSession({ sub: 'user-abc', role: 'user' }, SECRET, 1);
      // Flip a character in the payload segment (middle part of the JWT)
      const parts = token.split('.');
      parts[1] = parts[1].slice(0, -2) + 'XX';
      const tampered = parts.join('.');
      expect(verifySession(tampered, SECRET)).toBeNull();
    });

    it('returns null for a tampered token (altered signature)', () => {
      const token = signSession({ sub: 'user-abc', role: 'user' }, SECRET, 1);
      const parts = token.split('.');
      parts[2] = parts[2].slice(0, -3) + 'ZZZ';
      const tampered = parts.join('.');
      expect(verifySession(tampered, SECRET)).toBeNull();
    });

    it('returns null for completely garbage input', () => {
      expect(verifySession('not.a.jwt', SECRET)).toBeNull();
      expect(verifySession('', SECRET)).toBeNull();
      expect(verifySession('garbage', SECRET)).toBeNull();
    });

    it('returns null for an expired token', async () => {
      // Sign with a very short TTL that will expire immediately
      // We use -1 seconds (already expired) via direct jwt sign
      const jwt = await import('jsonwebtoken');
      const expiredToken = jwt.sign(
        { sub: 'user-exp', role: 'user' },
        SECRET,
        { algorithm: 'HS256', expiresIn: -1 },
      );
      expect(verifySession(expiredToken, SECRET)).toBeNull();
    });
  });
});
