import { z } from 'zod';
import { MetricKeySchema } from '../enums';
import type { MetricKey } from '../enums';

export const createAppreciationSchema = z.object({
  message: z.string().min(1).max(2000),
  recipientUserIds: z.array(z.string().uuid()).min(1).max(20),
  metricTag: MetricKeySchema.optional(),
});
export type CreateAppreciationInput = z.infer<typeof createAppreciationSchema>;

export const reactionSchema = z.object({
  type: z.string().min(1).max(50), // e.g. 'thumbs_up', 'heart'
});
export type ReactionInput = z.infer<typeof reactionSchema>;

export interface AppreciationRecipientDto {
  id: string;
  displayName: string;
}

export interface AppreciationReactionDto {
  type: string;
  count: number;
  mine: boolean; // did the current viewer react with this type
}

export interface AppreciationDto {
  id: string;
  authorUserId: string;
  authorName: string;
  message: string;
  metricTag: MetricKey | null;
  recipients: AppreciationRecipientDto[];
  reactions: AppreciationReactionDto[];
  createdAt: string;
  canRemove: boolean; // viewer is the author or an admin
}
