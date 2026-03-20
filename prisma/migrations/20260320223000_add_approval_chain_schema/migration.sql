-- Add approval chain and approval step schema linked to review requests.
CREATE TYPE "ApprovalChainStatus" AS ENUM ('ACTIVE', 'APPROVED', 'REJECTED');
CREATE TYPE "ApprovalStepStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'APPROVED', 'REJECTED', 'CANCELED');

CREATE TABLE "approval_chains" (
  "id" TEXT NOT NULL,
  "reviewRequestId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "status" "ApprovalChainStatus" NOT NULL DEFAULT 'ACTIVE',
  "currentStepOrder" INTEGER NOT NULL DEFAULT 1,
  "finalizedAt" TIMESTAMP(3),
  CONSTRAINT "approval_chains_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "approval_chains_reviewRequestId_key" ON "approval_chains"("reviewRequestId");
CREATE INDEX "approval_chains_status_createdAt_idx" ON "approval_chains"("status", "createdAt");

ALTER TABLE "approval_chains"
ADD CONSTRAINT "approval_chains_reviewRequestId_fkey"
FOREIGN KEY ("reviewRequestId") REFERENCES "review_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "approval_steps" (
  "id" TEXT NOT NULL,
  "chainId" TEXT NOT NULL,
  "stepOrder" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "status" "ApprovalStepStatus" NOT NULL DEFAULT 'PENDING',
  "assignedReviewerId" TEXT,
  "assignedRole" "Role",
  "acknowledgedAt" TIMESTAMP(3),
  "acknowledgedById" TEXT,
  "decidedAt" TIMESTAMP(3),
  "decidedById" TEXT,
  "decisionNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "approval_steps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "approval_steps_chainId_stepOrder_key" ON "approval_steps"("chainId", "stepOrder");
CREATE INDEX "approval_steps_chainId_status_idx" ON "approval_steps"("chainId", "status");
CREATE INDEX "approval_steps_assignedReviewerId_idx" ON "approval_steps"("assignedReviewerId");
CREATE INDEX "approval_steps_assignedRole_idx" ON "approval_steps"("assignedRole");

ALTER TABLE "approval_steps"
ADD CONSTRAINT "approval_steps_chainId_fkey"
FOREIGN KEY ("chainId") REFERENCES "approval_chains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "approval_steps"
ADD CONSTRAINT "approval_steps_assignedReviewerId_fkey"
FOREIGN KEY ("assignedReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "approval_steps"
ADD CONSTRAINT "approval_steps_acknowledgedById_fkey"
FOREIGN KEY ("acknowledgedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "approval_steps"
ADD CONSTRAINT "approval_steps_decidedById_fkey"
FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
