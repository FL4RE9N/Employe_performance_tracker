import { Module } from '@nestjs/common';
import { ReminderService } from './reminder.service';
import { JobsController } from './jobs.controller';

@Module({
  controllers: [JobsController],
  providers: [ReminderService],
  exports: [ReminderService],
})
export class JobsModule {}
