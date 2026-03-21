# Part 02: Draft Editing for Expanded Types

## Objective

Create draft editing flows for the newly supported entity types so Phase 1 can prove broader authoring behavior rather than only retrieval.

## Work To Be Done

- add validation and write routes or actions for the new entity type drafts
- create revision-on-save behavior for the expanded model
- define minimal editing feedback or response payloads
- preserve role boundaries across editor and author-admin users
- extend fixtures or tests for the new draft flows

## Deliverables

- draft editing path for the expanded entity model
- revision-on-save behavior for the new content type
- coverage for the broadened authoring flow

## Dependencies

- Part 01 complete

## Completion Check

- authorized users can create or update drafts for the Phase 1 entity types
- saving produces distinct revision records for the expanded model

## Status

**Completed** — 2026-03-18

### Implementation Evidence

- `apps/api/src/routes/adminLocationRouter.ts` — `POST /admin/locations/drafts` was already present; uses `locationDraftService.saveDraft()`, guarded by `requireAuthenticatedActor(["EDITOR", "AUTHOR_ADMIN"])`, Zod-validated input.
- `apps/api/src/routes/adminEventRouter.ts` — `POST /admin/events/drafts` was already present; identical pattern via `eventDraftService.saveDraft()`.
- `tests/phase1DraftEditingExpandedTypes.test.ts` — added 4 integration tests:
  1. Editor creates location draft; re-save increments `version` and produces a new `revisionId`.
  2. Author-admin creates event draft; same revision-on-save behavior confirmed.
  3. Unauthenticated POST to both draft endpoints returns 401.
  4. Missing required fields (`name` / `summary`) on both endpoints returns 400.

### Notes

- The write routes for location and event drafts predated this slice; Part 02 work was completed by adding test coverage that formally verifies revision-on-save behavior, auth boundaries, and validation for those routes.
- Tracker updated: Part 02 → `[x]`. Stage 02 remains `[-]` pending Part 03 (Relationship Authoring Flow).
