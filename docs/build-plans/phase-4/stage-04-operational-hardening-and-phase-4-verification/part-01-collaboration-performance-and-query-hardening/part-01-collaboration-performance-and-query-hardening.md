# Part 01: Collaboration Performance and Query Hardening

## Objective

Ensure review queues, approval histories, and analytics endpoints remain responsive as collaboration volume grows.

## Work To Be Done

- profile queue, history, and analytics query paths under representative datasets
- add or adjust indexes for assignee, state, timestamp, and policy-evaluation access patterns
- tune pagination contracts and query shapes for deterministic performance
- define baseline performance targets for critical read and write paths
- add regression tests for expensive query scenarios where practical

## Deliverables

- query profile summary and index tuning changes
- updated repository query contracts for high-volume paths
- performance regression test coverage for critical routes

## Dependencies

- Stage 03 inbox and analytics endpoints available for profiling
- deterministic fixture data scalable to larger collaboration scenarios
- existing test harness supports repeatable timing and load checks

## Completion Check

- critical collaboration endpoints satisfy agreed baseline response targets
- index changes reduce hotspot query latency without correctness regressions
- regression tests or scripted checks detect performance backslides

## Status

User Approved: True
Status: **COMPLETE** [x]

## Implementation Evidence

**Validated:** performance regression coverage added and executed for collaboration hotspot endpoints.

### Migrations
- `20260321013000_stage4_part01_collab_perf_indexes`
	- Added composite indexes for queue, approval-step, approval-event, and analytics access patterns.

### Repository Hardening
- Updated `reviewDecisionAnalyticsRepository.ts`
	- Added `listSummaryForWindow` with a lightweight select contract for analytics summary aggregation.
	- Kept timeline/history contract intact for detailed decision lineage reads.

### Service Hardening
- Updated `reviewDecisionAnalyticsService.ts`
	- Switched summary endpoint to the lightweight summary query path to avoid loading timeline/event payloads during aggregate-only reads.

### Schema / Index Hardening
- Updated `schema.prisma` indexes:
	- `ReviewRequest`: `(assignedApproverId, status, createdAt, id)`, `(status, createdAt, id)`
	- `ApprovalChain`: `(status, finalizedAt, createdAt)`
	- `ApprovalStep`: `(assignedReviewerId, status, createdAt)`, `(chainId, status, createdAt, id)`
	- `ApprovalStepEvent`: `(toAssignedReviewerId, eventType, createdAt)`

### Regression Detection
- Added `tests/phase4CollaborationPerformanceQueryHardeningPart01.test.ts`
	- Seeds representative review-request, approval-chain, step, and delegation-event data.
	- Measures p95 response latency for critical collaboration endpoints under fixture load:
		- `GET /review-inbox` (delegated + escalated + overdue filters)
		- `GET /review-requests/history/timeline`
		- `GET /review-requests/analytics/decision-summary`
	- Fails if configured baseline targets are exceeded.
