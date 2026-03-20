-- Add notification outbox event taxonomy and durable processing fields.
CREATE TYPE "NotificationEventType" AS ENUM (
  'REVIEW_REQUEST_CREATED',
  'REVIEW_REQUEST_STATUS_CHANGED',
  'REVIEW_REQUEST_ASSIGNED',
  'APPROVAL_STEP_DECISION_RECORDED',
  'APPROVAL_STEP_DELEGATED',
  'APPROVAL_STEP_ESCALATED'
);

CREATE TYPE "NotificationEventStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'DELIVERED',
  'FAILED'
);

CREATE TABLE "notification_events" (
  "id" TEXT NOT NULL,
  "eventType" "NotificationEventType" NOT NULL,
  "eventKey" TEXT NOT NULL,
  "status" "NotificationEventStatus" NOT NULL DEFAULT 'PENDING',
  "reviewRequestId" TEXT,
  "approvalChainId" TEXT,
  "approvalStepId" TEXT,
  "actorUserId" TEXT,
  "payload" JSONB,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastAttemptAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "lastError" TEXT,
  "processingToken" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notification_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_events_eventKey_key" ON "notification_events"("eventKey");
CREATE INDEX "notification_events_status_nextAttemptAt_createdAt_id_idx" ON "notification_events"("status", "nextAttemptAt", "createdAt", "id");
CREATE INDEX "notification_events_eventType_createdAt_id_idx" ON "notification_events"("eventType", "createdAt", "id");
CREATE INDEX "notification_events_reviewRequestId_createdAt_id_idx" ON "notification_events"("reviewRequestId", "createdAt", "id");
CREATE INDEX "notification_events_approvalChainId_idx" ON "notification_events"("approvalChainId");
CREATE INDEX "notification_events_approvalStepId_idx" ON "notification_events"("approvalStepId");
CREATE INDEX "notification_events_actorUserId_idx" ON "notification_events"("actorUserId");

ALTER TABLE "notification_events"
ADD CONSTRAINT "notification_events_reviewRequestId_fkey"
FOREIGN KEY ("reviewRequestId") REFERENCES "review_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notification_events"
ADD CONSTRAINT "notification_events_approvalChainId_fkey"
FOREIGN KEY ("approvalChainId") REFERENCES "approval_chains"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notification_events"
ADD CONSTRAINT "notification_events_approvalStepId_fkey"
FOREIGN KEY ("approvalStepId") REFERENCES "approval_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notification_events"
ADD CONSTRAINT "notification_events_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
