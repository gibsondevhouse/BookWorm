-- CreateEnum
CREATE TYPE "CommentType" AS ENUM ('GENERAL', 'QUESTION', 'SUGGESTION', 'CONCERN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "CommentSeverity" AS ENUM ('INFO', 'MINOR', 'MAJOR');

-- CreateEnum
CREATE TYPE "CommentTag" AS ENUM ('SPELLING', 'FACTUAL', 'CONSISTENCY', 'CLARITY', 'TONE');

-- AlterTable
ALTER TABLE "Comment"
ADD COLUMN "type" "CommentType" NOT NULL DEFAULT 'GENERAL',
ADD COLUMN "severity" "CommentSeverity" NOT NULL DEFAULT 'INFO',
ADD COLUMN "tags" "CommentTag"[] NOT NULL DEFAULT ARRAY[]::"CommentTag"[];

-- CreateIndex
CREATE INDEX "Comment_type_idx" ON "Comment"("type");

-- CreateIndex
CREATE INDEX "Comment_severity_idx" ON "Comment"("severity");
