import type {
  NotificationType,
  NotificationChannel,
  EntityRef,
} from '@perf-tracker/shared';

export type Priority = 'critical' | 'normal' | 'low';

export interface RouteDef {
  priority: Priority;
  channels: NotificationChannel[];
}

/**
 * Event -> priority + channels (plan/05 catalog).
 * critical => email is sent immediately; normal/low email goes via the daily
 * digest unless the user opted into immediate. low-only-in_app events never email.
 */
export const NOTIFICATION_ROUTING: Record<NotificationType, RouteDef> = {
  self_assessment_due: { priority: 'critical', channels: ['in_app', 'email'] },
  mentor_assessment_open: { priority: 'critical', channels: ['in_app', 'email'] },
  cycle_ending: { priority: 'normal', channels: ['in_app', 'email'] },
  schedule_call: { priority: 'critical', channels: ['in_app', 'email'] },
  meeting_scheduled: { priority: 'critical', channels: ['in_app', 'email'] },
  review_released: { priority: 'critical', channels: ['in_app', 'email'] },
  feedback_requested: { priority: 'normal', channels: ['in_app', 'email'] },
  feedback_submitted: { priority: 'low', channels: ['in_app'] },
  appreciation_received: { priority: 'low', channels: ['in_app', 'email'] }, // email only via digest
};

export interface Copy {
  title: string;
  body: string;
  emailSubject: string;
  emailText: string;
  emailHtml: string;
}

const TITLES: Record<NotificationType, string> = {
  self_assessment_due: 'Your self-assessment is due',
  mentor_assessment_open: 'A mentee review is ready for you',
  cycle_ending: 'A mentee review cycle is ending soon',
  schedule_call: 'Time to schedule the review call',
  meeting_scheduled: 'Your review meeting is scheduled',
  review_released: 'Your review has been released',
  feedback_requested: 'Someone requested your feedback',
  feedback_submitted: 'Your feedback request got a response',
  appreciation_received: 'You received an appreciation',
};

const BODIES: Record<NotificationType, string> = {
  self_assessment_due: 'Please complete the 4 questions and 5 metric ratings before your due date.',
  mentor_assessment_open: 'Your mentee submitted their self-assessment. Complete your assessment to unlock the comparison.',
  cycle_ending: 'The review cycle for your mentee is approaching its end date.',
  schedule_call: 'The cycle has ended. Schedule the 1:1 review call with your mentee.',
  meeting_scheduled: 'A review meeting has been scheduled. See the details and agenda.',
  review_released: 'Your mentor has released your review. Open it to read and acknowledge.',
  feedback_requested: 'A colleague asked you for feedback. You can respond or decline.',
  feedback_submitted: 'A colleague responded to your feedback request.',
  appreciation_received: 'A colleague recognised your work on the appreciation wall.',
};

/** Deep-link path within the SPA for a notification's entity. */
export function deepLink(entityRef: EntityRef | null | undefined): string {
  if (!entityRef) return '/notifications';
  switch (entityRef.entity) {
    case 'cycle':
    case 'submission':
    case 'meeting':
      return `/reviews/${entityRef.cycleId ?? entityRef.id}`;
    case 'feedbackRequest':
      return '/feedback';
    case 'appreciation':
      return '/appreciation';
    default:
      return '/notifications';
  }
}

export function buildCopy(
  type: NotificationType,
  entityRef: EntityRef | null | undefined,
): Copy {
  const title = TITLES[type] ?? 'Notification';
  let body = BODIES[type] ?? '';
  // Intensify the escalation copy by threshold.
  if (type === 'cycle_ending' && entityRef?.threshold) {
    body = `${body} (${entityRef.threshold.replace('T-', '')} days remaining)`;
  }
  const link = deepLink(entityRef);
  return {
    title,
    body,
    emailSubject: `[Performance Tracker] ${title}`,
    emailText: `${title}\n\n${body}\n\nOpen: ${link}`,
    emailHtml: `<p><strong>${title}</strong></p><p>${body}</p><p><a href="${link}">Open in Performance Tracker</a></p>`,
  };
}
