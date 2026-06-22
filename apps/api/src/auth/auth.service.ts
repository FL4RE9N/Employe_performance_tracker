import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AUTH_STRATEGY, IAuthStrategy } from './strategy/auth-strategy.interface';
import { signSession } from './session/session.cookie';
import type { SessionUser } from '@perf-tracker/shared';

const SESSION_TTL_DAYS = 7;

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_STRATEGY) private readonly strategy: IAuthStrategy,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async login(credentials: {
    email: string;
    password: string;
  }): Promise<{ token: string; user: Omit<SessionUser, never> }> {
    const verified = await this.strategy.verify(credentials);

    if (!verified) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const secret = this.config.get<string>('SESSION_SECRET');
    if (!secret) {
      throw new Error('SESSION_SECRET is not configured');
    }

    const token = signSession(
      { sub: verified.id, role: verified.role },
      secret,
      SESSION_TTL_DAYS,
    );

    const user: SessionUser = {
      id: verified.id,
      email: verified.email,
      displayName: verified.displayName,
      role: verified.role as SessionUser['role'],
    };

    return { token, user };
  }

  /**
   * Load and validate a user by ID (used by SessionGuard for DB-backed validation).
   * Returns null if not found or inactive.
   */
  async validate(userId: string): Promise<SessionUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role as SessionUser['role'],
    };
  }
}
