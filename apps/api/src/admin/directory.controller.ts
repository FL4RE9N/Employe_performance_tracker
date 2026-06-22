import { Controller, Get } from '@nestjs/common';
import { AdminService } from './admin.service';

/**
 * GET /directory
 * Returns active users for @mention / feedback-target pickers.
 * Any authenticated user may call this — no @Roles guard.
 */
@Controller('directory')
export class DirectoryController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  listDirectory() {
    return this.adminService.listDirectory();
  }
}
