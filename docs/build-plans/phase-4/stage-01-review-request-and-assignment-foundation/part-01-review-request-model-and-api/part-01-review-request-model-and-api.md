# Part 01: Review Request Model and API

## Objective

Introduce a first-class review-request entity so formal review can be tracked independently from proposal records while preserving proposal linkage and auditability.

## Work To Be Done

- extend schema with review-request table and enum-backed status fields
- define repository methods for create, read, and list operations
- implement service-level validation for eligible proposal attachment
- add API routes for review-request creation and retrieval
- seed deterministic fixtures for review-request baseline tests

## Deliverables

- schema migration for review-request records
- repository/service/API contract for review-request CRUD-read subset
- tests covering create and read paths with validation failures

## Dependencies

- Stage 01 overview approved
- proposal identifiers and role model from Phase 3 available
- existing API error contract reused for validation responses

## Completion Check

- review-request records persist with required linkage and timestamps
- API rejects missing, invalid, or ineligible proposal references
- deterministic tests cover success and error paths for create/read endpoints

## Implementation Notes

### Schema & Model

- `review_requests` table in Prisma schema with `proposalId`, `status`, `createdById`, timestamps
- Indexes on `(proposalId)`, `(createdById)`, `(status, createdAt)` for deterministic querying
- Migration: `20260320190000_add_review_request_model`

### Repository & Service

- `ReviewRequestService` with create/read/list authorization checks
- Validation: proposal reference is required, must exist, must target entity or manuscript content, and must be in `PENDING` + `IN_REVIEW` proposal state
- Error contract: `ReviewRequestNotFoundError`, `ReviewRequestProposalNotFoundError`, `ReviewRequestProposalIneligibleError`

### API Routes

- `POST /review-requests` — create with proposal linkage (AUTHOR_ADMIN only)
- `GET /review-requests/:id` — fetch by id (AUTHOR_ADMIN only)
- `GET /review-requests` — list with pagination (AUTHOR_ADMIN only)

### Tests

- `tests/phase4ReviewRequestModelApiPart01.test.ts` covers AC-01 through AC-08, including create success, validation failures, read/list behavior, unauthorized access denial, and ineligible proposal linkage blocking
- Deterministic fixtures and role-based access validation included

## Status

Status: Complete [x]
