import { Controller, Get } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '@perf-tracker/shared';

@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get()
  async listMeetings(@CurrentUser() user: SessionUser) {
    return this.meetingsService.listForUser(user);
  }
}
