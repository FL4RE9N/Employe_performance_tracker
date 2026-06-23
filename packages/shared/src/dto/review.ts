import { z } from 'zod';
import {
  QuestionKeySchema,
  MetricKeySchema,
  QUESTION_KEY_VALUES,
  METRIC_KEY_VALUES,
} from '../enums';
import type { QuestionKey, MetricKey, AuthorSide, SubmissionStatus } from '../enums';

// --- Inputs -------------------------------------------------------------------

export const answerInputSchema = z.object({
  questionKey: QuestionKeySchema,
  answerText: z.string().min(1).max(10000),
});
export type AnswerInput = z.infer<typeof answerInputSchema>;

export const ratingInputSchema = z.object({
  metricKey: MetricKeySchema, // server resolves to metricId; never trust a client metricId
  score: z.number().int().min(1).max(5),
  comment: z.string().max(5000).optional(),
  // scaleVersion is NOT accepted from the client — stamped server-side from the active RatingScale.
});
export type RatingInput = z.infer<typeof ratingInputSchema>;

/** Autosave: any subset of answers/ratings. */
export const saveDraftSchema = z
  .object({
    answers: z.array(answerInputSchema).max(QUESTION_KEY_VALUES.length).optional(),
    ratings: z.array(ratingInputSchema).max(METRIC_KEY_VALUES.length).optional(),
  })
  .refine((d) => d.answers !== undefined || d.ratings !== undefined, {
    message: 'nothing to save',
  });
export type SaveDraftInput = z.infer<typeof saveDraftSchema>;

/** Submit: must be COMPLETE — all 4 distinct questions and all 5 distinct metrics. */
export const submitReviewSchema = z.object({
  answers: z
    .array(answerInputSchema)
    .length(QUESTION_KEY_VALUES.length)
    .refine((a) => new Set(a.map((x) => x.questionKey)).size === QUESTION_KEY_VALUES.length, {
      message: 'all 4 questions are required, with no duplicates',
    }),
  ratings: z
    .array(ratingInputSchema)
    .length(METRIC_KEY_VALUES.length)
    .refine((r) => new Set(r.map((x) => x.metricKey)).size === METRIC_KEY_VALUES.length, {
      message: 'all 5 metrics are required, with no duplicates',
    }),
});
export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;

// --- Responses ----------------------------------------------------------------

export interface AnswerDto {
  questionKey: QuestionKey;
  answerText: string;
}

export interface RatingDto {
  metricKey: MetricKey;
  metricLabel: string;
  score: number;
  comment: string | null;
  scaleVersion: string;
}

export interface ReviewSubmissionDto {
  id: string;
  cycleId: string;
  authorSide: AuthorSide;
  status: SubmissionStatus;
  submittedAt: string | null;
  lockedAt: string | null;
  answers: AnswerDto[];
  ratings: RatingDto[];
}

export interface MetricGapDto {
  metricKey: MetricKey;
  metricLabel: string;
  selfScore: number | null;
  mentorScore: number | null;
  delta: number | null; // mentorScore - selfScore when both present
}

export interface ComparisonDto {
  cycleId: string;
  bothSubmitted: boolean;
  /** True when the mentor side is withheld from the employee pending release. */
  releaseGated: boolean;
  self: ReviewSubmissionDto | null;
  mentor: ReviewSubmissionDto | null;
  gaps: MetricGapDto[];
}
