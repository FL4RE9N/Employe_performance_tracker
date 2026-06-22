import { z } from 'zod';

// Role
export const RoleSchema = z.enum(['admin', 'user']);
export type Role = z.infer<typeof RoleSchema>;
export const ROLE_VALUES = ['admin', 'user'] as const;

// AuthSource
export const AuthSourceSchema = z.enum(['local', 'entra']);
export type AuthSource = z.infer<typeof AuthSourceSchema>;
export const AUTH_SOURCE_VALUES = ['local', 'entra'] as const;

// RelationshipType
export const RelationshipTypeSchema = z.enum(['mentor']);
export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;
export const RELATIONSHIP_TYPE_VALUES = ['mentor'] as const;

// MetricKey
export const MetricKeySchema = z.enum([
  'customer_satisfaction',
  'public_speaking',
  'deliverables',
  'mentoring_activity',
  'tech_community_events',
]);
export type MetricKey = z.infer<typeof MetricKeySchema>;
export const METRIC_KEY_VALUES = [
  'customer_satisfaction',
  'public_speaking',
  'deliverables',
  'mentoring_activity',
  'tech_community_events',
] as const;

// GoalStatus
export const GoalStatusSchema = z.enum(['draft', 'active', 'at_risk', 'done', 'dropped']);
export type GoalStatus = z.infer<typeof GoalStatusSchema>;
export const GOAL_STATUS_VALUES = ['draft', 'active', 'at_risk', 'done', 'dropped'] as const;

// Visibility
export const VisibilitySchema = z.enum(['public', 'restricted']);
export type Visibility = z.infer<typeof VisibilitySchema>;
export const VISIBILITY_VALUES = ['public', 'restricted'] as const;

// CycleScope
export const CycleScopeSchema = z.enum(['org_wide', 'individual']);
export type CycleScope = z.infer<typeof CycleScopeSchema>;
export const CYCLE_SCOPE_VALUES = ['org_wide', 'individual'] as const;

// CycleStatus
export const CycleStatusSchema = z.enum([
  'not_started',
  'goals_set',
  'self_assessment_open',
  'self_submitted',
  'mentor_assessment_open',
  'mentor_submitted',
  'calibration',
  'meeting_scheduled',
  'meeting_held',
  'released_to_employee',
  'acknowledged',
  'closed',
]);
export type CycleStatus = z.infer<typeof CycleStatusSchema>;
export const CYCLE_STATUS_VALUES = [
  'not_started',
  'goals_set',
  'self_assessment_open',
  'self_submitted',
  'mentor_assessment_open',
  'mentor_submitted',
  'calibration',
  'meeting_scheduled',
  'meeting_held',
  'released_to_employee',
  'acknowledged',
  'closed',
] as const;

// AuthorSide
export const AuthorSideSchema = z.enum(['self', 'mentor']);
export type AuthorSide = z.infer<typeof AuthorSideSchema>;
export const AUTHOR_SIDE_VALUES = ['self', 'mentor'] as const;

// SubmissionStatus
export const SubmissionStatusSchema = z.enum(['draft', 'submitted']);
export type SubmissionStatus = z.infer<typeof SubmissionStatusSchema>;
export const SUBMISSION_STATUS_VALUES = ['draft', 'submitted'] as const;

// QuestionKey
export const QuestionKeySchema = z.enum([
  'overall_achievement',
  'what_went_well',
  'areas_to_improve',
  'plan_next_year',
]);
export type QuestionKey = z.infer<typeof QuestionKeySchema>;
export const QUESTION_KEY_VALUES = [
  'overall_achievement',
  'what_went_well',
  'areas_to_improve',
  'plan_next_year',
] as const;

// FeedbackStatus
export const FeedbackStatusSchema = z.enum(['pending', 'completed', 'declined']);
export type FeedbackStatus = z.infer<typeof FeedbackStatusSchema>;
export const FEEDBACK_STATUS_VALUES = ['pending', 'completed', 'declined'] as const;

// NotificationChannel
export const NotificationChannelSchema = z.enum(['in_app', 'email', 'teams']);
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;
export const NOTIFICATION_CHANNEL_VALUES = ['in_app', 'email', 'teams'] as const;

// NotificationStatus
export const NotificationStatusSchema = z.enum(['unread', 'read']);
export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;
export const NOTIFICATION_STATUS_VALUES = ['unread', 'read'] as const;

// MeetingStatus
export const MeetingStatusSchema = z.enum(['scheduled', 'held', 'cancelled']);
export type MeetingStatus = z.infer<typeof MeetingStatusSchema>;
export const MEETING_STATUS_VALUES = ['scheduled', 'held', 'cancelled'] as const;
