import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import type { SessionUser } from '@perf-tracker/shared';
import type {
  CreateAppreciationInput,
  AppreciationDto,
  AppreciationRecipientDto,
  AppreciationReactionDto,
} from '@perf-tracker/shared';
import type { MetricKey } from '@perf-tracker/shared';

// ---------------------------------------------------------------------------
// Internal row types
// ---------------------------------------------------------------------------

type ReactionRow = {
  id: string;
  appreciationId: string;
  userId: string;
  type: string;
};

type RecipientRow = {
  appreciationId: string;
  recipientUserId: string;
  recipient: { id: string; displayName: string };
};

type AppreciationRow = {
  id: string;
  authorUserId: string;
  message: string;
  metricTag: string | null;
  visibility: string;
  createdAt: Date;
  author: { displayName: string };
  recipients: RecipientRow[];
  reactions: ReactionRow[];
};

// ---------------------------------------------------------------------------
// Include clause
// ---------------------------------------------------------------------------

const APPRECIATION_INCLUDE = {
  author: { select: { displayName: true } },
  recipients: {
    include: {
      recipient: { select: { id: true, displayName: true } },
    },
  },
  reactions: true,
} as const;

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

function toDto(row: AppreciationRow, actor: SessionUser): AppreciationDto {
  // Build recipient list
  const recipients: AppreciationRecipientDto[] = row.recipients.map((r) => ({
    id: r.recipient.id,
    displayName: r.recipient.displayName,
  }));

  // Aggregate reactions by type
  const reactionMap = new Map<string, { count: number; mine: boolean }>();
  for (const reaction of row.reactions) {
    const existing = reactionMap.get(reaction.type);
    if (existing) {
      existing.count += 1;
      if (reaction.userId === actor.id) {
        existing.mine = true;
      }
    } else {
      reactionMap.set(reaction.type, {
        count: 1,
        mine: reaction.userId === actor.id,
      });
    }
  }

  const reactions: AppreciationReactionDto[] = Array.from(reactionMap.entries()).map(
    ([type, { count, mine }]) => ({ type, count, mine }),
  );

  const canRemove = actor.id === row.authorUserId || actor.role === 'admin';

  return {
    id: row.id,
    authorUserId: row.authorUserId,
    authorName: row.author.displayName,
    message: row.message,
    metricTag: (row.metricTag as MetricKey) ?? null,
    recipients,
    reactions,
    createdAt: row.createdAt.toISOString(),
    canRemove,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class AppreciationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  async create(
    actor: SessionUser,
    input: CreateAppreciationInput,
  ): Promise<AppreciationDto> {
    const appreciation = await this.prisma.appreciation.create({
      data: {
        authorUserId: actor.id,
        message: input.message,
        metricTag: (input.metricTag as any) ?? null,
        visibility: 'public',
        recipients: {
          create: input.recipientUserIds.map((recipientUserId) => ({
            recipientUserId,
          })),
        },
      },
      include: APPRECIATION_INCLUDE,
    });

    // Notify each recipient
    for (const recipientUserId of input.recipientUserIds) {
      await this.notifications.create({
        recipientUserId,
        type: 'appreciation_received',
        entityRef: { entity: 'appreciation', id: appreciation.id },
      });
    }

    return toDto(appreciation as unknown as AppreciationRow, actor);
  }

  async list(actor: SessionUser): Promise<AppreciationDto[]> {
    const appreciations = await this.prisma.appreciation.findMany({
      orderBy: { createdAt: 'desc' },
      include: APPRECIATION_INCLUDE,
    });

    return (appreciations as unknown as AppreciationRow[]).map((row) =>
      toDto(row, actor),
    );
  }

  async addReaction(
    actor: SessionUser,
    id: string,
    type: string,
  ): Promise<{ ok: true }> {
    await this.prisma.appreciationReaction.upsert({
      where: {
        appreciationId_userId_type: {
          appreciationId: id,
          userId: actor.id,
          type,
        },
      },
      create: {
        appreciationId: id,
        userId: actor.id,
        type,
      },
      update: {},
    });

    return { ok: true };
  }

  async removeReaction(
    actor: SessionUser,
    id: string,
    type: string,
  ): Promise<{ ok: true }> {
    await this.prisma.appreciationReaction.deleteMany({
      where: {
        appreciationId: id,
        userId: actor.id,
        type,
      },
    });

    return { ok: true };
  }

  async remove(actor: SessionUser, id: string): Promise<{ ok: true }> {
    const appreciation = await this.prisma.appreciation.findUnique({
      where: { id },
    });

    if (!appreciation) {
      throw new NotFoundException(`Appreciation not found: ${id}`);
    }

    if (actor.id !== appreciation.authorUserId && actor.role !== 'admin') {
      throw new ForbiddenException('Only the author or an admin can remove this appreciation');
    }

    await this.prisma.$transaction([
      this.prisma.appreciationReaction.deleteMany({
        where: { appreciationId: id },
      }),
      this.prisma.appreciationRecipient.deleteMany({
        where: { appreciationId: id },
      }),
      this.prisma.appreciation.delete({
        where: { id },
      }),
    ]);

    return { ok: true };
  }
}
