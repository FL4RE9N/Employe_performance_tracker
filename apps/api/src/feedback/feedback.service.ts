import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import type { SessionUser } from '@perf-tracker/shared';
import type {
  CreateFeedbackRequestInput,
  SubmitFeedbackInput,
  FeedbackBox,
  FeedbackRequestDto,
  FeedbackResponseDto,
} from '@perf-tracker/shared';

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

type ResponseRow = {
  id: string;
  requestId: string;
  authorUserId: string;
  body: string;
  visibility: string;
  createdAt: Date;
  author: { displayName: string };
};

type RequestRow = {
  id: string;
  requesterUserId: string;
  targetUserId: string;
  cycleId: string | null;
  prompt: string;
  status: string;
  dueDate: Date | null;
  anonymity: boolean;
  createdAt: Date;
  requester: { displayName: string };
  target: { displayName: string };
  responses: ResponseRow[];
};

// ---------------------------------------------------------------------------
// Includes
// ---------------------------------------------------------------------------

const REQUEST_INCLUDE = {
  requester: { select: { displayName: true } },
  target: { select: { displayName: true } },
  responses: {
    include: {
      author: { select: { displayName: true } },
    },
  },
} as const;

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

function toResponseDto(response: ResponseRow, anonymity: boolean): FeedbackResponseDto {
  return {
    id: response.id,
    authorName: anonymity ? null : response.author.displayName,
    body: response.body,
    createdAt: response.createdAt.toISOString(),
  };
}

function toRequestDto(row: RequestRow): FeedbackRequestDto {
  return {
    id: row.id,
    requesterUserId: row.requesterUserId,
    requesterName: row.requester.displayName,
    targetUserId: row.targetUserId,
    targetName: row.target.displayName,
    prompt: row.prompt,
    status: row.status as FeedbackRequestDto['status'],
    dueDate: row.dueDate ? row.dueDate.toISOString() : null,
    anonymity: row.anonymity,
    createdAt: row.createdAt.toISOString(),
    responses: row.responses.map((r) => toResponseDto(r, row.anonymity)),
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  async createRequest(
    actor: SessionUser,
    input: CreateFeedbackRequestInput,
  ): Promise<FeedbackRequestDto> {
    if (input.targetUserId === actor.id) {
      throw new BadRequestException('You cannot request feedback from yourself');
    }

    const request = await this.prisma.feedbackRequest.create({
      data: {
        requesterUserId: actor.id,
        targetUserId: input.targetUserId,
        prompt: input.prompt ?? '',
        status: 'pending' as any,
        dueDate: input.dueDate ?? null,
        anonymity: input.anonymity ?? false,
      },
      include: REQUEST_INCLUDE,
    });

    await this.notifications.create({
      recipientUserId: input.targetUserId,
      type: 'feedback_requested',
      entityRef: { entity: 'feedbackRequest', id: request.id },
    });

    return toRequestDto(request as unknown as RequestRow);
  }

  async list(actor: SessionUser, box: FeedbackBox): Promise<FeedbackRequestDto[]> {
    const where =
      box === 'received'
        ? { targetUserId: actor.id }
        : { requesterUserId: actor.id };

    const rows = await this.prisma.feedbackRequest.findMany({
      where,
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return (rows as unknown as RequestRow[]).map((r) => toRequestDto(r));
  }

  async getRequest(actor: SessionUser, id: string): Promise<FeedbackRequestDto> {
    const row = await this.prisma.feedbackRequest.findUnique({
      where: { id },
      include: REQUEST_INCLUDE,
    });

    if (!row) {
      throw new NotFoundException(`FeedbackRequest not found: ${id}`);
    }

    const request = row as unknown as RequestRow;
    const isRequester = actor.id === request.requesterUserId;
    const isTarget = actor.id === request.targetUserId;
    const isAdmin = actor.role === 'admin';

    if (!isRequester && !isTarget && !isAdmin) {
      throw new ForbiddenException('You do not have access to this feedback request');
    }

    return toRequestDto(request);
  }

  async submitResponse(
    actor: SessionUser,
    requestId: string,
    input: SubmitFeedbackInput,
  ): Promise<FeedbackRequestDto> {
    const row = await this.prisma.feedbackRequest.findUnique({
      where: { id: requestId },
      include: REQUEST_INCLUDE,
    });

    if (!row) {
      throw new NotFoundException(`FeedbackRequest not found: ${requestId}`);
    }

    const request = row as unknown as RequestRow;

    if (actor.id !== request.targetUserId) {
      throw new ForbiddenException('Only the requested colleague can submit a response');
    }

    await this.prisma.feedbackResponse.create({
      data: {
        requestId,
        authorUserId: actor.id,
        body: input.body,
        visibility: (input.visibility ?? 'restricted') as any,
      },
    });

    const updated = await this.prisma.feedbackRequest.update({
      where: { id: requestId },
      data: { status: 'completed' as any },
      include: REQUEST_INCLUDE,
    });

    await this.notifications.create({
      recipientUserId: request.requesterUserId,
      type: 'feedback_submitted',
      entityRef: { entity: 'feedbackRequest', id: requestId },
    });

    return toRequestDto(updated as unknown as RequestRow);
  }

  async decline(actor: SessionUser, requestId: string): Promise<FeedbackRequestDto> {
    const row = await this.prisma.feedbackRequest.findUnique({
      where: { id: requestId },
      include: REQUEST_INCLUDE,
    });

    if (!row) {
      throw new NotFoundException(`FeedbackRequest not found: ${requestId}`);
    }

    const request = row as unknown as RequestRow;

    if (actor.id !== request.targetUserId) {
      throw new ForbiddenException('Only the requested colleague can decline a request');
    }

    const updated = await this.prisma.feedbackRequest.update({
      where: { id: requestId },
      data: { status: 'declined' as any },
      include: REQUEST_INCLUDE,
    });

    return toRequestDto(updated as unknown as RequestRow);
  }
}
