import { z } from 'zod';
import { VisibilitySchema } from '../enums';
import type { FeedbackStatus } from '../enums';

/**
 * Feedback flow: a requester asks a colleague (the target/recipient) to give
 * feedback. The request lands in the target's tasks; they submit a response or
 * decline. Responses are attributed by default; when the request is marked
 * anonymous the author identity is suppressed in responses shown to the requester.
 */
export const createFeedbackRequestSchema = z.object({
  targetUserId: z.string().uuid(),
  prompt: z.string().max(2000).optional(),
  dueDate: z.coerce.date().optional(),
  anonymity: z.boolean().optional(),
});
export type CreateFeedbackRequestInput = z.infer<typeof createFeedbackRequestSchema>;

export const submitFeedbackSchema = z.object({
  body: z.string().min(1).max(5000),
  visibility: VisibilitySchema.optional(),
});
export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;

/** Which side of the feedback inbox to list. */
export const FeedbackBoxSchema = z.enum(['received', 'sent']);
export type FeedbackBox = z.infer<typeof FeedbackBoxSchema>;

export interface FeedbackResponseDto {
  id: string;
  /** null when the request is anonymous (author identity suppressed). */
  authorName: string | null;
  body: string;
  createdAt: string;
}

export interface FeedbackRequestDto {
  id: string;
  requesterUserId: string;
  requesterName: string;
  targetUserId: string;
  targetName: string;
  prompt: string;
  status: FeedbackStatus;
  dueDate: string | null;
  anonymity: boolean;
  createdAt: string;
  responses?: FeedbackResponseDto[];
}
