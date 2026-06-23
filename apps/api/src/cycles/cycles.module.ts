import { Module } from '@nestjs/common';
import { PolicyModule } from '../policy/policy.module';
import { NotificationModule } from '../notifications/notification.module';
import { CycleService } from './cycle.service';
import { CycleController } from './cycle.controller';

@Module({
  imports: [PolicyModule, NotificationModule],
  controllers: [CycleController],
  providers: [CycleService],
  exports: [CycleService],
})
export class CyclesModule {}
