# Part 02: Timeline Surface Baseline

## Objective

Add the first release-selectable timeline API surface for public chronology by exposing a deterministic event feed shaped from release-safe timeline-anchor metadata.

## Status

**Complete** — 2026-03-19

## Completed Executable Slice

`Release-Selectable Public Codex Timeline Event Feed API Baseline`

## Current Repository Baseline

- Part 01 is complete for release-selectable public codex detail/list/related neighbors on `CHARACTER`, `FACTION`, `LOCATION`, and `EVENT` via the shared public codex seam (`publicCodexRouter` -> `publicCodexService` -> `publicCodexRepository`)
- release selection behavior is already established and regression-tested for active fallback versus explicit archived selection, including leak-safe 404 behavior for draft or unknown selectors
- entity metadata already normalizes and validates `timelineAnchor` through `entityMetadataContract`, with `timelineAnchor` supported only on chronology-sensitive entity types (`EVENT`, `REVEAL`, `TIMELINE_ERA`)
- existing metadata baseline coverage (`tests/phase2MetadataVisibilityTimelineBaseline.test.ts`) proves timeline-anchor metadata remains normalized across admin and current public surfaces and that visibility gating remains authoritative
- no dedicated public timeline route exists yet, so Part 02 should land as API-first contract work before any reader or web timeline rendering

## Repository Evidence

- `apps/api/src/routes/publicCodexRouter.ts` exposes `GET /codex/timeline/events` with optional `releaseSlug` and bounded `limit`, calling one service method and mapping not-found release selectors to leak-safe 404
- `apps/api/src/services/publicCodexService.ts` carries the timeline request through the service layer without bypassing repository boundaries
- `apps/api/src/repositories/publicCodexRepository.ts` (`listTimelineEvents`) resolves active fallback versus explicit archived selection, filters by entity type `EVENT`, revision visibility `PUBLIC`, non-retired entity, and non-null `timelineAnchor.sortKey`; sorts deterministically by `sortKey` → `name` → `slug`; maps `detailPath` and release-aware `detailHref`; and bounds results via `slice`
- `tests/phase2PublicCodexTimelineSurfaceBaseline.test.ts` verifies active fallback with chronology ordering and stable tie-breakers, archived release selection with release-aware `detailHref`, and leak-safe 404 for draft and unknown selectors

## Work To Be Done

- no remaining implementation slices inside Part 02
- carry forward into Part 03 chapter reader and edition selection planning on top of the completed public codex timeline seam

## API-First Scope Boundary

- route layer: parse/validate query (`releaseSlug`, optional bounded `limit`), call one service method, and map not-found release selectors to leak-safe 404 responses
- service layer: pass through validated request shape without business logic leakage
- repository layer: reuse existing public release resolution and enforce timeline eligibility filters plus deterministic ordering
- output model: timeline feed contract only; no rendering, no reader composition, no client state behavior

## Explicit Non-Goals

- no chapter/scene reader work
- no web app/UI timeline implementation
- no broad canonical timeline engine
- no timeline-era grouping engine, period bucketing strategy, or cross-type chronology beyond baseline event feed
- no graph expansion, no relationship traversal changes, and no cross-release diffing

## Deliverables

- timeline feed API contract for public event chronology on the codex release-selection seam
- release-safe filtering and deterministic chronology ordering behavior
- targeted timeline feed regression plus codex/metadata seam regression validation set

## Dependencies

- Stage 01 Part 03 complete
- Part 01 complete enough to link timeline entries back to codex pages

## Acceptance Criteria

- `GET` timeline feed without `releaseSlug` resolves from active release and returns only public, non-retired event revisions with non-null `timelineAnchor`
- `GET` timeline feed with archived `releaseSlug` resolves from that selected archived release and does not leak active/draft release data
- draft and unknown release selectors return leak-safe 404 behavior
- timeline feed output order is deterministic and chronology-oriented (`sortKey` then stable tie-breakers)
- each timeline item includes release-safe navigation fields (`detailPath`, `detailHref`) consistent with existing event detail path conventions
- existing Part 01 codex routes and metadata normalization behavior remain intact

## Validation Expectations

- new targeted test:
  - `tests/phase2PublicCodexTimelineSurfaceBaseline.test.ts`
- required regression tests:
  - `tests/phase2PublicCodexReleaseSelection.test.ts`
  - `tests/phase2PublicCodexListReleaseSelection.test.ts`
  - `tests/phase2PublicCodexRelatedContentNavigation.test.ts`
  - `tests/phase2MetadataVisibilityTimelineBaseline.test.ts`
- required commands:
  - `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase2PublicCodexTimelineSurfaceBaseline.test.ts`
  - `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase2PublicCodexReleaseSelection.test.ts`
  - `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase2PublicCodexListReleaseSelection.test.ts`
  - `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase2PublicCodexRelatedContentNavigation.test.ts`
  - `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase2MetadataVisibilityTimelineBaseline.test.ts`
  - `pnpm lint`
  - `pnpm type-check`

## Blockers And Assumptions

- assumption: timeline baseline can be materially advanced with event-only chronology feed, deferring reveal and timeline-era expansion to later slices
- assumption: `timelineAnchor.anchorLabel` is display data while `timelineAnchor.sortKey` is the ordering primitive for this baseline
- assumption: if a selected release has no eligible timeline entries, returning `200` with an empty `items` list is acceptable; only unsupported selectors should produce 404
- no active blockers in repository seams; release selection and metadata normalization foundations are already implemented and covered

## Completion Check

- API clients can retrieve release-safe, chronologically ordered timeline events without reader or web UI dependencies
- timeline output is release-bound and changes only when selected release composition changes
- all acceptance criteria are met and validated by targeted and regression tests
- existing Part 01 codex contracts remain intact and unaffected by the timeline additions
