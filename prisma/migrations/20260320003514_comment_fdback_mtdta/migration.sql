-- DropIndex
DROP INDEX "proposals_workflowState_createdAt_idx";

-- CreateIndex
CREATE INDEX "proposals_workflowState_createdAt_idx" ON "proposals"("workflowState", "createdAt");
