import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardService } from './dashboard.service';
import { METRICS } from '@perf-tracker/shared';

// ---------------------------------------------------------------------------
// Hand-mocked PrismaService — no Nest container, no database
// ---------------------------------------------------------------------------

const mockPrisma = {
  goal: {
    groupBy: vi.fn(),
  },
  reviewCycle: {
    groupBy: vi.fn(),
  },
  user: {
    count: vi.fn(),
  },
  metricRating: {
    findMany: vi.fn(),
  },
} as any;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRating(
  metricKey: string,
  metricLabel: string,
  score: number,
  authorSide: 'self' | 'mentor',
) {
  return {
    score,
    metric: { key: metricKey, label: metricLabel },
    submission: { authorSide },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DashboardService(mockPrisma);

    // Sensible defaults — override per test
    mockPrisma.goal.groupBy.mockResolvedValue([]);
    mockPrisma.reviewCycle.groupBy.mockResolvedValue([]);
    mockPrisma.user.count.mockResolvedValue(0);
    mockPrisma.metricRating.findMany.mockResolvedValue([]);
  });

  // -------------------------------------------------------------------------
  // goalsByStatus mapping
  // -------------------------------------------------------------------------

  describe('goalsByStatus', () => {
    it('maps groupBy rows to StatusCountDto[]', async () => {
      mockPrisma.goal.groupBy.mockResolvedValue([
        { status: 'active', _count: { _all: 5 } },
        { status: 'draft', _count: { _all: 3 } },
        { status: 'done', _count: { _all: 1 } },
      ]);

      const result = await service.getOverview();

      expect(result.goalsByStatus).toEqual([
        { status: 'active', count: 5 },
        { status: 'draft', count: 3 },
        { status: 'done', count: 1 },
      ]);
    });

    it('returns empty array when no goals exist', async () => {
      mockPrisma.goal.groupBy.mockResolvedValue([]);
      const result = await service.getOverview();
      expect(result.goalsByStatus).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // cyclesByStatus mapping
  // -------------------------------------------------------------------------

  describe('cyclesByStatus', () => {
    it('maps groupBy rows to StatusCountDto[]', async () => {
      mockPrisma.reviewCycle.groupBy.mockResolvedValue([
        { status: 'not_started', _count: { _all: 2 } },
        { status: 'closed', _count: { _all: 10 } },
      ]);

      const result = await service.getOverview();

      expect(result.cyclesByStatus).toEqual([
        { status: 'not_started', count: 2 },
        { status: 'closed', count: 10 },
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // totalUsers
  // -------------------------------------------------------------------------

  describe('totalUsers', () => {
    it('returns the user count', async () => {
      mockPrisma.user.count.mockResolvedValue(42);
      const result = await service.getOverview();
      expect(result.totalUsers).toBe(42);
    });
  });

  // -------------------------------------------------------------------------
  // metrics — all 5 present even with zero data
  // -------------------------------------------------------------------------

  describe('metrics — zero data', () => {
    it('returns all 5 metrics with n=0 and average=null when there are no ratings', async () => {
      mockPrisma.metricRating.findMany.mockResolvedValue([]);

      const result = await service.getOverview();

      expect(result.metrics).toHaveLength(5);

      for (const m of result.metrics) {
        expect(m.self.n).toBe(0);
        expect(m.self.average).toBeNull();
        expect(m.self.distribution).toEqual([0, 0, 0, 0, 0]);
        expect(m.mentor.n).toBe(0);
        expect(m.mentor.average).toBeNull();
        expect(m.mentor.distribution).toEqual([0, 0, 0, 0, 0]);
      }
    });

    it('returns metrics in METRICS order with correct keys and labels', async () => {
      mockPrisma.metricRating.findMany.mockResolvedValue([]);

      const result = await service.getOverview();

      expect(result.metrics.map((m) => m.metricKey)).toEqual(
        METRICS.map((m) => m.key),
      );
      expect(result.metrics.map((m) => m.metricLabel)).toEqual(
        METRICS.map((m) => m.label),
      );
    });
  });

  // -------------------------------------------------------------------------
  // metrics — distribution + average aggregation
  // -------------------------------------------------------------------------

  describe('metrics — distribution + average', () => {
    it('builds correct distribution and average for self ratings', async () => {
      // Three self ratings for customer_satisfaction: scores 3, 4, 5
      // distribution: [0,0,1,1,1], n=3, average=(3+4+5)/3=4.00
      mockPrisma.metricRating.findMany.mockResolvedValue([
        makeRating('customer_satisfaction', 'Customer satisfaction', 3, 'self'),
        makeRating('customer_satisfaction', 'Customer satisfaction', 4, 'self'),
        makeRating('customer_satisfaction', 'Customer satisfaction', 5, 'self'),
      ]);

      const result = await service.getOverview();
      const cs = result.metrics.find((m) => m.metricKey === 'customer_satisfaction')!;

      expect(cs.self.n).toBe(3);
      expect(cs.self.distribution).toEqual([0, 0, 1, 1, 1]);
      expect(cs.self.average).toBe(4.0);

      // mentor side untouched
      expect(cs.mentor.n).toBe(0);
      expect(cs.mentor.average).toBeNull();
    });

    it('builds correct distribution and average for mentor ratings', async () => {
      // Two mentor ratings for public_speaking: scores 2, 2
      // distribution: [0,2,0,0,0], n=2, average=2.00
      mockPrisma.metricRating.findMany.mockResolvedValue([
        makeRating('public_speaking', 'Public speaking', 2, 'mentor'),
        makeRating('public_speaking', 'Public speaking', 2, 'mentor'),
      ]);

      const result = await service.getOverview();
      const ps = result.metrics.find((m) => m.metricKey === 'public_speaking')!;

      expect(ps.mentor.n).toBe(2);
      expect(ps.mentor.distribution).toEqual([0, 2, 0, 0, 0]);
      expect(ps.mentor.average).toBe(2.0);

      expect(ps.self.n).toBe(0);
      expect(ps.self.average).toBeNull();
    });

    it('correctly splits ratings by authorSide for the same metric', async () => {
      // deliverables: self scores [1,5] avg=3.00; mentor scores [3] avg=3.00
      mockPrisma.metricRating.findMany.mockResolvedValue([
        makeRating('deliverables', 'Deliverables', 1, 'self'),
        makeRating('deliverables', 'Deliverables', 5, 'self'),
        makeRating('deliverables', 'Deliverables', 3, 'mentor'),
      ]);

      const result = await service.getOverview();
      const d = result.metrics.find((m) => m.metricKey === 'deliverables')!;

      expect(d.self.n).toBe(2);
      expect(d.self.distribution).toEqual([1, 0, 0, 0, 1]);
      expect(d.self.average).toBe(3.0);

      expect(d.mentor.n).toBe(1);
      expect(d.mentor.distribution).toEqual([0, 0, 1, 0, 0]);
      expect(d.mentor.average).toBe(3.0);
    });

    it('rounds average to 2 decimal places', async () => {
      // scores 1,2,3 → sum=6, n=3, avg=2.00 (exact)
      // scores 1,2 → sum=3, n=2, avg=1.50 (exact)
      // scores 1,1,2 → sum=4, n=3, avg=1.33 (rounded)
      mockPrisma.metricRating.findMany.mockResolvedValue([
        makeRating('mentoring_activity', 'Mentee / Mentor activity', 1, 'self'),
        makeRating('mentoring_activity', 'Mentee / Mentor activity', 1, 'self'),
        makeRating('mentoring_activity', 'Mentee / Mentor activity', 2, 'self'),
      ]);

      const result = await service.getOverview();
      const ma = result.metrics.find((m) => m.metricKey === 'mentoring_activity')!;

      // 4/3 = 1.3333... → rounds to 1.33
      expect(ma.self.average).toBe(1.33);
    });

    it('keeps other metrics at zero when only one metric has ratings', async () => {
      mockPrisma.metricRating.findMany.mockResolvedValue([
        makeRating('tech_community_events', 'Technical community events', 5, 'self'),
      ]);

      const result = await service.getOverview();

      // tech_community_events has data
      const tce = result.metrics.find(
        (m) => m.metricKey === 'tech_community_events',
      )!;
      expect(tce.self.n).toBe(1);
      expect(tce.self.average).toBe(5.0);

      // All other metrics have no data
      const others = result.metrics.filter(
        (m) => m.metricKey !== 'tech_community_events',
      );
      for (const o of others) {
        expect(o.self.n).toBe(0);
        expect(o.self.average).toBeNull();
        expect(o.mentor.n).toBe(0);
        expect(o.mentor.average).toBeNull();
      }
    });
  });
});
