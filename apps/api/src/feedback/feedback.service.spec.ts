import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';

// ---------------------------------------------------------------------------
// Hand-mocked PrismaService — no Nest container, no database
// ---------------------------------------------------------------------------

const mockPrisma = {
  feedbackRequest: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  feedbackResponse: {
    create: vi.fn(),
  },
} as any;

// ---------------------------------------------------------------------------
// Hand-mocked NotificationService
// ---------------------------------------------------------------------------

const mockNotifications = {
  create: vi.fn(),
} as any;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const REQUESTER = { id: 'requester-id', email: 'alice@example.com', displayName: 'Alice', role: 'user' as const };
const TARGET = { id: 'target-id', email: 'bob@example.com', displayName: 'Bob', role: 'user' as const };
const ADMIN = { id: 'admin-id', email: 'admin@example.com', displayName: 'Admin', role: 'admin' as const };
const OTHER = { id: 'other-id', email: 'other@example.com', displayName: 'Other', role: 'user' as const };

const BASE_REQUEST = {
  id: 'request-uuid-1',
  requesterUserId: REQUESTER.id,
  targetUserId: TARGET.id,
  cycleId: null,
  prompt: 'Please share feedback',
  status: 'pending',
  dueDate: null,
  anonymity: false,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  requester: { displayName: 'Alice' },
  target: { displayName: 'Bob' },
  responses: [],
};

const BASE_RESPONSE = {
  id: 'response-uuid-1',
  requestId: 'request-uuid-1',
  authorUserId: TARGET.id,
  body: 'Great work!',
  visibility: 'restricted',
  createdAt: new Date('2024-01-02T00:00:00.000Z'),
  author: { displayName: 'Bob' },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FeedbackService', () => {
  let service: FeedbackService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FeedbackService(mockPrisma, mockNotifications);
  });

  // --- createRequest ---------------------------------------------------------

  describe('createRequest()', () => {
    it('creates a request and notifies the target (feedback_requested)', async () => {
      mockPrisma.feedbackRequest.create.mockResolvedValue(BASE_REQUEST);

      const result = await service.createRequest(REQUESTER, {
        targetUserId: TARGET.id,
        prompt: 'Please share feedback',
      });

      // Prisma create called with correct fields
      const createCall = mockPrisma.feedbackRequest.create.mock.calls[0][0];
      expect(createCall.data.requesterUserId).toBe(REQUESTER.id);
      expect(createCall.data.targetUserId).toBe(TARGET.id);
      expect(createCall.data.prompt).toBe('Please share feedback');
      expect(createCall.data.status).toBe('pending');
      expect(createCall.data.anonymity).toBe(false);

      // Notification sent to the target
      expect(mockNotifications.create).toHaveBeenCalledOnce();
      expect(mockNotifications.create).toHaveBeenCalledWith({
        recipientUserId: TARGET.id,
        type: 'feedback_requested',
        entityRef: { entity: 'feedbackRequest', id: BASE_REQUEST.id },
      });

      // DTO shape
      expect(result.id).toBe(BASE_REQUEST.id);
      expect(result.requesterUserId).toBe(REQUESTER.id);
      expect(result.targetUserId).toBe(TARGET.id);
      expect(result.status).toBe('pending');
    });

    it('defaults prompt to empty string when not provided', async () => {
      mockPrisma.feedbackRequest.create.mockResolvedValue({
        ...BASE_REQUEST,
        prompt: '',
      });

      await service.createRequest(REQUESTER, { targetUserId: TARGET.id });

      const createCall = mockPrisma.feedbackRequest.create.mock.calls[0][0];
      expect(createCall.data.prompt).toBe('');
    });

    it('rejects when targetUserId === actor.id (self-target)', async () => {
      await expect(
        service.createRequest(REQUESTER, { targetUserId: REQUESTER.id }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.feedbackRequest.create).not.toHaveBeenCalled();
      expect(mockNotifications.create).not.toHaveBeenCalled();
    });
  });

  // --- submitResponse --------------------------------------------------------

  describe('submitResponse()', () => {
    it('throws ForbiddenException when actor is not the target', async () => {
      mockPrisma.feedbackRequest.findUnique.mockResolvedValue(BASE_REQUEST);

      await expect(
        service.submitResponse(OTHER, BASE_REQUEST.id, { body: 'Some feedback' }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.feedbackResponse.create).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the requester tries to respond', async () => {
      mockPrisma.feedbackRequest.findUnique.mockResolvedValue(BASE_REQUEST);

      await expect(
        service.submitResponse(REQUESTER, BASE_REQUEST.id, { body: 'Some feedback' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates a response, sets status=completed, and notifies the requester', async () => {
      mockPrisma.feedbackRequest.findUnique.mockResolvedValue(BASE_REQUEST);

      const updatedRequest = {
        ...BASE_REQUEST,
        status: 'completed',
        responses: [BASE_RESPONSE],
      };
      mockPrisma.feedbackResponse.create.mockResolvedValue(BASE_RESPONSE);
      mockPrisma.feedbackRequest.update.mockResolvedValue(updatedRequest);

      const result = await service.submitResponse(TARGET, BASE_REQUEST.id, {
        body: 'Great work!',
      });

      // FeedbackResponse was created
      const responseCreateCall = mockPrisma.feedbackResponse.create.mock.calls[0][0];
      expect(responseCreateCall.data.requestId).toBe(BASE_REQUEST.id);
      expect(responseCreateCall.data.authorUserId).toBe(TARGET.id);
      expect(responseCreateCall.data.body).toBe('Great work!');

      // Request status updated to completed
      const updateCall = mockPrisma.feedbackRequest.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe('completed');

      // Notification sent to the requester
      expect(mockNotifications.create).toHaveBeenCalledOnce();
      expect(mockNotifications.create).toHaveBeenCalledWith({
        recipientUserId: REQUESTER.id,
        type: 'feedback_submitted',
        entityRef: { entity: 'feedbackRequest', id: BASE_REQUEST.id },
      });

      // DTO reflects completed status
      expect(result.status).toBe('completed');
    });
  });

  // --- ANONYMITY -------------------------------------------------------------

  describe('ANONYMITY', () => {
    it('returns authorName=null in mapped responses when request.anonymity=true', async () => {
      const anonymousRequest = {
        ...BASE_REQUEST,
        anonymity: true,
        responses: [BASE_RESPONSE],
      };
      mockPrisma.feedbackRequest.findUnique.mockResolvedValue(anonymousRequest);

      const result = await service.getRequest(REQUESTER, BASE_REQUEST.id);

      expect(result.anonymity).toBe(true);
      expect(result.responses).toHaveLength(1);
      expect(result.responses![0].authorName).toBeNull();
    });

    it('returns authorName equal to the author displayName when anonymity=false', async () => {
      const attributedRequest = {
        ...BASE_REQUEST,
        anonymity: false,
        responses: [BASE_RESPONSE],
      };
      mockPrisma.feedbackRequest.findUnique.mockResolvedValue(attributedRequest);

      const result = await service.getRequest(REQUESTER, BASE_REQUEST.id);

      expect(result.anonymity).toBe(false);
      expect(result.responses).toHaveLength(1);
      expect(result.responses![0].authorName).toBe('Bob');
    });
  });

  // --- getRequest ------------------------------------------------------------

  describe('getRequest()', () => {
    it('throws NotFoundException when request does not exist', async () => {
      mockPrisma.feedbackRequest.findUnique.mockResolvedValue(null);

      await expect(service.getRequest(REQUESTER, 'nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException for unrelated users', async () => {
      mockPrisma.feedbackRequest.findUnique.mockResolvedValue(BASE_REQUEST);

      await expect(service.getRequest(OTHER, BASE_REQUEST.id)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows the requester to view the request', async () => {
      mockPrisma.feedbackRequest.findUnique.mockResolvedValue(BASE_REQUEST);

      const result = await service.getRequest(REQUESTER, BASE_REQUEST.id);
      expect(result.id).toBe(BASE_REQUEST.id);
    });

    it('allows the target to view the request', async () => {
      mockPrisma.feedbackRequest.findUnique.mockResolvedValue(BASE_REQUEST);

      const result = await service.getRequest(TARGET, BASE_REQUEST.id);
      expect(result.id).toBe(BASE_REQUEST.id);
    });

    it('allows an admin to view any request', async () => {
      mockPrisma.feedbackRequest.findUnique.mockResolvedValue(BASE_REQUEST);

      const result = await service.getRequest(ADMIN, BASE_REQUEST.id);
      expect(result.id).toBe(BASE_REQUEST.id);
    });
  });

  // --- decline ---------------------------------------------------------------

  describe('decline()', () => {
    it('throws ForbiddenException when actor is not the target', async () => {
      mockPrisma.feedbackRequest.findUnique.mockResolvedValue(BASE_REQUEST);

      await expect(service.decline(OTHER, BASE_REQUEST.id)).rejects.toThrow(ForbiddenException);
    });

    it('sets status to declined when the target declines', async () => {
      mockPrisma.feedbackRequest.findUnique.mockResolvedValue(BASE_REQUEST);
      mockPrisma.feedbackRequest.update.mockResolvedValue({
        ...BASE_REQUEST,
        status: 'declined',
      });

      const result = await service.decline(TARGET, BASE_REQUEST.id);

      const updateCall = mockPrisma.feedbackRequest.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe('declined');
      expect(result.status).toBe('declined');
    });
  });
});
