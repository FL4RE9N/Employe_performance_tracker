import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MAILER_SERVICE } from '../providers/mailer/mailer.tokens';
import type { IMailerService } from '../providers/mailer/mailer.interface';
import { NotificationBus } from './notification-bus';
import { NOTIFICATION_ROUTING, buildCopy, deepLink } from './notification-routing';
import type {
  NotificationType,
  EntityRef,
  NotificationDto,
  NotificationPreferenceDto,
  UpdatePreferenceInput,
} from '@perf-tracker/shared';

export interface CreateNotificationInput {
  recipientUserId: string;
  type: NotificationType;
  entityRef: EntityRef;
  /** When set, the in-app (and digest-email) rows are deduped by this key. */
  reminderKey?: string;
}

type Row = any;

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bus: NotificationBus,
    @Inject(MAILER_SERVICE) private readonly mailer: IMailerService,
  ) {}

  // --- Write primitive (called by the cycle engine + feedback/appreciation) ---

  async create(input: CreateNotificationInput): Promise<void> {
    const route = NOTIFICATION_ROUTING[input.type];
    if (!route) {
      this.logger.warn(`no routing for notification type ${input.type}`);
      return;
    }
    const pref = await this.getPreference(input.recipientUserId);
    const entityRefJson = input.entityRef as unknown as object;

    // 1) in-app feed row (idempotent for reminders)
    let row: Row | null;
    if (input.reminderKey) {
      const res = await this.prisma.notification.createMany({
        data: [
          {
            recipientUserId: input.recipientUserId,
            type: input.type,
            channel: 'in_app',
            entityRef: entityRefJson,
            reminderKey: `${input.reminderKey}:in_app`,
          },
        ],
        skipDuplicates: true,
      });
      if (res.count === 0) return; // already delivered this reminder — do not re-send anything
      row = await this.prisma.notification.findUnique({
        where: { reminderKey: `${input.reminderKey}:in_app` },
      });
    } else {
      row = await this.prisma.notification.create({
        data: {
          recipientUserId: input.recipientUserId,
          type: input.type,
          channel: 'in_app',
          entityRef: entityRefJson,
        },
      });
    }

    // 2) push live to any open SSE stream
    if (row) {
      this.bus.publish({ recipientUserId: input.recipientUserId, dto: this.toDto(row) });
    }

    // 3) email — immediately for critical / immediate-pref users; otherwise queue for the digest
    const wantsEmail =
      route.channels.includes('email') && pref.emailEnabled && pref.digestFrequency !== 'off';
    if (wantsEmail) {
      const immediate = route.priority === 'critical' || pref.digestFrequency === 'immediate';
      if (immediate) {
        await this.safeSend(input.recipientUserId, input.type, input.entityRef);
      } else {
        await this.prisma.notification.createMany({
          data: [
            {
              recipientUserId: input.recipientUserId,
              type: input.type,
              channel: 'email',
              entityRef: entityRefJson,
              reminderKey: input.reminderKey ? `${input.reminderKey}:email` : null,
            },
          ],
          skipDuplicates: true,
        });
      }
    }
  }

  // --- Reads (recipient-only) -------------------------------------------------

  async listForUser(
    userId: string,
    opts: { limit?: number } = {},
  ): Promise<{ items: NotificationDto[]; unreadCount: number }> {
    const items = await this.prisma.notification.findMany({
      where: { recipientUserId: userId, channel: 'in_app' },
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 50,
    });
    const unreadCount = await this.unreadCount(userId);
    return { items: items.map((r: Row) => this.toDto(r)), unreadCount };
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { recipientUserId: userId, channel: 'in_app', status: 'unread' },
    });
  }

  async markRead(userId: string, id: string): Promise<{ ok: true }> {
    const res = await this.prisma.notification.updateMany({
      where: { id, recipientUserId: userId },
      data: { status: 'read', readAt: new Date() },
    });
    if (res.count === 0) throw new NotFoundException('Notification not found');
    return { ok: true };
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const res = await this.prisma.notification.updateMany({
      where: { recipientUserId: userId, channel: 'in_app', status: 'unread' },
      data: { status: 'read', readAt: new Date() },
    });
    return { updated: res.count };
  }

  // --- Preferences ------------------------------------------------------------

  async getPreference(userId: string): Promise<NotificationPreferenceDto> {
    const pref = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    return {
      emailEnabled: pref?.emailEnabled ?? true,
      digestFrequency: (pref?.digestFrequency ?? 'daily') as NotificationPreferenceDto['digestFrequency'],
    };
  }

  async updatePreference(
    userId: string,
    input: UpdatePreferenceInput,
  ): Promise<NotificationPreferenceDto> {
    const pref = await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...input },
      update: { ...input },
    });
    return {
      emailEnabled: pref.emailEnabled,
      digestFrequency: pref.digestFrequency as NotificationPreferenceDto['digestFrequency'],
    };
  }

  // --- Daily digest (called from the reminder sweep) --------------------------

  async sendDailyDigests(_now: Date): Promise<{ usersEmailed: number; itemsBatched: number }> {
    const pending = await this.prisma.notification.findMany({
      where: { channel: 'email', digestBatchId: null },
      orderBy: { createdAt: 'asc' },
    });
    const byUser = new Map<string, Row[]>();
    for (const row of pending) {
      const list = byUser.get(row.recipientUserId) ?? [];
      list.push(row);
      byUser.set(row.recipientUserId, list);
    }

    let usersEmailed = 0;
    let itemsBatched = 0;
    for (const [userId, rows] of byUser) {
      const batchId = randomUUID();
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      if (user) {
        const lines = rows.map((r) => `- ${buildCopy(r.type, r.entityRef).title}`).join('\n');
        try {
          await this.mailer.sendMail({
            to: user.email,
            subject: `[Performance Tracker] Your daily summary (${rows.length})`,
            text: `You have ${rows.length} update(s):\n\n${lines}`,
            html: `<p>You have <strong>${rows.length}</strong> update(s):</p><ul>${rows
              .map((r) => `<li>${buildCopy(r.type, r.entityRef).title}</li>`)
              .join('')}</ul>`,
          });
          usersEmailed += 1;
        } catch (err) {
          this.logger.warn(`digest email to ${userId} failed: ${String(err)}`);
        }
      }
      await this.prisma.notification.updateMany({
        where: { id: { in: rows.map((r) => r.id) } },
        data: { digestBatchId: batchId },
      });
      itemsBatched += rows.length;
    }
    return { usersEmailed, itemsBatched };
  }

  // --- Internals --------------------------------------------------------------

  private async safeSend(
    userId: string,
    type: NotificationType,
    entityRef: EntityRef,
  ): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      if (!user) return;
      const copy = buildCopy(type, entityRef);
      await this.mailer.sendMail({
        to: user.email,
        subject: copy.emailSubject,
        text: copy.emailText,
        html: copy.emailHtml,
      });
    } catch (err) {
      this.logger.warn(`email (${type}) to ${userId} failed: ${String(err)}`);
    }
  }

  private toDto(row: Row): NotificationDto {
    const entityRef = (row.entityRef ?? null) as EntityRef | null;
    const copy = buildCopy(row.type, entityRef);
    return {
      id: row.id,
      type: row.type,
      channel: row.channel,
      status: row.status,
      entityRef,
      title: copy.title,
      body: copy.body,
      link: deepLink(entityRef),
      createdAt: new Date(row.createdAt).toISOString(),
      readAt: row.readAt ? new Date(row.readAt).toISOString() : null,
    };
  }
}
