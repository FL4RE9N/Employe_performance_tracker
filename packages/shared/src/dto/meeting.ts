import type { CycleStatus } from '../enums';

/** A meeting in the actor's 1-on-1 list, with its cycle context for the agenda. */
export interface MeetingListItemDto {
  id: string;
  cycleId: string;
  periodLabel: string;
  menteeId: string;
  menteeName: string;
  mentorId: string;
  mentorName: string;
  scheduledStart: string;
  scheduledEnd: string;
  teamsJoinUrl: string | null;
  status: string;
  cycleStatus: CycleStatus;
}
