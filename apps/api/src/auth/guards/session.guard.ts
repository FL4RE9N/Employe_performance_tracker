import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { COOKIE_NAME, verifySession } from '../session/session.cookie';
import type { SessionUser } from '@perf-tracker/shared';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Allow routes/controllers decorated with @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user: SessionUser }>();
    const token = request.cookies?.[COOKIE_NAME] as string | undefined;

    if (!token) {
      throw new UnauthorizedException('No session cookie');
    }

    const secret = this.config.get<string>('SESSION_SECRET');
    if (!secret) {
      throw new UnauthorizedException('Session secret not configured');
    }

    const payload = verifySession(token, secret);
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Reload user from DB to ensure it's still active
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Attach normalized session user to request
    request.user = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role as SessionUser['role'],
    };

    return true;
  }
}
