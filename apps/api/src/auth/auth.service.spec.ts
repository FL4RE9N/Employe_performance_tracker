import { describe, it, expect, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { IAuthStrategy } from './strategy/auth-strategy.interface';
import type { PrismaService } from '../prisma/prisma.service';
import type { ConfigService } from '@nestjs/config';

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

const FAKE_USER = {
  id: 'user-id-1',
  email: 'alice@example.com',
  displayName: 'Alice',
  role: 'user',
  isActive: true,
};

const SESSION_SECRET = 'test-secret-at-least-32-chars-long!!';

function makeStrategy(returnValue: typeof FAKE_USER | null): IAuthStrategy {
  return {
    verify: vi.fn().mockResolvedValue(returnValue),
  };
}

function makePrisma(): Partial<PrismaService> {
  return {
    user: {
      findUnique: vi.fn().mockResolvedValue({ ...FAKE_USER, passwordHash: 'hash' }),
    } as any,
  };
}

function makeConfig(overrides: Record<string, string> = {}): Partial<ConfigService> {
  return {
    get: vi.fn((key: string) => {
      const values: Record<string, string> = {
        SESSION_SECRET,
        ...overrides,
      };
      return values[key];
    }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuthService', () => {
  describe('login()', () => {
    it('returns a non-empty token and the user when credentials are valid', async () => {
      const strategy = makeStrategy(FAKE_USER);
      const prisma = makePrisma();
      const config = makeConfig();

      const service = new AuthService(
        strategy,
        prisma as PrismaService,
        config as ConfigService,
      );

      const result = await service.login({ email: 'alice@example.com', password: 'password123' });

      expect(result.token).toBeTruthy();
      expect(typeof result.token).toBe('string');
      expect(result.token.split('.').length).toBe(3); // valid JWT structure

      expect(result.user.id).toBe(FAKE_USER.id);
      expect(result.user.email).toBe(FAKE_USER.email);
      expect(result.user.displayName).toBe(FAKE_USER.displayName);
      expect(result.user.role).toBe(FAKE_USER.role);
    });

    it('calls strategy.verify with the supplied credentials', async () => {
      const strategy = makeStrategy(FAKE_USER);
      const prisma = makePrisma();
      const config = makeConfig();

      const service = new AuthService(
        strategy,
        prisma as PrismaService,
        config as ConfigService,
      );

      await service.login({ email: 'alice@example.com', password: 'password123' });

      expect(strategy.verify).toHaveBeenCalledWith({
        email: 'alice@example.com',
        password: 'password123',
      });
    });

    it('throws UnauthorizedException when strategy returns null', async () => {
      const strategy = makeStrategy(null);
      const prisma = makePrisma();
      const config = makeConfig();

      const service = new AuthService(
        strategy,
        prisma as PrismaService,
        config as ConfigService,
      );

      await expect(
        service.login({ email: 'bad@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('minted token encodes the correct sub and role', async () => {
      const strategy = makeStrategy({ ...FAKE_USER, role: 'admin' });
      const prisma = makePrisma();
      const config = makeConfig();

      const service = new AuthService(
        strategy,
        prisma as PrismaService,
        config as ConfigService,
      );

      const { token } = await service.login({ email: 'alice@example.com', password: 'pw' });

      // Decode (without verifying) to inspect payload
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64url').toString('utf8'),
      );
      expect(payload.sub).toBe(FAKE_USER.id);
      expect(payload.role).toBe('admin');
    });
  });

  describe('validate()', () => {
    it('returns a SessionUser when the user exists and is active', async () => {
      const prisma = makePrisma();
      const service = new AuthService(
        makeStrategy(null),
        prisma as PrismaService,
        makeConfig() as ConfigService,
      );

      const result = await service.validate('user-id-1');
      expect(result).not.toBeNull();
      expect(result!.id).toBe(FAKE_USER.id);
    });

    it('returns null when the user is not found', async () => {
      const prisma: Partial<PrismaService> = {
        user: {
          findUnique: vi.fn().mockResolvedValue(null),
        } as any,
      };
      const service = new AuthService(
        makeStrategy(null),
        prisma as PrismaService,
        makeConfig() as ConfigService,
      );

      const result = await service.validate('nonexistent-id');
      expect(result).toBeNull();
    });

    it('returns null when the user is inactive', async () => {
      const prisma: Partial<PrismaService> = {
        user: {
          findUnique: vi.fn().mockResolvedValue({ ...FAKE_USER, isActive: false }),
        } as any,
      };
      const service = new AuthService(
        makeStrategy(null),
        prisma as PrismaService,
        makeConfig() as ConfigService,
      );

      const result = await service.validate('user-id-1');
      expect(result).toBeNull();
    });
  });
});
