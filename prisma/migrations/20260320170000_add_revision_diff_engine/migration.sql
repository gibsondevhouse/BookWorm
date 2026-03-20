-- CreateEnum
CREATE TYPE "RevisionDiffKind" AS ENUM ('ENTITY', 'MANUSCRIPT');

-- CreateTable
CREATE TABLE "RevisionDiff" (
    "id" TEXT NOT NULL,
    "kind" "RevisionDiffKind" NOT NULL,
    "fromRevisionId" TEXT NOT NULL,
    "toRevisionId" TEXT NOT NULL,
    "fromContentIdentity" TEXT NOT NULL,
    "toContentIdentity" TEXT NOT NULL,
    "pairContentIdentity" TEXT NOT NULL,
    "diff" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevisionDiff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RevisionDiff_kind_fromRevisionId_toRevisionId_pairContentIdentity_key"
ON "RevisionDiff"("kind", "fromRevisionId", "toRevisionId", "pairContentIdentity");

-- CreateIndex
CREATE INDEX "RevisionDiff_kind_fromRevisionId_toRevisionId_idx"
ON "RevisionDiff"("kind", "fromRevisionId", "toRevisionId");
