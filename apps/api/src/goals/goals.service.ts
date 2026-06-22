import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PolicyService } from '../policy/policy.service';
import type { SessionUser } from '@perf-tracker/shared';
import type {
  CreateGoalInput,
  UpdateGoalInput,
  GoalScope,
  GoalDto,
} from '@perf-tracker/shared';

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

type GoalRow = {
  id: string;
  ownerUserId: string;
  metricId: string;
  title: string;
  description: string;
  target: string | null;
  cycleId: string | null;
  status: string;
  visibility: string;
  createdAt: Date;
  updatedAt: Date;
  metric: { key: string; label: string };
  owner: { displayName: string };
};

function toGoalDto(row: GoalRow): GoalDto {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    ownerName: row.owner.displayName,
    metricKey: row.metric.key as GoalDto['metricKey'],
    metricLabel: row.metric.label,
    title: row.title,
    description: row.description,
    target: row.target ?? null,
    cycleId: row.cycleId ?? null,
    status: row.status as GoalDto['status'],
    visibility: row.visibility as GoalDto['visibility'],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const GOAL_INCLUDE = {
  metric: { select: { key: true, label: true } },
  owner: { select: { displayName: true } },
} as const;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class GoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
  ) {}

  async createGoal(actor: SessionUser, input: CreateGoalInput): Promise<GoalDto> {
    const metric = await this.prisma.metricDefinition.findUnique({
      where: { key: input.metricKey as any },
    });
    if (!metric) {
      throw new BadRequestException(`Unknown metric key: ${input.metricKey}`);
    }

    const goal = await this.prisma.goal.create({
      data: {
        ownerUserId: actor.id,
        metricId: metric.id,
        title: input.title,
        description: input.description ?? '',
        target: input.target,
        cycleId: input.cycleId,
        status: (input.status ?? 'draft') as any,
        visibility: (input.visibility ?? 'restricted') as any,
      },
      include: GOAL_INCLUDE,
    });

    return toGoalDto(goal as unknown as GoalRow);
  }

  async listGoals(
    actor: SessionUser,
    query: { as?: GoalScope; ownerId?: string },
  ): Promise<GoalDto[]> {
    let goals: GoalRow[];

    if (query.as === 'all') {
      if (actor.role !== 'admin') {
        throw new ForbiddenException('Only admins may list all goals');
      }
      goals = (await this.prisma.goal.findMany({
        include: GOAL_INCLUDE,
        orderBy: { createdAt: 'desc' },
      })) as unknown as GoalRow[];
    } else if (query.ownerId) {
      const canView = await this.policy.canViewGoal(actor, {
        ownerUserId: query.ownerId,
      });
      if (!canView) {
        throw new ForbiddenException('Not allowed to view goals of this user');
      }
      goals = (await this.prisma.goal.findMany({
        where: { ownerUserId: query.ownerId },
        include: GOAL_INCLUDE,
        orderBy: { createdAt: 'desc' },
      })) as unknown as GoalRow[];
    } else if (query.as === 'mentee') {
      const ids = await this.policy.menteeIdsOf(actor.id);
      goals = (await this.prisma.goal.findMany({
        where: { ownerUserId: { in: ids } },
        include: GOAL_INCLUDE,
        orderBy: { createdAt: 'desc' },
      })) as unknown as GoalRow[];
    } else {
      // default: 'mine'
      goals = (await this.prisma.goal.findMany({
        where: { ownerUserId: actor.id },
        include: GOAL_INCLUDE,
        orderBy: { createdAt: 'desc' },
      })) as unknown as GoalRow[];
    }

    return goals.map(toGoalDto);
  }

  async getGoal(actor: SessionUser, id: string): Promise<GoalDto> {
    const goal = await this.prisma.goal.findUnique({
      where: { id },
      include: GOAL_INCLUDE,
    });
    if (!goal) {
      throw new NotFoundException(`Goal not found: ${id}`);
    }
    await this.policy.assertCanViewGoal(actor, goal as unknown as GoalRow);
    return toGoalDto(goal as unknown as GoalRow);
  }

  async updateGoal(
    actor: SessionUser,
    id: string,
    input: UpdateGoalInput,
  ): Promise<GoalDto> {
    const goal = await this.prisma.goal.findUnique({
      where: { id },
      include: GOAL_INCLUDE,
    });
    if (!goal) {
      throw new NotFoundException(`Goal not found: ${id}`);
    }
    this.policy.assertCanEditGoal(actor, goal as unknown as GoalRow);

    let metricId: string | undefined;
    if (input.metricKey) {
      const metric = await this.prisma.metricDefinition.findUnique({
        where: { key: input.metricKey as any },
      });
      if (!metric) {
        throw new BadRequestException(`Unknown metric key: ${input.metricKey}`);
      }
      metricId = metric.id;
    }

    const updated = await this.prisma.goal.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.target !== undefined && { target: input.target }),
        ...(input.status !== undefined && { status: input.status as any }),
        ...(input.visibility !== undefined && { visibility: input.visibility as any }),
        ...(metricId !== undefined && { metricId }),
      },
      include: GOAL_INCLUDE,
    });

    return toGoalDto(updated as unknown as GoalRow);
  }

  async deleteGoal(actor: SessionUser, id: string): Promise<{ ok: boolean }> {
    const goal = await this.prisma.goal.findUnique({
      where: { id },
      include: GOAL_INCLUDE,
    });
    if (!goal) {
      throw new NotFoundException(`Goal not found: ${id}`);
    }
    this.policy.assertCanEditGoal(actor, goal as unknown as GoalRow);
    await this.prisma.goal.delete({ where: { id } });
    return { ok: true };
  }
}
