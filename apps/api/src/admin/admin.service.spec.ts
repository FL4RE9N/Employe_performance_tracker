import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';

// ---------------------------------------------------------------------------
// Hand-mocked PrismaService — no Nest container, no database
// ---------------------------------------------------------------------------

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  mentorRelationship: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
} as any;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_USER = {
  id: 'user-uuid-1',
  email: 'alice@example.com',
  displayName: 'Alice',
  role: 'user' as const,
  isActive: true,
  auth_source: 'local' as const,
  passwordHash: 'hashed-secret',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  entra_object_id: null,
  tenant_id: null,
  upn: null,
  manager_id: null,
};

const BASE_PAIRING = {
  id: 'pairing-uuid-1',
  menteeId: 'user-uuid-1',
  mentorId: 'user-uuid-2',
  type: 'mentor' as const,
  effectiveFrom: new Date('2024-01-01T00:00:00.000Z'),
  effectiveTo: null,
  mentee: { displayName: 'Alice' },
  mentor: { displayName: 'Bob' },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdminService(mockPrisma);
  });

  // --- createUser -----------------------------------------------------------

  describe('createUser()', () => {
    it('hashes password with argon2 and returns a DTO without passwordHash', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null); // no duplicate

      // Capture the passwordHash that the service passes to prisma.user.create
      mockPrisma.user.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        ...BASE_USER,
        passwordHash: data['passwordHash'],
      }));

      const result = await service.createUser({
        email: 'alice@example.com',
        displayName: 'Alice',
        role: 'user',
        password: 'securePassword1',
      });

      // Verify prisma.user.create was called with a non-empty passwordHash
      // (argon2 actually ran and produced a hash string)
      const createCall = mockPrisma.user.create.mock.calls[0][0];
      expect(typeof createCall.data.passwordHash).toBe('string');
      expect(createCall.data.passwordHash.length).toBeGreaterThan(20);

      // Argon2id hashes start with $argon2id$
      expect(createCall.data.passwordHash).toMatch(/^\$argon2id\$/);

      // auth_source must be 'local', isActive must be true
      expect(createCall.data.auth_source).toBe('local');
      expect(createCall.data.isActive).toBe(true);

      // Returned DTO must never expose passwordHash
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.email).toBe('alice@example.com');
      expect(result.displayName).toBe('Alice');
      expect(result.role).toBe('user');
      expect(result.isActive).toBe(true);
      expect(typeof result.createdAt).toBe('string'); // ISO string
    });

    it('throws ConflictException when the email is already taken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(BASE_USER); // exists

      await expect(
        service.createUser({
          email: 'alice@example.com',
          displayName: 'Alice',
          role: 'user',
          password: 'securePassword1',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // --- updateUser -----------------------------------------------------------

  describe('updateUser()', () => {
    it('maps updated fields and returns DTO without passwordHash', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(BASE_USER);
      const updated = {
        ...BASE_USER,
        displayName: 'Alice Updated',
        role: 'admin' as const,
        isActive: false,
      };
      mockPrisma.user.update.mockResolvedValue(updated);

      const result = await service.updateUser('user-uuid-1', {
        displayName: 'Alice Updated',
        role: 'admin',
        isActive: false,
      });

      expect(result.displayName).toBe('Alice Updated');
      expect(result.role).toBe('admin');
      expect(result.isActive).toBe(false);
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUser('nonexistent-id', { displayName: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // --- createPairing --------------------------------------------------------

  describe('createPairing()', () => {
    it('defaults effectiveFrom to today and sets type to mentor', async () => {
      const before = new Date();
      mockPrisma.mentorRelationship.create.mockResolvedValue(BASE_PAIRING);

      const result = await service.createPairing({
        menteeId: 'user-uuid-1',
        mentorId: 'user-uuid-2',
        // effectiveFrom omitted — should default to today
      });

      // Verify create was called with a Date for effectiveFrom
      const createCall = mockPrisma.mentorRelationship.create.mock.calls[0][0];
      const after = new Date();
      const usedDate: Date = createCall.data.effectiveFrom;
      expect(usedDate).toBeInstanceOf(Date);
      expect(usedDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(usedDate.getTime()).toBeLessThanOrEqual(after.getTime());

      // type must be 'mentor'
      expect(createCall.data.type).toBe('mentor');

      // DTO shape
      expect(result.menteeId).toBe('user-uuid-1');
      expect(result.mentorId).toBe('user-uuid-2');
      expect(result.menteeName).toBe('Alice');
      expect(result.mentorName).toBe('Bob');
    });

    it('uses provided effectiveFrom when supplied', async () => {
      const pairingWithDate = {
        ...BASE_PAIRING,
        effectiveFrom: new Date('2025-03-01T00:00:00.000Z'),
      };
      mockPrisma.mentorRelationship.create.mockResolvedValue(pairingWithDate);

      await service.createPairing({
        menteeId: 'user-uuid-1',
        mentorId: 'user-uuid-2',
        effectiveFrom: '2025-03-01',
      });

      const createCall = mockPrisma.mentorRelationship.create.mock.calls[0][0];
      expect(createCall.data.effectiveFrom).toEqual(
        new Date('2025-03-01'),
      );
    });

    it('throws ConflictException when menteeId === mentorId', async () => {
      await expect(
        service.createPairing({
          menteeId: 'same-uuid',
          mentorId: 'same-uuid',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // --- closePairing ---------------------------------------------------------

  describe('closePairing()', () => {
    it('sets effectiveTo to today', async () => {
      mockPrisma.mentorRelationship.findUnique.mockResolvedValue(BASE_PAIRING);
      const closed = {
        ...BASE_PAIRING,
        effectiveTo: new Date(),
      };
      mockPrisma.mentorRelationship.update.mockResolvedValue(closed);

      const before = new Date();
      const result = await service.closePairing('pairing-uuid-1');
      const after = new Date();

      const updateCall = mockPrisma.mentorRelationship.update.mock.calls[0][0];
      const usedDate: Date = updateCall.data.effectiveTo;
      expect(usedDate).toBeInstanceOf(Date);
      expect(usedDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(usedDate.getTime()).toBeLessThanOrEqual(after.getTime());

      // effectiveTo in the returned DTO is a non-null ISO string
      expect(result.effectiveTo).not.toBeNull();
      expect(typeof result.effectiveTo).toBe('string');
    });

    it('throws NotFoundException when pairing does not exist', async () => {
      mockPrisma.mentorRelationship.findUnique.mockResolvedValue(null);

      await expect(service.closePairing('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // --- getUser --------------------------------------------------------------

  describe('getUser()', () => {
    it('throws NotFoundException when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUser('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns DTO when user exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(BASE_USER);

      const result = await service.getUser('user-uuid-1');

      expect(result.id).toBe('user-uuid-1');
      expect(result).not.toHaveProperty('passwordHash');
    });
  });
});
