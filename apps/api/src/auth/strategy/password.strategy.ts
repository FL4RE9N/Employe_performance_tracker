import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { IAuthStrategy } from './auth-strategy.interface';

type VerifyResult = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  isActive: boolean;
} | null;

@Injectable()
export class PasswordAuthStrategy implements IAuthStrategy {
  constructor(private readonly prisma: PrismaService) {}

  async verify(credentials: { email: string; password: string }): Promise<VerifyResult> {
    const { email, password } = credentials;

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive || !user.passwordHash) {
      return null;
    }

    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      isActive: user.isActive,
    };
  }
}
