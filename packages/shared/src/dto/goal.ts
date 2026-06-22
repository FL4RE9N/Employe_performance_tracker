import { z } from 'zod';
import { MetricKeySchema, GoalStatusSchema, VisibilitySchema } from '../enums';
import type { MetricKey, GoalStatus, Visibility } from '../enums';

// --- Create / update ----------------------------------------------------------

export const createGoalSchema = z.object({
  metricKey: MetricKeySchema,
  title: z.string().min(1).max(300),
  description: z.string().max(5000).default(''),
  target: z.string().max(1000).optional(),
  status: GoalStatusSchema.optional(), // server defaults to 'draft'
  visibility: VisibilitySchema.optional(), // server defaults to 'restricted'
  cycleId: z.string().uuid().optional(),
});
export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export const updateGoalSchema = z
  .object({
    metricKey: MetricKeySchema.optional(),
    title: z.string().min(1).max(300).optional(),
    description: z.string().max(5000).optional(),
    target: z.string().max(1000).nullable().optional(),
    status: GoalStatusSchema.optional(),
    visibility: VisibilitySchema.optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'nothing to update' });
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

// --- Query --------------------------------------------------------------------

/** Scope of a goals list request. mine=own; mentee=all my mentees'; all=admin only. */
export const GoalScopeSchema = z.enum(['mine', 'mentee', 'all']);
export type GoalScope = z.infer<typeof GoalScopeSchema>;

// --- Response -----------------------------------------------------------------

export interface GoalDto {
  id: string;
  ownerUserId: string;
  ownerName?: string; // included in mentor/admin roll-up views
  metricKey: MetricKey;
  metricLabel: string;
  title: string;
  description: string;
  target: string | null;
  cycleId: string | null;
  status: GoalStatus;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
}
