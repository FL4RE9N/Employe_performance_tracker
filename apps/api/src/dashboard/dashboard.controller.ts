import { Controller, Get } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';
import type { DashboardDto } from '@perf-tracker/shared';

@Roles('admin')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  getOverview(): Promise<DashboardDto> {
    return this.dashboardService.getOverview();
  }
}
