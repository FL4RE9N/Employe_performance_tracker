import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { DirectoryController } from './directory.controller';
import { AdminService } from './admin.service';

@Module({
  controllers: [AdminController, DirectoryController],
  providers: [AdminService],
})
export class AdminModule {}
