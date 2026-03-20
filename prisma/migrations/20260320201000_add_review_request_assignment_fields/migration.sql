-- AlterTable
ALTER TABLE "review_requests"
ADD COLUMN "assignedApproverId" TEXT,
ADD COLUMN "assignedAt" TIMESTAMP(3),
ADD COLUMN "assignmentHistory" JSONB;

-- CreateIndex
CREATE INDEX "review_requests_assignedApproverId_idx" ON "review_requests"("assignedApproverId");

-- CreateIndex
CREATE INDEX "review_requests_assignedApproverId_status_createdAt_idx" ON "review_requests"("assignedApproverId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "review_requests"
ADD CONSTRAINT "review_requests_assignedApproverId_fkey"
FOREIGN KEY ("assignedApproverId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
