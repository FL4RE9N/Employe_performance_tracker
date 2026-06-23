import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  AuthorSideSchema,
  saveDraftSchema,
  submitReviewSchema,
} from '@perf-tracker/shared';
import type { SessionUser, AuthorSide } from '@perf-tracker/shared';
import { SubmissionService } from './submission.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('cycles/:cycleId/submissions')
export class SubmissionController {
  constructor(private readonly submissions: SubmissionService) {}

  private parseSide(side: string): AuthorSide {
    const parsed = AuthorSideSchema.safeParse(side);
    if (!parsed.success) throw new BadRequestException('Invalid side');
    return parsed.data;
  }

  @Get(':side')
  get(
    @CurrentUser() user: SessionUser,
    @Param('cycleId') cycleId: string,
    @Param('side') side: string,
  ) {
    return this.submissions.getSubmission(user, cycleId, this.parseSide(side));
  }

  @Put(':side/draft')
  async saveDraft(
    @CurrentUser() user: SessionUser,
    @Param('cycleId') cycleId: string,
    @Param('side') side: string,
    @Body() body: unknown,
  ) {
    const parsed = saveDraftSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.submissions.saveDraft(
      user,
      cycleId,
      this.parseSide(side),
      parsed.data,
    );
  }

  @Post(':side/submit')
  @HttpCode(HttpStatus.OK)
  async submit(
    @CurrentUser() user: SessionUser,
    @Param('cycleId') cycleId: string,
    @Param('side') side: string,
    @Body() body: unknown,
  ) {
    const parsed = submitReviewSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.submissions.submit(
      user,
      cycleId,
      this.parseSide(side),
      parsed.data,
    );
  }
}
