import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  createAppreciationSchema,
  reactionSchema,
} from '@perf-tracker/shared';
import type { SessionUser } from '@perf-tracker/shared';
import { AppreciationService } from './appreciation.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('appreciation')
export class AppreciationController {
  constructor(private readonly appreciationService: AppreciationService) {}

  @Post()
  async create(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    const parsed = createAppreciationSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.appreciationService.create(user, parsed.data);
  }

  @Get()
  async list(@CurrentUser() user: SessionUser) {
    return this.appreciationService.list(user);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/reactions')
  async addReaction(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = reactionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.appreciationService.addReaction(user, id, parsed.data.type);
  }

  @HttpCode(HttpStatus.OK)
  @Delete(':id/reactions/:type')
  async removeReaction(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Param('type') type: string,
  ) {
    return this.appreciationService.removeReaction(user, id, type);
  }

  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  async remove(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.appreciationService.remove(user, id);
  }
}
