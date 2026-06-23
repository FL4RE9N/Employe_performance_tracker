import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { NotificationType, EntityRef } from '@perf-tracker/shared';

export interface CreateNotificationInput {
  recipientUserId: string;
  type: NotificationType;
  entityRef: EntityRef;
}

/**
 * NotificationService — minimal write primitive (Slice 3). Persists an in-app
 * Notification row. Slice 4 extends this with the SSE bus, email delivery via
 * MailerService, priority routing, per-user preferences, and digest batching.
 */
@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateNotificationInput): Promise<void> {
    await this.prisma.notification.create({
      data: {
        recipientUserId: input.recipientUserId,
        type: input.type,
        channel: 'in_app',
        entityRef: input.entityRef as unknown as object,
      },
    });
  }
}
