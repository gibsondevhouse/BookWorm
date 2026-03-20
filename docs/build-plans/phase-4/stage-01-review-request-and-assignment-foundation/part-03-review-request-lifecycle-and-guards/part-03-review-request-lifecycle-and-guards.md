# Part 03: Review Request Lifecycle and Guards

## Objective

Introduce deterministic review-request lifecycle transitions with guardrails that prevent contradictory or out-of-order reviewer actions.

## Work To Be Done

- define lifecycle states (for example: OPEN, ACKNOWLEDGED, IN_REVIEW, RESOLVED, CANCELED)
- enforce transition matrix in service logic
- record transition timestamps and actor attribution for each state change
- expose transition endpoints and read surfaces for lifecycle history
- ensure lifecycle changes remain aligned with proposal status progression

## Deliverables

- lifecycle enum and transition matrix contract
- transition API endpoints with audit attribution
- tests for allowed transitions, forbidden transitions, and race-condition guards

## Dependencies

- Part 02 assignment and queue behavior complete
- proposal status contract from Phase 3 available for cross-checks
- audit metadata patterns reused for transition history

## Completion Check

- [x] lifecycle states change only through permitted transitions
- [x] transition history is queryable and attributed
- [x] conflicting lifecycle/proposal states are blocked by validation
- [x] test coverage demonstrates deterministic guard behavior under concurrent attempts

## Implementation Notes

**Schema and Persistence**
- `ReviewRequestStatus` now supports `OPEN`, `ACKNOWLEDGED`, `IN_REVIEW`, `RESOLVED`, and `CANCELED`.
- `review_requests.lifecycleHistory` persists transition audit entries with timestamp, actor attribution, and from/to state.
- Repository status transitions are guarded with compare-and-set semantics (`id` + `fromStatus`) to prevent lost updates under concurrent attempts.

**Services and Validation**
- Service-level transition matrix enforces deterministic allowed paths.
- Lifecycle transitions are authorized for `AUTHOR_ADMIN` and assigned approvers; unauthorized transitions fail explicitly.
- Proposal-alignment validation blocks contradictory lifecycle transitions unless proposal progression indicates a final decision state.

**API Surfaces**
- `PATCH /review-requests/:id/lifecycle` transitions lifecycle status using validated transition rules.
- `GET /review-requests/:id/lifecycle-history` exposes current status and attributed transition history.

**Tests**
- `tests/phase4ReviewRequestLifecycleGuardsPart03.test.ts` covers AC-01 through AC-04:
	- allowed transitions and attributed lifecycle history read surface
	- forbidden transition matrix paths
	- conflicting lifecycle/proposal state validation
	- authorization gates and concurrent transition guard behavior

## Status

Status: Complete [x]

Stage synchronization note:
- Stage 01 is complete because Parts 01, 02, and 03 are complete.

Evidence bounded to implemented behavior:
- lifecycle enum and review-request history field in `prisma/schema.prisma`
- transition/history repository and service guards in `apps/api/src/repositories/reviewRequestRepository.ts` and `apps/api/src/services/reviewRequestService.ts`
- lifecycle endpoints and error mapping in `apps/api/src/routes/reviewRequestRouter.ts`
- acceptance coverage in `tests/phase4ReviewRequestLifecycleGuardsPart03.test.ts`
