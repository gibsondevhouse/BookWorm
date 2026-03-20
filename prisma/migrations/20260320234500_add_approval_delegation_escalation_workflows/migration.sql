-- Add delegation/escalation event tracking and escalation state on approval steps.
CREATE TYPE "ApprovalStepEventType" AS ENUM ('DELEGATED', 'ESCALATED');

ALTER TABLE "approval_steps"
ADD COLUMN "escalationLevel" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "escalatedAt" TIMESTAMP(3),
ADD COLUMN "escalatedById" TEXT;

CREATE INDEX "approval_steps_escalationLevel_idx" ON "approval_steps"("escalationLevel");

ALTER TABLE "approval_steps"
ADD CONSTRAINT "approval_steps_escalatedById_fkey"
FOREIGN KEY ("escalatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "approval_step_events" (
  "id" TEXT NOT NULL,
  "stepId" TEXT NOT NULL,
  "eventType" "ApprovalStepEventType" NOT NULL,
  "reasonCode" TEXT NOT NULL,
  "reasonNote" TEXT,
  "actorUserId" TEXT NOT NULL,
  "fromAssignedReviewerId" TEXT,
  "fromAssignedRole" "Role",
  "toAssignedReviewerId" TEXT,
  "toAssignedRole" "Role",
  "escalationLevel" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "approval_step_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "approval_step_events_stepId_createdAt_idx" ON "approval_step_events"("stepId", "createdAt");
CREATE INDEX "approval_step_events_eventType_createdAt_idx" ON "approval_step_events"("eventType", "createdAt");
CREATE INDEX "approval_step_events_actorUserId_idx" ON "approval_step_events"("actorUserId");

ALTER TABLE "approval_step_events"
ADD CONSTRAINT "approval_step_events_stepId_fkey"
FOREIGN KEY ("stepId") REFERENCES "approval_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "approval_step_events"
ADD CONSTRAINT "approval_step_events_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
