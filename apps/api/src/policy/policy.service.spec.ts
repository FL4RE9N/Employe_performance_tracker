import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { PolicyService } from './policy.service';
import type { SessionUser } from '@perf-tracker/shared';

const MENTOR = 'mentor-id';
const MENTEE = 'mentee-id';
const OTHER = 'other-id';

function makePrisma() {
  return {
    mentorRelationship: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  };
}

function asUser(id: string, role: SessionUser['role'] = 'user'): SessionUser {
  return { id, email: `${id}@x.local`, displayName: id, role };
}

describe('PolicyService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let policy: PolicyService;

  beforeEach(() => {
    prisma = makePrisma();
    policy = new PolicyService(prisma as never);
  });

  describe('isMentorOf — time-bounded edges', () => {
    it('returns true when a covering edge exists', async () => {
      prisma.mentorRelationship.findFirst.mockResolvedValue({ id: 'edge-1' });
      await expect(policy.isMentorOf(MENTOR, MENTEE)).resolves.toBe(true);
    });

    it('returns false when no covering edge exists', async () => {
      prisma.mentorRelationship.findFirst.mockResolvedValue(null);
      await expect(policy.isMentorOf(MENTOR, MENTEE)).resolves.toBe(false);
    });

    it('short-circuits (no query) when mentor === mentee', async () => {
      await expect(policy.isMentorOf(MENTEE, MENTEE)).resolves.toBe(false);
      expect(prisma.mentorRelationship.findFirst).not.toHaveBeenCalled();
    });

    it('queries with effectiveFrom<=date and (effectiveTo null OR >=date) for the given date', async () => {
      prisma.mentorRelationship.findFirst.mockResolvedValue(null);
      const at = new Date('2026-06-01T00:00:00.000Z');
      await policy.isMentorOf(MENTOR, MENTEE, at);
      const where = prisma.mentorRelationship.findFirst.mock.calls[0][0].where;
      expect(where).toMatchObject({ mentorId: MENTOR, menteeId: MENTEE, type: 'mentor' });
      expect(where.effectiveFrom).toEqual({ lte: at });
      expect(where.OR).toEqual([{ effectiveTo: null }, { effectiveTo: { gte: at } }]);
    });
  });

  describe('menteeIdsOf', () => {
    it('returns the distinct current mentee ids', async () => {
      prisma.mentorRelationship.findMany.mockResolvedValue([
        { menteeId: 'a' },
        { menteeId: 'b' },
        { menteeId: 'a' },
      ]);
      await expect(policy.menteeIdsOf(MENTOR)).resolves.toEqual(['a', 'b']);
    });

    it('returns [] when the mentor has no current mentees', async () => {
      prisma.mentorRelationship.findMany.mockResolvedValue([]);
      await expect(policy.menteeIdsOf(MENTOR)).resolves.toEqual([]);
    });
  });

  describe('canViewGoal — visibility matrix', () => {
    const goal = { ownerUserId: MENTEE };

    it('admin can view any goal (no edge query)', async () => {
      await expect(policy.canViewGoal(asUser('admin-id', 'admin'), goal)).resolves.toBe(true);
      expect(prisma.mentorRelationship.findFirst).not.toHaveBeenCalled();
    });

    it('owner can view own goal', async () => {
      await expect(policy.canViewGoal(asUser(MENTEE), goal)).resolves.toBe(true);
    });

    it('a current mentor of the owner can view the goal', async () => {
      prisma.mentorRelationship.findFirst.mockResolvedValue({ id: 'edge-1' });
      await expect(policy.canViewGoal(asUser(MENTOR), goal)).resolves.toBe(true);
    });

    it('an unrelated user cannot view the goal', async () => {
      prisma.mentorRelationship.findFirst.mockResolvedValue(null);
      await expect(policy.canViewGoal(asUser(OTHER), goal)).resolves.toBe(false);
    });
  });

  describe('canEditGoal — owner only', () => {
    const goal = { ownerUserId: MENTEE };

    it('owner may edit', () => {
      expect(policy.canEditGoal(asUser(MENTEE), goal)).toBe(true);
    });

    it('admin may NOT edit (read-only roll-up)', () => {
      expect(policy.canEditGoal(asUser('admin-id', 'admin'), goal)).toBe(false);
    });

    it('mentor / others may NOT edit', () => {
      expect(policy.canEditGoal(asUser(MENTOR), goal)).toBe(false);
      expect(policy.canEditGoal(asUser(OTHER), goal)).toBe(false);
    });

    it('assertCanEditGoal throws ForbiddenException for non-owner', () => {
      expect(() => policy.assertCanEditGoal(asUser(OTHER), goal)).toThrow(ForbiddenException);
    });
  });
});
