// Enums — schemas, types, and plain arrays
export {
  RoleSchema,
  AUTH_SOURCE_VALUES,
  AuthSourceSchema,
  RELATIONSHIP_TYPE_VALUES,
  RelationshipTypeSchema,
  METRIC_KEY_VALUES,
  MetricKeySchema,
  GOAL_STATUS_VALUES,
  GoalStatusSchema,
  VISIBILITY_VALUES,
  VisibilitySchema,
  CYCLE_SCOPE_VALUES,
  CycleScopeSchema,
  CYCLE_STATUS_VALUES,
  CycleStatusSchema,
  AUTHOR_SIDE_VALUES,
  AuthorSideSchema,
  SUBMISSION_STATUS_VALUES,
  SubmissionStatusSchema,
  QUESTION_KEY_VALUES,
  QuestionKeySchema,
  FEEDBACK_STATUS_VALUES,
  FeedbackStatusSchema,
  NOTIFICATION_CHANNEL_VALUES,
  NotificationChannelSchema,
  NOTIFICATION_STATUS_VALUES,
  NotificationStatusSchema,
  MEETING_STATUS_VALUES,
  MeetingStatusSchema,
  ROLE_VALUES,
} from './enums';

export type {
  Role,
  AuthSource,
  RelationshipType,
  MetricKey,
  GoalStatus,
  Visibility,
  CycleScope,
  CycleStatus,
  AuthorSide,
  SubmissionStatus,
  QuestionKey,
  FeedbackStatus,
  NotificationChannel,
  NotificationStatus,
  MeetingStatus,
} from './enums';

// Constants — metrics, questions, rating scale
export { METRICS, QUESTIONS, RATING_SCALE_V1 } from './constants';
export type { MetricDefinition, ReviewQuestion, RatingLevel, RatingScale } from './constants';

// DTOs
export { loginSchema } from './dto/auth';
export type { LoginInput, SessionUser } from './dto/auth';

export { createUserSchema, updateUserSchema, createPairingSchema } from './dto/user';
export type {
  CreateUserInput,
  UpdateUserInput,
  CreatePairingInput,
  AdminUserDto,
  DirectoryUserDto,
  PairingDto,
} from './dto/user';

export { createGoalSchema, updateGoalSchema, GoalScopeSchema } from './dto/goal';
export type { CreateGoalInput, UpdateGoalInput, GoalScope, GoalDto } from './dto/goal';

export {
  createCycleSchema,
  launchOrgWideSchema,
  scheduleMeetingSchema,
  transitionSchema,
  acknowledgeSchema,
} from './dto/cycle';
export type {
  CreateCycleInput,
  LaunchOrgWideInput,
  ScheduleMeetingInput,
  TransitionInput,
  AcknowledgeInput,
  CycleDto,
  MeetingDto,
} from './dto/cycle';

export {
  answerInputSchema,
  ratingInputSchema,
  saveDraftSchema,
  submitReviewSchema,
} from './dto/review';
export type {
  AnswerInput,
  RatingInput,
  SaveDraftInput,
  SubmitReviewInput,
  AnswerDto,
  RatingDto,
  ReviewSubmissionDto,
  MetricGapDto,
  ComparisonDto,
} from './dto/review';

export {
  CYCLE_TRANSITIONS,
  findTransition,
  availableTransitions,
  nextAutoTransition,
  cycleStatusIndex,
  statusAtOrAfter,
} from './state/cycle-transitions';
export type { CycleActorKind, TransitionDef } from './state/cycle-transitions';

export { NOTIFICATION_TYPE_VALUES, NotificationTypeSchema } from './notifications';
export type { NotificationType, EntityRef } from './notifications';
