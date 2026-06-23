import { z } from 'zod';

/**
 * Notification event catalog (plan/05). The cycle engine + reminder sweep +
 * feedback/appreciation features emit these `type` values. Slice 4 extends this
 * file with reminder thresholds, digest frequency, and the wire DTO.
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

/** What a notification points at (stored as Notification.entityRef JSON). */
export interface EntityRef {
  entity: 'cycle' | 'meeting' | 'feedbackRequest' | 'appreciation' | 'submission';
  id: string;
  cycleId?: string;
}
