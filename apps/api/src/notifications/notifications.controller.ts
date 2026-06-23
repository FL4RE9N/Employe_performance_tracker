import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Sse,
  BadRequestException,
  HttpCode,
  HttpStatus,
  type MessageEvent,
} from '@nestjs/common';
import { Observable, interval, merge } from 'rxjs';
import { map } from 'rxjs/operators';
import { updatePreferenceSchema } from '@perf-tracker/shared';
import type { SessionUser } from '@perf-tracker/shared';
import { NotificationService } from './notification.service';
import { NotificationBus } from './notification-bus';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly svc: NotificationService,
    private readonly bus: NotificationBus,
  ) {}

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.svc.listForUser(user.id);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: SessionUser) {
    return { unreadCount: await this.svc.unreadCount(user.id) };
  }

  @Get('preferences')
  getPreferences(@CurrentUser() user: SessionUser) {
    return this.svc.getPreference(user.id);
  }

  @Patch('preferences')
  updatePreferences(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    const parsed = updatePreferenceSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.svc.updatePreference(user.id, parsed.data);
  }

  /** Live in-app stream. EventSource sends the session cookie same-origin (via the Vite proxy). */
  @Sse('stream')
  stream(@CurrentUser() user: SessionUser): Observable<MessageEvent> {
    const data$ = this.bus.forUser(user.id).pipe(
      map((e): MessageEvent => ({ data: e.dto })),
    );
    // 25s heartbeat keeps idle proxies from dropping the connection (sent as a named 'ping' event).
    const heartbeat$ = interval(25_000).pipe(
      map((): MessageEvent => ({ type: 'ping', data: '' })),
    );
    return merge(data$, heartbeat$);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.svc.markRead(user.id, id);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  markAllRead(@CurrentUser() user: SessionUser) {
    return this.svc.markAllRead(user.id);
  }
}
