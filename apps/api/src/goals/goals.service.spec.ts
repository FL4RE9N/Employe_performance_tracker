import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { GoalsService } from './goals.service';

// ---------------------------------------------------------------------------
// Hand-mocked PrismaService
// ---------------------------------------------------------------------------

const mockPrisma = {
  metricDefinition: {
    findUnique: vi.fn(),
  },
  goal: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
} as any;

// ---------------------------------------------------------------------------
// Hand-mocked PolicyService
// ---------------------------------------------------------------------------

const mockPolicy = {
  isMentorOf: vi.fn(),
  menteeIdsOf: vi.fn(),
  canViewGoal: vi.fn(),
  assertCanViewGoal: vi.fn(),
  canEditGoal: vi.fn(),
  assertCanEditGoal: vi.fn(),
} as any;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = new Date('2025-01-01T00:00:00.000Z');

const ACTOR_OWNER: any = {
  id: 'owner-uuid',
  email: 'owner@example.com',
  displayName: 'Owner',
  role: 'user',
};

const ACTOR_ADMIN: any = {
  id: 'admin-uuid',
  email: 'admin@example.com',
  displayName: 'Admin',
  role: 'admin',
};

const ACTOR_OTHER: any = {
  id: 'other-uuid',
  email: 'other@example.com',
  displayName: 'Other',
  role: 'user',
};

const METRIC = {
  id: 'metric-uuid',
  key: 'deliverables',
  label: 'Deliverables',
};

const BASE_GOAL_ROW = {
  id: 'goal-uuid',
  ownerUserId: ACTOR_OWNER.id,
  metricId: METRIC.id,
  title: 'My Goal',
  description: 'A description',
  target: null,
  cycleId: null,
  status: 'draft',
  visibility: 'restricted',
  createdAt: NOW,
  updatedAt: NOW,
  metric: { key: 'deliverables', label: 'Deliverables' },
  owner: { displayName: 'Owner' },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GoalsService', () => {
  let service: GoalsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GoalsService(mockPrisma, mockPolicy);
  });

  // --- createGoal ------------------------------------------------------------

  describe('createGoal()', () => {
    it('resolves metricKey to metricId and applies default status/visibility', async () => {
      mockPrisma.metricDefinition.findUnique.mockResolvedValue(METRIC);
      mockPrisma.goal.create.mockResolvedValue(BASE_GOAL_ROW);

      const result = await service.createGoal(ACTOR_OWNER, {
        metricKey: 'deliverables',
        title: 'My Goal',
        description: 'A description',
      });

      // Verify metricDefinition.findUnique was called with the key
      expect(mockPrisma.metricDefinition.findUnique).toHaveBeenCalledWith({
        where: { key: 'deliverables' },
      });

      // Verify goal.create was called with correct data
      const createCall = mockPrisma.goal.create.mock.calls[0][0];
      expect(createCall.data.metricId).toBe(METRIC.id);
      expect(createCall.data.ownerUserId).toBe(ACTOR_OWNER.id);
      expect(createCall.data.status).toBe('draft');
      expect(createCall.data.visibility).toBe('restricted');
      expect(createCall.data.description).toBe('A description');

      // Verify DTO shape
      expect(result.metricKey).toBe('deliverables');
      expect(result.metricLabel).toBe('Deliverables');
      expect(result.status).toBe('draft');
      expect(result.visibility).toBe('restricted');
      expect(typeof result.createdAt).toBe('string');
    });

    it('uses provided status and visibility when supplied', async () => {
      mockPrisma.metricDefinition.findUnique.mockResolvedValue(METRIC);
      mockPrisma.goal.create.mockResolvedValue({
        ...BASE_GOAL_ROW,
        status: 'active',
        visibility: 'public',
      });

      await service.createGoal(ACTOR_OWNER, {
        metricKey: 'deliverables',
        title: 'My Goal',
        description: '',
        status: 'active',
        visibility: 'public',
      });

      const createCall = mockPrisma.goal.create.mock.calls[0][0];
      expect(createCall.data.status).toBe('active');
      expect(createCall.data.visibility).toBe('public');
    });

    it('throws BadRequestException when metric key is unknown', async () => {
      mockPrisma.metricDefinition.findUnique.mockResolvedValue(null);

      await expect(
        service.createGoal(ACTOR_OWNER, {
          metricKey: 'deliverables',
          title: 'My Goal',
          description: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // --- listGoals -------------------------------------------------------------

  describe('listGoals()', () => {
    it("as='all' throws ForbiddenException for a non-admin", async () => {
      await expect(
        service.listGoals(ACTOR_OWNER, { as: 'all' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("as='all' succeeds for an admin and returns all goals", async () => {
      mockPrisma.goal.findMany.mockResolvedValue([BASE_GOAL_ROW]);

      const result = await service.listGoals(ACTOR_ADMIN, { as: 'all' });

      expect(result).toHaveLength(1);
      expect(mockPrisma.goal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    it("default (no 'as') returns own goals only", async () => {
      mockPrisma.goal.findMany.mockResolvedValue([BASE_GOAL_ROW]);

      const result = await service.listGoals(ACTOR_OWNER, {});

      expect(mockPrisma.goal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerUserId: ACTOR_OWNER.id },
        }),
      );
      expect(result).toHaveLength(1);
    });

    it("as='mentee' returns goals for actor's mentees", async () => {
      mockPolicy.menteeIdsOf.mockResolvedValue(['mentee-uuid-1', 'mentee-uuid-2']);
      mockPrisma.goal.findMany.mockResolvedValue([BASE_GOAL_ROW]);

      await service.listGoals(ACTOR_OWNER, { as: 'mentee' });

      expect(mockPolicy.menteeIdsOf).toHaveBeenCalledWith(ACTOR_OWNER.id);
      expect(mockPrisma.goal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerUserId: { in: ['mentee-uuid-1', 'mentee-uuid-2'] } },
        }),
      );
    });

    it('ownerId provided: throws ForbiddenException when policy denies view', async () => {
      mockPolicy.canViewGoal.mockResolvedValue(false);

      await expect(
        service.listGoals(ACTOR_OTHER, { ownerId: ACTOR_OWNER.id }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // --- getGoal ---------------------------------------------------------------

  describe('getGoal()', () => {
    it('throws NotFoundException when goal does not exist', async () => {
      mockPrisma.goal.findUnique.mockResolvedValue(null);

      await expect(
        service.getGoal(ACTOR_OWNER, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('calls assertCanViewGoal and returns GoalDto', async () => {
      mockPrisma.goal.findUnique.mockResolvedValue(BASE_GOAL_ROW);
      mockPolicy.assertCanViewGoal.mockResolvedValue(undefined);

      const result = await service.getGoal(ACTOR_OWNER, BASE_GOAL_ROW.id);

      expect(mockPolicy.assertCanViewGoal).toHaveBeenCalledWith(
        ACTOR_OWNER,
        expect.objectContaining({ ownerUserId: ACTOR_OWNER.id }),
      );
      expect(result.id).toBe(BASE_GOAL_ROW.id);
    });
  });

  // --- updateGoal ------------------------------------------------------------

  describe('updateGoal()', () => {
    it('throws NotFoundException when goal does not exist', async () => {
      mockPrisma.goal.findUnique.mockResolvedValue(null);

      await expect(
        service.updateGoal(ACTOR_OWNER, 'nonexistent-id', { title: 'New Title' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('calls assertCanEditGoal and throws when it throws (non-owner)', async () => {
      mockPrisma.goal.findUnique.mockResolvedValue(BASE_GOAL_ROW);
      mockPolicy.assertCanEditGoal.mockImplementation(() => {
        throw new ForbiddenException('Only the goal owner may modify it');
      });

      await expect(
        service.updateGoal(ACTOR_OTHER, BASE_GOAL_ROW.id, { title: 'New Title' }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPolicy.assertCanEditGoal).toHaveBeenCalledWith(
        ACTOR_OTHER,
        expect.objectContaining({ ownerUserId: ACTOR_OWNER.id }),
      );
    });

    it('updates fields and returns GoalDto', async () => {
      mockPrisma.goal.findUnique.mockResolvedValue(BASE_GOAL_ROW);
      mockPolicy.assertCanEditGoal.mockReturnValue(undefined);
      mockPrisma.goal.update.mockResolvedValue({
        ...BASE_GOAL_ROW,
        title: 'Updated Title',
      });

      const result = await service.updateGoal(ACTOR_OWNER, BASE_GOAL_ROW.id, {
        title: 'Updated Title',
      });

      expect(result.title).toBe('Updated Title');
      const updateCall = mockPrisma.goal.update.mock.calls[0][0];
      expect(updateCall.data.title).toBe('Updated Title');
    });
  });
});
