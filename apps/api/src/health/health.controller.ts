import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  getHealth(): { status: string; ts: string } {
    return { status: 'ok', ts: new Date().toISOString() };
  }

  @Public()
  @Get('db')
  async getDbHealth(): Promise<{ db: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { db: 'up' };
    } catch {
      throw new HttpException({ db: 'down' }, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}
