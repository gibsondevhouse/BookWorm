-- CreateEnum
CREATE TYPE "RelationshipRevisionState" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL,
    "sourceEntityId" TEXT NOT NULL,
    "targetEntityId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Relationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelationshipRevision" (
    "id" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "state" "RelationshipRevisionState" NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RelationshipRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseRelationshipEntry" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "relationshipRevisionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReleaseRelationshipEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Relationship_sourceEntityId_targetEntityId_relationType_key" ON "Relationship"("sourceEntityId", "targetEntityId", "relationType");

-- CreateIndex
CREATE INDEX "Relationship_sourceEntityId_idx" ON "Relationship"("sourceEntityId");

-- CreateIndex
CREATE INDEX "Relationship_targetEntityId_idx" ON "Relationship"("targetEntityId");

-- CreateIndex
CREATE INDEX "Relationship_relationType_idx" ON "Relationship"("relationType");

-- CreateIndex
CREATE UNIQUE INDEX "RelationshipRevision_relationshipId_version_key" ON "RelationshipRevision"("relationshipId", "version");

-- CreateIndex
CREATE INDEX "RelationshipRevision_relationshipId_createdAt_idx" ON "RelationshipRevision"("relationshipId", "createdAt");

-- CreateIndex
CREATE INDEX "RelationshipRevision_state_idx" ON "RelationshipRevision"("state");

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseRelationshipEntry_releaseId_relationshipId_key" ON "ReleaseRelationshipEntry"("releaseId", "relationshipId");

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseRelationshipEntry_releaseId_relationshipRevisionId_key" ON "ReleaseRelationshipEntry"("releaseId", "relationshipRevisionId");

-- CreateIndex
CREATE INDEX "ReleaseRelationshipEntry_relationshipId_idx" ON "ReleaseRelationshipEntry"("relationshipId");

-- CreateIndex
CREATE INDEX "ReleaseRelationshipEntry_relationshipRevisionId_idx" ON "ReleaseRelationshipEntry"("relationshipRevisionId");

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_sourceEntityId_fkey" FOREIGN KEY ("sourceEntityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_targetEntityId_fkey" FOREIGN KEY ("targetEntityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipRevision" ADD CONSTRAINT "RelationshipRevision_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "Relationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipRevision" ADD CONSTRAINT "RelationshipRevision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseRelationshipEntry" ADD CONSTRAINT "ReleaseRelationshipEntry_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseRelationshipEntry" ADD CONSTRAINT "ReleaseRelationshipEntry_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "Relationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseRelationshipEntry" ADD CONSTRAINT "ReleaseRelationshipEntry_relationshipRevisionId_fkey" FOREIGN KEY ("relationshipRevisionId") REFERENCES "RelationshipRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;