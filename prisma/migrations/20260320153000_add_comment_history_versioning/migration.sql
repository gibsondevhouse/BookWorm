-- AlterTable
ALTER TABLE "Comment"
ADD COLUMN "currentVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CommentVersion" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "previousBody" TEXT NOT NULL,
    "resultingBody" TEXT NOT NULL,
    "previousType" "CommentType" NOT NULL,
    "resultingType" "CommentType" NOT NULL,
    "previousSeverity" "CommentSeverity" NOT NULL,
    "resultingSeverity" "CommentSeverity" NOT NULL,
    "previousTags" "CommentTag"[] NOT NULL,
    "resultingTags" "CommentTag"[] NOT NULL,
    "previousStatus" "CommentStatus" NOT NULL,
    "resultingStatus" "CommentStatus" NOT NULL,
    "editedById" TEXT NOT NULL,
    "editReason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommentVersion_commentId_version_key" ON "CommentVersion"("commentId", "version");

-- CreateIndex
CREATE INDEX "CommentVersion_commentId_createdAt_idx" ON "CommentVersion"("commentId", "createdAt");

-- CreateIndex
CREATE INDEX "CommentVersion_editedById_idx" ON "CommentVersion"("editedById");

-- AddForeignKey
ALTER TABLE "CommentVersion" ADD CONSTRAINT "CommentVersion_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentVersion" ADD CONSTRAINT "CommentVersion_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;