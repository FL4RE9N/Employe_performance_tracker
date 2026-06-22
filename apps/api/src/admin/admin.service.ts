import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateUserInput,
  UpdateUserInput,
  CreatePairingInput,
  AdminUserDto,
  DirectoryUserDto,
  PairingDto,
} from '@perf-tracker/shared';
import type { User, MentorRelationship } from '@prisma/client';

// ---------------------------------------------------------------------------
// Mapper helpers
// ---------------------------------------------------------------------------

type UserWithoutHash = Omit<User, 'passwordHash'> & { passwordHash?: string | null };

function toAdminUserDto(user: UserWithoutHash): AdminUserDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role as AdminUserDto['role'],
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  };
}

type PairingWithNames = MentorRelationship & {
  mentee: { displayName: string };
  mentor: { displayName: string };
};

function toPairingDto(row: PairingWithNames): PairingDto {
  return {
    id: row.id,
    menteeId: row.menteeId,
    mentorId: row.mentorId,
    menteeName: row.mentee.displayName,
    mentorName: row.mentor.displayName,
    // @db.Date fields come back as Date objects; .toISOString() gives full UTC string
    // which is consistent and parseable. Callers may truncate to YYYY-MM-DD if needed.
    effectiveFrom: row.effectiveFrom.toISOString(),
    effectiveTo: row.effectiveTo ? row.effectiveTo.toISOString() : null,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Users -----------------------------------------------------------------

  async createUser(input: CreateUserInput): Promise<AdminUserDto> {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new ConflictException(`Email already registered: ${input.email}`);
    }

    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
    });

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        displayName: input.displayName,
        role: input.role,
        auth_source: 'local',
        isActive: true,
        passwordHash,
      },
    });

    // Strip passwordHash before returning
    const { passwordHash: _omitted, ...safe } = user;
    return toAdminUserDto(safe);
  }

  async listUsers(): Promise<AdminUserDto[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return users.map(({ passwordHash: _omitted, ...safe }) =>
      toAdminUserDto(safe),
    );
  }

  async getUser(id: string): Promise<AdminUserDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User not found: ${id}`);
    }
    const { passwordHash: _omitted, ...safe } = user;
    return toAdminUserDto(safe);
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<AdminUserDto> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`User not found: ${id}`);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(input.displayName !== undefined && {
          displayName: input.displayName,
        }),
        ...(input.role !== undefined && { role: input.role }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });

    const { passwordHash: _omitted, ...safe } = updated;
    return toAdminUserDto(safe);
  }

  // --- Directory -------------------------------------------------------------

  async listDirectory(): Promise<DirectoryUserDto[]> {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      orderBy: { displayName: 'asc' },
      select: { id: true, displayName: true, email: true },
    });
    return users;
  }

  // --- Pairings --------------------------------------------------------------

  async listPairings(): Promise<PairingDto[]> {
    const rows = await this.prisma.mentorRelationship.findMany({
      include: {
        mentee: { select: { displayName: true } },
        mentor: { select: { displayName: true } },
      },
    });
    return rows.map(toPairingDto);
  }

  async createPairing(input: CreatePairingInput): Promise<PairingDto> {
    // Defense-in-depth: Zod already validates, but guard here too
    if (input.menteeId === input.mentorId) {
      throw new ConflictException('mentee and mentor must be different users');
    }

    const effectiveFrom = input.effectiveFrom
      ? new Date(input.effectiveFrom)
      : new Date();

    const row = await this.prisma.mentorRelationship.create({
      data: {
        menteeId: input.menteeId,
        mentorId: input.mentorId,
        type: 'mentor',
        effectiveFrom,
      },
      include: {
        mentee: { select: { displayName: true } },
        mentor: { select: { displayName: true } },
      },
    });

    return toPairingDto(row);
  }

  async closePairing(id: string): Promise<PairingDto> {
    const existing = await this.prisma.mentorRelationship.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Pairing not found: ${id}`);
    }

    const updated = await this.prisma.mentorRelationship.update({
      where: { id },
      data: { effectiveTo: new Date() },
      include: {
        mentee: { select: { displayName: true } },
        mentor: { select: { displayName: true } },
      },
    });

    return toPairingDto(updated);
  }
}
