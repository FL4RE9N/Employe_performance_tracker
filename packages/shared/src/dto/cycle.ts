import { z } from 'zod';
import { CycleStatusSchema } from '../enums';
import type { CycleStatus, CycleScope } from '../enums';

// --- Shared date/period fields ------------------------------------------------

const periodAndDates = {
  periodLabel: z.string().min(1).max(100),
  goalsDueDate: z.coerce.date(),
  selfDueDate: z.coerce.date(),
  mentorDueDate: z.coerce.date(),
  cycleEndDate: z.coerce.date().optional(),
};

// self due must not be after mentor due (FR-5.2); goals due not after self due.
const dateOrder = (d: {
  goalsDueDate: Date;
  selfDueDate: Date;
  mentorDueDate: Date;
}) => d.goalsDueDate <= d.selfDueDate && d.selfDueDate <= d.mentorDueDate;
const dateOrderMsg = {
  message: 'dates must be ordered: goalsDueDate <= selfDueDate <= mentorDueDate',
};

// --- Create an individual cycle (one mentee/mentor pairing) -------------------

export const createCycleSchema = z
  .object({
    menteeId: z.string().uuid(),
    mentorId: z.string().uuid(),
    ...periodAndDates,
  })
  .refine((d) => d.menteeId !== d.mentorId, {
    message: 'mentee and mentor must be different users',
  })
  .refine(dateOrder, dateOrderMsg);
export type CreateCycleInput = z.infer<typeof createCycleSchema>;

// --- Launch an org-wide cycle (fans out one cycle per active mentor edge) ------

export const launchOrgWideSchema = z
  .object({ ...periodAndDates })
  .refine(dateOrder, dateOrderMsg);
export type LaunchOrgWideInput = z.infer<typeof launchOrgWideSchema>;

// --- Schedule the 1:1 review meeting ------------------------------------------

export const scheduleMeetingSchema = z
  .object({
    scheduledStart: z.coerce.date(),
    scheduledEnd: z.coerce.date(),
    teamsJoinUrl: z.string().url().max(2000).optional(),
  })
  .refine((d) => d.scheduledStart < d.scheduledEnd, {
    message: 'scheduledEnd must be after scheduledStart',
  });
export type ScheduleMeetingInput = z.infer<typeof scheduleMeetingSchema>;

// --- Generic transition (the choke-point) -------------------------------------

export const transitionSchema = z.object({
  to: CycleStatusSchema,
  meeting: scheduleMeetingSchema.optional(), // required by the engine for -> meeting_scheduled
});
export type TransitionInput = z.infer<typeof transitionSchema>;

// --- Acknowledge (employee) ---------------------------------------------------

export const acknowledgeSchema = z.object({
  comment: z.string().max(5000).optional(),
});
export type AcknowledgeInput = z.infer<typeof acknowledgeSchema>;

// --- Response -----------------------------------------------------------------

export interface MeetingDto {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  teamsJoinUrl: string | null;
  status: string;
}

export interface CycleDto {
  id: string;
  scope: CycleScope;
  periodLabel: string;
  menteeId: string;
  menteeName?: string;
  mentorId: string;
  mentorName?: string;
  status: CycleStatus;
  goalsDueDate: string;
  selfDueDate: string;
  mentorDueDate: string;
  cycleEndDate: string | null;
  openedAt: string | null;
  closedAt: string | null;
  releasedAt: string | null;
  acknowledgedAt: string | null;
  acknowledgementComment: string | null;
  meeting: MeetingDto | null;
  /** Server-computed: the statuses this actor may transition the cycle to right now. */
  availableTransitions?: CycleStatus[];
}
