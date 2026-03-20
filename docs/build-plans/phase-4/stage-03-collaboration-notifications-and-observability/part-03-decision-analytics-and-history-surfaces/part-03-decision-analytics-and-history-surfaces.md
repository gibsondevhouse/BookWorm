# Part 03: Decision Analytics and History Surfaces

## Objective

Provide read-only insight into collaboration behavior so editors can track throughput, bottlenecks, and decision lineage.

## Work To Be Done

- define summary endpoints for queue depth, approval latency, and decision outcomes
- add history endpoints showing review-request and approval-chain timelines
- support scoped analytics windows and role-safe filtering
- ensure summary values are reproducible from stored lifecycle data
- document baseline metrics contract for future dashboard integration

## Deliverables

- decision analytics endpoints and response contracts
- review history timeline APIs with pagination and filters
- tests validating metric correctness against deterministic fixtures

## Dependencies

- Part 02 delivery preferences and inbox data paths complete
- lifecycle and audit tables from Stages 01 and 02 populated
- notification event timestamps available for latency calculations

## Completion Check

- analytics endpoints return stable counts and latency aggregates for configured windows
- history endpoints reconstruct decision lineage without gaps
- role-based filtering prevents unauthorized analytics visibility
- tests prove summaries match underlying transition records

## Status

Status: **COMPLETE** [x]

## Implementation Evidence

**Validated:** 4/4 tests passing — `tests/phase4DecisionAnalyticsHistorySurfacesPart03.test.ts`

### Migration
- None required for this slice (implemented from existing lifecycle, approval chain, and step event tables).

### Repositories
- Added: `reviewDecisionAnalyticsRepository.ts` — window-scoped analytics source and paginated history retrieval with status/outcome filtering.

### Services
- Added: `reviewDecisionAnalyticsService.ts` — role-gated summary aggregation, latency metrics, and timeline reconstruction.

### Routers
- Updated: `reviewRequestRouter.ts`
	- Added `GET /review-requests/analytics/decision-summary`
	- Added `GET /review-requests/history/timeline`
	- Added decision analytics/history validation schemas and unauthorized error mappings
