import { z } from 'zod';
import type { NotificationChannel, NotificationStatus } from './enums';

/**
 * Notification event catalog (plan/05). The cycle engine + reminder sweep +
 * feedback/appreciation features emit these `type` values.
 */
export const NOTIFICATION_TYPE_VALUES = [
  'self_assessment_due', // -> mentee
  'mentor_assessment_open', // -> mentor (open / due)
  'cycle_ending', // -> mentor (T-30/14/7/3 escalation)
  'schedule_call', // -> mentor (on/after cycle end)
  'meeting_scheduled', // -> both
  'review_released', // -> mentee
  'feedback_requested', // -> recipient
  'feedback_submitted', // -> requester
  'appreciation_received', // -> recipient
] as const;
export const NotificationTypeSchema = z.enum(NOTIFICATION_TYPE_VALUES);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

/** Mentor "cycle ending" escalation thresholds; T-0 = on/after the cycle end. */
export const REMINDER_THRESHOLD_VALUES = ['T-30', 'T-14', 'T-7', 'T-3', 'T-0'] as const;
export const ReminderThresholdSchema = z.enum(REMINDER_THRESHOLD_VALUES);
export type ReminderThreshold = z.infer<typeof ReminderThresholdSchema>;

/** Per-user email/digest preference. */
export const DIGEST_FREQUENCY_VALUES = ['immediate', 'daily', 'off'] as const;
export const DigestFrequencySchema = z.enum(DIGEST_FREQUENCY_VALUES);
export type DigestFrequency = z.infer<typeof DigestFrequencySchema>;

export const updatePreferenceSchema = z.object({
  emailEnabled: z.boolean().optional(),
  digestFrequency: DigestFrequencySchema.optional(),
});
export type UpdatePreferenceInput = z.infer<typeof updatePreferenceSchema>;

export interface NotificationPreferenceDto {
  emailEnabled: boolean;
  digestFrequency: DigestFrequency;
}

/** What a notification points at (stored as Notification.entityRef JSON). */
export interface EntityRef {
  entity: 'cycle' | 'meeting' | 'feedbackRequest' | 'appreciation' | 'submission';
  id: string;
  cycleId?: string;
  /** Set by the reminder sweep for escalation rows. */
  threshold?: ReminderThreshold;
  /** Set by due-date nudges. */
  dueKind?: 'self' | 'mentor';
}

/** The wire shape for in-app notifications (SSE payload + REST list). title/body are derived. */
export interface NotificationDto {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  entityRef: EntityRef | null;
  title: string;
  body: string;
  /** Deep-link path within the SPA, derived from entityRef. */
  link: string;
  createdAt: string;
  readAt: string | null;
}
