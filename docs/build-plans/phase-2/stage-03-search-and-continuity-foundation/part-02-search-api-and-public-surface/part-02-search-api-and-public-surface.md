# Part 02: Search API and Public Surface

**Status:** Complete `[x]`

## Objective

Implement the first functional search surface for BookWorm: an in-memory search adapter, a DB-backed index builder service, a public HTTP search route, and full-rebuild invalidation wiring on release lifecycle events. All 13 acceptance criteria from Part 01 §8 are covered by the test file delivered in this part.

## Context

**Part 01 delivered (interface/type definitions only):**
- `apps/api/src/lib/searchTypes.ts` — `SearchDocument`, `SearchQuery`, `SearchHit`, `SearchResult`
- `apps/api/src/lib/searchAdapter.ts` — `SearchAdapter` interface
- `apps/api/src/lib/searchIndexBuilder.ts` — `SearchIndexBuilder` interface

**Repository evidence this spec is grounded in:**
- `apps/api/src/repositories/publicDiscoveryRepository.ts` — `releaseEntry.findMany` with `revision.visibility="PUBLIC"` and active-release filter; `entityMetadataContract.readMetadata()` call pattern
- `apps/api/src/repositories/publicCodexRepository.ts` — `findPublicRelease()` helper; `buildDetailPath()` for CHARACTER/FACTION/LOCATION/EVENT; `status: { in: ["ACTIVE", "ARCHIVED"] }` release eligibility pattern
- `apps/api/src/repositories/publicCodexManuscriptRepository.ts` — `releaseManuscriptEntry.findMany` with `manuscriptRevision.visibility="PUBLIC"`; manuscript `buildDetailPath(slug)` helper
- `apps/api/src/routes/publicDiscoveryRouter.ts` — route handler pattern (Zod parse, single service call, json response)
- `apps/api/src/routes/adminReleaseRouter.ts` — `POST /:slug/activate` — the hook point for full-rebuild invalidation
- `apps/api/src/services/releaseService.ts` — `releaseService.activateRelease()` — called in the activate route handler; the rebuild wires in after this returns
- `apps/api/src/app/createApp.ts` — Express app assembly; new router mounts here
- `apps/api/src/startServer.ts` — server startup; initial rebuild fires here after server is listening

**MVP constraint:** Full rebuild (`SearchAdapter.rebuild(docs)`) is used for all invalidation events as permitted by Part 01 §4. Incremental wiring is the target steady-state but is not required in this part.

---

## 1. File Layout

| File | Action | Contents |
|---|---|---|
| `apps/api/src/lib/searchAdapters/inMemorySearchAdapter.ts` | **Create** | `InMemorySearchAdapter` class implementing `SearchAdapter` |
| `apps/api/src/repositories/searchIndexRepository.ts` | **Create** | `searchIndexRepository` singleton — Prisma queries for index building |
| `apps/api/src/services/searchIndexService.ts` | **Create** | `searchIndexService` singleton — implements `SearchIndexBuilder` + `search()` + `rebuildIndex()` |
| `apps/api/src/routes/publicSearchRouter.ts` | **Create** | `publicSearchRouter` Express router — `GET /` |
| `apps/api/src/app/createApp.ts` | **Extend** | Mount `publicSearchRouter` at `/search` |
| `apps/api/src/startServer.ts` | **Extend** | Call `searchIndexService.rebuildIndex()` after server starts listening |
| `apps/api/src/routes/adminReleaseRouter.ts` | **Extend** | After `releaseService.activateRelease()` returns, fire-and-forget `searchIndexService.rebuildIndex()` |
| `tests/phase2SearchApiSlice.test.ts` | **Create** | Integration test covering AC-01 through AC-13 |

---

## 2. Implementation Specifications

### 2.1 `apps/api/src/repositories/searchIndexRepository.ts`

**Exports:** `searchIndexRepository` (named const object)

**Methods:**

#### `findAllIndexableEntityRevisions()`

**Returns:**
```typescript
Promise<Array<{
  releaseSlug: string;
  releaseStatus: "ACTIVE" | "ARCHIVED";
  entityId: string;
  entityType: EntityType;
  entitySlug: string;
  revisionId: string;
  revisionName: string;
  revisionSummary: string;
  revisionVersion: number;
  revisionPayload: Prisma.JsonValue | null;
}>>
```

**Prisma query:**
```
prismaClient.releaseEntry.findMany({
  where: {
    release: { status: { in: ["ACTIVE", "ARCHIVED"] } },
    revision: { visibility: "PUBLIC" },
    entity: { retiredAt: null }
  },
  orderBy: [{ release: { status: "desc" } }],
  // "desc" puts ARCHIVED before ACTIVE (alphabetically ARCHIVED > ACTIVE).
  // This ordering guarantee ensures the service can call adapter.rebuild(docs)
  // and the ACTIVE-release version of any shared revision id wins (last write wins on upsert).
  select: {
    release: { select: { slug: true, status: true } },
    entity:  { select: { id: true, type: true, slug: true } },
    revision: {
      select: { id: true, name: true, summary: true, version: true, payload: true }
    }
  }
})
```

Map each row to the return type: `release.slug → releaseSlug`, `release.status → releaseStatus`, `entity.id → entityId`, etc.

#### `findAllIndexableManuscriptRevisions()`

**Returns:**
```typescript
Promise<Array<{
  releaseSlug: string;
  releaseStatus: "ACTIVE" | "ARCHIVED";
  manuscriptId: string;
  manuscriptType: "CHAPTER" | "SCENE";
  manuscriptSlug: string;
  revisionId: string;
  revisionTitle: string;
  revisionSummary: string;
  revisionVersion: number;
  revisionPayload: Prisma.JsonValue | null;
}>>
```

**Prisma query:**
```
prismaClient.releaseManuscriptEntry.findMany({
  where: {
    release: { status: { in: ["ACTIVE", "ARCHIVED"] } },
    manuscriptRevision: { visibility: "PUBLIC" }
  },
  orderBy: [{ release: { status: "desc" } }],
  select: {
    release: { select: { slug: true, status: true } },
    manuscript: { select: { id: true, type: true, slug: true } },
    manuscriptRevision: {
      select: { id: true, title: true, summary: true, version: true, payload: true }
    }
  }
})
```

#### `findEntityRevisionForIndex(revisionId: string)`

Used by `buildEntityDocument()` for targeted single-revision lookups. Applies gates E1–E3 inline.

**Returns:** `Promise<{ ... same shape as one row from findAllIndexableEntityRevisions ... } | null>`

```
prismaClient.entityRevision.findFirst({
  where: {
    id: revisionId,
    visibility: "PUBLIC",
    entity: { retiredAt: null },
    releaseEntries: {
      some: { release: { status: { in: ["ACTIVE", "ARCHIVED"] } } }
    }
  },
  select: {
    id: true, name: true, summary: true, version: true, payload: true,
    entity: { select: { id: true, type: true, slug: true } },
    releaseEntries: {
      where: { release: { status: { in: ["ACTIVE", "ARCHIVED"] } } },
      orderBy: { release: { activatedAt: "desc" } },
      take: 1,
      select: { release: { select: { slug: true, status: true } } }
    }
  }
})
```

If null (no matching row), return null. If found but `releaseEntries` array is empty, return null.
Take `releaseEntries[0].release` as the provenance release.

#### `findManuscriptRevisionForIndex(manuscriptRevisionId: string)`

Analogous to `findEntityRevisionForIndex`. Applies gates M1–M2.

```
prismaClient.manuscriptRevision.findFirst({
  where: {
    id: manuscriptRevisionId,
    visibility: "PUBLIC",
    releaseEntries: {
      some: { release: { status: { in: ["ACTIVE", "ARCHIVED"] } } }
    }
  },
  select: {
    id: true, title: true, summary: true, version: true, payload: true,
    manuscript: { select: { id: true, type: true, slug: true } },
    releaseEntries: {
      where: { release: { status: { in: ["ACTIVE", "ARCHIVED"] } } },
      orderBy: { release: { activatedAt: "desc" } },
      take: 1,
      select: { release: { select: { slug: true, status: true } } }
    }
  }
})
```

#### `findActiveReleaseSlug()`

**Returns:** `Promise<string | null>`

```
prismaClient.release.findFirst({
  where: { status: "ACTIVE" },
  orderBy: { activatedAt: "desc" },
  select: { slug: true }
}).then(r => r?.slug ?? null)
```

---

### 2.2 `apps/api/src/lib/searchAdapters/inMemorySearchAdapter.ts`

**Exports:** `InMemorySearchAdapter` (named class implementing `SearchAdapter`)

**Internal state:**
```typescript
private readonly store = new Map<string, SearchDocument>();
```

**Method implementations:**

#### `index(doc: SearchDocument): Promise<void>`
```
this.store.set(doc.id, doc);
```
Upsert semantics — existing doc with same id is fully replaced. Fulfills invariant 4.

#### `indexBatch(docs: SearchDocument[]): Promise<void>`
Iterate and call `this.store.set(doc.id, doc)` for each doc. Semantically identical to sequential `index()`.

#### `delete(id: string): Promise<void>`
```
this.store.delete(id);
```
No error thrown when `id` is absent. Fulfills invariant 6.

#### `clear(): Promise<void>`
```
this.store.clear();
```

#### `rebuild(docs: SearchDocument[]): Promise<void>`
```
this.store.clear();
for (const doc of docs) { this.store.set(doc.id, doc); }
```
Atomically replaces the entire index. After this call returns, the store contains only docs present in `docs`. Fulfills invariant 5.

#### `healthCheck(): Promise<{ ready: boolean }>`
```
return { ready: true };
```
The in-memory adapter is always ready.

#### `search(query: SearchQuery): Promise<SearchResult>`

The adapter assumes `query.releaseSlug` has already been resolved by the service. If `query.releaseSlug` is absent, return `{ resolvedReleaseSlug: null, total: 0, hits: [] }` immediately (invariant 3 — the service is responsible for resolution, but the adapter must not return results for an unresolved query).

**Filter pipeline (applied to `Array.from(this.store.values())`):**

1. **Visibility guard (invariant 1):** Exclude any doc where `doc.visibility !== "PUBLIC"`. This is a defensive check; the builder should never produce non-PUBLIC documents.

2. **Release scope:** Keep only docs where `doc.releaseSlug === query.releaseSlug`.

3. **`documentType`** (if present): Keep only docs where `doc.documentType === query.documentType`.

4. **`entityType`** (if present): Keep only docs where `doc.documentType === "ENTITY"` AND `doc.entityType === query.entityType`. MANUSCRIPT docs pass this filter unchanged (the filter is silent for non-ENTITY docs).

5. **`manuscriptType`** (if present): Keep only docs where `doc.documentType === "MANUSCRIPT"` AND `doc.manuscriptType === query.manuscriptType`. ENTITY docs pass unchanged.

6. **`spoilerTier`** (if present and non-empty): Keep only docs where `query.spoilerTier.includes(doc.spoilerTier)`. OR semantics.

7. **`tags`** (if present and non-empty): Keep only docs where every tag in `query.tags` appears in `doc.tags`. AND semantics: `query.tags.every(t => doc.tags.includes(t))`.

8. **`timelineEraSlug`** (if present): For ENTITY docs keep only where `doc.timelineEraSlug === query.timelineEraSlug`. MANUSCRIPT docs pass unchanged (silently ignored per Part 01 §3).

9. **`q`** (if present and non-empty after trim): Case-insensitive substring match.
   - ENTITY docs: match against `doc.name + " " + doc.summary`.
   - MANUSCRIPT docs: match against `doc.title + " " + doc.summary`.
   - Implementation: `haystack.toLowerCase().includes(q.toLowerCase().trim())`.
   - Empty or whitespace-only `q` matches all (no text filtering applied).

**After filtering:**
- `total = filtered.length`
- `const safeOffset = Math.max(0, query.offset)` — negative offsets treated as 0
- `hits = filtered.slice(safeOffset, safeOffset + query.limit).map(doc => ({ id: doc.id, documentType: doc.documentType, score: 1.0, document: doc }))`
- Return `{ resolvedReleaseSlug: query.releaseSlug, total, hits }`

All hits receive `score: 1.0`. No sorting is specified for the MVP; results are in insertion order of the Map.

---

### 2.3 `apps/api/src/services/searchIndexService.ts`

**Exports:** `searchIndexService` (named const object)

**Module-level singleton adapter:**
```typescript
import { InMemorySearchAdapter } from "../lib/searchAdapters/inMemorySearchAdapter.js";
const adapter = new InMemorySearchAdapter();
```

**Helper: document field mapping**

```typescript
// detailPath lookup (from Part 01 §1.2)
const ENTITY_DETAIL_PATHS: Partial<Record<EntityType, string>> = {
  CHARACTER: "/characters",
  FACTION: "/factions",
  LOCATION: "/locations",
  EVENT: "/events"
};

function buildEntityDetailPath(entityType: EntityType, entitySlug: string): string | null {
  const base = ENTITY_DETAIL_PATHS[entityType];
  return base !== undefined ? `${base}/${entitySlug}` : null;
}
```

**Helper: manuscript metadata extraction**

```typescript
// No manuscriptMetadataContract exists. Extract directly per Part 01 §1.3.
function extractManuscriptSpoilerTier(payload: Prisma.JsonValue | null): "NONE" | "MINOR" | "MAJOR" {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "NONE";
  const meta = (payload as Record<string, unknown>).metadata;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return "NONE";
  const tier = (meta as Record<string, unknown>).spoilerTier;
  return tier === "NONE" || tier === "MINOR" || tier === "MAJOR" ? tier : "NONE";
}

function extractManuscriptTags(payload: Prisma.JsonValue | null): string[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const meta = (payload as Record<string, unknown>).metadata;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return [];
  const rawTags = (meta as Record<string, unknown>).tags;
  if (!Array.isArray(rawTags)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const t of rawTags) {
    if (typeof t !== "string") continue;
    const normalized = t.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}
```

**`buildAllDocuments()` implementation:**

1. Call `searchIndexRepository.findAllIndexableEntityRevisions()` and `searchIndexRepository.findAllIndexableManuscriptRevisions()` in parallel via `Promise.all`.
2. For each entity row, build an `EntitySearchDocument`:
   - `id`: `revisionId`
   - `documentType`: `"ENTITY"`
   - `entityId`, `entityType`, `entitySlug` from the row
   - `name`, `summary`, `revisionVersion` from the row
   - `visibility`: `"PUBLIC"` (hardcoded — only PUBLIC revisions are returned by the query)
   - `spoilerTier`, `tags`, `timelineEraSlug`, `anchorLabel`, `sortKey` — via `entityMetadataContract.readMetadata({ entityType, payload })`:
     - `spoilerTier = metadata.spoilerTier`
     - `tags = metadata.tags`
     - `timelineEraSlug = metadata.timelineAnchor?.timelineEraSlug ?? null`
     - `anchorLabel = metadata.timelineAnchor?.anchorLabel ?? null`
     - `sortKey = metadata.timelineAnchor?.sortKey ?? null`
   - `releaseSlug`: `releaseSlug` from the row
   - `detailPath`: `buildEntityDetailPath(entityType, entitySlug)` (null for non-codex types)
   - `indexedAt`: `new Date().toISOString()`
3. For each manuscript row, build a `ManuscriptSearchDocument`:
   - `id`: `revisionId`
   - `documentType`: `"MANUSCRIPT"`
   - `manuscriptId`, `manuscriptType`, `manuscriptSlug` from the row
   - `title`: `revisionTitle`, `summary`: `revisionSummary`, `revisionVersion`
   - `visibility`: `"PUBLIC"`
   - `spoilerTier`: `extractManuscriptSpoilerTier(revisionPayload)`
   - `tags`: `extractManuscriptTags(revisionPayload)`
   - `releaseSlug`: `releaseSlug` from the row
   - `detailPath`: `"/codex/manuscripts/${manuscriptSlug}"`
   - `indexedAt`: `new Date().toISOString()`
4. Concatenate entity docs first, then manuscript docs. The ordering guarantee (ARCHIVED before ACTIVE) is enforced by the repository's `orderBy: [{ release: { status: "desc" } }]`, which applies consistently to both entity and manuscript queries.
5. Return the combined array.

**`buildDocumentsForRelease(releaseSlug: string)` implementation:**

1. Query `prismaClient.release.findFirst({ where: { slug: releaseSlug } })` to verify the release exists.
2. If not found, throw `new Error(`Release not found: ${releaseSlug}`)`.
3. If `status === "DRAFT"`, throw `new Error(`Cannot build documents for DRAFT release: ${releaseSlug}`)`.
4. Query `findAllIndexableEntityRevisions()` and `findAllIndexableManuscriptRevisions()` (same as `buildAllDocuments`), then filter results to `row.releaseSlug === releaseSlug`.

**`buildEntityDocument(revisionId: string)` implementation:**

1. Call `searchIndexRepository.findEntityRevisionForIndex(revisionId)`.
2. If null, return null.
3. Build and return one `EntitySearchDocument` using the same mapping logic as `buildAllDocuments`.

**`buildManuscriptDocument(manuscriptRevisionId: string)` implementation:**

1. Call `searchIndexRepository.findManuscriptRevisionForIndex(manuscriptRevisionId)`.
2. If null, return null.
3. Build and return one `ManuscriptSearchDocument`.

**`search(query: SearchQuery) → Promise<SearchResult>` implementation:**

```
1. resolvedReleaseSlug = query.releaseSlug ?? await searchIndexRepository.findActiveReleaseSlug()
2. If resolvedReleaseSlug is null:
     return { resolvedReleaseSlug: null, total: 0, hits: [] }
3. return adapter.search({ ...query, releaseSlug: resolvedReleaseSlug })
```

**`rebuildIndex() → Promise<void>` implementation:**

```
1. const docs = await searchIndexService.buildAllDocuments()
2. await adapter.rebuild(docs)
```

---

### 2.4 `apps/api/src/routes/publicSearchRouter.ts`

**Exports:** `publicSearchRouter` (named const, `Router()`)

**Route:** `GET /`

**Zod query schema:**

```typescript
const spoilerTierEnum = z.enum(["NONE", "MINOR", "MAJOR"]);

const searchQuerySchema = z.object({
  q:               z.string().trim().optional(),
  releaseSlug:     z.string().optional(),
  documentType:    z.enum(["ENTITY", "MANUSCRIPT"]).optional(),
  entityType:      z.nativeEnum(EntityType).optional(),
  manuscriptType:  z.enum(["CHAPTER", "SCENE"]).optional(),
  spoilerTier: z
    .union([z.array(spoilerTierEnum), spoilerTierEnum])
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      return Array.isArray(v) ? v : [v];
    }),
  tags: z
    .union([z.array(z.string().trim().min(1)), z.string().trim().min(1)])
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      return Array.isArray(v) ? v : v.split(",").map((t) => t.trim()).filter(Boolean);
    }),
  timelineEraSlug: z.string().optional(),
  limit:  z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});
```

**Handler:**

```typescript
publicSearchRouter.get("/", async (request, response) => {
  const parsed = searchQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const result = await searchIndexService.search(parsed.data);
  response.json(result);
});
```

No auth required — this is a public route.

**Success response shape (`200 OK`):**
```json
{
  "resolvedReleaseSlug": "v1.0" | null,
  "total": 42,
  "hits": [
    {
      "id": "<RevisionId>",
      "documentType": "ENTITY" | "MANUSCRIPT",
      "score": 1.0,
      "document": { /* EntitySearchDocument or ManuscriptSearchDocument */ }
    }
  ]
}
```

**Error response (`400 Bad Request`):**
```json
{ "error": { "fieldErrors": { ... }, "formErrors": [] } }
```

---

### 2.5 Wiring

#### `apps/api/src/app/createApp.ts`

Add to imports:
```typescript
import { publicSearchRouter } from "../routes/publicSearchRouter.js";
```

Add to route registrations (after `publicDiscoveryRouter`):
```typescript
app.use("/search", publicSearchRouter);
```

#### `apps/api/src/startServer.ts`

After `server.once("listening", ...)` resolves:
```typescript
import { searchIndexService } from "./services/searchIndexService.js";
// ...
const server = await listenOnPort(port);
searchIndexService.rebuildIndex().catch((error) => {
  console.error("[search] initial rebuild failed:", error);
});
```

This fires the first full rebuild on server start so the in-memory index is populated from existing release data immediately. The `catch` prevents an unhandled rejection from crashing the server if the DB is briefly unavailable at startup.

#### `apps/api/src/routes/adminReleaseRouter.ts`

Add to imports:
```typescript
import { searchIndexService } from "../services/searchIndexService.js";
```

In `POST /:slug/activate`, after `response.json(release)`:
```typescript
// Triggers R1 (DRAFT → ACTIVE) and R2 (ACTIVE → ARCHIVED implicitly via
// releaseRepository.activateRelease transaction). Fire-and-forget so activation
// response returns immediately; index reflects new state within rebuild time.
searchIndexService.rebuildIndex().catch((error) => {
  console.error("[search] post-activation rebuild failed:", error);
});
```

**Note for tests:** Tests that call `releaseRepository.activateRelease()` directly (bypassing the HTTP route) must call `searchIndexService.rebuildIndex()` explicitly in the test `before()` hook to populate the index, since the fire-and-forget hook does not fire for direct repository calls.

---

## 3. HTTP Route Definition

| Property | Value |
|---|---|
| Method | `GET` |
| Path | `/search` |
| Auth | None (public) |
| Query params | See Zod schema in §2.4 |
| Content-Type | `application/json` |
| Success status | `200 OK` |
| Error status | `400 Bad Request` (validation) |

**Query parameter reference:**

| Param | Type | Required | Default | Semantics |
|---|---|---|---|---|
| `q` | `string` | No | match-all | Case-insensitive substring match against name+summary (entities) or title+summary (manuscripts) |
| `releaseSlug` | `string` | No | current ACTIVE release | Exact-match scope |
| `documentType` | `"ENTITY"\|"MANUSCRIPT"` | No | both | Restrict by document class |
| `entityType` | `EntityType` | No | all | ENTITY docs only |
| `manuscriptType` | `"CHAPTER"\|"SCENE"` | No | both | MANUSCRIPT docs only |
| `spoilerTier` | `string[]` or comma-separated `string` | No | all tiers | OR semantics |
| `tags` | `string[]` or comma-separated `string` | No | no constraint | AND semantics |
| `timelineEraSlug` | `string` | No | no constraint | ENTITY docs only |
| `limit` | `number` | No | `20` | Clamped `[1, 50]` |
| `offset` | `number` | No | `0` | Must be `>= 0` |

---

## 4. Acceptance Criteria

The Part 02 test file must verify all of the following. Each maps to the corresponding AC from Part 01 §8.

| AC | Test scenario | Key assertion |
|---|---|---|
| AC-01 | PRIVATE entity revision + ACTIVE release `ReleaseEntry` → rebuild → `GET /search` | Zero hits containing that revision's id |
| AC-02 | RESTRICTED entity revision + ACTIVE release `ReleaseEntry` → rebuild | Zero hits for that id under any filter |
| AC-03 | PUBLIC entity revision + ACTIVE `ReleaseEntry` + `Entity.retiredAt` set → rebuild | Zero hits for that revision id or its `entityId` |
| AC-04 | PUBLIC entity revision whose only `ReleaseEntry` is in a DRAFT release → rebuild | Zero hits for that revision id |
| AC-05 | PUBLIC entity in ACTIVE release with `payload.metadata.spoilerTier = "MINOR"` → rebuild → `GET /search` | Hit present; `documentType = "ENTITY"`; `document.spoilerTier = "MINOR"` |
| AC-06 | PUBLIC manuscript in ACTIVE release → rebuild → `GET /search?documentType=MANUSCRIPT` | Hit present; `documentType = "MANUSCRIPT"`; `document.detailPath = "/codex/manuscripts/<slug>"` |
| AC-07 | Query `GET /search` before any release activation (no ACTIVE release) | `total = 0`, `hits = []`, `resolvedReleaseSlug = null` |
| AC-08 | Entity in ARCHIVED release only → rebuild → search without `releaseSlug` returns 0 hits; search with `releaseSlug=<archived>` returns the hit | Confirmed by two separate search calls |
| AC-09 | `adapter.rebuild([])` then `GET /search?limit=1000` | `total = 0`, `hits = []` |
| AC-10 | Call `adapter.delete("nonexistent-id-abc123")` | Resolves without throwing |
| AC-11 | ARTIFACT entity in ACTIVE release → rebuild | `document.detailPath = null`; CHARACTER entity same release → `document.detailPath = "/characters/<slug>"` |
| AC-12 | Entities with tags `["war"]` and `["war", "magic"]` → `GET /search?tags=war,magic` | Only the `["war", "magic"]` entity returned |
| AC-13 | Entities with `spoilerTier = "NONE"`, `"MINOR"`, `"MAJOR"` → `GET /search?spoilerTier=NONE&spoilerTier=MINOR` | Zero hits with `document.spoilerTier = "MAJOR"` |

---

## 5. Test File Specification

**File:** `tests/phase2SearchApiSlice.test.ts`

**Pattern:** Follows `tests/phase2PublicEntitySlice.test.ts` — `node:test` + `assert/strict`; real DB via Prisma; test server via `createServer(createApp())`.

### 5.1 Imports and server setup

```typescript
import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";

import { createApp } from "../apps/api/src/app/createApp.js";
import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { releaseRepository } from "../apps/api/src/repositories/releaseRepository.js";
import { searchIndexService } from "../apps/api/src/services/searchIndexService.js";
import { phase0FixtureConfig } from "../scripts/phase0FixtureConfig.js";
```

### 5.2 Fixture requirements

All slugs must include a `timestamp` suffix to avoid conflicts with parallel test runs.

**Before all tests, create:**

| Handle | Type | Release | Visibility | Notes |
|---|---|---|---|---|
| `char01` | CHARACTER | archiveRelease + activeRelease | PUBLIC | AC-05, AC-08, AC-11 |
| `artifact01` | ARTIFACT | activeRelease | PUBLIC | AC-11 (detailPath=null) |
| `privateChar` | CHARACTER | activeRelease | PRIVATE | AC-01 |
| `restrictedChar` | FACTION | activeRelease | RESTRICTED | AC-02 |
| `retiredChar` | CHARACTER | activeRelease | PUBLIC | AC-03 — `Entity.retiredAt` set after release entry |
| `draftChar` | CHARACTER | draftRelease (DRAFT only) | PUBLIC | AC-04 |
| `tagWarOnly` | CHARACTER | activeRelease | PUBLIC | tags: `["war"]` — AC-12 |
| `tagWarMagic` | CHARACTER | activeRelease | PUBLIC | tags: `["war", "magic"]` — AC-12 |
| `tierNone` | CHARACTER | activeRelease | PUBLIC | spoilerTier: NONE — AC-13 |
| `tierMinor` | CHARACTER | activeRelease | PUBLIC | spoilerTier: MINOR — AC-13 |
| `tierMajor` | CHARACTER | activeRelease | PUBLIC | spoilerTier: MAJOR — AC-13 |
| `manuscript01` | CHAPTER | activeRelease | PUBLIC | AC-06 |

**Releases:**

| Handle | Activation order | Final status | Notes |
|---|---|---|---|
| `archiveRelease` | Activated first | ARCHIVED after `activeRelease` is activated | Holds `char01` v1 — AC-08 |
| `activeRelease` | Activated second (current) | ACTIVE | All other PUBLIC entities |
| `draftRelease` | Never activated | DRAFT | Holds `draftChar` — AC-04 |

**Setup sequence:**

1. Upsert author user (AUTHOR_ADMIN)
2. Create all entities and their revisions in Prisma
3. Set `retiredChar.retiredAt = new Date()` via direct `prismaClient.entity.update()`
4. Create `archiveRelease`, add `char01` v1, activate it
5. Create `activeRelease`, add all remaining entities + manuscripts, activate it (this archives `archiveRelease`)
6. Update `char01` v2 revision, include it in `activeRelease` (so `char01` appears in both releases with different revision IDs)
7. Create `draftRelease`, add `draftChar`, do NOT activate
8. Call `await searchIndexService.rebuildIndex()`

### 5.3 Test scenarios (one `test()` per AC)

**AC-07** runs before the main `before()` completes activation — or as a special early check inside `before()`, before calling `rebuildIndex()`. Strategy: assert immediately after `createApp()` (index is empty, no active release yet in a clean state). Since this is ordering-sensitive, AC-07 can alternatively be a standalone `test()` that calls `await searchIndexService.search({ limit: 20, offset: 0 })` directly (bypassing HTTP) before the global `before()` data is loaded.

Preferred approach: split into two `describe`-equivalent groups in `node:test` (nested `test` with `before`/`after`), one for the "no active release" edge case and one for the main fixture.

**AC-09 and AC-10** can call `searchIndexService`'s underlying adapter directly, or use the HTTP route + a subsequent rebuild:
- AC-09: call `adapter.rebuild([])` directly via the service's internals, or call `searchIndexService.rebuildIndex()` with an empty index after clearing all releases temporarily. Simplest: import `InMemorySearchAdapter` from the service module and expose a `clearIndex()` test helper, OR just call `GET /search?limit=1000` after calling `releaseRepository.activateRelease()` for... no, that's wrong. The cleanest path: `tests/phase2SearchApiSlice.test.ts` imports the adapter singleton from `searchIndexService.ts`. Since the adapter is a module-level singleton, its `rebuild([])` method can be called directly.

The spec should note that `searchIndexService.ts` must export either a `testAdapter` reference or exposes a `clearForTest()` helper. Alternatively, AC-09 can be verified by noting that `rebuild([])` is called as part of the test fixture teardown and observing that subsequent search returns 0. The implementation team chooses the most pragmatic approach consistent with the test file staying under 250 lines.

### 5.4 Teardown

In `after()`:
- Delete all releases, release entries, entities, entity revisions, manuscript revisions, manuscripts created by this test suite (by slug prefix or exact slug list)
- Call `await searchIndexService.rebuildIndex()` to restore the index to a clean post-teardown state
- `await prismaClient.$disconnect()`

---

## 6. Validation

Before marking this part complete:

```bash
pnpm type-check   # must pass with 0 errors
pnpm lint         # must pass with 0 warnings/errors
```

The test file must be runnable as part of the project's test suite. All 13 ACs must pass.

---

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Adapter instantiation** | Module-level singleton in `searchIndexService.ts` | Matches object singleton pattern used throughout the codebase; no DI container exists in the project |
| **Active-release resolution** | Service resolves active release slug before calling adapter | Adapter has no DB access; this was mandated in Part 01 §5.4 invariant 3 |
| **Startup rebuild** | `startServer.ts` after server is listening, fire-and-forget | Ensures the in-memory index is warm from the first request; failure does not crash the server |
| **Activation rebuild hook** | `adminReleaseRouter.ts` after `releaseService.activateRelease()`, fire-and-forget | Keeps release service free of search concerns; one hook covers both R1 (new ACTIVE) and R2 (implicit ARCHIVE of previous ACTIVE) since `activateRelease()` is a single atomic transaction |
| **No explicit archive endpoint** | `activateRelease()` atomically archives the previous ACTIVE release; rebuild wired once at that point | `releaseRepository.activateRelease()` archives in the same transaction; no separate archive route exists |
| **Array query params** | Accept both repeated params and comma-separated strings via Zod `union + transform` | Handles both `?spoilerTier=NONE&spoilerTier=MINOR` and `?spoilerTier=NONE,MINOR`; matches common client behavior |
| **`tags` comma separation** | `?tags=war,magic` parsed as `["war", "magic"]` | Simpler URL construction; consistent with the union/transform approach; no precedent in existing query schemas for multi-value arrays |
| **Scoring** | All hits `score: 1.0` | No ranking model exists; the field is declared on `SearchHit` for future use |
| **Manuscript metadata** | Extracted directly from payload (no `manuscriptMetadataContract`) | Consistent with Part 01 §1.3 decision; `manuscriptMetadataContract` deferred to Phase 3 |
| **Non-goals** | No RESTRICTED/admin search surface, no relationship traversal, no full-text ranking, no web UI | Explicitly out of scope; MVP covers only the 13 ACs |

---

## Completion Record

**Completed:** 2026-03-19

### Delivered

- `apps/api/src/lib/searchAdapters/inMemorySearchAdapter.ts` created with `InMemorySearchAdapter` implementing the `SearchAdapter` contract.
- `apps/api/src/repositories/searchIndexRepository.ts` created with release-safe index source queries and single-document lookup helpers.
- `apps/api/src/services/searchIndexService.ts` created with full-document build, release resolution, and search orchestration.
- `apps/api/src/routes/publicSearchRouter.ts` created and mounted as `GET /search`.
- `apps/api/src/app/createApp.ts` extended to mount `/search`.
- `apps/api/src/startServer.ts` extended to run startup index rebuild.
- `apps/api/src/routes/adminReleaseRouter.ts` extended so post-activation triggers fire-and-forget search rebuild.
- `tests/phase2SearchApiSlice.test.ts` delivered with all 13 acceptance criteria passing.

### Implementation Deviation Captured

- Relation name fix applied during delivery: `ManuscriptRevision.releaseManuscriptEntries` references in planning text were corrected to `ManuscriptRevision.releaseEntries` to match the actual Prisma schema relation field.

### Verification

- `pnpm type-check`
- `pnpm lint`
- `tests/phase2SearchApiSlice.test.ts`

All passed at execution handoff.
