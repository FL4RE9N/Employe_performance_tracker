import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReminderService } from './reminder.service';

// Hand-mocked PrismaService — no Nest container, no database
const mockPrisma = {
  reviewCycle: {
    count: vi.fn(),
  },
} as any;

describe('ReminderService', () => {
  let service: ReminderService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReminderService(mockPrisma);
  });

  it('runSweep returns the active cycle count', async () => {
    mockPrisma.reviewCycle.count.mockResolvedValue(3);

    const result = await service.runSweep();

    expect(result.activeCycles).toBe(3);
    expect(typeof result.ranAt).toBe('string');
    // Verify the prisma query excludes terminal statuses
    expect(mockPrisma.reviewCycle.count).toHaveBeenCalledWith({
      where: {
        status: {
          notIn: ['closed', 'acknowledged'],
        },
      },
    });
  });

  it('runSweep returns 0 when there are no active cycles', async () => {
    mockPrisma.reviewCycle.count.mockResolvedValue(0);

    const result = await service.runSweep();

    expect(result.activeCycles).toBe(0);
  });

  it('ranAt is a valid ISO date string', async () => {
    mockPrisma.reviewCycle.count.mockResolvedValue(1);

    const result = await service.runSweep();

    expect(() => new Date(result.ranAt)).not.toThrow();
    expect(new Date(result.ranAt).toISOString()).toBe(result.ranAt);
  });
});
