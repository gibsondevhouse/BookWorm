# Part 02: Full Admin CRUD Coverage

## Objective

Extend admin authoring beyond the current baseline so the supported MVP content types can be created, updated, reviewed, and retired through authenticated application flows rather than through fixtures alone.

## Work To Be Done

- add retrieval, create, update, and delete-or-retire behavior for the supported content types
- align request validation and response shapes across the admin authoring surface
- ensure role rules remain consistent between editor and author-admin access
- integrate revision creation with the broader content set rather than only the initial slice
- capture the minimum verification coverage for the expanded admin paths

## Deliverables

- admin CRUD flows for the supported MVP types
- consistent admin validation and authorization behavior
- verification coverage for the expanded authoring surface

## Dependencies

- Part 01 complete
- outstanding Phase 1 authoring-surface gaps resolved or intentionally superseded by this broader admin plan

## Completion Check

- authorized users can author the supported MVP content through documented routes
- draft mutation remains revision-based and release-safe across the broader content set

## Status

**Completed** — March 18, 2026

### What Was Implemented

- `adminEntityRouter` extended with `POST /:entityType/drafts` covering all 13 supported `EntityType` values
- `entityAdminService.saveDraft` added; `supportedEntityTypes` expanded to the full 13-type set (`CHARACTER`, `FACTION`, `LOCATION`, `EVENT`, `ARTIFACT`, `CREATURE`, `BELIEF_SYSTEM`, `POLITICAL_BODY`, `LANGUAGE`, `SECRET`, `REVEAL`, `TAG`, `TIMELINE_ERA`)
- `entityAdminRepository.saveDraft` added — upserts the entity on slug, creates a new revision on each call
- Role guards (`EDITOR` / `AUTHOR_ADMIN`) consistent with prior admin read routes
- 9 types that previously had zero admin write coverage now fully supported: `ARTIFACT`, `CREATURE`, `BELIEF_SYSTEM`, `POLITICAL_BODY`, `LANGUAGE`, `SECRET`, `REVEAL`, `TAG`, `TIMELINE_ERA`
- Existing `CHARACTER` and `FACTION` write routes remain backward-compatible
- All draft mutations remain revision-based and release-safe

### Verification

- `tests/phase2AdminEntityCrudSlice.test.ts` — 7 new tests: unauthenticated guard (401), unsupported type guard (400), missing body guard (400), all 9 new entity types create + retrieve, revision-on-same-slug increments version, history endpoint returns ordered revisions, list-by-type returns all seeded slugs
- `tests/phase2AdminManuscriptCrudSlice.test.ts` — pre-existing manuscript draft tests also pass as part of the full suite
- 38/38 full test suite passes
- `pnpm lint` and `pnpm type-check` clean

### Intentionally Deferred

- **Update and retire routes** (`PATCH`/`PUT` and `DELETE`/retire) were not delivered in this part. The "Work To Be Done" section listed them, but this part scoped to create-draft coverage so the broader content set was unblocked for follow-on work. That deferred scope was completed in Part 02b: Admin Update and Retire Completion on 2026-03-18; Stage 01 closure then remained with Part 03.
