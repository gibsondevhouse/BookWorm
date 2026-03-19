# Stage 01: Comprehensive Entity Management

## Purpose

Expand the content spine from the current representative slice into the broader MVP entity model so later public and discovery features have complete structured data to operate on.

## Parts

1. Remaining Entity Type Schema
2. Full Admin CRUD Coverage
3. Admin Update and Retire Completion (Part 02b)
4. Metadata, Visibility, and Timeline Baseline (Part 03)

## Outputs

- schema and revision support for the remaining MVP entity and manuscript types
- authenticated authoring coverage across the supported content model
- consistent handling for visibility tiers, spoiler tiers, tags, and timeline anchors

## Exit Criteria

- the MVP entity set exists in the schema with revision-safe persistence rules
- authors and editors can create, update, and retire supported drafts through admin routes
- metadata required by public rendering, search, and continuity is stored in a consistent shape
- Stage 01 exit criterion #2 was satisfied by Part 02b completion (March 18, 2026), and Part 03 has now landed the shared metadata baseline required to close the stage

## Progress

- [x] Part 01: Remaining Entity Type Schema — completed; all 13 MVP entity types present in schema with revision-safe persistence
- [x] Part 02: Full Admin CRUD Coverage — completed; `POST /:entityType/drafts` covers all 13 entity types, 7/7 new tests passing, 38/38 full suite; update and retire routes intentionally deferred (see part doc)
- [x] Part 02b: Admin Update and Retire Completion — completed; PATCH update and DELETE retire/delete-or-retire routes implemented with `retiredAt` schema field, 11 new tests, 49/49 suite passes; Stage 01 exit criterion #2 satisfied
- [x] Part 03: Metadata, Visibility, and Timeline Baseline — completed; shared metadata contract, chronology-sensitive timeline-anchor validation, metadata-preserving draft updates, and public visibility filtering verified

## Status

**Completed** — 2026-03-19

All Stage 01 parts are complete. The stage now closes with all three exit criteria satisfied:

- [x] the MVP entity set exists in the schema with revision-safe persistence rules
- [x] authors and editors can create, update, and retire supported drafts through admin routes
- [x] metadata required by public rendering, search, and continuity is stored in a consistent shape

Part 03 provided the remaining closure work by standardizing spoiler tier, tags, and timeline-anchor metadata through shared admin contracts and release-safe public shaping.
