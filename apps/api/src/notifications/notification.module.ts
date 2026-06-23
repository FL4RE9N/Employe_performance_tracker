import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';

/**
 * NotificationModule — exports the NotificationService write primitive consumed
 * by the cycle engine (and, in later slices, feedback/appreciation). Slice 4 adds
 * the SSE controller + bus + email delivery here.
 */
@Module({
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
