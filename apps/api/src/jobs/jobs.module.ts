import { Module } from '@nestjs/common';
import { NotificationModule } from '../notifications/notification.module';
import { ReminderService } from './reminder.service';
import { JobsController } from './jobs.controller';

@Module({
  imports: [NotificationModule],
  controllers: [JobsController],
  providers: [ReminderService],
  exports: [ReminderService],
})
export class JobsModule {}
