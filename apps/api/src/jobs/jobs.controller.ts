import { Controller, Post } from '@nestjs/common';
import { ReminderService, SweepResult } from './reminder.service';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('jobs')
export class JobsController {
  constructor(private readonly reminderService: ReminderService) {}

  /**
   * Manual dev/admin trigger for the reminder sweep.
   * Guarded by @Roles('admin') — only admin users may trigger it.
   * Useful for testing without waiting for the 2 AM cron.
   */
  @Post('run-reminder-sweep')
  @Roles('admin')
  runReminderSweep(): Promise<SweepResult> {
    return this.reminderService.runSweep();
  }
}
