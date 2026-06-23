import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AppreciationService } from './appreciation.service';
import type { SessionUser } from '@perf-tracker/shared';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const AUTHOR: SessionUser = {
  id: 'author-uuid',
  email: 'author@example.com',
  displayName: 'Author User',
  role: 'user',
};

const OTHER_USER: SessionUser = {
  id: 'other-uuid',
  email: 'other@example.com',
  displayName: 'Other User',
  role: 'user',
};

const ADMIN_USER: SessionUser = {
  id: 'admin-uuid',
  email: 'admin@example.com',
  displayName: 'Admin User',
  role: 'admin',
};

const BASE_APPRECIATION = {
  id: 'appreciation-uuid-1',
  authorUserId: AUTHOR.id,
  message: 'Great work!',
  metricTag: null,
  visibility: 'public',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  author: { displayName: 'Author User' },
  recipients: [
    {
      appreciationId: 'appreciation-uuid-1',
      recipientUserId: 'recipient-1',
      recipient: { id: 'recipient-1', displayName: 'Recipient One' },
    },
    {
      appreciationId: 'appreciation-uuid-1',
      recipientUserId: 'recipient-2',
      recipient: { id: 'recipient-2', displayName: 'Recipient Two' },
    },
  ],
  reactions: [],
};

// ---------------------------------------------------------------------------
// Hand-mocked Prisma + NotificationService
// ---------------------------------------------------------------------------

function makeService() {
  const mockPrisma = {
    appreciation: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    appreciationReaction: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    appreciationRecipient: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn() as any,
  } as any;

  const mockNotifications = {
    create: vi.fn().mockResolvedValue(undefined),
  } as any;

  const svc = new AppreciationService(mockPrisma, mockNotifications);

  return { svc, mockPrisma, mockNotifications };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AppreciationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- create ---------------------------------------------------------------

  describe('create()', () => {
    it('notifies EACH recipient with appreciation_received', async () => {
      const { svc, mockPrisma, mockNotifications } = makeService();
      const recipientUserIds = ['recipient-1', 'recipient-2', 'recipient-3'];

      mockPrisma.appreciation.create.mockResolvedValue({
        ...BASE_APPRECIATION,
        id: 'new-appreciation-id',
        recipients: recipientUserIds.map((id, i) => ({
          appreciationId: 'new-appreciation-id',
          recipientUserId: id,
          recipient: { id, displayName: `Recipient ${i + 1}` },
        })),
      });

      await svc.create(AUTHOR, {
        message: 'Great work!',
        recipientUserIds,
      });

      // notifications.create must be called once per recipient
      expect(mockNotifications.create).toHaveBeenCalledTimes(recipientUserIds.length);

      for (const recipientUserId of recipientUserIds) {
        expect(mockNotifications.create).toHaveBeenCalledWith({
          recipientUserId,
          type: 'appreciation_received',
          entityRef: { entity: 'appreciation', id: 'new-appreciation-id' },
        });
      }
    });

    it('creates appreciation with correct data and returns AppreciationDto', async () => {
      const { svc, mockPrisma } = makeService();

      mockPrisma.appreciation.create.mockResolvedValue(BASE_APPRECIATION);

      const result = await svc.create(AUTHOR, {
        message: 'Great work!',
        recipientUserIds: ['recipient-1', 'recipient-2'],
      });

      expect(result.id).toBe(BASE_APPRECIATION.id);
      expect(result.authorUserId).toBe(AUTHOR.id);
      expect(result.authorName).toBe('Author User');
      expect(result.message).toBe('Great work!');
      expect(result.recipients).toHaveLength(2);
      expect(result.createdAt).toBe(BASE_APPRECIATION.createdAt.toISOString());
      expect(result.canRemove).toBe(true); // actor is author
    });
  });

  // --- remove ---------------------------------------------------------------

  describe('remove()', () => {
    it('throws ForbiddenException when actor is not author and not admin', async () => {
      const { svc, mockPrisma } = makeService();
      mockPrisma.appreciation.findUnique.mockResolvedValue(BASE_APPRECIATION);

      await expect(svc.remove(OTHER_USER, BASE_APPRECIATION.id)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when appreciation does not exist', async () => {
      const { svc, mockPrisma } = makeService();
      mockPrisma.appreciation.findUnique.mockResolvedValue(null);

      await expect(svc.remove(AUTHOR, 'nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deletes children first then appreciation when actor is the author', async () => {
      const { svc, mockPrisma } = makeService();
      mockPrisma.appreciation.findUnique.mockResolvedValue(BASE_APPRECIATION);

      // Mock transaction to resolve with empty array (simulates 3 operations completing)
      mockPrisma.$transaction.mockResolvedValue([{ count: 0 }, { count: 2 }, BASE_APPRECIATION]);

      const result = await svc.remove(AUTHOR, BASE_APPRECIATION.id);

      expect(result).toEqual({ ok: true });
      expect(mockPrisma.$transaction).toHaveBeenCalledOnce();

      // Verify the transaction was called with 3 operations (reactions, recipients, appreciation)
      const transactionArgs = mockPrisma.$transaction.mock.calls[0][0];
      expect(Array.isArray(transactionArgs)).toBe(true);
      expect(transactionArgs).toHaveLength(3);
    });

    it('allows admin to delete an appreciation they did not author', async () => {
      const { svc, mockPrisma } = makeService();
      mockPrisma.appreciation.findUnique.mockResolvedValue(BASE_APPRECIATION);

      // Admin UUID is different from author UUID
      mockPrisma.$transaction.mockResolvedValue([{ count: 0 }, { count: 2 }, BASE_APPRECIATION]);

      const result = await svc.remove(ADMIN_USER, BASE_APPRECIATION.id);

      expect(result).toEqual({ ok: true });
      expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    });
  });

  // --- toDto (canRemove) ----------------------------------------------------

  describe('toDto — canRemove', () => {
    it('sets canRemove=true when actor is the author', async () => {
      const { svc, mockPrisma } = makeService();
      mockPrisma.appreciation.findMany.mockResolvedValue([BASE_APPRECIATION]);

      const [dto] = await svc.list(AUTHOR);
      expect(dto.canRemove).toBe(true);
    });

    it('sets canRemove=false when actor is a non-author non-admin', async () => {
      const { svc, mockPrisma } = makeService();
      mockPrisma.appreciation.findMany.mockResolvedValue([BASE_APPRECIATION]);

      const [dto] = await svc.list(OTHER_USER);
      expect(dto.canRemove).toBe(false);
    });

    it('sets canRemove=true when actor is an admin (even if not the author)', async () => {
      const { svc, mockPrisma } = makeService();
      mockPrisma.appreciation.findMany.mockResolvedValue([BASE_APPRECIATION]);

      const [dto] = await svc.list(ADMIN_USER);
      expect(dto.canRemove).toBe(true);
    });

    it('aggregates reactions by type with mine flag', async () => {
      const { svc, mockPrisma } = makeService();
      const appreciationWithReactions = {
        ...BASE_APPRECIATION,
        reactions: [
          { id: 'r1', appreciationId: 'appreciation-uuid-1', userId: AUTHOR.id, type: 'thumbs_up' },
          { id: 'r2', appreciationId: 'appreciation-uuid-1', userId: OTHER_USER.id, type: 'thumbs_up' },
          { id: 'r3', appreciationId: 'appreciation-uuid-1', userId: OTHER_USER.id, type: 'heart' },
        ],
      };
      mockPrisma.appreciation.findMany.mockResolvedValue([appreciationWithReactions]);

      const [dto] = await svc.list(AUTHOR);

      // Should have 2 reaction types
      expect(dto.reactions).toHaveLength(2);

      const thumbsUp = dto.reactions.find((r) => r.type === 'thumbs_up');
      expect(thumbsUp?.count).toBe(2);
      expect(thumbsUp?.mine).toBe(true); // AUTHOR reacted with thumbs_up

      const heart = dto.reactions.find((r) => r.type === 'heart');
      expect(heart?.count).toBe(1);
      expect(heart?.mine).toBe(false); // AUTHOR did not react with heart
    });
  });
});
