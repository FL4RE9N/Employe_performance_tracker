import { Controller, Get, Param } from '@nestjs/common';
import type { SessionUser } from '@perf-tracker/shared';
import { ComparisonService } from './comparison.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('cycles')
export class ComparisonController {
  constructor(private readonly comparison: ComparisonService) {}

  @Get(':id/comparison')
  getComparison(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.comparison.getComparison(user, id);
  }

  @Get(':id/released-review')
  getReleasedReview(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.comparison.getReleasedReview(user, id);
  }
}
