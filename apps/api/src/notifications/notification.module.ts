import { Module } from '@nestjs/common';
import { ProvidersModule } from '../providers/providers.module';
import { NotificationService } from './notification.service';
import { NotificationBus } from './notification-bus';
import { NotificationsController } from './notifications.controller';

/**
 * NotificationModule — the in-app SSE feed + email delivery + per-user prefs +
 * digest. ProvidersModule (global) is imported explicitly so MAILER_SERVICE is
 * available when this module is booted in isolation (tests).
 */
@Module({
  imports: [ProvidersModule],
  providers: [NotificationService, NotificationBus],
  controllers: [NotificationsController],
  exports: [NotificationService],
})
export class NotificationModule {}
