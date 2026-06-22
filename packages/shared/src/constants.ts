import type { MetricKey, QuestionKey } from './enums';

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export interface MetricDefinition {
  key: MetricKey;
  label: string;
  description: string;
}

export const METRICS: MetricDefinition[] = [
  {
    key: 'customer_satisfaction',
    label: 'Customer satisfaction',
    description: 'Quality of service to internal/external customers',
  },
  {
    key: 'public_speaking',
    label: 'Public speaking',
    description: 'Talks, presentations, demos, conference/webinar speaking',
  },
  {
    key: 'deliverables',
    label: 'Deliverables',
    description: 'Output quality & delivery against commitments',
  },
  {
    key: 'mentoring_activity',
    label: 'Mentee / Mentor activity',
    description: 'Coaching, mentoring, being a mentee — development relationships',
  },
  {
    key: 'tech_community_events',
    label: 'Technical community events',
    description: 'Participation in/organizing tech community events',
  },
];

// ---------------------------------------------------------------------------
// Review questions
// ---------------------------------------------------------------------------

export interface ReviewQuestion {
  key: QuestionKey;
  label: string;
  order: number;
}

export const QUESTIONS: ReviewQuestion[] = [
  {
    key: 'overall_achievement',
    label: 'Overall achievement',
    order: 1,
  },
  {
    key: 'what_went_well',
    label: 'What went well',
    order: 2,
  },
  {
    key: 'areas_to_improve',
    label: 'Areas that need improvement',
    order: 3,
  },
  {
    key: 'plan_next_year',
    label: 'Plan for next year',
    order: 4,
  },
];

// ---------------------------------------------------------------------------
// Rating scale
// ---------------------------------------------------------------------------

export interface RatingLevel {
  score: 1 | 2 | 3 | 4 | 5;
  label: string;
  anchor: string;
}

export interface RatingScale {
  version: string;
  levels: RatingLevel[];
}

export const RATING_SCALE_V1: RatingScale = {
  version: 'v1',
  levels: [
    {
      score: 1,
      label: 'Poor',
      anchor: 'Consistently below expectations; significant concerns',
    },
    {
      score: 2,
      label: 'Below average',
      anchor: 'Falls short of expectations in important areas',
    },
    {
      score: 3,
      label: 'On track',
      anchor: 'Meets expectations reliably',
    },
    {
      score: 4,
      label: 'Moving forward',
      anchor: 'Exceeds expectations; clearly growing',
    },
    {
      score: 5,
      label: 'Exceeded expectations',
      anchor: 'Exceptional, rare-level impact',
    },
  ],
};
