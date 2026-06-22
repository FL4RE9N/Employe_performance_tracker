-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'user');

-- CreateEnum
CREATE TYPE "AuthSource" AS ENUM ('local', 'entra');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('mentor');

-- CreateEnum
CREATE TYPE "MetricKey" AS ENUM ('customer_satisfaction', 'public_speaking', 'deliverables', 'mentoring_activity', 'tech_community_events');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('draft', 'active', 'at_risk', 'done', 'dropped');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('public', 'restricted');

-- CreateEnum
CREATE TYPE "CycleScope" AS ENUM ('org_wide', 'individual');

-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('not_started', 'goals_set', 'self_assessment_open', 'self_submitted', 'mentor_assessment_open', 'mentor_submitted', 'calibration', 'meeting_scheduled', 'meeting_held', 'released_to_employee', 'acknowledged', 'closed');

-- CreateEnum
CREATE TYPE "AuthorSide" AS ENUM ('self', 'mentor');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('draft', 'submitted');

-- CreateEnum
CREATE TYPE "QuestionKey" AS ENUM ('overall_achievement', 'what_went_well', 'areas_to_improve', 'plan_next_year');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('pending', 'completed', 'declined');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('in_app', 'email', 'teams');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('unread', 'read');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('scheduled', 'held', 'cancelled');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "entra_object_id" TEXT,
    "tenant_id" TEXT,
    "upn" TEXT,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "auth_source" "AuthSource" NOT NULL,
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "manager_id" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorRelationship" (
    "id" UUID NOT NULL,
    "menteeId" UUID NOT NULL,
    "mentorId" UUID NOT NULL,
    "type" "RelationshipType" NOT NULL DEFAULT 'mentor',
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,

    CONSTRAINT "MentorRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricDefinition" (
    "id" UUID NOT NULL,
    "key" "MetricKey" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MetricDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" UUID NOT NULL,
    "ownerUserId" UUID NOT NULL,
    "metricId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "target" TEXT,
    "cycleId" UUID,
    "status" "GoalStatus" NOT NULL DEFAULT 'draft',
    "visibility" "Visibility" NOT NULL DEFAULT 'restricted',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewCycle" (
    "id" UUID NOT NULL,
    "scope" "CycleScope" NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "menteeId" UUID NOT NULL,
    "mentorId" UUID NOT NULL,
    "status" "CycleStatus" NOT NULL DEFAULT 'not_started',
    "goalsDueDate" DATE NOT NULL,
    "selfDueDate" DATE NOT NULL,
    "mentorDueDate" DATE NOT NULL,
    "meetingId" UUID,
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "ReviewCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewSubmission" (
    "id" UUID NOT NULL,
    "cycleId" UUID NOT NULL,
    "authorUserId" UUID NOT NULL,
    "authorSide" "AuthorSide" NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'draft',
    "submittedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "ReviewSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionAnswer" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "questionKey" "QuestionKey" NOT NULL,
    "answerText" TEXT NOT NULL,

    CONSTRAINT "QuestionAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricRating" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "metricId" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "scaleVersion" TEXT NOT NULL,

    CONSTRAINT "MetricRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackRequest" (
    "id" UUID NOT NULL,
    "requesterUserId" UUID NOT NULL,
    "targetUserId" UUID NOT NULL,
    "cycleId" UUID,
    "prompt" TEXT NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'pending',
    "dueDate" TIMESTAMP(3),
    "anonymity" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackResponse" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "authorUserId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'restricted',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appreciation" (
    "id" UUID NOT NULL,
    "authorUserId" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "metricTag" "MetricKey",
    "visibility" "Visibility" NOT NULL DEFAULT 'public',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appreciation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppreciationRecipient" (
    "appreciationId" UUID NOT NULL,
    "recipientUserId" UUID NOT NULL,

    CONSTRAINT "AppreciationRecipient_pkey" PRIMARY KEY ("appreciationId","recipientUserId")
);

-- CreateTable
CREATE TABLE "AppreciationReaction" (
    "id" UUID NOT NULL,
    "appreciationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "AppreciationReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "recipientUserId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "entityRef" JSONB,
    "status" "NotificationStatus" NOT NULL DEFAULT 'unread',
    "digestBatchId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" UUID NOT NULL,
    "organizerUserId" UUID NOT NULL,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "teamsJoinUrl" TEXT,
    "onlineMeetingId" TEXT,
    "status" "MeetingStatus" NOT NULL DEFAULT 'scheduled',

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectorySyncState" (
    "id" UUID NOT NULL,
    "deltaLink" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectorySyncState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatingScale" (
    "id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "definitions" JSONB NOT NULL,

    CONSTRAINT "RatingScale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CycleConfig" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,

    CONSTRAINT "CycleConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_entra_object_id_key" ON "User"("entra_object_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "MentorRelationship_menteeId_idx" ON "MentorRelationship"("menteeId");

-- CreateIndex
CREATE UNIQUE INDEX "MetricDefinition_key_key" ON "MetricDefinition"("key");

-- CreateIndex
CREATE INDEX "Goal_ownerUserId_idx" ON "Goal"("ownerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewCycle_meetingId_key" ON "ReviewCycle"("meetingId");

-- CreateIndex
CREATE INDEX "ReviewCycle_menteeId_idx" ON "ReviewCycle"("menteeId");

-- CreateIndex
CREATE INDEX "ReviewCycle_mentorId_idx" ON "ReviewCycle"("mentorId");

-- CreateIndex
CREATE INDEX "ReviewCycle_status_idx" ON "ReviewCycle"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewSubmission_cycleId_authorSide_key" ON "ReviewSubmission"("cycleId", "authorSide");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionAnswer_submissionId_questionKey_key" ON "QuestionAnswer"("submissionId", "questionKey");

-- CreateIndex
CREATE UNIQUE INDEX "MetricRating_submissionId_metricId_key" ON "MetricRating"("submissionId", "metricId");

-- CreateIndex
CREATE UNIQUE INDEX "AppreciationReaction_appreciationId_userId_type_key" ON "AppreciationReaction"("appreciationId", "userId", "type");

-- CreateIndex
CREATE INDEX "Notification_recipientUserId_status_idx" ON "Notification"("recipientUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RatingScale_version_key" ON "RatingScale"("version");

-- CreateIndex
CREATE UNIQUE INDEX "CycleConfig_key_key" ON "CycleConfig"("key");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorRelationship" ADD CONSTRAINT "MentorRelationship_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorRelationship" ADD CONSTRAINT "MentorRelationship_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "MetricDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "ReviewCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCycle" ADD CONSTRAINT "ReviewCycle_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCycle" ADD CONSTRAINT "ReviewCycle_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCycle" ADD CONSTRAINT "ReviewCycle_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewSubmission" ADD CONSTRAINT "ReviewSubmission_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "ReviewCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewSubmission" ADD CONSTRAINT "ReviewSubmission_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAnswer" ADD CONSTRAINT "QuestionAnswer_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ReviewSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricRating" ADD CONSTRAINT "MetricRating_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ReviewSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricRating" ADD CONSTRAINT "MetricRating_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "MetricDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackRequest" ADD CONSTRAINT "FeedbackRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackRequest" ADD CONSTRAINT "FeedbackRequest_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackResponse" ADD CONSTRAINT "FeedbackResponse_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "FeedbackRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackResponse" ADD CONSTRAINT "FeedbackResponse_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appreciation" ADD CONSTRAINT "Appreciation_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppreciationRecipient" ADD CONSTRAINT "AppreciationRecipient_appreciationId_fkey" FOREIGN KEY ("appreciationId") REFERENCES "Appreciation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppreciationRecipient" ADD CONSTRAINT "AppreciationRecipient_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppreciationReaction" ADD CONSTRAINT "AppreciationReaction_appreciationId_fkey" FOREIGN KEY ("appreciationId") REFERENCES "Appreciation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppreciationReaction" ADD CONSTRAINT "AppreciationReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_organizerUserId_fkey" FOREIGN KEY ("organizerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
