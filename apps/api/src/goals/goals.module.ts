import { Module } from '@nestjs/common';
import { PolicyModule } from '../policy/policy.module';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';

@Module({
  imports: [PolicyModule],
  controllers: [GoalsController],
  providers: [GoalsService],
})
export class GoalsModule {}
