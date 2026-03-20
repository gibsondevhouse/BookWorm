-- Create ProposalWorkflowState enum type
CREATE TYPE "ProposalWorkflowState" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'APPLIED', 'ARCHIVED');

-- Add workflow state columns to proposals table
ALTER TABLE "proposals" ADD COLUMN "workflowState" "ProposalWorkflowState" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "proposals" ADD COLUMN "submittedAt" TIMESTAMP(3);
ALTER TABLE "proposals" ADD COLUMN "reviewStartedAt" TIMESTAMP(3);
ALTER TABLE "proposals" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "proposals" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "proposals" ADD COLUMN "reviewNotes" TEXT;

-- Add indexes for workflow state queries
CREATE INDEX "proposals_workflowState_idx" ON "proposals"("workflowState");
CREATE INDEX "proposals_workflowState_createdAt_idx" ON "proposals"("workflowState", "createdAt" DESC);
