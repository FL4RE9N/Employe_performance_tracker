import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  createGoalSchema,
  updateGoalSchema,
  GoalScopeSchema,
} from '@perf-tracker/shared';
import type { GoalScope } from '@perf-tracker/shared';
import { GoalsService } from './goals.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '@perf-tracker/shared';

@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  async createGoal(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    const parsed = createGoalSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.goalsService.createGoal(user, parsed.data);
  }

  @Get()
  async listGoals(
    @CurrentUser() user: SessionUser,
    @Query('as') as_raw?: string,
    @Query('ownerId') ownerId?: string,
  ) {
    let as: GoalScope | undefined;
    if (as_raw !== undefined) {
      const parsed = GoalScopeSchema.safeParse(as_raw);
      if (!parsed.success) {
        throw new BadRequestException(`Invalid 'as' value: ${as_raw}`);
      }
      as = parsed.data;
    }
    return this.goalsService.listGoals(user, { as, ownerId });
  }

  @Get(':id')
  async getGoal(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.goalsService.getGoal(user, id);
  }

  @Patch(':id')
  async updateGoal(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = updateGoalSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.goalsService.updateGoal(user, id, parsed.data);
  }

  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  async deleteGoal(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.goalsService.deleteGoal(user, id);
  }
}
