CREATE INDEX IF NOT EXISTS "review_requests_assigned_status_created_id_idx"
  ON "review_requests" ("assigned_approver_id", "status", "created_at", "id");

CREATE INDEX IF NOT EXISTS "review_requests_status_created_id_idx"
  ON "review_requests" ("status", "created_at", "id");

CREATE INDEX IF NOT EXISTS "approval_chains_status_finalized_created_idx"
  ON "approval_chains" ("status", "finalized_at", "created_at");

CREATE INDEX IF NOT EXISTS "approval_steps_assigned_status_created_idx"
  ON "approval_steps" ("assigned_reviewer_id", "status", "created_at");

CREATE INDEX IF NOT EXISTS "approval_steps_chain_status_created_id_idx"
  ON "approval_steps" ("chain_id", "status", "created_at", "id");

CREATE INDEX IF NOT EXISTS "approval_step_events_to_reviewer_event_created_idx"
  ON "approval_step_events" ("to_assigned_reviewer_id", "event_type", "created_at");
