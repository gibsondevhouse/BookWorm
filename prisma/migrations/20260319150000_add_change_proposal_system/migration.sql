-- CreateEnum
CREATE TYPE "ProposalChangeType" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "proposals" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "proposedById" TEXT NOT NULL,
    "decidedById" TEXT,
    "entityId" TEXT,
    "manuscriptId" TEXT,
    "changeType" "ProposalChangeType" NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "payload" JSONB,
    "decisionNote" TEXT,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "proposals_target_check" CHECK (
      (("entityId" IS NOT NULL)::int + ("manuscriptId" IS NOT NULL)::int) = 1
    )
);

-- CreateIndex
CREATE INDEX "proposals_entityId_idx" ON "proposals"("entityId");

-- CreateIndex
CREATE INDEX "proposals_manuscriptId_idx" ON "proposals"("manuscriptId");

-- CreateIndex
CREATE INDEX "proposals_proposedById_idx" ON "proposals"("proposedById");

-- CreateIndex
CREATE INDEX "proposals_decidedById_idx" ON "proposals"("decidedById");

-- CreateIndex
CREATE INDEX "proposals_status_createdAt_idx" ON "proposals"("status", "createdAt");

-- CreateIndex
CREATE INDEX "proposals_changeType_createdAt_idx" ON "proposals"("changeType", "createdAt");

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_manuscriptId_fkey" FOREIGN KEY ("manuscriptId") REFERENCES "Manuscript"("id") ON DELETE CASCADE ON UPDATE CASCADE;
