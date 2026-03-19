-- CreateEnum
CREATE TYPE "ContinuityIssueSeverity" AS ENUM ('BLOCKING', 'WARNING');

-- CreateEnum
CREATE TYPE "ContinuityIssueStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ContinuityIssueSubjectType" AS ENUM ('RELEASE', 'ENTITY_REVISION', 'MANUSCRIPT_REVISION', 'RELATIONSHIP_REVISION');

-- CreateTable
CREATE TABLE "continuity_issues" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "severity" "ContinuityIssueSeverity" NOT NULL,
    "status" "ContinuityIssueStatus" NOT NULL DEFAULT 'OPEN',
    "subjectType" "ContinuityIssueSubjectType" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "metadata" JSONB,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "entityId" TEXT,
    "entityRevisionId" TEXT,
    "manuscriptId" TEXT,
    "manuscriptRevisionId" TEXT,
    "relationshipId" TEXT,
    "relationshipRevisionId" TEXT,

    CONSTRAINT "continuity_issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "continuity_issues_releaseId_status_severity_idx" ON "continuity_issues"("releaseId", "status", "severity");

-- CreateIndex
CREATE INDEX "continuity_issues_ruleCode_idx" ON "continuity_issues"("ruleCode");

-- CreateIndex
CREATE INDEX "continuity_issues_subjectType_subjectId_idx" ON "continuity_issues"("subjectType", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "continuity_issues_releaseId_fingerprint_key" ON "continuity_issues"("releaseId", "fingerprint");

-- AddForeignKey
ALTER TABLE "continuity_issues" ADD CONSTRAINT "continuity_issues_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "continuity_issues" ADD CONSTRAINT "continuity_issues_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "continuity_issues" ADD CONSTRAINT "continuity_issues_entityRevisionId_fkey" FOREIGN KEY ("entityRevisionId") REFERENCES "EntityRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "continuity_issues" ADD CONSTRAINT "continuity_issues_manuscriptId_fkey" FOREIGN KEY ("manuscriptId") REFERENCES "Manuscript"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "continuity_issues" ADD CONSTRAINT "continuity_issues_manuscriptRevisionId_fkey" FOREIGN KEY ("manuscriptRevisionId") REFERENCES "ManuscriptRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "continuity_issues" ADD CONSTRAINT "continuity_issues_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "Relationship"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "continuity_issues" ADD CONSTRAINT "continuity_issues_relationshipRevisionId_fkey" FOREIGN KEY ("relationshipRevisionId") REFERENCES "RelationshipRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
