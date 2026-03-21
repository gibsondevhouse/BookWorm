# Part 01: Search Index Contract

**Status:** Complete `[x]`

## Objective

Define the MVP search indexing contract — including the search document schema, indexability rules, filter dimensions, invalidation triggers, and engine-agnostic adapter interface — so that Part 02 can implement search behavior without making residual design decisions.

## Context

The search index is **derived infrastructure**, not a source of truth. It is a materialized projection of release-safe content. All constraints from the existing release, visibility, and spoiler systems hold here.

**Repository evidence this spec is grounded in:**

- `prisma/schema.prisma` — all 13 `EntityType` values, `ManuscriptType` (CHAPTER, SCENE), `Visibility` (PUBLIC, RESTRICTED, PRIVATE), `ReleaseStatus` (DRAFT, ACTIVE, ARCHIVED)
- `apps/api/src/lib/entityMetadataContract.ts` — defines `spoilerTier`, `tags`, and `timelineAnchor` extraction from `EntityRevision.payload.metadata`; `chronologySensitiveEntityTypes = { EVENT, REVEAL, TIMELINE_ERA }`
- `apps/api/src/repositories/publicDiscoveryRepository.ts` — active-release public content query; accepts all entity types; the precedent for "indexable = public + active release"
- `apps/api/src/repositories/publicCodexRepository.ts` — release-selectable query pattern (ACTIVE + ARCHIVED); `findPublicRelease()` helper; `detailPath` construction for CHARACTER, FACTION, LOCATION, EVENT
- `apps/api/src/repositories/publicCodexManuscriptRepository.ts` — release-selectable manuscript query; visibility gate: `ManuscriptRevision.visibility = 'PUBLIC'`; `detailPath = "/codex/manuscripts/:slug"`

**Code-vs-Brief Discrepancy:** The original user brief listed entity types CHARACTER, FACTION, LOCATION, ORGANIZATION, ARTIFACT, EVENT, CONCEPT, CREATURE, MAGIC_SYSTEM. None of ORGANIZATION, CONCEPT, or MAGIC_SYSTEM exist in the schema. The closest schema equivalents are POLITICAL_BODY (≈ ORGANIZATION) and BELIEF_SYSTEM (≈ CONCEPT / MAGIC_SYSTEM). This spec uses the exact `EntityType` enum values from `schema.prisma`.

---

## 1. Search Document Schema

The index holds documents of two types, distinguished by `documentType`.

### 1.1 `EntitySearchDocument`

```typescript
interface EntitySearchDocument {
  // ── Identity ────────────────────────────────────────────────────────────────
  id: string;
  // Source: EntityRevision.id
  // Globally unique across all documents. Stable across rebuilds when the revision
  // has not changed. Used as the primary key for index(), delete(), and upsert operations.

  documentType: "ENTITY";
  // Fixed discriminant; distinguishes EntitySearchDocument from ManuscriptSearchDocument.

  // ── Entity root ─────────────────────────────────────────────────────────────
  entityId: string; // Entity.id
  entityType: EntityType; // Entity.type — one of 13 EntityType enum values (see §1.4)
  entitySlug: string; // Entity.slug

  // ── Revision content (full-text indexed) ────────────────────────────────────
  name: string; // EntityRevision.name
  summary: string; // EntityRevision.summary
  revisionVersion: number; // EntityRevision.version

  // ── Visibility ──────────────────────────────────────────────────────────────
  visibility: "PUBLIC";
  // Always "PUBLIC". Non-PUBLIC revisions MUST never appear in the index.
  // This field is stored explicitly so adapter invariant checks can be self-contained.

  // ── Metadata (extracted via entityMetadataContract.readMetadata) ────────────
  spoilerTier: "NONE" | "MINOR" | "MAJOR";
  // Source: entityMetadataContract.readMetadata({ entityType, payload }).spoilerTier
  // Default "NONE" when payload is null, spoilerTier is absent, or it is unrecognized.

  tags: string[];
  // Source: entityMetadataContract.readMetadata({ entityType, payload }).tags
  // Normalization: lowercase, trimmed, deduplicated (matches entityMetadataContract behavior).
  // Default [].

  timelineEraSlug: string | null;
  // Source: entityMetadataContract.readMetadata({ entityType, payload }).timelineAnchor?.timelineEraSlug
  // Non-null ONLY for chronology-sensitive types: EVENT, REVEAL, TIMELINE_ERA.
  // null for all other entity types.

  anchorLabel: string | null;
  // Source: ...timelineAnchor?.anchorLabel
  // Non-null only when a timelineAnchor is set on a chronology-sensitive entity.

  sortKey: string | null;
  // Source: ...timelineAnchor?.sortKey
  // null when absent or entity type is not chronology-sensitive.

  // ── Release provenance ──────────────────────────────────────────────────────
  releaseSlug: string;
  // Release.slug — the specific release from which this document was indexed.
  // Used as an exact-match filter. Queries without an explicit releaseSlug default
  // to the current ACTIVE release (see §3 and §5.4 invariant 3).

  // ── Navigation ──────────────────────────────────────────────────────────────
  detailPath: string | null;
  // Computed public URL path. See §1.4 for the full mapping.
  // null for entity types that have no public detail route in this codebase.

  // ── Index bookkeeping ───────────────────────────────────────────────────────
  indexedAt: string;
  // ISO 8601 timestamp (new Date().toISOString()) set at document build time.
}
```

### 1.2 `detailPath` Computation

| `entityType`     | `detailPath`              |
| ---------------- | ------------------------- |
| `CHARACTER`      | `/characters/:entitySlug` |
| `FACTION`        | `/factions/:entitySlug`   |
| `LOCATION`       | `/locations/:entitySlug`  |
| `EVENT`          | `/events/:entitySlug`     |
| `ARTIFACT`       | `null`                    |
| `CREATURE`       | `null`                    |
| `BELIEF_SYSTEM`  | `null`                    |
| `POLITICAL_BODY` | `null`                    |
| `LANGUAGE`       | `null`                    |
| `TIMELINE_ERA`   | `null`                    |
| `SECRET`         | `null`                    |
| `REVEAL`         | `null`                    |
| `TAG`            | `null`                    |

The four codex types with non-null paths are identical to the `buildDetailPath()` helper in `publicCodexRepository.ts`. If that helper's paths change, this mapping must change in sync.

### 1.3 `ManuscriptSearchDocument`

```typescript
interface ManuscriptSearchDocument {
  // ── Identity ────────────────────────────────────────────────────────────────
  id: string;
  // Source: ManuscriptRevision.id
  // Globally unique. Stable across rebuilds for unchanged revisions.

  documentType: "MANUSCRIPT";

  // ── Manuscript root ─────────────────────────────────────────────────────────
  manuscriptId: string; // Manuscript.id
  manuscriptType: "CHAPTER" | "SCENE"; // Manuscript.type
  manuscriptSlug: string; // Manuscript.slug

  // ── Revision content (full-text indexed) ────────────────────────────────────
  title: string; // ManuscriptRevision.title
  summary: string; // ManuscriptRevision.summary
  revisionVersion: number; // ManuscriptRevision.version

  // ── Visibility ──────────────────────────────────────────────────────────────
  visibility: "PUBLIC";
  // Always "PUBLIC". RESTRICTED and PRIVATE revisions MUST never appear in the index.

  // ── Metadata (extracted from ManuscriptRevision.payload) ────────────────────
  // No manuscriptMetadataContract exists in the codebase. Extract these fields directly.
  spoilerTier: "NONE" | "MINOR" | "MAJOR";
  // Extraction path: (payload as Record<string, unknown>)?.metadata?.spoilerTier
  // Apply the same normalization as entityMetadataContract: accept only "NONE", "MINOR", "MAJOR";
  // default "NONE" for absent, null, or unrecognized values.

  tags: string[];
  // Extraction path: (payload as Record<string, unknown>)?.metadata?.tags
  // Apply the same normalization as entityMetadataContract: lowercase, trimmed, deduplicated.
  // Default [].

  // Note: timelineAnchor is NOT extracted for manuscripts in this MVP.
  // The entityMetadataContract.chronologySensitiveEntityTypes set does not include manuscript
  // types. Defer manuscript timeline placement to Phase 3.

  // ── Release provenance ──────────────────────────────────────────────────────
  releaseSlug: string; // Release.slug

  // ── Navigation ──────────────────────────────────────────────────────────────
  detailPath: string;
  // Always defined for manuscripts: "/codex/manuscripts/:manuscriptSlug"
  // Matches buildDetailPath() in publicCodexManuscriptRepository.ts.

  // ── Index bookkeeping ───────────────────────────────────────────────────────
  indexedAt: string; // ISO 8601 timestamp
}
```

### 1.4 Discriminated Union

```typescript
type SearchDocument = EntitySearchDocument | ManuscriptSearchDocument;
```

---

## 2. Indexability Rules

### 2.1 Eligible Releases

A release qualifies as a document source if and only if:

```text
Release.status IN ('ACTIVE', 'ARCHIVED')
```

Releases with `status = 'DRAFT'` are **never** indexed, regardless of the content they contain.

### 2.2 Entity Indexability Gate

All four conditions must hold for an `EntityRevision` to produce an `EntitySearchDocument`.

| Gate   | Condition                                                                  | Source field                                                                                                           |
| ------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **E1** | A `ReleaseEntry` exists linking `EntityRevision.id` to an eligible release | `ReleaseEntry.revisionId = revision.id AND ReleaseEntry.releaseId IN (releases WHERE status IN ('ACTIVE','ARCHIVED'))` |
| **E2** | `EntityRevision.visibility = 'PUBLIC'`                                     | `EntityRevision.visibility`                                                                                            |
| **E3** | `Entity.retiredAt IS NULL`                                                 | `Entity.retiredAt`                                                                                                     |

**RESTRICTED excluded.** The `Visibility` enum has three values: PUBLIC, RESTRICTED, PRIVATE. RESTRICTED is treated as non-public and is never indexed. There is no "unlisted" tier in this schema. Indexing RESTRICTED would require caller-role enforcement inside the adapter; that path does not exist in the MVP.

**No type-based exclusion.** All 13 `EntityType` values — CHARACTER, FACTION, LOCATION, EVENT, ARTIFACT, CREATURE, BELIEF_SYSTEM, POLITICAL_BODY, LANGUAGE, SECRET, REVEAL, TAG, TIMELINE_ERA — are eligible for indexing subject only to E1–E3 above. Types like SECRET and REVEAL with PUBLIC visibility in a release may appear in search results; `spoilerTier` filtering gives clients exposure control.

### 2.3 Manuscript Indexability Gate

Both conditions must hold for a `ManuscriptRevision` to produce a `ManuscriptSearchDocument`.

| Gate   | Condition                                                                                | Source field                                                                                                            |
| ------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **M1** | A `ReleaseManuscriptEntry` exists linking `ManuscriptRevision.id` to an eligible release | `ReleaseManuscriptEntry.manuscriptRevisionId = revision.id AND ReleaseManuscriptEntry.releaseId IN (eligible releases)` |
| **M2** | `ManuscriptRevision.visibility = 'PUBLIC'`                                               | `ManuscriptRevision.visibility`                                                                                         |

### 2.4 Multi-Release Behavior

If the same `EntityRevision.id` is referenced by `ReleaseEntry` rows in both an ACTIVE release and one or more ARCHIVED releases, `SearchIndexBuilder.buildAllDocuments()` must index ARCHIVED-release documents before ACTIVE-release documents. Because `SearchAdapter.index()` has upsert semantics (§5.4 invariant 4), the ACTIVE-release version is always the one that survives for that `id`.

A revision present only in ARCHIVED releases retains the `releaseSlug` from its archived release in the index.

A search without an explicit `releaseSlug` is scoped to documents whose `releaseSlug` matches the current ACTIVE release. To query an archived release's documents, the caller must pass `releaseSlug` explicitly.

### 2.5 No Payload Body Indexing

For manuscripts, only `title` and `summary` are full-text indexed. The body content of a chapter or scene (prose stored in `ManuscriptRevision.payload`) is not indexed in this MVP. Indexing unstructured body text would (a) create unbounded index growth and (b) risk indexing draft content embedded in payload revisions that may not yet be editorially reviewed for a given release.

---

## 3. Filter Dimensions

Every conforming `SearchAdapter.search()` implementation must support exact-match filtering on all fields in the table below.

| Filter key        | TypeScript type | Semantics                                                                    | Default when absent                                                        |
| ----------------- | --------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------- |
| `releaseSlug`     | `string`        | Scope results to documents from this specific release                        | Resolve to current ACTIVE release; return `[]` if none                     |
| `documentType`    | `"ENTITY" \     | "MANUSCRIPT"`                                                                | Restrict to one document class                                             | All document types                                    |
| `entityType`      | `EntityType`    | Restrict to one entity type (ENTITY docs only; ignored for MANUSCRIPT)       | All entity types                                                           |
| `manuscriptType`  | `"CHAPTER" \    | "SCENE"`                                                                     | Restrict to one manuscript type (MANUSCRIPT docs only; ignored for ENTITY) | Both manuscript types                                 |
| `spoilerTier`     | `("NONE" \      | "MINOR" \                                                                    | "MAJOR")[]`                                                                | **OR** match: return docs whose tier is in this array | All spoiler tiers |
| `tags`            | `string[]`      | **AND** match: return only docs carrying all listed tags                     | No tag constraint                                                          |
| `timelineEraSlug` | `string`        | Restrict to ENTITY docs with this `timelineEraSlug` (ignored for MANUSCRIPT) | No era constraint                                                          |

**Filter combination rules:**

- `entityType` and `manuscriptType` are applied exclusively to their respective `documentType`. A query with both fields set and no `documentType` constraint applies each filter only to its matching document class.
- `spoilerTier: ["NONE", "MINOR"]` returns documents with NONE or MINOR; MAJOR documents are excluded.
- `tags: ["war", "magic"]` returns only documents containing both `"war"` and `"magic"` in their `tags` array.
- `timelineEraSlug` matches against `EntitySearchDocument.timelineEraSlug` only; it is silently ignored for `ManuscriptSearchDocument` hits.

**Pagination (required on every `SearchQuery`, not filters):**

| Field    | Type     | Default | Constraint                                             |
| -------- | -------- | ------- | ------------------------------------------------------ |
| `limit`  | `number` | 20      | Clamped to [1, 50] by caller before passing to adapter |
| `offset` | `number` | 0       | Negative values treated as 0                           |

---

## 4. Invalidation Triggers

### 4.1 Full-Index Rebuild Triggers

A **full rebuild** calls `SearchAdapter.rebuild(docs)` with a freshly computed complete document set from `SearchIndexBuilder.buildAllDocuments()`.

| #   | Event             | DB change that fires it                                    |
| --- | ----------------- | ---------------------------------------------------------- |
| R1  | Release activated | `Release.status` transitions DRAFT → ACTIVE                |
| R2  | Release archived  | `Release.status` transitions ACTIVE → ARCHIVED             |
| R3  | Release deleted   | `Release` record hard-deleted (removes orphaned documents) |

R1–R3 require a full rebuild because they change the release-eligibility baseline used to scope all search results.

### 4.2 Incremental Update Triggers

An **incremental update** calls `SearchAdapter.index(doc)` or `SearchAdapter.delete(id)` for specific documents, leaving other documents untouched.

| #   | Event                                                                 | DB change                                                                                              | Required operation                                                                                  |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| I1  | Entity revision included in active release with PUBLIC visibility     | New `EntityRevision` (`visibility=PUBLIC`) + new/updated `ReleaseEntry` → ACTIVE release               | `index(newDoc)` + `delete(previousRevisionId)` if an older revision for the same entity was indexed |
| I2  | Entity visibility promoted to PUBLIC                                  | `EntityRevision.visibility` updated to `PUBLIC` on a revision with an eligible `ReleaseEntry`          | `index(doc)`                                                                                        |
| I3  | Entity visibility demoted from PUBLIC                                 | `EntityRevision.visibility` updated to `RESTRICTED` or `PRIVATE`                                       | `delete(revisionId)`                                                                                |
| I4  | Entity retired                                                        | `Entity.retiredAt` set to non-null                                                                     | `delete(revisionId)` for each document in the index with this `entityId`                            |
| I5  | `ReleaseEntry` revision swapped                                       | `ReleaseEntry.revisionId` updated to a different revision                                              | `index(newRevisionDoc)` + `delete(oldRevisionId)`                                                   |
| I6  | Manuscript revision included in active release with PUBLIC visibility | New `ManuscriptRevision` (`visibility=PUBLIC`) + new/updated `ReleaseManuscriptEntry` → ACTIVE release | `index(newDoc)` + `delete(previousRevisionId)` if applicable                                        |
| I7  | Manuscript visibility promoted to PUBLIC                              | `ManuscriptRevision.visibility` updated to `PUBLIC`                                                    | `index(doc)`                                                                                        |
| I8  | Manuscript visibility demoted from PUBLIC                             | `ManuscriptRevision.visibility` updated to `RESTRICTED` or `PRIVATE`                                   | `delete(revisionId)`                                                                                |
| I9  | `ReleaseManuscriptEntry` revision swapped                             | `ReleaseManuscriptEntry.manuscriptRevisionId` updated                                                  | `index(newRevisionDoc)` + `delete(oldRevisionId)`                                                   |

**MVP implementation note:** For the first implementation shipped in Part 02, **a full rebuild (`SearchAdapter.rebuild(docs)`) is acceptable for every trigger — both R-series and I-series**. The incremental operations above define the target steady-state behavior and exist so that the invalidation hooks are wired with the correct granularity semantics from day one. Upgrade from full-rebuild to incremental is a non-breaking optimization pass.

---

## 5. Engine-Agnostic `SearchAdapter` Contract

Part 02 programs against this interface exclusively. Any backend (in-memory, PostgreSQL FTS, Meilisearch, SQLite FTS5, Typesense) must satisfy all methods and invariants.

### 5.1 `SearchQuery` Type

```typescript
type SearchQuery = {
  q?: string;
  // Free-text search string applied against name/summary (entities) and title/summary (manuscripts).
  // Absent or empty string = match-all; no text filtering is applied.

  releaseSlug?: string;
  // Absent → resolve to current ACTIVE release; return [] if no ACTIVE release exists.
  // Present → scope to documents with this exact releaseSlug (must be ACTIVE or ARCHIVED).

  documentType?: "ENTITY" | "MANUSCRIPT";

  entityType?: EntityType;
  // Applied only to ENTITY documents. Ignored when evaluating MANUSCRIPT hits.

  manuscriptType?: "CHAPTER" | "SCENE";
  // Applied only to MANUSCRIPT documents. Ignored when evaluating ENTITY hits.

  spoilerTier?: ("NONE" | "MINOR" | "MAJOR")[];
  // OR semantics. Absent = all tiers.

  tags?: string[];
  // AND semantics. Absent or [] = no tag constraint.

  timelineEraSlug?: string;
  // Exact match against EntitySearchDocument.timelineEraSlug.
  // Silently ignored for MANUSCRIPT documents.

  limit: number; // Required. Caller must clamp to [1, 50] before passing in.
  offset: number; // Required. Caller must ensure >= 0 before passing in.
};
```

### 5.2 Result Types

```typescript
type SearchHit = {
  id: string;
  documentType: "ENTITY" | "MANUSCRIPT";
  score: number;
  // Relevance score. Adapters without scoring return 1.0 for all hits.
  document: SearchDocument;
};

type SearchResult = {
  resolvedReleaseSlug: string | null;
  // The release the results were scoped to.
  // null if query.releaseSlug was absent and no ACTIVE release exists.
  total: number;
  // Total matching document count before pagination.
  hits: SearchHit[];
  // Paginated window: offset..offset+limit items from the total match set.
};
```

### 5.3 `SearchAdapter` Interface

```typescript
interface SearchAdapter {
  /**
   * Add or replace a single document by id (upsert semantics).
   * If a document with the same id already exists, it is fully replaced atomically.
   */
  index(doc: SearchDocument): Promise<void>;

  /**
   * Add or replace multiple documents in one operation.
   * Semantically equivalent to sequential index() calls.
   * Implementations may optimize the batch case internally.
   */
  indexBatch(docs: SearchDocument[]): Promise<void>;

  /**
   * Remove the document with the given id from the index.
   * Must resolve without error when the id is not present.
   */
  delete(id: string): Promise<void>;

  /**
   * Execute a search query. Must respect all invariants in §5.4.
   */
  search(query: SearchQuery): Promise<SearchResult>;

  /**
   * Atomically replace the entire index with the provided document set.
   * All previously indexed documents absent from docs are removed.
   * After this call returns, search() must return only documents present in docs.
   */
  rebuild(docs: SearchDocument[]): Promise<void>;

  /**
   * Remove all documents from the index.
   * After this call, search() must return total=0 for any query.
   * Used in tests and explicit reset scenarios.
   */
  clear(): Promise<void>;

  /**
   * Return adapter readiness. Called at server startup and by health-check routes.
   */
  healthCheck(): Promise<{ ready: boolean }>;
}
```

### 5.4 Contract Invariants

Every conforming implementation must uphold all of the following:

1. **Visibility isolation** — `search()` MUST NOT return documents whose `visibility` field is not `"PUBLIC"`, even if non-PUBLIC documents were passed to `index()` or `indexBatch()`.
2. **Draft release isolation** — Documents whose `releaseSlug` maps to a DRAFT release MUST NOT appear in `search()` results. Because adapters may not have direct DB access, the `SearchIndexBuilder` must exclude DRAFT-release documents before calling `index()`. Adapters are permitted to enforce this as a second check via the `releaseSlug` field if they store release status.
3. **Active-release default** — When `query.releaseSlug` is absent, `search()` scopes to documents whose `releaseSlug` equals the current ACTIVE release's slug. When no ACTIVE release exists, `hits` must be `[]` and `resolvedReleaseSlug` must be `null`. If the adapter does not know which release is currently ACTIVE, the calling service must resolve `releaseSlug` before calling `search()` and pass it explicitly.
4. **Idempotent `index()`** — Calling `index(doc)` twice with the same `id` must not create duplicate entries. The second call fully replaces the first.
5. **`rebuild()` atomicity** — After `rebuild(docs)` returns, `search({ q: "", limit: 1000, offset: 0 })` must return only documents present in `docs`. No documents present before the call that are absent from `docs` may appear in subsequent searches.
6. **`delete()` safety** — Calling `delete(id)` for a non-existent `id` must resolve without throwing or returning an error.
7. **No payload body indexing** — Adapters must index only the explicitly declared fields of `EntitySearchDocument` and `ManuscriptSearchDocument`. The source DB `payload` field is not a document field and must not be included in any adapter-internal full-text index.

---

## 6. `SearchIndexBuilder` Service Interface

The `SearchIndexBuilder` queries the database, applies all indexability gates from §2, and converts raw DB records into typed `SearchDocument` instances. It is the only component that knows about both the DB schema and the search document schema; the adapter knows only about search documents.

**File:** `apps/api/src/lib/searchIndexBuilder.ts` (interface definition; implementation ships in Part 02 as `apps/api/src/services/searchIndexService.ts`)

```typescript
interface SearchIndexBuilder {
  /**
   * Build the full set of indexable documents across all non-DRAFT releases.
   *
   * Ordering guarantee: ARCHIVED-release documents are built before ACTIVE-release documents
   * so that, for shared revision IDs, the ACTIVE-release version takes precedence when the
   * caller passes the result to SearchAdapter.rebuild() or indexBatch().
   *
   * Respects gates E1–E3 for entities and M1–M2 for manuscripts.
   */
  buildAllDocuments(): Promise<SearchDocument[]>;

  /**
   * Build the set of indexable documents for a single named release.
   * Throws if the release does not exist or has status DRAFT.
   */
  buildDocumentsForRelease(releaseSlug: string): Promise<SearchDocument[]>;

  /**
   * Build the indexable document for a single entity revision.
   * Evaluates gates E1–E3 at call time against the current DB state.
   * Returns null if the revision does not satisfy all gates.
   */
  buildEntityDocument(revisionId: string): Promise<EntitySearchDocument | null>;

  /**
   * Build the indexable document for a single manuscript revision.
   * Evaluates gates M1–M2 at call time.
   * Returns null if the revision does not satisfy all gates.
   */
  buildManuscriptDocument(
    manuscriptRevisionId: string
  ): Promise<ManuscriptSearchDocument | null>;
}
```

---

## 7. File Layout

### Part 01 deliverables (type definitions and interface declarations only — no runtime behavior)

| File                                     | Contents                                                                                                         |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/lib/searchTypes.ts`        | `EntitySearchDocument`, `ManuscriptSearchDocument`, `SearchDocument`, `SearchQuery`, `SearchHit`, `SearchResult` |
| `apps/api/src/lib/searchAdapter.ts`      | `SearchAdapter` interface                                                                                        |
| `apps/api/src/lib/searchIndexBuilder.ts` | `SearchIndexBuilder` interface                                                                                   |

### Part 02 deliverables (implementations; listed here for orientation)

| File                                                       | Contents                                                                                                                                                   |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/lib/searchAdapters/inMemorySearchAdapter.ts` | MVP in-memory `SearchAdapter` implementation                                                                                                               |
| `apps/api/src/services/searchIndexService.ts`              | `SearchIndexBuilder` implementation; queries DB, applies indexability gates, constructs `SearchDocument` instances                                         |
| `apps/api/src/repositories/searchIndexRepository.ts`       | Prisma queries used by `searchIndexService`; joins `ReleaseEntry`→`EntityRevision`→`Entity` and `ReleaseManuscriptEntry`→`ManuscriptRevision`→`Manuscript` |
| `apps/api/src/routes/searchRouter.ts`                      | Public search API route handler                                                                                                                            |

---

## 8. Acceptance Criteria

The following are discrete, testable conditions. Tests for all ACs ship in Part 02.

**AC-01 — PRIVATE entity excluded:** Given an `EntityRevision` with `visibility = 'PRIVATE'` that has a `ReleaseEntry` in the current ACTIVE release, `SearchAdapter.search({ q: "", limit: 50, offset: 0 })` returns zero hits bearing that revision's `id`.

**AC-02 — RESTRICTED entity excluded:** Given an `EntityRevision` with `visibility = 'RESTRICTED'` that has a `ReleaseEntry` in the current ACTIVE release, `search()` with any filter combination returns zero hits bearing that revision's `id`.

**AC-03 — Retired entity excluded:** Given an `EntityRevision` with `visibility = 'PUBLIC'` in the ACTIVE release where `Entity.retiredAt IS NOT NULL`, `search()` returns zero hits bearing either that revision's `id` or that entity's `entityId`.

**AC-04 — DRAFT release excluded:** Given an `EntityRevision` with `visibility = 'PUBLIC'` whose only `ReleaseEntry` is in a release with `status = 'DRAFT'`, `search()` with any filter returns zero hits bearing that revision's `id`.

**AC-05 — PUBLIC entity in active release appears with correct fields:** Given an `EntityRevision` with `visibility = 'PUBLIC'` in the current ACTIVE release and `payload.metadata.spoilerTier = "MINOR"`, calling `search({ q: "", limit: 50, offset: 0 })` without a `releaseSlug` filter returns a hit whose `id` equals that revision's id, `documentType = "ENTITY"`, and `document.spoilerTier = "MINOR"`. If `payload` is null, `spoilerTier` defaults to `"NONE"`.

**AC-06 — PUBLIC manuscript in active release appears with correct fields:** Given a `ManuscriptRevision` with `visibility = 'PUBLIC'` and a `ReleaseManuscriptEntry` in the current ACTIVE release, `search({ documentType: "MANUSCRIPT", limit: 50, offset: 0 })` returns a hit where `documentType = "MANUSCRIPT"` and `document.detailPath = "/codex/manuscripts/:manuscriptSlug"`.

**AC-07 — No active release returns empty result set:** When no release has `status = 'ACTIVE'` and `search()` is called without a `releaseSlug`, `SearchResult.hits` is `[]`, `SearchResult.total` is `0`, and `resolvedReleaseSlug` is `null`.

**AC-08 — Archived release accessible by explicit slug:** Given an `EntityRevision` with `visibility = 'PUBLIC'` in an ARCHIVED release (and not in the current ACTIVE release), `search({ releaseSlug: "<archived-slug>", limit: 50, offset: 0 })` returns a hit for that revision. The same call without `releaseSlug` (defaulting to the ACTIVE release) returns zero hits for that revision's `id`.

**AC-09 — `rebuild([])` resets the index:** After `SearchAdapter.rebuild([])`, `search({ q: "", limit: 1000, offset: 0 })` returns `total = 0` and `hits = []`, regardless of what was indexed before.

**AC-10 — `delete()` is safe for unknown IDs:** `SearchAdapter.delete("nonexistent-id-abc123")` resolves without throwing.

**AC-11 — Non-codex entity type has `detailPath = null`:** The `EntitySearchDocument` built for an `ARTIFACT` entity has `detailPath = null`. The document built for a `CHARACTER` entity has `detailPath = "/characters/:entitySlug"`.

**AC-12 — Tag AND filter semantics:** `search({ tags: ["war", "magic"], limit: 50, offset: 0 })` returns only hits whose `document.tags` contains both `"war"` AND `"magic"`. A document tagged `["war"]` only is not returned.

**AC-13 — `spoilerTier` OR filter semantics:** `search({ spoilerTier: ["NONE", "MINOR"], limit: 50, offset: 0 })` returns zero hits with `document.spoilerTier = "MAJOR"`.

---

## Key Design Decisions

| Decision                        | Choice                                                                                   | Rationale                                                                                                                                                                                                                                                                |
| ------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Document ID**                 | `EntityRevision.id` / `ManuscriptRevision.id`                                            | Revision IDs are globally unique, immutable, and stable across rebuilds when content is unchanged. Using revision IDs makes invalidation precise — `delete(revisionId)` removes exactly one document — and is consistent with the existing revision-anchored data model. |
| **Multi-release indexing**      | All non-DRAFT releases (ACTIVE + ARCHIVED) indexed; ACTIVE takes priority for shared IDs | Aligns with `publicCodexRepository.findPublicRelease()` pattern. Enables future archived-release search without index redesign. Avoids index and query complexity of managing separate per-release indexes.                                                              |
| **RESTRICTED excluded**         | Public only                                                                              | RESTRICTED lacks a caller-role enforcement path at search time. Indexing it safely would require per-request role checks inside the adapter, which is out of scope for MVP.                                                                                              |
| **All EntityTypes eligible**    | No exclusion by type                                                                     | Consistent with `publicDiscoveryRepository` which does not restrict by entity type. Spoiler tier filtering provides exposure control for sensitive types (SECRET, REVEAL).                                                                                               |
| **Manuscript `timelineAnchor`** | Not indexed in MVP                                                                       | No `manuscriptMetadataContract` exists. Manuscript timeline placement is a Phase 3 concern.                                                                                                                                                                              |
| **Full rebuild for MVP**        | Acceptable for all triggers                                                              | Incremental invalidation is specified in §4.2 as the target steady state. Part 02 implements full rebuild for simplicity. `SearchAdapter` interface supports both from day one.                                                                                          |
| **Full-text fields**            | `name`+`summary` for entities; `title`+`summary` for manuscripts                         | `payload` body is JSON with unspecified shape. Indexing it would risk unbounded growth and surfacing draft prose content. Only editorially stable fields are indexed.                                                                                                    |
| **Active-release default**      | Queries without `releaseSlug` resolve to ACTIVE release                                  | Consistent with all existing public read paths. Prevents inadvertent cross-release result mixing.                                                                                                                                                                        |

---

## Dependencies

- Stage 01 complete — all 13 `EntityType` values and the `Manuscript`/`ManuscriptRevision`/`ReleaseManuscriptEntry` models exist in the schema
- Stage 02 complete — the public codex read surface and release-selection pattern (`findPublicRelease`, `detailPath` conventions) are stable

## Non-Goals for Part 01

The following are explicitly out of scope here and addressed in Part 02 or later:

- No runtime adapter implementation (no `inMemorySearchAdapter.ts`)
- No search API routes or HTTP endpoints
- No `SearchIndexBuilder` DB queries
- No invalidation wiring or event hooks
- No web UI
- No RESTRICTED-tier or admin search surface
- No relationship-graph traversal via search index
- No full-text ranking or relevance tuning

## Completion Check

- All six spec items (schema, indexability rules, filter dimensions, invalidation triggers, adapter interface, acceptance criteria) are defined with enough precision that a developer can begin Part 02 without making residual design decisions.
- Every acceptance criterion in §8 maps to a concrete test scenario that does not require additional interpretation.
- The `SearchAdapter` interface in §5 is complete enough to write an in-memory implementation without consulting this document for clarification on method signatures or invariants.
- The file layout in §7 defines exactly where new code goes.

---

## Completion Record

**Completed:** 2026-03-19

**Delivered files (interface/type definitions only — no runtime behavior):**

| File                                     | Status                                                                                                                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/lib/searchTypes.ts`        | Created — exports `EntitySearchDocument`, `ManuscriptSearchDocument`, `SearchDocument`, `SearchQuery`, `SearchHit`, `SearchResult` exactly as specified in §1 and §5.1–5.2 |
| `apps/api/src/lib/searchAdapter.ts`      | Created — exports `SearchAdapter` interface with all seven methods as specified in §5.3                                                                                    |
| `apps/api/src/lib/searchIndexBuilder.ts` | Created — exports `SearchIndexBuilder` interface with all four methods as specified in §6, including JSDoc for the ARCHIVED-before-ACTIVE ordering guarantee               |

**Verification:** `pnpm type-check` passes with zero errors. No runtime implementation shipped in this part, consistent with Non-Goals.
