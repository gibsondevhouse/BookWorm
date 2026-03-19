# Part 02b: Admin Update and Retire Completion

## Objective

Close the deferred mutation surface from Part 02 so Stage 01 exit criterion #2 is fully satisfied before Part 03 can be treated as stage-closing work.

## Work To Be Done

- implement authenticated admin update routes for supported entity drafts using revision-safe update semantics
- implement retire behavior via delete-or-retire semantics that preserve revision history and release safety
- align update and retire request validation and authorization behavior with existing admin create and read routes
- verify representative entity types and generic route behavior for create, update, and retire state transitions
- document route contracts and edge-case behavior where retire is blocked by dependency or state rules

## Deliverables

- admin update route coverage for supported entity draft types
- admin retire (delete-or-retire) behavior wired with revision-safe semantics
- consistent validation and role-gating outcomes across create, update, and retire mutations
- test coverage proving create, update, and retire transitions for representative entity types and generic entity-type routing

## Dependencies

- Part 01 complete
- Part 02 complete
- existing admin create-draft route contract (`POST /:entityType/drafts`) remains the baseline for validation and authorization consistency

## Completion Check

- supported entity draft update routes accept valid payloads and persist revision-safe mutations
- retire/delete-or-retire flows do not hard-delete historical revision state and remain release-safe
- validation and authorization behavior for update and retire matches the established admin mutation baseline
- tests pass for representative type-specific paths and generic route behavior covering create, update, and retire transitions
- Stage 01 exit criterion #2 can be marked satisfied only after this part is marked complete

## Status

**Completed** — March 18, 2026

### What Was Implemented

- `PATCH /admin/entities/:entityType/:slug/drafts` — update route requiring `EDITOR` or `AUTHOR_ADMIN` role; validates entity existence (404 if missing), rejects unsupported types (400), rejects missing fields (400), and creates a new revision via the existing `saveDraft` semantics
- `DELETE /admin/entities/:entityType/:slug` — retire/delete-or-retire route with revision-safe semantics: hard-deletes entities with no release history (returns `{ outcome: "deleted" }`); soft-retires entities with release entries by setting `retiredAt` on the Entity record (returns `{ outcome: "retired" }`); idempotent on already-retired entities
- `retiredAt DateTime?` column added to `Entity` via migration `20260318200000_add_entity_retired_at`; Prisma schema updated and client regenerated
- `entityAdminRepository.retireEntity` — checks release-entry count and applies delete-or-retire; hard delete cascades to revisions; soft retire preserves full revision history
- `entityAdminService.updateDraft` — existence-guard wrapper over `saveDraft`; `entityAdminService.retireEntity` — role-and-type guard delegating to repository
- `updateDraftBodySchema` (slug comes from URL, not body) defined alongside existing `saveDraftBodySchema`
- Authorization matches established admin mutation baseline: `EDITOR` and `AUTHOR_ADMIN` permitted; unauthenticated requests rejected with 401

### Verification

- 11 new tests added to `tests/phase2AdminEntityCrudSlice.test.ts`:
  - unauthenticated PATCH → 401; unsupported type → 400; missing body → 400; non-existent entity → 404
  - PATCH creates a new revision and increments version for an existing entity draft
  - unauthenticated DELETE → 401; unsupported type → 400; non-existent entity → 404
  - DELETE hard-deletes entity with no release entries (confirmed 404 after)
  - DELETE soft-retires entity with release entries; entity remains retrievable; idempotent retry returns `retired`
  - Full create → update → retire lifecycle using CHARACTER type (generic route)
- 49/49 full test suite passes
- `pnpm lint` and `pnpm type-check` clean

## Acceptance Criteria

- authenticated `EDITOR` and `AUTHOR_ADMIN` users can update drafts for supported entity types through admin routes
- unauthorized or unauthenticated requests for update and retire routes are rejected with consistent status codes and error shape
- unsupported entity types or invalid mutation payloads are rejected with validation-safe responses
- retire behavior applies revision-safe delete-or-retire semantics and preserves required historical integrity
- verification includes route-level tests that demonstrate create, update, and retire transitions across representative entity types plus generic `:entityType` route handling
- Stage 01 is not eligible for `[x]` completion while this part remains `[-]` or `[ ]`
