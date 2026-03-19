# Part 03: Relationship Authoring Flow

## Objective
Provide the first authenticated authoring path for relationship revisions so links between content are managed as first-class draftable records.

## Work To Be Done
- add validation for relationship draft payloads
- create write behavior for relationship create, update, and removal revisions
- align relationship authoring with dependency rules and release composition needs
- define minimal success and failure responses for the admin surface
- extend tests or verification steps for relationship authoring

## Deliverables
- admin relationship draft flow
- revision behavior for relationship changes
- verification coverage for relationship authoring

## Dependencies
- Stage 01 Part 02 complete
- Part 02 complete enough to integrate with the admin authoring surface

## Completion Check
- authorized users can create and revise relationships through the admin path
- relationship revisions are distinguishable across create, update, and delete states

## Status

**Completed** — 2026-03-18

### Implementation Evidence
- `apps/api/src/routes/adminRelationshipRouter.ts` — new router; `POST /admin/relationships/revisions` creates or advances a relationship revision (Zod-validated `CREATE | UPDATE | DELETE` state, `EDITOR | AUTHOR_ADMIN` gate); `GET /admin/relationships/:sourceSlug/:relationType/:targetSlug` returns the latest revision with full creator info; `GET /admin/relationships/:sourceSlug/:relationType/:targetSlug/history` returns all revisions newest-first.
- `apps/api/src/services/relationshipAdminService.ts` — new service; `getLatestByKey` and `getHistory` methods backed by `relationshipRepository`.
- `apps/api/src/services/relationshipDraftService.ts` — new service; `saveRevision` orchestrates relationship upsert and revision creation, delegating state-transition enforcement to the repository layer.
- `apps/api/src/repositories/relationshipRepository.ts` — extended with write methods; invalid state transitions are rejected at the repository layer and surfaced as 403 by the router.
- `apps/api/src/app/createApp.ts` — `adminRelationshipRouter` registered under `/admin/relationships`.
- `tests/phase1RelationshipAuthoringFlow.test.ts` — 9 integration tests covering CREATE / UPDATE / DELETE revision creation, latest-revision retrieval, history ordering, cross-state distinguishability, 403 on invalid state transition, 401 for unauthenticated callers, and 400 for invalid payloads. All suite-level tests pass; `pnpm lint` and `pnpm type-check` clean.

### Notes
- All three admin endpoints are gated by `requireAuthenticatedActor(["EDITOR", "AUTHOR_ADMIN"])`; unauthenticated requests return 401.
- State-transition validation is enforced in the repository layer; attempting an out-of-order transition returns 403.
- Tracker updated by executor: Part 03 → `[x]`, Stage 02 Overview → `[x]`.
- User brief stated 8 tests; repository contains 9 `test()` calls. This completion note uses the repository-verified count of 9.