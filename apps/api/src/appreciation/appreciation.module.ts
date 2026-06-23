import { Module } from '@nestjs/common';
import { NotificationModule } from '../notifications/notification.module';
import { AppreciationController } from './appreciation.controller';
import { AppreciationService } from './appreciation.service';

@Module({
  imports: [NotificationModule],
  controllers: [AppreciationController],
  providers: [AppreciationService],
  exports: [AppreciationService],
})
export class AppreciationModule {}
