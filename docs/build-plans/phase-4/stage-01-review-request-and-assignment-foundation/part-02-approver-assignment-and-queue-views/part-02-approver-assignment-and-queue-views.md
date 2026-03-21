# Part 02: Approver Assignment and Queue Views

## Objective

Provide explicit reviewer assignment and queue visibility so pending review workload is attributable, queryable, and role-safe.

## Work To Be Done

- add assignment endpoints for admin or policy-authorized roles
- support single and reassignment flows with assignment-history metadata
- implement reviewer queue route scoped by assignee and workflow state
- implement admin queue route for cross-team visibility and balancing
- add ordering and pagination rules for deterministic queue behavior

## Deliverables

- assignment and reassignment API/service flows
- reviewer and admin queue endpoints with filtering support
- tests for queue visibility, assignment constraints, and deterministic ordering

## Dependencies

- Part 01 review-request model and API complete
- role-based authorization checks reusable for assignment actions
- proposal lifecycle state values available for queue filters

## Completion Check

- [x] authorized users can assign and reassign approvers
- [x] reviewers see only queue items they are permitted to access
- [x] admin queue view returns stable pagination and ordering
- [x] unauthorized assignment attempts return explicit policy errors

## Implementation Notes

### Schema and Persistence

- `review_requests` now persists assignment metadata with `assignedApproverId`, `assignedAt`, and `assignmentHistory` JSON audit entries.
- Assignment and queue indexes support deterministic assignee/status pagination.

### API and Services

- `PATCH /review-requests/:id/assign` supports assignment and reassignment with policy checks.
- `GET /review-requests/queue/reviewer` enforces assignee scoping (editors limited to self; admins can query reviewer-specific queues).
- `GET /review-requests/queue/admin` provides cross-team queue visibility with assignee/state filters, deterministic ordering, and pagination.

### Validation and Authorization

- Assignment allowed for `AUTHOR_ADMIN` and policy-authorized assigned editors.
- Unauthorized assignment and queue access return explicit policy/authorization errors.

### Tests

- `tests/phase4ApproverAssignmentQueueViewsPart02.test.ts` covers AC-01 through AC-05 for assignment, reassignment history, queue scope, deterministic ordering/pagination, workflow filtering, and unauthorized access denial.

## Status

Status: Complete [x]

Evidence bounded to implemented behavior:

- schema fields and indexes present for assignment metadata in `prisma/schema.prisma`
- assignment and queue routes implemented in `apps/api/src/routes/reviewRequestRouter.ts`
- assignment policy error contract implemented in `apps/api/src/services/reviewRequestService.ts`
- acceptance coverage implemented in `tests/phase4ApproverAssignmentQueueViewsPart02.test.ts`
