import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SessionUser } from '@perf-tracker/shared';

/**
 * PolicyService — the single, reusable server-side authorization layer.
 *
 * There is NO "mentor" role: mentor-ness is DERIVED from time-bounded
 * MentorRelationship edges (effectiveTo IS NULL, or covering the date). Every
 * mentor decision flows through here, never through @Roles. UI gating is
 * advisory only — these checks are the real enforcement (critical invariant #3).
 *
 * Slice 2 covers goals + the edge primitives. Slice 3 extends this with cycle /
 * submission / released-review visibility (reusing isMentorOf / menteeIdsOf).
 */
@Injectable()
export class PolicyService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Mentor-edge derivation (the heart of "no mentor role") ----------------

  /** True iff `mentorId` is a current mentor of `menteeId` at `atDate`. */
  async isMentorOf(
    mentorId: string,
    menteeId: string,
    atDate: Date = new Date(),
  ): Promise<boolean> {
    if (mentorId === menteeId) return false;
    const edge = await this.prisma.mentorRelationship.findFirst({
      where: {
        mentorId,
        menteeId,
        type: 'mentor',
        effectiveFrom: { lte: atDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: atDate } }],
      },
      select: { id: true },
    });
    return edge !== null;
  }

  /** The distinct mentee ids `mentorId` currently mentors at `atDate`. */
  async menteeIdsOf(
    mentorId: string,
    atDate: Date = new Date(),
  ): Promise<string[]> {
    const edges = await this.prisma.mentorRelationship.findMany({
      where: {
        mentorId,
        type: 'mentor',
        effectiveFrom: { lte: atDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: atDate } }],
      },
      select: { menteeId: true },
    });
    return [...new Set(edges.map((e) => e.menteeId))];
  }

  // --- Goals visibility (per plan/05 matrix) ---------------------------------

  /** Read: owner OR admin OR a current mentor of the owner. */
  async canViewGoal(
    actor: SessionUser,
    goal: { ownerUserId: string },
  ): Promise<boolean> {
    if (actor.role === 'admin') return true;
    if (actor.id === goal.ownerUserId) return true;
    return this.isMentorOf(actor.id, goal.ownerUserId);
  }

  /** Edit: owner only (admin gets a read-only roll-up, mentors are read-only). */
  canEditGoal(actor: SessionUser, goal: { ownerUserId: string }): boolean {
    return actor.id === goal.ownerUserId;
  }

  async assertCanViewGoal(
    actor: SessionUser,
    goal: { ownerUserId: string },
  ): Promise<void> {
    if (!(await this.canViewGoal(actor, goal))) {
      throw new ForbiddenException('Not allowed to view this goal');
    }
  }

  assertCanEditGoal(actor: SessionUser, goal: { ownerUserId: string }): void {
    if (!this.canEditGoal(actor, goal)) {
      throw new ForbiddenException('Only the goal owner may modify it');
    }
  }
}
