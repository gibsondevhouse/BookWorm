-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Comment"
ADD COLUMN "status" "CommentStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "Comment_status_idx" ON "Comment"("status");
