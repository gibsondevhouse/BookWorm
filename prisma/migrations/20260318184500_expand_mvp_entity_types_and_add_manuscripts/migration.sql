-- AlterEnum
ALTER TYPE "EntityType" ADD VALUE 'LOCATION';
ALTER TYPE "EntityType" ADD VALUE 'EVENT';
ALTER TYPE "EntityType" ADD VALUE 'ARTIFACT';
ALTER TYPE "EntityType" ADD VALUE 'CREATURE';
ALTER TYPE "EntityType" ADD VALUE 'BELIEF_SYSTEM';
ALTER TYPE "EntityType" ADD VALUE 'POLITICAL_BODY';
ALTER TYPE "EntityType" ADD VALUE 'LANGUAGE';
ALTER TYPE "EntityType" ADD VALUE 'SECRET';
ALTER TYPE "EntityType" ADD VALUE 'REVEAL';
ALTER TYPE "EntityType" ADD VALUE 'TAG';
ALTER TYPE "EntityType" ADD VALUE 'TIMELINE_ERA';

-- CreateEnum
CREATE TYPE "ManuscriptType" AS ENUM ('CHAPTER', 'SCENE');

-- CreateTable
CREATE TABLE "Manuscript" (
    "id" TEXT NOT NULL,
    "type" "ManuscriptType" NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Manuscript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManuscriptRevision" (
    "id" TEXT NOT NULL,
    "manuscriptId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManuscriptRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseManuscriptEntry" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "manuscriptId" TEXT NOT NULL,
    "manuscriptRevisionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReleaseManuscriptEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Manuscript_slug_key" ON "Manuscript"("slug");

-- CreateIndex
CREATE INDEX "Manuscript_type_idx" ON "Manuscript"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ManuscriptRevision_manuscriptId_version_key" ON "ManuscriptRevision"("manuscriptId", "version");

-- CreateIndex
CREATE INDEX "ManuscriptRevision_manuscriptId_createdAt_idx" ON "ManuscriptRevision"("manuscriptId", "createdAt");

-- CreateIndex
CREATE INDEX "ManuscriptRevision_visibility_idx" ON "ManuscriptRevision"("visibility");

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseManuscriptEntry_releaseId_manuscriptId_key" ON "ReleaseManuscriptEntry"("releaseId", "manuscriptId");

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseManuscriptEntry_releaseId_manuscriptRevisionId_key" ON "ReleaseManuscriptEntry"("releaseId", "manuscriptRevisionId");

-- CreateIndex
CREATE INDEX "ReleaseManuscriptEntry_manuscriptId_idx" ON "ReleaseManuscriptEntry"("manuscriptId");

-- CreateIndex
CREATE INDEX "ReleaseManuscriptEntry_manuscriptRevisionId_idx" ON "ReleaseManuscriptEntry"("manuscriptRevisionId");

-- AddForeignKey
ALTER TABLE "ManuscriptRevision" ADD CONSTRAINT "ManuscriptRevision_manuscriptId_fkey" FOREIGN KEY ("manuscriptId") REFERENCES "Manuscript"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManuscriptRevision" ADD CONSTRAINT "ManuscriptRevision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseManuscriptEntry" ADD CONSTRAINT "ReleaseManuscriptEntry_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseManuscriptEntry" ADD CONSTRAINT "ReleaseManuscriptEntry_manuscriptId_fkey" FOREIGN KEY ("manuscriptId") REFERENCES "Manuscript"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseManuscriptEntry" ADD CONSTRAINT "ReleaseManuscriptEntry_manuscriptRevisionId_fkey" FOREIGN KEY ("manuscriptRevisionId") REFERENCES "ManuscriptRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;