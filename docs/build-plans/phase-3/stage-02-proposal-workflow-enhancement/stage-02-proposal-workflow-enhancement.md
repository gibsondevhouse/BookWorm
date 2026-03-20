# Stage 02: Proposal Workflow Enhancement

## Purpose

Extend the Stage 01 proposal model with workflow state progression, filtering, sorting, and querying capabilities so authors and reviewers can manage proposals at scale and track their lifecycle through submission, review, and application states.

## Outcome

At the end of Stage 02, the project should have:

- proposal workflow states (DRAFT, SUBMITTED, IN_REVIEW, APPROVED, REJECTED, APPLIED, ARCHIVED) with state transition logic
- admin and author filtering and sorting on proposals by state, date, content type, and submitter
- proposal metadata tracking including submission timestamp, review notes, decision timestamp, application timestamp
- proposal metrics API for counts of proposals by state (without building analytics dashboards)
- query and list APIs for authored proposals, pending review, and applied proposals
- role-based visibility of proposals (authors/editors see their own via my-proposals, admins see global pending/applied lists)
- comprehensive test coverage for state transitions, filtering, and query isolation

## Included Parts

### Part 01: Proposal State Machine and Transitions [x]

Implement workflow state progression for proposals without approval chains. Define states `DRAFT` → `SUBMITTED` → `IN_REVIEW` → `APPROVED` (or `REJECTED`) → `APPLIED` → `ARCHIVED`. Add state transition validation and recorded timestamps. Support state filtering on proposal list routes. Extend proposal schema with `currentState` enum and state transition timestamps.

### Part 02: Proposal Filtering and Querying [x]

Add query parameters to proposal list routes for filtering by state, content type (ENTITY_CREATE, ENTITY_UPDATE, etc.), submitter, and date range. Implement deterministic ordering (state priority, then date). Support pagination. Add separate list endpoints for authored proposals, pending review, and applied proposals to support different UI views without dashboard aggregation.

Implementation note (completed slice):

- Supported filters: `workflowState`, `changeType`, `submitter`/`proposedById`, `createdAt` from/to
- Added endpoints: `/proposals/my-proposals`, `/proposals/pending-review`, `/proposals/applied-proposals`
- Deterministic ordering and pagination are implemented for proposal list/query surfaces
- Reviewer-assignment filtering is deferred because the current schema does not include a reviewer-assignment field

### Part 03: Proposal Metadata and Summary Endpoints [x]

Extend proposal model with metadata fields including review comment, decision rationale, and application notes. Add metrics endpoints (not dashboards) that return proposal counts by state and content type, enabling quick status summaries without rendering surfaces. Ensure metadata/state mutations remain traceable through proposal record timestamps and attribution fields where available.

Implementation note (completed slice):

- Metadata endpoint behavior: authorized users can read proposal metadata; admin-only `PATCH /proposals/:id/metadata` updates `reviewNotes`, `decisionNote`/`rationale`, and `appliedNote`, with `updatedAt` changes preserved
- Summary endpoints: `GET /proposals/summary/workflow-states` and `GET /proposals/summary/change-types` return deterministic counts and totals with optional `from`/`to` date window filters
- Role gating and validation: summary endpoints are admin-only; metadata patch rejects empty/malformed payloads, conflicting `decisionNote` + `rationale`, invalid date windows, and `appliedNote` updates before proposal application

## Exit Criteria

- proposal workflow states (DRAFT, SUBMITTED, IN_REVIEW, APPROVED, REJECTED, APPLIED, ARCHIVED) are implemented with state transition endpoints ✓
- state transitions are validated and only permitted by authorized roles (author for DRAFT→SUBMITTED, admin for SUBMITTED→IN_REVIEW, etc.) ✓
- state transitions and metadata changes are traceable through proposal timestamps and attribution fields where available ✓
- proposal list endpoints support filtering by state, content type, submitter, date range ✓
- separate `/proposals/my-proposals`, `/proposals/pending-review`, and `/proposals/applied-proposals` endpoints serve different views ✓
- proposal counts by state returned via metrics endpoints for summary displays ✓
- role-based visibility enforced (authors/editors see their own via my-proposals, admins see all in pending/applied) ✓
- all proposal filtering, querying, and state transition paths have 100% test coverage ✓
- phase tracker updated

## Status

**Complete [x]** — Part 01, Part 02, and Part 03 implemented and verified

## Known Constraints

- Reviewer-assignment filtering remains deferred in Stage 02 because the current proposal schema has no reviewer-assignment field.
