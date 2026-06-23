import { Module } from '@nestjs/common';
import { PolicyModule } from '../policy/policy.module';
import { CyclesModule } from '../cycles/cycles.module';
import { SubmissionService } from './submission.service';
import { ComparisonService } from './comparison.service';
import { SubmissionController } from './submission.controller';
import { ComparisonController } from './comparison.controller';

@Module({
  imports: [PolicyModule, CyclesModule],
  controllers: [SubmissionController, ComparisonController],
  providers: [SubmissionService, ComparisonService],
})
export class SubmissionsModule {}
