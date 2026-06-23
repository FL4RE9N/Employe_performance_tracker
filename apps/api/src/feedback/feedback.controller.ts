import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  createFeedbackRequestSchema,
  submitFeedbackSchema,
  FeedbackBoxSchema,
} from '@perf-tracker/shared';
import type { FeedbackBox, SessionUser } from '@perf-tracker/shared';
import { FeedbackService } from './feedback.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post('requests')
  async createRequest(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    const parsed = createFeedbackRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.feedbackService.createRequest(user, parsed.data);
  }

  @Get('requests')
  async list(
    @CurrentUser() user: SessionUser,
    @Query('box') boxRaw?: string,
  ) {
    let box: FeedbackBox = 'received';
    if (boxRaw !== undefined) {
      const parsed = FeedbackBoxSchema.safeParse(boxRaw);
      if (!parsed.success) {
        throw new BadRequestException(`Invalid 'box' value: ${boxRaw}`);
      }
      box = parsed.data;
    }
    return this.feedbackService.list(user, box);
  }

  @Get('requests/:id')
  async getRequest(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.feedbackService.getRequest(user, id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('requests/:id/respond')
  async submitResponse(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = submitFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.feedbackService.submitResponse(user, id, parsed.data);
  }

  @HttpCode(HttpStatus.OK)
  @Post('requests/:id/decline')
  async decline(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.feedbackService.decline(user, id);
  }
}
