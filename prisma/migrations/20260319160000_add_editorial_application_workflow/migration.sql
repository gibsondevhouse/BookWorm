-- Add columns to proposals table
ALTER TABLE "proposals" ADD COLUMN "appliedAt" TIMESTAMP(3);
ALTER TABLE "proposals" ADD COLUMN "appliedById" TEXT;
ALTER TABLE "proposals" ADD COLUMN "appliedNote" TEXT;

-- Add index on appliedAt for rapid applied vs pending-accepted lookups
CREATE INDEX "proposals_appliedAt_idx" ON "proposals"("appliedAt");

-- Add index on appliedById
CREATE INDEX "proposals_appliedById_idx" ON "proposals"("appliedById");

-- Add appliedFromProposalId column to EntityRevision
ALTER TABLE "EntityRevision" ADD COLUMN "appliedFromProposalId" TEXT;

-- Add appliedFromProposalId column to ManuscriptRevision
ALTER TABLE "ManuscriptRevision" ADD COLUMN "appliedFromProposalId" TEXT;

-- Add appliedFromProposalId column to RelationshipRevision
ALTER TABLE "RelationshipRevision" ADD COLUMN "appliedFromProposalId" TEXT;

-- Add indexes for quick audit trail traversal
CREATE INDEX "EntityRevision_appliedFromProposalId_idx" ON "EntityRevision"("appliedFromProposalId");
CREATE INDEX "ManuscriptRevision_appliedFromProposalId_idx" ON "ManuscriptRevision"("appliedFromProposalId");
CREATE INDEX "RelationshipRevision_appliedFromProposalId_idx" ON "RelationshipRevision"("appliedFromProposalId");

-- Add foreign keys
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_appliedById_fkey" FOREIGN KEY ("appliedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EntityRevision" ADD CONSTRAINT "EntityRevision_appliedFromProposalId_fkey" FOREIGN KEY ("appliedFromProposalId") REFERENCES "proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ManuscriptRevision" ADD CONSTRAINT "ManuscriptRevision_appliedFromProposalId_fkey" FOREIGN KEY ("appliedFromProposalId") REFERENCES "proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RelationshipRevision" ADD CONSTRAINT "RelationshipRevision_appliedFromProposalId_fkey" FOREIGN KEY ("appliedFromProposalId") REFERENCES "proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
