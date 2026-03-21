# Part 01: Release History and Archive Browsing

**Status:** Completed `[x]`

## Objective

Define and deliver a release-history baseline that makes prior releases first-class read targets for both admin inspection and public archive browsing, while preserving existing release immutability and release-selection safety rules.

## Context

This part builds directly on completed release-safe read behavior already in the repository:

- `apps/api/src/repositories/publicCodexRepository.ts` already resolves selected public releases with `status IN (ACTIVE, ARCHIVED)` and returns 404 semantics for invalid or draft selectors.
- `apps/api/src/repositories/publicCodexManuscriptRepository.ts` already applies the same release-selection safety model for manuscripts.
- `apps/api/src/routes/publicCodexRouter.ts` and `apps/api/src/routes/publicReleaseQuerySchema.ts` already define release-selector query contracts used by public readers.
- `apps/api/src/routes/adminReleaseRouter.ts`, `apps/api/src/services/releaseService.ts`, and `apps/api/src/repositories/releaseRepository.ts` already enforce draft-only release mutation and activation behavior.
- `tests/phase2PublicCodexReleaseSelection.test.ts` and `tests/phase2PublicCodexListReleaseSelection.test.ts` already validate release selector safety at public read endpoints.

Stage 04 Part 01 does not introduce release mutation behavior. It introduces release-history discovery and archive navigation surfaces that make existing release-selection behavior discoverable and inspectable.

## Scope

### In Scope

- Admin release history listing and per-release history detail APIs for inspection.
- Public release archive listing API for browsing and selecting active or archived releases.
- Explicit archive selection semantics aligned with existing `releaseSlug` behavior.
- Immutability rules for release-history surfaces.
- Integration test coverage for admin and public history/archive behaviors.

### Out Of Scope

- No release rollback, restore, cloning, or reactivation beyond existing activation behavior.
- No release diff engine between releases in this part.
- No web UI implementation in this part.
- No import/export behavior (covered by Stage 04 Part 02).

## Dependencies

- Phase 2 Stage 03 complete.
- Existing public release-selection contract remains source-of-truth for release gating:
  - omitted `releaseSlug` uses active release fallback where supported
  - explicit `releaseSlug` is valid only for `ACTIVE` or `ARCHIVED` releases on public surfaces
- Existing release mutation guardrails remain unchanged:
  - draft-only composition mutation
  - activation transitions `ACTIVE -> ARCHIVED` + `DRAFT -> ACTIVE`

---

## 1. API Contracts

### 1.1 Admin Release History List

| Property     | Value                     |
| ------------ | ------------------------- | ------ | ------------------------------------------------------------- |
| Method       | `GET`                     |
| Path         | `/admin/releases/history` |
| Auth         | `AUTHOR_ADMIN`            |
| Query Params | `status?=DRAFT            | ACTIVE | ARCHIVED`,`limit?`(default 20, max 100),`offset?` (default 0) |
| Success      | `200 OK`                  |

#### Response shape (Public Archive Release List) (Admin Release History Detail) (Admin Release History List)

```json
{
  "items": [
    {
      "slug": "spring-arc",
      "name": "Spring Arc",
      "status": "ACTIVE",
      "createdAt": "2026-03-19T01:30:00.000Z",
      "activatedAt": "2026-03-19T03:45:00.000Z",
      "entryCounts": {
        "entities": 42,
        "manuscripts": 18,
        "relationships": 21
      },
      "isMutable": false
    }
  ],
  "page": {
    "limit": 20,
    "offset": 0,
    "total": 3
  }
}
```

### 1.2 Admin Release History Detail

| Property  | Value                                  |
| --------- | -------------------------------------- |
| Method    | `GET`                                  |
| Path      | `/admin/releases/:slug/history`        |
| Auth      | `AUTHOR_ADMIN`                         |
| Success   | `200 OK`                               |
| Not Found | `404` when release slug does not exist |

#### Response shape (Public Archive Release List)

```json
{
  "release": {
    "slug": "spring-arc",
    "name": "Spring Arc",
    "status": "ARCHIVED",
    "createdAt": "2026-03-18T01:30:00.000Z",
    "activatedAt": "2026-03-18T03:45:00.000Z",
    "isMutable": false
  },
  "composition": {
    "entityEntries": [
      {
        "entitySlug": "captain-mira",
        "entityType": "CHARACTER",
        "revisionId": "rev_entity_123",
        "version": 3,
        "visibility": "PUBLIC"
      }
    ],
    "manuscriptEntries": [
      {
        "manuscriptSlug": "chapter-1",
        "manuscriptType": "CHAPTER",
        "manuscriptRevisionId": "rev_manuscript_123",
        "version": 2,
        "visibility": "PUBLIC"
      }
    ],
    "relationshipEntries": [
      {
        "relationshipId": "rel_123",
        "relationshipRevisionId": "rel_rev_123",
        "relationType": "ALLY_OF",
        "version": 4,
        "visibility": "PUBLIC"
      }
    ]
  }
}
```

### 1.3 Public Archive Release List

| Property     | Value                                                 |
| ------------ | ----------------------------------------------------- |
| Method       | `GET`                                                 |
| Path         | `/codex/releases`                                     |
| Auth         | Public                                                |
| Query Params | `limit?` (default 20, max 100), `offset?` (default 0) |
| Success      | `200 OK`                                              |

**Behavior:** Returns only `ACTIVE` and `ARCHIVED` releases, newest first by `activatedAt DESC` then `createdAt DESC`.

#### Response shape

```json
{
  "items": [
    {
      "slug": "spring-arc",
      "name": "Spring Arc",
      "status": "ACTIVE",
      "activatedAt": "2026-03-19T03:45:00.000Z",
      "createdAt": "2026-03-19T01:30:00.000Z",
      "browseHref": "/codex?releaseSlug=spring-arc"
    },
    {
      "slug": "winter-arc",
      "name": "Winter Arc",
      "status": "ARCHIVED",
      "activatedAt": "2026-03-11T08:00:00.000Z",
      "createdAt": "2026-03-10T22:00:00.000Z",
      "browseHref": "/codex?releaseSlug=winter-arc"
    }
  ],
  "page": {
    "limit": 20,
    "offset": 0,
    "total": 2
  }
}
```

---

## 2. Archive Selection Semantics

1. Public content routes that accept `releaseSlug` (`/codex`, `/codex/:entityType/:slug/related`, `/codex/timeline/events`, `/codex/manuscripts`, `/codex/manuscripts/:slug`) continue to allow only `ACTIVE` or `ARCHIVED` selected releases.
2. Any explicit `releaseSlug` that resolves to `DRAFT` or unknown release must produce existing leak-safe not-found behavior (404).
3. Omitted `releaseSlug` semantics remain unchanged per endpoint:

- endpoints with active fallback continue using current active release
- no-active-release behavior remains endpoint-specific and unchanged

1. `/codex/releases` is read-only discovery; it does not switch release state and does not imply activation rights.
2. Admin history endpoints may show `DRAFT`, `ACTIVE`, and `ARCHIVED` because they are inspection endpoints for author-admin users.

---

## 3. Immutability Constraints

1. This part adds no mutation endpoint for releases, release entries, or activation state.
2. `ACTIVE` and `ARCHIVED` release composition remains immutable through existing draft-only guards (`ReleaseMutationGuardError`).
3. History/archive responses must be generated from release composition tables (`ReleaseEntry`, `ReleaseManuscriptEntry`, `ReleaseRelationshipEntry`) and must not synthesize mutable projections.
4. Browsing historical releases must never alter `activatedAt`, `status`, or entry bindings.
5. Public archive listing must never expose `DRAFT` releases.

---

## 4. File Layout and Likely Touch Points

| File                                                    | Action             | Why                                                                                          |
| ------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------- |
| `apps/api/src/repositories/releaseHistoryRepository.ts` | Create             | Centralize Prisma reads for release history list/detail and public archive list              |
| `apps/api/src/services/releaseHistoryService.ts`        | Create             | Author-admin history orchestration and response shaping                                      |
| `apps/api/src/services/publicCodexService.ts`           | Extend             | Add delegate method for public archive release list                                          |
| `apps/api/src/repositories/publicCodexRepository.ts`    | Extend or delegate | Reuse existing public release gating logic for archive listing                               |
| `apps/api/src/routes/adminReleaseRouter.ts`             | Extend             | Add `GET /history` and `GET /:slug/history` handlers using Zod parsing + single service call |
| `apps/api/src/routes/publicCodexRouter.ts`              | Extend             | Add `GET /releases` public archive browsing endpoint                                         |
| `apps/api/src/routes/publicReleaseQuerySchema.ts`       | Reuse              | Keep `releaseSlug` selector contract consistent                                              |
| `tests/phase2ReleaseHistoryArchiveBrowsing.test.ts`     | Create             | Integration tests for admin/public release history and archive browsing                      |

Implementation note: if `adminReleaseRouter.ts` grows materially, extract release-history handlers into a dedicated router file and mount under `/admin/releases` in `apps/api/src/app/createApp.ts` while preserving route behavior.

---

## 5. Acceptance Criteria

1. `GET /admin/releases/history` returns paginated release records with status, timestamps, and composition counts.
2. `GET /admin/releases/history?status=ARCHIVED` returns only archived releases.
3. `GET /admin/releases/:slug/history` returns composition snapshots for entity/manuscript/relationship entries and returns 404 for unknown slug.
4. Admin history endpoints are read-only and do not mutate release status, activation time, or composition.
5. `GET /codex/releases` returns only `ACTIVE` and `ARCHIVED` releases, sorted by recency (`activatedAt DESC`, fallback `createdAt DESC`).
6. `/codex/releases` includes a stable browse target (`browseHref`) using the established `releaseSlug` query pattern.
7. Existing public `releaseSlug` routes continue returning 404 for unknown or draft slugs (regression guard).
8. Existing active-fallback behavior for omitted `releaseSlug` remains unchanged (regression guard).
9. A release marked `ARCHIVED` remains browsable via public `releaseSlug` routes and appears in `/codex/releases`.
10. A release marked `DRAFT` appears in admin history but never appears in `/codex/releases`.

---

## 6. Required Test Coverage

**Test file:** `tests/phase2ReleaseHistoryArchiveBrowsing.test.ts`

Minimum scenarios:

- admin history list returns all statuses with counts and pagination metadata
- admin history list status filter works for `DRAFT`, `ACTIVE`, and `ARCHIVED`
- admin history detail returns composition snapshots for known slug
- admin history detail returns 404 for unknown slug
- public archive list excludes draft releases and includes archived releases
- public archive list ordering uses activation recency
- public archive list `browseHref` format is `"/codex?releaseSlug=<slug>"`
- archived `releaseSlug` works on at least one existing public route (`/codex`, `/codex/manuscripts`, or `/codex/timeline/events`)
- draft `releaseSlug` still returns 404 on existing public release-selectable routes
- active-fallback behavior remains unchanged when `releaseSlug` omitted

Optional regression split (if test file grows large):

- keep route-specific release selection regression assertions in current phase2 public codex tests
- keep history/archive behavior in the new Stage 04 Part 01 test file

---

## 7. Validation Commands

```bash
pnpm test --test-name-pattern "phase2ReleaseHistoryArchiveBrowsing" 2>&1
pnpm test --test-name-pattern "phase2PublicCodex.*ReleaseSelection|phase2PublicCodexListReleaseSelection" 2>&1
pnpm lint
pnpm type-check
```

Audit note: This planning document defines the required validation command set, but command pass/fail evidence must come from implementation-linked execution logs (local run output or CI), not from this document text alone.

---

## 8. Completion Check

- Admin users can inspect release history and release composition snapshots without any mutation side effects.
- Public users can discover archived releases and browse them through existing releaseSlug-aware public read routes.
- Draft releases remain private to admin inspection and are never surfaced through public archive endpoints.
- Validation command outcomes are recorded in implementation execution evidence for this part.
