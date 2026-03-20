-- CreateEnum
CREATE TYPE "ReviewRequestStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "review_requests" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "proposalId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" "ReviewRequestStatus" NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "review_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "review_requests_proposalId_idx" ON "review_requests"("proposalId");

-- CreateIndex
CREATE INDEX "review_requests_createdById_idx" ON "review_requests"("createdById");

-- CreateIndex
CREATE INDEX "review_requests_status_createdAt_idx" ON "review_requests"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "review_requests"
ADD CONSTRAINT "review_requests_proposalId_fkey"
FOREIGN KEY ("proposalId") REFERENCES "proposals"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_requests"
ADD CONSTRAINT "review_requests_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
