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
  createCycleSchema,
  launchOrgWideSchema,
  transitionSchema,
  acknowledgeSchema,
} from '@perf-tracker/shared';
import type { SessionUser } from '@perf-tracker/shared';
import { CycleService } from './cycle.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('cycles')
export class CycleController {
  constructor(private readonly cycles: CycleService) {}

  @Post()
  @Roles('admin')
  async create(@Body() body: unknown) {
    const parsed = createCycleSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.cycles.createCycle(parsed.data);
  }

  @Post('launch-org-wide')
  @Roles('admin')
  async launchOrgWide(@Body() body: unknown) {
    const parsed = launchOrgWideSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.cycles.launchOrgWide(parsed.data);
  }

  @Get()
  list(@CurrentUser() user: SessionUser, @Query('as') as?: string) {
    const scope =
      as === 'all' || as === 'mentee' || as === 'mine' ? as : undefined;
    return this.cycles.listCycles(user, scope);
  }

  @Get(':id')
  get(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.cycles.getCycle(user, id);
  }

  @Post(':id/transition')
  @HttpCode(HttpStatus.OK)
  async transition(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = transitionSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.cycles.transition(id, parsed.data.to, user, {
      meeting: parsed.data.meeting,
    });
  }

  @Post(':id/release')
  @HttpCode(HttpStatus.OK)
  release(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.cycles.transition(id, 'released_to_employee', user);
  }

  @Post(':id/acknowledge')
  @HttpCode(HttpStatus.OK)
  async acknowledge(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = acknowledgeSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.cycles.transition(id, 'acknowledged', user, {
      comment: parsed.data.comment,
    });
  }
}
