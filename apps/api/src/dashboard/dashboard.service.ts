import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { METRICS } from '@perf-tracker/shared';
import type {
  DashboardDto,
  StatusCountDto,
  MetricDistributionDto,
  SideDistributionDto,
} from '@perf-tracker/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptySide(): SideDistributionDto {
  return { distribution: [0, 0, 0, 0, 0], average: null, n: 0 };
}

type RatingRow = {
  score: number;
  metric: { key: string; label: string };
  submission: { authorSide: string };
};

function buildSide(ratings: RatingRow[]): SideDistributionDto {
  if (ratings.length === 0) return emptySide();
  const dist: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let sum = 0;
  for (const r of ratings) {
    const idx = r.score - 1; // score 1 → index 0
    if (idx >= 0 && idx < 5) {
      dist[idx]++;
      sum += r.score;
    }
  }
  const n = ratings.length;
  const average = n > 0 ? Math.round((sum / n) * 100) / 100 : null;
  return { distribution: dist, average, n };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(): Promise<DashboardDto> {
    // --- goalsByStatus -------------------------------------------------------
    const goalGroups = await this.prisma.goal.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const goalsByStatus: StatusCountDto[] = goalGroups.map((g) => ({
      status: g.status as string,
      count: g._count._all,
    }));

    // --- cyclesByStatus ------------------------------------------------------
    const cycleGroups = await this.prisma.reviewCycle.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const cyclesByStatus: StatusCountDto[] = cycleGroups.map((c) => ({
      status: c.status as string,
      count: c._count._all,
    }));

    // --- totalUsers ----------------------------------------------------------
    const totalUsers = await this.prisma.user.count();

    // --- metrics distribution ------------------------------------------------
    const rawRatings = await this.prisma.metricRating.findMany({
      include: {
        metric: { select: { key: true, label: true } },
        submission: { select: { authorSide: true } },
      },
    });

    // Group ratings by metricKey → authorSide
    type SideMap = Map<string, RatingRow[]>;
    const byMetric = new Map<string, SideMap>();

    for (const r of rawRatings as RatingRow[]) {
      const key = r.metric.key;
      if (!byMetric.has(key)) {
        byMetric.set(key, new Map<string, RatingRow[]>());
      }
      const sideMap = byMetric.get(key)!;
      const side = r.submission.authorSide;
      if (!sideMap.has(side)) {
        sideMap.set(side, []);
      }
      sideMap.get(side)!.push(r);
    }

    // Build MetricDistributionDto[] in METRICS order, filling zeros for missing
    const metrics: MetricDistributionDto[] = METRICS.map((m) => {
      const sideMap = byMetric.get(m.key) ?? new Map<string, RatingRow[]>();
      const selfRatings = sideMap.get('self') ?? [];
      const mentorRatings = sideMap.get('mentor') ?? [];
      return {
        metricKey: m.key,
        metricLabel: m.label,
        self: buildSide(selfRatings),
        mentor: buildSide(mentorRatings),
      };
    });

    return { goalsByStatus, cyclesByStatus, totalUsers, metrics };
  }
}
