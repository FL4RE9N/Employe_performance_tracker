import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MeetingsService } from './meetings.service';
import type { SessionUser } from '@perf-tracker/shared';

// ---------------------------------------------------------------------------
// Hand-mocked PrismaService — no Nest container, no database
// ---------------------------------------------------------------------------

const mockPrisma = {
  reviewCycle: {
    findMany: vi.fn(),
  },
} as any;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MEETING_A = {
  id: 'meeting-uuid-a',
  organizerUserId: 'mentor-uuid-1',
  scheduledStart: new Date('2025-06-01T10:00:00.000Z'),
  scheduledEnd: new Date('2025-06-01T11:00:00.000Z'),
  teamsJoinUrl: 'https://teams.microsoft.com/join/abc',
  status: 'scheduled',
};

const MEETING_B = {
  id: 'meeting-uuid-b',
  organizerUserId: 'mentor-uuid-2',
  scheduledStart: new Date('2025-03-15T14:00:00.000Z'),
  scheduledEnd: new Date('2025-03-15T15:00:00.000Z'),
  teamsJoinUrl: null,
  status: 'held',
};

const CYCLE_A = {
  id: 'cycle-uuid-a',
  periodLabel: '2025-H1',
  menteeId: 'mentee-uuid-1',
  mentorId: 'mentor-uuid-1',
  status: 'meeting_scheduled',
  meetingId: MEETING_A.id,
  meeting: MEETING_A,
  mentee: { displayName: 'Alice' },
  mentor: { displayName: 'Bob' },
};

const CYCLE_B = {
  id: 'cycle-uuid-b',
  periodLabel: '2024-H2',
  menteeId: 'mentee-uuid-2',
  mentorId: 'mentor-uuid-2',
  status: 'closed',
  meetingId: MEETING_B.id,
  meeting: MEETING_B,
  mentee: { displayName: 'Charlie' },
  mentor: { displayName: 'Dave' },
};

const ACTOR_ADMIN: SessionUser = {
  id: 'admin-uuid',
  email: 'admin@example.com',
  displayName: 'Admin',
  role: 'admin',
};

const ACTOR_MENTEE: SessionUser = {
  id: 'mentee-uuid-1',
  email: 'alice@example.com',
  displayName: 'Alice',
  role: 'user',
};

const ACTOR_MENTOR: SessionUser = {
  id: 'mentor-uuid-1',
  email: 'bob@example.com',
  displayName: 'Bob',
  role: 'user',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MeetingsService', () => {
  let service: MeetingsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MeetingsService(mockPrisma);
  });

  // --- Admin sees all meetings ----------------------------------------------

  describe('listForUser() — admin actor', () => {
    it('queries with no menteeId/mentorId OR filter (admin sees all)', async () => {
      mockPrisma.reviewCycle.findMany.mockResolvedValue([CYCLE_A, CYCLE_B]);

      const result = await service.listForUser(ACTOR_ADMIN);

      const call = mockPrisma.reviewCycle.findMany.mock.calls[0][0];
      // Admin where clause must NOT contain an OR with menteeId/mentorId
      expect(call.where).not.toHaveProperty('OR');
      // Must still filter for meetingId not null
      expect(call.where).toHaveProperty('meetingId');

      expect(result).toHaveLength(2);
    });

    it('maps all fields correctly to MeetingListItemDto', async () => {
      mockPrisma.reviewCycle.findMany.mockResolvedValue([CYCLE_A]);

      const result = await service.listForUser(ACTOR_ADMIN);

      expect(result).toHaveLength(1);
      const dto = result[0];
      expect(dto.id).toBe(MEETING_A.id);
      expect(dto.cycleId).toBe(CYCLE_A.id);
      expect(dto.periodLabel).toBe('2025-H1');
      expect(dto.menteeId).toBe('mentee-uuid-1');
      expect(dto.menteeName).toBe('Alice');
      expect(dto.mentorId).toBe('mentor-uuid-1');
      expect(dto.mentorName).toBe('Bob');
      expect(dto.scheduledStart).toBe(MEETING_A.scheduledStart.toISOString());
      expect(dto.scheduledEnd).toBe(MEETING_A.scheduledEnd.toISOString());
      expect(dto.teamsJoinUrl).toBe('https://teams.microsoft.com/join/abc');
      expect(dto.status).toBe('scheduled');
      expect(dto.cycleStatus).toBe('meeting_scheduled');
    });

    it('maps teamsJoinUrl to null when absent', async () => {
      mockPrisma.reviewCycle.findMany.mockResolvedValue([CYCLE_B]);

      const result = await service.listForUser(ACTOR_ADMIN);

      expect(result[0].teamsJoinUrl).toBeNull();
    });
  });

  // --- Non-admin (mentee) sees only their meetings ---------------------------

  describe('listForUser() — mentee actor', () => {
    it('queries with OR filter [menteeId, mentorId] for non-admin', async () => {
      mockPrisma.reviewCycle.findMany.mockResolvedValue([CYCLE_A]);

      await service.listForUser(ACTOR_MENTEE);

      const call = mockPrisma.reviewCycle.findMany.mock.calls[0][0];
      expect(call.where).toHaveProperty('OR');
      const orClauses = call.where.OR as Array<Record<string, string>>;
      expect(orClauses).toContainEqual({ menteeId: ACTOR_MENTEE.id });
      expect(orClauses).toContainEqual({ mentorId: ACTOR_MENTEE.id });
    });

    it('returns only cycles where actor is mentee or mentor', async () => {
      mockPrisma.reviewCycle.findMany.mockResolvedValue([CYCLE_A]);

      const result = await service.listForUser(ACTOR_MENTEE);

      expect(result).toHaveLength(1);
      expect(result[0].menteeId).toBe(ACTOR_MENTEE.id);
    });
  });

  // --- Non-admin (mentor) sees only their meetings ---------------------------

  describe('listForUser() — mentor actor', () => {
    it('queries with OR filter using mentor actor id', async () => {
      mockPrisma.reviewCycle.findMany.mockResolvedValue([CYCLE_A]);

      await service.listForUser(ACTOR_MENTOR);

      const call = mockPrisma.reviewCycle.findMany.mock.calls[0][0];
      expect(call.where).toHaveProperty('OR');
      const orClauses = call.where.OR as Array<Record<string, string>>;
      expect(orClauses).toContainEqual({ menteeId: ACTOR_MENTOR.id });
      expect(orClauses).toContainEqual({ mentorId: ACTOR_MENTOR.id });
    });
  });

  // --- Ordering and null-meeting skipping -----------------------------------

  describe('listForUser() — ordering', () => {
    it('sorts results by scheduledStart descending', async () => {
      // CYCLE_B has an earlier meeting (March), CYCLE_A has a later one (June)
      // Return them in wrong order and verify service sorts correctly
      mockPrisma.reviewCycle.findMany.mockResolvedValue([CYCLE_B, CYCLE_A]);

      const result = await service.listForUser(ACTOR_ADMIN);

      expect(result[0].id).toBe(MEETING_A.id); // June first
      expect(result[1].id).toBe(MEETING_B.id); // March second
    });

    it('skips cycles whose meeting is null', async () => {
      const cycleWithNullMeeting = {
        ...CYCLE_A,
        meeting: null,
        meetingId: null,
      };
      mockPrisma.reviewCycle.findMany.mockResolvedValue([
        cycleWithNullMeeting,
        CYCLE_B,
      ]);

      const result = await service.listForUser(ACTOR_ADMIN);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(MEETING_B.id);
    });
  });
});
