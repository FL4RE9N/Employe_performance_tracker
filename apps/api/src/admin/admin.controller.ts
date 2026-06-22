import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  createUserSchema,
  updateUserSchema,
  createPairingSchema,
} from '@perf-tracker/shared';
import { AdminService } from './admin.service';
import { Roles } from '../auth/decorators/roles.decorator';

@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // --- Users -----------------------------------------------------------------

  @Post('users')
  async createUser(@Body() body: unknown) {
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.adminService.createUser(parsed.data);
  }

  @Get('users')
  listUsers() {
    return this.adminService.listUsers();
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id')
  async updateUser(@Param('id') id: string, @Body() body: unknown) {
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.adminService.updateUser(id, parsed.data);
  }

  // --- Pairings --------------------------------------------------------------

  @Get('pairings')
  listPairings() {
    return this.adminService.listPairings();
  }

  @Post('pairings')
  async createPairing(@Body() body: unknown) {
    const parsed = createPairingSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.adminService.createPairing(parsed.data);
  }

  @HttpCode(HttpStatus.OK)
  @Delete('pairings/:id')
  closePairing(@Param('id') id: string) {
    return this.adminService.closePairing(id);
  }
}
