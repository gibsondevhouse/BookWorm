# Part 03: Metadata, Visibility, and Timeline Baseline

## Objective

Establish the shared metadata rules that later public, search, and continuity features depend on, especially visibility, spoiler tier, tags, and timeline anchors.

## Work To Be Done

- define the minimum metadata contract for the supported MVP types
- standardize visibility and spoiler-tier handling across admin and public surfaces
- add timeline anchor support where chronology-sensitive types require it
- ensure the metadata shape supports search filters and continuity rules without later migration churn
- document precedence assumptions that must remain stable in later phases

## Deliverables

- shared metadata contract for MVP content types
- baseline visibility and spoiler handling rules
- timeline-anchor support for chronology-aware content

## Dependencies

- Part 01 complete
- Part 02 complete enough to persist the required metadata through admin flows

## Completion Check

- supported content types expose a predictable metadata shape for downstream consumers
- release-safe public shaping can rely on server-side visibility and spoiler metadata rather than ad hoc field handling

## Status

**Completed** — 2026-03-19

### What Was Implemented

- `entityMetadataContract` now defines the shared metadata contract used by both generic and specialized admin draft routes: `spoilerTier`, normalized lowercase `tags`, and optional `timelineAnchor`
- timeline anchors are restricted to chronology-sensitive entity types (`EVENT`, `REVEAL`, `TIMELINE_ERA`); unsupported types are rejected during request validation before persistence
- draft payload building now merges metadata against the previous revision so omitted metadata fields persist across update calls instead of being dropped
- generic admin entity list/detail/history responses expose normalized metadata consistently, alongside release summary data that later public, search, and continuity work can consume
- public discovery shaping returns normalized metadata for active-release public entities while continuing to gate access primarily on `visibility`
- specialized `CHARACTER`, `FACTION`, `LOCATION`, and `EVENT` draft paths all route through the same metadata payload-building rules, keeping legacy and generic admin surfaces aligned

### Evidence

- `apps/api/src/lib/entityMetadataContract.ts` defines the contract, chronology-sensitive type gate, metadata normalization, and payload merge behavior
- `apps/api/src/repositories/entityAdminRepository.ts` and `apps/api/src/repositories/entityRevisionRepository.ts` persist and read normalized metadata across admin draft and public active-release reads
- `apps/api/src/routes/adminEntityRouter.ts` enforces the shared create/update schemas and serializes metadata on generic admin responses
- `apps/api/src/repositories/publicDiscoveryRepository.ts` limits discovery to active-release `PUBLIC` revisions while returning normalized metadata for downstream consumers
- `apps/api/src/repositories/characterRepository.ts`, `apps/api/src/repositories/factionRepository.ts`, `apps/api/src/repositories/locationRepository.ts`, and `apps/api/src/repositories/eventRepository.ts` all use the shared metadata payload builder
- `apps/api/src/services/characterDraftService.ts`, `apps/api/src/services/factionDraftService.ts`, `apps/api/src/services/locationDraftService.ts`, and `apps/api/src/services/eventDraftService.ts` keep specialized draft writes aligned with the same role-gated contract
- `apps/api/src/routes/adminCharacterRouter.ts`, `apps/api/src/routes/adminFactionRouter.ts`, `apps/api/src/routes/adminLocationRouter.ts`, and `apps/api/src/routes/adminEventRouter.ts` validate specialized draft creation through the same metadata contract
- `tests/phase2MetadataVisibilityTimelineBaseline.test.ts` verifies timeline-anchor rejection for `LOCATION`, metadata normalization across specialized admin create and generic admin update, public event metadata parity, and visibility-safe discovery filtering

### Completion Check Results

- [x] supported content types expose a predictable metadata shape for downstream consumers
- [x] release-safe public shaping relies on server-side visibility and spoiler metadata rather than ad hoc field handling
- [x] chronology-sensitive entity types support timeline anchors and non-chronology types reject them at validation time
- [x] metadata remains stable across specialized admin create, generic admin update, and active-release public reads

### Verification

- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase2MetadataVisibilityTimelineBaseline.test.ts`
- `pnpm lint`
- `pnpm type-check`

All passed before this doc sync.

### Unblocks

- Stage 01 closure
- Phase 2 Stage 02 planning and delivery against a stable metadata, visibility, and timeline baseline
