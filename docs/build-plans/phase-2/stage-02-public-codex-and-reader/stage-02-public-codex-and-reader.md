# Stage 02: Public Codex and Reader

## Purpose

Turn the broader content model into a usable public experience by building release-bound codex, timeline, and reading surfaces.

## Parts

1. Public Codex Detail Baseline
2. Timeline Surface Baseline
3. Chapter Reader and Edition Selection

## Outputs

- public list and detail behavior for supported entity types
- timeline rendering anchored to release-safe event data
- chapter and scene reading flows with release selection

## Current Repository Baseline

- the API now exposes release-selectable public detail routes for `CHARACTER`, `FACTION`, `LOCATION`, and `EVENT`, with optional `releaseSlug` support for `ACTIVE` and `ARCHIVED` releases plus active-release fallback when the selector is omitted
- the API now also exposes `GET /codex` for release-selectable list reads across `CHARACTER`, `FACTION`, `LOCATION`, and `EVENT`, including deterministic ordering, bounded `limit`, and type/query filtering within the selected release
- the API now also exposes `GET /codex/:entityType/:slug/related` for release-selectable one-hop neighbor reads with deterministic ordering, bounded `limit`, and release-safe relationship/entity filtering
- the API now also exposes `GET /codex/timeline/events` for release-selectable chronological event feeds, returning only `EVENT` type entries with non-null `timelineAnchor.sortKey`, ordered deterministically by `sortKey` ascending then `name` then `slug`, with release-aware `detailHref` navigation fields
- the API already exposes active-release public detail routes for `RELATIONSHIP`, `CHAPTER`, and `SCENE`
- cross-entity public discovery already exists at `GET /discover`, with active-release filtering plus type and query filtering for public entities
- regression coverage now proves active-release fallback, archived release selection, leak-safe 404 behavior, and release-bound type/query filtering for public `CHARACTER`, `FACTION`, `LOCATION`, and `EVENT` detail and codex-list routes; timeline feed coverage proves chronology ordering with stable tie-breakers, archived release-aware detailHref, and draft/unknown selector 404 behavior; alongside existing discovery, relationship detail, manuscript list/detail, and metadata visibility shaping coverage
- the web app does not yet provide a public codex or reader UI beyond the minimal app shell, so Stage 02 must continue API-first rather than planning around a non-existent frontend surface

## Execution Order

1. Part 01 has completed its first API-first codex detail slice, adding explicit release selection for public entity detail reads while preserving current active-release fallback behavior.
2. Part 01 has now also completed `Release-Selectable Public Codex List Baseline`, adding codex-oriented list behavior on top of the shared public release-resolution seam without widening into timeline, reader, or web UI delivery.
3. Part 01 has now completed `Release-Selectable Codex Related-Content Neighbors API Baseline`, adding a one-hop related-content navigation route on top of the detail + list seam.
4. Part 02 is complete. The timeline event feed has been implemented and regression-tested. Its release-selection contract is now stable for public chronology reads.
5. Part 03 is complete. The manuscript list and chapter reader surface has been implemented and regression-tested. The release-selection contract is now stable for public manuscript reads.

## Completed Slice (Part 01)

`Release-Selectable Codex Related-Content Neighbors API Baseline`

### Verified Scope

- add a release-selectable public codex related-content endpoint for supported entity types (`CHARACTER`, `FACTION`, `LOCATION`, `EVENT`) that returns one-hop neighbors for a source entity
- keep release resolution aligned with existing Part 01 seams: active fallback when `releaseSlug` is omitted, explicit `ACTIVE`/`ARCHIVED` selection when provided, and leak-safe 404 on unsupported release selectors
- return deterministic navigation fields for each related item (`detailPath`, `detailHref`) so clients can navigate from an entity detail view to adjacent codex pages without UI work in this slice
- enforce public safeguards at query time for both relationship and entity sides: relationship revision must be `PUBLIC` and not `DELETE`; related entity revision must be `PUBLIC`, non-retired, and included in the same selected release

### Repository Evidence

- `apps/api/src/routes/publicCodexRouter.ts` now exposes `GET /codex/:entityType/:slug/related` with optional `releaseSlug`, bounded `limit`, and leak-safe 404 handling
- `apps/api/src/services/publicCodexService.ts` carries the related-content request through the service layer without bypassing repository boundaries
- `apps/api/src/repositories/publicCodexRepository.ts` resolves active fallback versus explicit archived selection, filters relationship + neighbor visibility/state, bounds and deterministically sorts one-hop neighbor results, and maps `detailPath`/`detailHref`
- `tests/phase2PublicCodexRelatedContentNavigation.test.ts` verifies active fallback, archived release selection, leak-safe draft/unknown selector 404 behavior, deterministic ordering + bounded limit behavior, and release-safe `detailHref` propagation

### Non-Goals

- no timeline endpoints, timeline shaping, or chronology rendering
- no chapter/scene reader work or edition selection behavior
- no web app implementation
- no broad graph traversal, recursion, ranking, or multi-hop expansion
- no new release lifecycle behavior beyond existing active/archived public selection rules

## Completed Slice (Part 02)

`Release-Selectable Public Codex Timeline Event Feed API Baseline`

### Verified Timeline Scope

- add one API-first timeline endpoint under the existing public codex seam that returns release-bound `EVENT` entries with normalized `timelineAnchor` metadata for chronology rendering
- use the existing public release-resolution contract already proven by Part 01 (`releaseSlug` omitted => active fallback, explicit `ACTIVE`/`ARCHIVED` selection when provided, draft/unknown selector => leak-safe 404)
- keep timeline result ordering deterministic and chronology-oriented by sorting on `timelineAnchor.sortKey` ascending, then `name`, then `slug`
- include only entries that are safe and timeline-actionable in the selected release: entity type `EVENT`, revision visibility `PUBLIC`, entity not retired, and `metadata.timelineAnchor` present
- return deterministic codex navigation fields (`detailPath`, `detailHref`) aligned to existing event detail routes so later reader/web work can consume the feed without changing this API contract
- preserve Part 01 contracts (`/codex` detail/list/related) without breaking response models, route behavior, or release-selection semantics

### Explicit Non-Goals For Next Slice

- no chapter or scene reader behavior
- no web UI, frontend reader, or timeline rendering implementation
- no timeline era aggregation engine, no canonical chronology reconciliation, and no cross-release merge logic
- no broad timeline model for non-event entity types
- no relationship traversal beyond existing Part 01 related-neighbor behavior

### Acceptance Criteria

- `GET` timeline feed requests without `releaseSlug` resolve using the active release and return only public, non-retired event revisions with non-null timeline anchors
- `GET` timeline feed requests with an archived `releaseSlug` resolve from that release and preserve release-bound chronology (no bleed from active or draft releases)
- draft and unknown release selectors return leak-safe 404 behavior, aligned to current public codex release-selection rules
- timeline feed ordering is deterministic and chronology-oriented (`sortKey` then stable name/slug tie-breakers)
- each timeline item includes release-aware event navigation fields (`detailPath`, `detailHref`) consistent with Part 01 contracts
- existing `/codex` list/detail/related behavior and existing metadata shaping behavior remain unchanged

### Validation Expectations

- add targeted regression coverage for this slice in `tests/phase2PublicCodexTimelineSurfaceBaseline.test.ts`
- preserve and rerun seam regressions that guard release selection and metadata shaping:
  - `tests/phase2PublicCodexReleaseSelection.test.ts`
  - `tests/phase2PublicCodexListReleaseSelection.test.ts`
  - `tests/phase2PublicCodexRelatedContentNavigation.test.ts`
  - `tests/phase2MetadataVisibilityTimelineBaseline.test.ts`
- required command set for slice completion:
  - `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase2PublicCodexTimelineSurfaceBaseline.test.ts`
  - `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase2PublicCodexReleaseSelection.test.ts`
  - `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase2PublicCodexListReleaseSelection.test.ts`
  - `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase2PublicCodexRelatedContentNavigation.test.ts`
  - `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase2MetadataVisibilityTimelineBaseline.test.ts`
  - `pnpm lint`
  - `pnpm type-check`

## Completed Slice (Part 03)

`Release-Selectable Public Manuscript List and Chapter Reader Baseline`

### Verified Manuscript Reader Scope

- add two routes under the `/codex` router seam: `GET /codex/manuscripts` and `GET /codex/manuscripts/:slug`
- use the same `releaseSlug` contract as Parts 01 and 02: active fallback when omitted, explicit `ACTIVE`/`ARCHIVED` selection when provided, draft/unknown => 404
- filter by `ManuscriptRevision.visibility === PUBLIC` and `ReleaseManuscriptEntry` membership for the resolved release
- return deterministic `title` asc / `slug` asc ordering, bounded `limit`, and release-aware `detailHref`

### Part 03 Repository Evidence

- `apps/api/src/repositories/publicCodexManuscriptRepository.ts` - new file; implements `listManuscripts` and `getManuscriptDetail` using `ReleaseManuscriptEntry` -> `ManuscriptRevision` -> `Manuscript`
- `apps/api/src/services/publicCodexService.ts` - extended with `listManuscripts` and `getManuscriptDetail` delegates
- `apps/api/src/routes/publicCodexRouter.ts` - extended with `GET /manuscripts` and `GET /manuscripts/:slug`, registered before parameterized wildcards
  - `tests/phase2PublicCodexChapterReaderBaseline.test.ts` - 10 tests covering active fallback, archived selection, draft/unknown 404 on list and draft 404 on detail, type filtering, PRIVATE visibility exclusion, detailHref form, and seam regression

## Exit Criteria

- readers can navigate core public codex pages for the supported MVP types
- timeline views resolve chronological content from release data only
- reader views resolve chapters and scenes from the selected release without leaking drafts

## Status

**Complete** — 2026-03-19

All three parts are complete: Part 01 delivered release-selectable public entity detail, codex list, and one-hop related-content neighbors for `CHARACTER`, `FACTION`, `LOCATION`, and `EVENT`; Part 02 delivered the timeline event feed; Part 03 delivered the manuscript list and chapter reader surface with edition selection via `releaseSlug`.
