# Part 01: Public Codex Detail Baseline

## Objective

Provide the first broad public codex surface for the MVP entity set so readers can navigate beyond isolated entity endpoints.

## Current Repository Baseline

- `GET /characters/:slug`, `GET /factions/:slug`, `GET /locations/:slug`, and `GET /events/:slug` now accept an optional `releaseSlug` query parameter and return public detail from the selected `ACTIVE` or `ARCHIVED` release, while still falling back to the active release when the selector is omitted
- `GET /discover` already lists active-release public entity content across types with release slug, visibility, metadata, and version information
- `tests/phase2PublicEntitySlice.test.ts` still proves active-release binding for public `LOCATION` and `EVENT` detail
- `tests/phase2PublicCodexReleaseSelection.test.ts` proves active fallback with no selector, archived release selection for `CHARACTER`, `FACTION`, `LOCATION`, and `EVENT`, and leak-safe 404 behavior for draft releases, unknown releases, missing release entries, and non-public revisions
- `tests/phase2PublicCodexListReleaseSelection.test.ts` proves release-selectable codex list behavior, deterministic ordering, bounded list responses, leak-safe 404 behavior for draft/unknown selectors, and release-bound type/query filtering for `CHARACTER`, `FACTION`, `LOCATION`, and `EVENT`
- `tests/phase2PublicCodexRelatedContentNavigation.test.ts` proves release-selectable one-hop codex related-content neighbors, including active fallback, archived selection, leak-safe 404 behavior for draft/unknown selectors, deterministic ordering, bounded `limit`, and release-safe `detailHref` propagation
- `tests/phase1PublicDiscoveryBaseline.test.ts` proves active-release filtering and query behavior for discovery
- `tests/phase2MetadataVisibilityTimelineBaseline.test.ts` proves public metadata shaping stays visibility-safe and spoiler-safe at the current API boundary
- Part 01 codex detail scope is now functionally complete across release-selectable detail, codex list, and one-hop related-content navigation seams for supported MVP types

## Work To Be Done

- no remaining implementation slices inside Part 01
- carry forward into Part 02 timeline API planning on top of the completed public codex release-selection seams

## Deliverables

- public codex list, detail, and one-hop related-content neighbor baselines
- release-safe public response models for supported entity types
- verification coverage for representative codex reads

## Dependencies

- Stage 01 complete enough that the required public fields exist consistently

## Completion Check

- readers can resolve supported entity pages from published release data
- readers can resolve one-hop, release-safe related-content neighbors from supported codex entity detail context
- unreleased or unauthorized content remains excluded from public codex responses

## Status

**Completed** — 2026-03-19

### Completed Slice

`Release-Selectable Public Codex Entity Detail Baseline`

### What Was Implemented

- `publicReleaseQuerySchema` now validates an optional `releaseSlug` query parameter shared by the existing public `CHARACTER`, `FACTION`, `LOCATION`, and `EVENT` detail routers
- the public entity-detail route handlers now pass the optional selector through the service layer instead of remaining hard-wired to active-release reads
- repository-level public entity lookup now resolves either the active release by default or an explicitly selected `ACTIVE` or `ARCHIVED` release while continuing to require `PUBLIC` visibility and a non-retired entity
- public detail reads remain leak-safe at the route boundary: draft releases, unknown releases, selected releases that do not include the entity, non-public revisions, and retired entities all collapse to 404 behavior
- existing response contracts stay backward-compatible apart from the added release-selection capability; normalized metadata and version fields remain present on public detail responses

### Evidence

- `apps/api/src/routes/publicReleaseQuerySchema.ts` defines the shared optional `releaseSlug` query contract
- `apps/api/src/routes/publicCharacterRouter.ts`, `apps/api/src/routes/publicFactionRouter.ts`, `apps/api/src/routes/publicLocationRouter.ts`, and `apps/api/src/routes/publicEventRouter.ts` validate the selector and keep the public 404 boundary stable
- `apps/api/src/services/publicCharacterService.ts`, `apps/api/src/services/publicFactionService.ts`, `apps/api/src/services/publicLocationService.ts`, and `apps/api/src/services/publicEventService.ts` expose the selector through the service layer without bypassing repository boundaries
- `apps/api/src/repositories/entityRevisionRepository.ts` implements shared public release resolution for active fallback versus explicitly selected archived releases while filtering to public, non-retired content
- `apps/api/src/repositories/characterRepository.ts`, `apps/api/src/repositories/factionRepository.ts`, `apps/api/src/repositories/locationRepository.ts`, and `apps/api/src/repositories/eventRepository.ts` consume the shared resolver for type-specific detail reads
- `tests/phase2PublicCodexReleaseSelection.test.ts` verifies active fallback, archived selection, and leak-safe 404 behavior for draft, unknown, missing-entry, and non-public cases
- `tests/phase2PublicEntitySlice.test.ts` remains the active-release regression guard for the earlier public entity baseline

### Why This Slice Landed First

- current public entity detail already exists, so the fastest material advance was to close the release-resolution gap rather than rebuild a surface the repo already had
- Part 01 explicitly requires stable resolution for current and prior releases, and this slice closes that gap for the core public entity-detail routes
- the web app has no codex UI yet, so the slice stayed in the API and verification layer where the repository already had working seams
- discovery lists and related-content links are easier to add now that public entity detail uses a shared release-selection contract

### Acceptance Criteria

- [x] requesting a supported public entity detail route without `releaseSlug` continues to resolve from the active release
- [x] requesting a supported public entity detail route with an `ACTIVE` or `ARCHIVED` `releaseSlug` returns the entity revision included in that release when the revision is public
- [x] requesting a supported public entity detail route with a `DRAFT` `releaseSlug`, an unknown `releaseSlug`, or a release that does not include a public revision for the entity returns 404
- [x] public entity detail responses continue to expose normalized metadata and version information without leaking unreleased draft state
- [x] existing active-release regressions remain valid after the release-selection behavior is added
- [x] readers can browse a codex-oriented list or navigation surface beyond the existing discovery endpoint and isolated detail routes
- [x] public detail routes expose related-content navigation needed for a fuller codex experience

### Verification

- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase2PublicEntitySlice.test.ts`
- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase2PublicCodexReleaseSelection.test.ts`
- `pnpm lint`
- `pnpm type-check`

All passed before this doc sync.

### Remaining Part 01 Work

- none; Part 01 implementation slices are complete
- next planning focus is Part 02 timeline surface baseline

## Completed Slice: Release-Selectable Codex Related-Content Neighbors API Baseline

`Release-Selectable Codex Related-Content Neighbors API Baseline`

### What Was Implemented In This Related-Content Slice

- added `GET /codex/:entityType/:slug/related` for supported entity types (`CHARACTER`, `FACTION`, `LOCATION`, `EVENT`)
- release selection supports active fallback when `releaseSlug` is omitted and explicit `ACTIVE`/`ARCHIVED` selection when provided
- draft and unknown selectors return leak-safe 404 behavior
- response is bounded by `limit` (default `20`, max `50`) and deterministically ordered by relation type, neighbor name, neighbor slug, then relationship id
- related results are restricted to direct one-hop neighbors only
- relationship safety is enforced at query time (`PUBLIC` visibility, non-`DELETE` state)
- neighbor safety is enforced at query time (neighbor revision `PUBLIC`, entity non-retired, included in the selected release)
- each item exposes `detailPath` and `detailHref` for route-safe codex navigation, including release selector propagation when a release is explicitly selected

### Evidence For This Related-Content Slice

- `apps/api/src/routes/publicCodexRouter.ts` defines the `GET /codex/:entityType/:slug/related` route contract with bounded query parsing and leak-safe 404 handling
- `apps/api/src/services/publicCodexService.ts` carries related-content requests through the service layer
- `apps/api/src/repositories/publicCodexRepository.ts` implements release resolution, one-hop relationship joins, safety filters, deterministic ordering, bounded slicing, and detail route mapping
- `tests/phase2PublicCodexRelatedContentNavigation.test.ts` verifies active fallback, archived selection, leak-safe 404 behavior for draft/unknown selectors, deterministic ordering + bounded limit, and relationship/neighbor visibility safety filters

### Validation Expectations For This Related-Content Slice

- targeted related-content coverage is now present in `tests/phase2PublicCodexRelatedContentNavigation.test.ts`
- seam regressions to preserve for this part remain:
  - `tests/phase2PublicCodexReleaseSelection.test.ts`
  - `tests/phase2PublicCodexListReleaseSelection.test.ts`
  - `tests/phase1PublicRelationshipSlice.test.ts`
  - `tests/phase1PublicDiscoveryBaseline.test.ts`
  - `tests/phase2MetadataVisibilityTimelineBaseline.test.ts`
- gate commands remain:
  - `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase2PublicCodexRelatedContentNavigation.test.ts`
  - `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase2PublicCodexReleaseSelection.test.ts`
  - `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase2PublicCodexListReleaseSelection.test.ts`
  - `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase1PublicRelationshipSlice.test.ts`
  - `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase1PublicDiscoveryBaseline.test.ts`
  - `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase2MetadataVisibilityTimelineBaseline.test.ts`
  - `pnpm lint`
  - `pnpm type-check`

### Explicit Non-Goals

- no timeline API work, timeline links, or chronology rendering
- no chapter/scene reader API work
- no web app codex UI implementation
- no relationship metadata rendering contract expansion
- no broad graph traversal, pathfinding, recommendation logic, or scoring/ranking system

## Completed Slice: Release-Selectable Public Codex List Baseline

`Release-Selectable Public Codex List Baseline`

### What Was Implemented In This Slice

- added `GET /codex` as a dedicated release-selectable public codex list route for `CHARACTER`, `FACTION`, `LOCATION`, and `EVENT`
- list reads now use active-release fallback when `releaseSlug` is omitted and explicit selection when `releaseSlug` targets an `ACTIVE` or `ARCHIVED` release
- explicit draft or unknown `releaseSlug` selectors now return leak-safe `404` behavior on this list surface
- codex list filtering now supports type and optional text query while staying constrained to the selected release and bounded by `limit` (default `20`, max `50`)
- codex list items now include deterministic navigation fields (`detailPath`, `detailHref`) that map directly to existing public detail routes
- existing `GET /discover` semantics remain unchanged and active-release-only

### Acceptance Criteria For This Slice

- [x] requesting the new codex list surface with no `releaseSlug` resolves from the active release and returns only `PUBLIC`, non-retired entity revisions
- [x] requesting the codex list with an archived `releaseSlug` returns only items included in that archived release, with response `releaseSlug` aligned to the selected release
- [x] requesting the codex list with a draft or unknown `releaseSlug` returns leak-safe 404 behavior
- [x] type and query filters operate within the selected release boundary and do not return entities absent from that release
- [x] list items expose stable routing data that points to existing public detail routes (`/characters/:slug`, `/factions/:slug`, `/locations/:slug`, `/events/:slug`) without requiring web UI work
- [x] existing `GET /discover` behavior and tests remain valid and unchanged in semantics

### Evidence For This Slice

- `apps/api/src/routes/publicCodexRouter.ts` defines the new codex list route contract, including query parsing for `releaseSlug`, `type`, `q`, and `limit`
- `apps/api/src/services/publicCodexService.ts` carries codex list requests through the service layer
- `apps/api/src/repositories/publicCodexRepository.ts` enforces release selection, public visibility, non-retired filtering, deterministic ordering, bounded results, and list-to-detail navigation fields
- `apps/api/src/app/createApp.ts` wires `GET /codex` without changing `GET /discover`
- `tests/phase2PublicCodexListReleaseSelection.test.ts` validates active fallback, archived selection, leak-safe 404 behavior, deterministic ordering + limit behavior, and release-bound type/query filters across `CHARACTER`, `FACTION`, `LOCATION`, and `EVENT`

### Validation Expectations

- targeted codex-list coverage was added via `tests/phase2PublicCodexListReleaseSelection.test.ts`
- required discovery and release-selection regressions plus lint/type-check validation remain required for this part

Validated command set reported by the executor:

- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase1PublicDiscoveryBaseline.test.ts`
- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase2PublicCodexReleaseSelection.test.ts`
- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase2PublicCodexListReleaseSelection.test.ts`
- `pnpm lint`
- `pnpm type-check`

### Explicit Non-Goals For This Slice

- no timeline endpoints, timeline shaping, or chronology rendering
- no chapter or scene reader changes
- no web app codex UI implementation
- no broad related-content graph or relationship traversal contract beyond simple list-to-detail navigation fields
- no breaking changes to existing public detail route payloads

### Executor Notes

- preserve route -> service -> repository layering used throughout the API
- keep release-resolution logic centralized on the existing shared seam instead of duplicating selection logic per route
- if related-content links are introduced at all in this slice, keep them strictly minimal and scoped to deterministic list-to-detail navigation fields only

### Unblocks

- Part 02 timeline planning against a stable release-selectable codex detail, list, and related-neighbors seam
- later archive and reader work that needs explicit public release targeting
