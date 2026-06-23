import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SessionUser, MeetingListItemDto, CycleStatus } from '@perf-tracker/shared';

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

type MeetingRow = {
  id: string;
  organizerUserId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  teamsJoinUrl: string | null;
  status: string;
};

type CycleWithMeeting = {
  id: string;
  periodLabel: string;
  menteeId: string;
  mentorId: string;
  status: string;
  meetingId: string | null;
  meeting: MeetingRow | null;
  mentee: { displayName: string };
  mentor: { displayName: string };
};

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

function toCycleStatus(s: string): CycleStatus {
  return s as CycleStatus;
}

function toDto(cycle: CycleWithMeeting): MeetingListItemDto | null {
  const m = cycle.meeting;
  if (!m) return null;

  return {
    id: m.id,
    cycleId: cycle.id,
    periodLabel: cycle.periodLabel,
    menteeId: cycle.menteeId,
    menteeName: cycle.mentee.displayName,
    mentorId: cycle.mentorId,
    mentorName: cycle.mentor.displayName,
    scheduledStart: m.scheduledStart.toISOString(),
    scheduledEnd: m.scheduledEnd.toISOString(),
    teamsJoinUrl: m.teamsJoinUrl ?? null,
    status: m.status,
    cycleStatus: toCycleStatus(cycle.status),
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class MeetingsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(actor: SessionUser): Promise<MeetingListItemDto[]> {
    const where =
      actor.role === 'admin'
        ? { meetingId: { not: null as unknown as string } }
        : {
            meetingId: { not: null as unknown as string },
            OR: [{ menteeId: actor.id }, { mentorId: actor.id }],
          };

    const cycles = (await this.prisma.reviewCycle.findMany({
      where,
      include: {
        meeting: true,
        mentee: { select: { displayName: true } },
        mentor: { select: { displayName: true } },
      },
      orderBy: { periodLabel: 'desc' },
    })) as unknown as CycleWithMeeting[];

    // Sort by scheduledStart descending in JS (Prisma cannot order by a relation field directly)
    cycles.sort((a, b) => {
      const aTime = a.meeting ? new Date(a.meeting.scheduledStart).getTime() : 0;
      const bTime = b.meeting ? new Date(b.meeting.scheduledStart).getTime() : 0;
      return bTime - aTime;
    });

    const results: MeetingListItemDto[] = [];
    for (const cycle of cycles) {
      const dto = toDto(cycle);
      if (dto) results.push(dto);
    }
    return results;
  }
}
