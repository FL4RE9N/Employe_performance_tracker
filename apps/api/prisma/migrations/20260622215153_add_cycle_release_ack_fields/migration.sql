-- AlterTable
ALTER TABLE "ReviewCycle" ADD COLUMN     "acknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "acknowledgementComment" TEXT,
ADD COLUMN     "cycleEndDate" DATE,
ADD COLUMN     "releasedAt" TIMESTAMP(3);
