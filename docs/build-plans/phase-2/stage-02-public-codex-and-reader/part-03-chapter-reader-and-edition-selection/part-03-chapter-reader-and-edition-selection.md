# Part 03: Chapter Reader and Edition Selection

**Status:** **Complete**

## Objective

Create the MVP reader baseline so chapters and scenes can be browsed by release as a first-class public experience. Part 03 extends the mature public codex release-selection contract — proven across entity detail, list, related-content, and timeline routes in Parts 01 and 02 — to CHAPTER and SCENE manuscript types, giving clients a release-bound manuscript navigation surface. Edition selection is implemented by applying the existing `releaseSlug` mechanism to manuscript reads; no new edition concept is introduced.

## Context: Chapter and Scene Modelling in This Codebase

CHAPTER and SCENE are **not** `EntityType` variants that live in `Entity`/`EntityRevision`/`ReleaseEntry`. They are `ManuscriptType` enum values on a parallel set of models: `Manuscript`, `ManuscriptRevision`, and `ReleaseManuscriptEntry`. This means the existing entity codex queries do not cover them and a separate query path is required against `ReleaseManuscriptEntry`.

## Dependencies

- Stage 01 complete (CHAPTER and SCENE manuscripts are authorable via admin routes)
- Part 01 and Part 02 complete (public codex release-selection contract and seam files are stable)
- `apps/api/src/repositories/publicCodexRepository.ts` exceeds 250 lines; manuscript queries must go in a new file to respect file-size conventions

## Completion Check

- Readers can list and read chapter and scene content from an explicitly selected release without receiving draft-only changes
- Switching the `releaseSlug` parameter changes which manuscript revision is returned, confirming edition selection works
- Unknown, draft, or omitted-when-no-active release selectors never leak private manuscript content

---

## Slice 01: Release-Selectable Public Manuscript List and Chapter Reader Baseline

### Slice Objective

Add a release-selectable public read surface for CHAPTER and SCENE under the `/codex` router seam — two new endpoints that use the same `releaseSlug` contract as all existing Part 01/02 routes. This gives clients the minimum viable manuscript navigation surface: list all manuscripts in a release (filterable by type) and read a single manuscript's content by slug with edition selection. Reading progress is explicitly client-side and is not part of this slice.

### Scope

- Add `GET /codex/manuscripts` — release-selectable list of CHAPTER and SCENE manuscripts
  - Optional query params: `releaseSlug`, `type` (CHAPTER or SCENE), `limit` (default 20, max 50)
  - Response: `{ releaseSlug, items: [...] }` where each item carries `manuscriptType`, `manuscriptSlug`, `title`, `summary`, `version`, `detailPath`, `detailHref`
  - `detailPath`: `/codex/manuscripts/:slug`
  - `detailHref`: bare `detailPath` for active-fallback reads; `detailPath?releaseSlug=<slug>` for explicit release selection
  - Deterministic ordering: `title` ascending, then `manuscriptSlug` ascending
  - Bounded by `limit`
- Add `GET /codex/manuscripts/:slug` — release-selectable manuscript detail
  - Optional query param: `releaseSlug`
  - Response: full manuscript detail including `payload` field
  - Shares the same release-resolution contract and safety rules as the list endpoint
- New file: `apps/api/src/repositories/publicCodexManuscriptRepository.ts`
  - Implements `listManuscripts` and `getManuscriptDetail` using `ReleaseManuscriptEntry` + `ManuscriptRevision`
  - Imports and reuses the shared `findPublicRelease` release-resolution helper already in `publicCodexRepository.ts` (extracted or duplicated cleanly — see note below)
  - Safety predicates: `ManuscriptRevision.visibility === PUBLIC` and a `ReleaseManuscriptEntry` must exist for the resolved release
- Extend `apps/api/src/services/publicCodexService.ts` with `listManuscripts` and `getManuscriptDetail` methods that delegate to the new repository
- Extend `apps/api/src/routes/publicCodexRouter.ts` with two new route handlers; new routes must be registered before the existing `/:entityType/:slug/related` wildcard pattern to keep Express route order consistent with convention
- New test file: `tests/phase2PublicCodexChapterReaderBaseline.test.ts`

**Note on `findPublicRelease`:** The release-resolution helper is currently private to `publicCodexRepository.ts`. For the new file, extract it to a shared location (`apps/api/src/lib/findPublicRelease.ts` or similar) and import it from both repositories, OR duplicate it in `publicCodexManuscriptRepository.ts` with a comment naming the canonical source. Do not leave it referenced across module boundaries without an import. The delivery agent should pick the minimal-change option and call it out explicitly.

### Non-Goals

- No changes to the existing `/chapters` or `/scenes` routes (they remain active-release-only; legacy route behavior is preserved)
- No reading progress tracking, client-side state management, or server-side progress persistence
- No web UI implementation
- No CHAPTER or SCENE entries under the `GET /codex/:entityType/:slug` or `GET /codex/:entityType/:slug/related` routes (those route params accept only `CHARACTER`, `FACTION`, `LOCATION`, `EVENT`)
- No sequential chapter ordering derived from payload data (e.g., `chapterNumber` sorting is not part of this slice; deterministic ordering uses `title` and `slug`)
- No edition-switching UX or client-side edition state
- No changes to the admin authoring surface

### Acceptance Criteria

- `GET /codex/manuscripts` without `releaseSlug` returns chapters and scenes from the active release; the `releaseSlug` field in the response matches the active release's slug
- `GET /codex/manuscripts?releaseSlug=<archived-slug>` returns chapters and scenes pinned to that archived release, not the current active revision
- `GET /codex/manuscripts?releaseSlug=<draft-slug>` returns 404 with a release-not-found error body
- `GET /codex/manuscripts?releaseSlug=<unknown-slug>` returns 404 with a release-not-found error body
- `GET /codex/manuscripts?type=CHAPTER` returns only entries with `manuscriptType === "CHAPTER"`
- `GET /codex/manuscripts?type=SCENE` returns only entries with `manuscriptType === "SCENE"`
- A CHAPTER or SCENE manuscript whose `ManuscriptRevision.visibility` is not `PUBLIC` does not appear in any list or detail response regardless of release selection
- A CHAPTER or SCENE manuscript with no `ReleaseManuscriptEntry` for the selected release does not appear in the list, and its slug returns 404 from the detail endpoint under that release
- A newer draft revision of a manuscript that is not yet in any `ReleaseManuscriptEntry` does not surface through list or detail when requests are scoped to an older active/archived release
- `GET /codex/manuscripts/:slug` without `releaseSlug` returns the revision anchored to the active release, including the `payload` field
- `GET /codex/manuscripts/:slug?releaseSlug=<archived-slug>` returns the revision anchored to that archived release, including `payload`
- `GET /codex/manuscripts/:slug?releaseSlug=<draft-slug>` returns 404
- `GET /codex/manuscripts/:slug` for a slug not in the selected release returns 404
- `detailHref` for active-fallback list items omits the `releaseSlug` query parameter; `detailHref` for explicit-release list items includes `?releaseSlug=<resolved-slug>`
- Results from `GET /codex/manuscripts` are ordered deterministically by `title` ascending, then `manuscriptSlug` ascending; `limit` upper-bounds the result count
- All existing `/codex` routes (`GET /codex`, `GET /codex/:entityType/:slug/related`, `GET /codex/timeline/events`) and all existing `/chapters` and `/scenes` routes continue to behave without change

### Validation Expectations

**Test file:** `tests/phase2PublicCodexChapterReaderBaseline.test.ts`

**Test coverage targets:**

- Active-fallback list and detail reads for both CHAPTER and SCENE
- Archived release selection (list and detail) producing release-pinned revisions distinct from the active revision
- Pre-activation draft isolation: a second revision added to a DRAFT release does not appear on list or detail before that release is activated
- Leak-safe 404 for draft `releaseSlug` on list and detail endpoints
- Leak-safe 404 for unknown `releaseSlug` on list and detail endpoints
- Type filtering (`?type=CHAPTER`, `?type=SCENE`) returns only the requested type
- Visibility predicate: a PRIVATE revision is excluded from list and detail even when it has a `ReleaseManuscriptEntry`
- `detailHref` carries the correct form for active-fallback vs. explicit-release reads
- Deterministic ordering and bounded `limit` enforcement on the list endpoint
- Regression guard: at least one `GET /codex` or `GET /codex/timeline/events` call is included to confirm no seam regression

**Validation commands:**

```bash
pnpm test --test-name-pattern "phase2PublicCodexChapterReaderBaseline" 2>&1
pnpm lint
pnpm type-check
```

### Repository Evidence

- `apps/api/src/repositories/publicCodexManuscriptRepository.ts` - new file; implements `listManuscripts` and `getManuscriptDetail` using `ReleaseManuscriptEntry` -> `ManuscriptRevision` -> `Manuscript`
- `apps/api/src/services/publicCodexService.ts` - extended with `listManuscripts` and `getManuscriptDetail` delegates
- `apps/api/src/routes/publicCodexRouter.ts` - extended with `GET /manuscripts` and `GET /manuscripts/:slug`, registered before parameterized wildcards
  - `tests/phase2PublicCodexChapterReaderBaseline.test.ts` - 10 tests covering active fallback, archived selection, draft/unknown 404 on list and draft 404 on detail, type filtering, PRIVATE visibility exclusion, detailHref form, and seam regression

---

## Stage 02 Exit Criteria Status

| Criterion | Status |
| --- | --- |
| Readers can navigate core public codex pages for the supported MVP types (CHARACTER, FACTION, LOCATION, EVENT) | Complete — Parts 01 and 02 |
| Timeline views resolve chronological content from release data only | Complete — Part 02 |
| Reader views resolve chapters and scenes from the selected release without leaking drafts | Complete — Part 03 Slice 01 |
