-- Expand review request lifecycle states and add transition audit history.
ALTER TYPE "ReviewRequestStatus" RENAME TO "ReviewRequestStatus_old";

CREATE TYPE "ReviewRequestStatus" AS ENUM (
  'OPEN',
  'ACKNOWLEDGED',
  'IN_REVIEW',
  'RESOLVED',
  'CANCELED'
);

ALTER TABLE "review_requests"
ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "review_requests"
ALTER COLUMN "status" TYPE "ReviewRequestStatus"
USING (
  CASE
    WHEN "status"::text = 'CLOSED' THEN 'RESOLVED'
    ELSE "status"::text
  END
)::"ReviewRequestStatus";

ALTER TABLE "review_requests"
ALTER COLUMN "status" SET DEFAULT 'OPEN';

ALTER TABLE "review_requests"
ADD COLUMN "lifecycleHistory" JSONB;

DROP TYPE "ReviewRequestStatus_old";
