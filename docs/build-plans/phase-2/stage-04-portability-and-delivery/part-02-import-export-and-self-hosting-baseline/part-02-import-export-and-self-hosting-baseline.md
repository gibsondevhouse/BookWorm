# Part 02: Import Export and Self-Hosting Baseline

**Status:** Complete `[x]`

## Slice Progress

- [x] Slice 1 executed: JSON export CLI foundation for `scope=current` and `scope=release`
- [x] Slice 1 executed: first `pnpm auth:bootstrap-admin` command backed by service and repository layers
- [x] Slice 1 executed: focused tests and minimum operator docs for the implemented commands
- [x] Slice 2 executed: JSON import CLI foundation — `jsonPortabilityParser`, `portabilityImportService`, `portabilityImportRepository`, `scripts/importPortability.ts`, `pnpm portability:import` script, and `tests/phase2PortabilityImportJsonBaseline.test.ts` covering all 8 §8.2 acceptance scenarios
- [x] Slice 3 executed: Markdown portability, backup/restore wrappers, and self-hosting baseline documentation and tests

## Objective

Define and deliver the minimum portability and operator baseline required for the current Phase 2 MVP slice so implemented content can be exported, re-imported into draft-safe state, and run by another operator on a clean self-hosted setup.

## Context

This part must align with the repository as it exists now rather than with broader aspirational docs:

- `apps/api/src/app/createApp.ts` exposes an Express API organized around route -> service -> repository boundaries.
- `apps/api/src/config/env.ts`, `.env.example`, and `package.json` establish the current runtime contract: Node 22+, pnpm 10.7, PostgreSQL via `DATABASE_URL`, and Prisma-managed migrations.
- `apps/api/src/startServer.ts` rebuilds the in-memory search index on API startup, which means import and restore flows cannot rely on a persistent search backend and must account for restart behavior.
- `apps/api/src/services/releaseService.ts`, `apps/api/src/services/releaseHistoryService.ts`, and the release-related repositories already define the release-safe source of truth for draft, active, and archived releases.
- `apps/api/src/lib/entityMetadataContract.ts` already stabilizes metadata fields such as spoiler tier, tags, and timeline anchors that portability formats must preserve.
- `docs/build-system/book-worm-decisions-resolution.md` has already resolved that the database is the sole runtime source of truth and Markdown/JSON are import/export portability formats rather than co-equal canonical stores.
- There is currently no import/export implementation under `apps/api/src` or `scripts/`, no operator bootstrap flow outside the deterministic Phase 0 seed, and no dedicated self-hosting guide.

This part therefore defines an execution-ready baseline for portability and self-hosting that fits the current architecture: CLI-first portability commands backed by API-layer services and repositories, plus explicit operator documentation for startup, migration, backup, and restore.

## Scope

### In Scope

- CLI-first export for implemented entities, manuscripts, relationships, and release snapshots.
- CLI-first import for JSON packages and Markdown-based packages.
- Stable exported package layout and manifest rules.
- Transactional validation, failure reporting, and draft-safe import constraints.
- Clean-install operator bootstrap, including first author-admin creation.
- Self-hosting documentation for environment requirements, startup flow, migration flow, and backup/restore baseline.
- Integration and script-level test coverage for export, import, and operator-baseline commands.

### Out Of Scope

- No admin web UI for import/export in this part.
- No multipart upload API, zip package API, or long-running job API in this part.
- No background worker or resumable import/export job system.
- No media or image import/export; the repo has no finalized object storage layer yet.
- No import of sessions or users beyond bootstrap admin creation.
- No replay of imported releases as `ACTIVE` or `ARCHIVED`; imported releases remain draft-safe.
- No backup of a separate search service; current search is in-memory and rebuilt from the database.

## Dependencies

- Phase 2 Stage 03 complete.
- Stage 04 Part 01 complete so release-history and archive semantics are already defined.
- Existing release mutation guardrails remain unchanged:
	- only draft releases are mutable
	- activation and archiving remain controlled by the current release service
- Existing entity and manuscript metadata rules remain source-of-truth for portable field coverage.

---

## 1. Delivery Strategy

### 1.1 Approved interface for Part 02

Part 02 should be implemented as **CLI-first portability tooling**, not as HTTP import/export endpoints.

Rationale grounded in the current repo:

1. The repo already uses root-level scripts for seed and verification workflows.
2. The current API runtime has no file-upload stack, no background jobs, and only JSON body parsing.
3. Session auth is browser-oriented; operator portability workflows are better modeled as local maintenance commands.
4. Import and restore operations need maintenance-mode semantics because the running API process owns the in-memory search index.

### 1.2 Architecture boundary for implementation

Implementation should still follow the repository's layering discipline:

- `scripts/` contains thin command entrypoints and argument parsing.
- `apps/api/src/services/` contains orchestration for import, export, bootstrap, and backup-related domain rules.
- `apps/api/src/repositories/` contains the Prisma reads and writes required for portability operations.
- `apps/api/src/lib/` contains format parsing, serialization, manifest helpers, and portability-specific types.

No portability logic should be embedded directly into the CLI scripts.

### 1.3 Maintenance-mode rule

Imports and database restores must be treated as **offline maintenance operations**.

Required operator rule set:

1. Stop the API process before `portability:import` or `db:restore`.
2. Restart the API after the operation so `apps/api/src/startServer.ts` can rebuild the search index.
3. Export and `db:backup` may run while the system is online, but docs should recommend a quiescent authoring window for deterministic snapshots.

---

## 2. CLI Contracts

## 2.1 Export command

| Property | Value |
|---|---|
| Command | `pnpm portability:export` |
| Backing script | `scripts/exportPortability.ts` |
| Primary consumer | author-admin operator on the repo host |
| Result | writes a portability package to a local directory |

**Required arguments**

- `--scope=current|release`
- `--format=json|markdown`
- `--output=<path>`

**Conditional arguments**

- `--release-slug=<slug>` is required when `--scope=release`

**Behavior**

1. `scope=current` exports the latest authored state for implemented records:
	 - all entity records and their latest entity revision payloads
	 - all manuscripts and their latest manuscript revision payloads
	 - all relationships and their latest relationship revision state
	 - entity-level retirement state where present
2. `scope=release` exports an exact release-bound snapshot for one release slug:
	 - only revisions included in the selected release
	 - release composition metadata for entities, manuscripts, and relationships
	 - release metadata in a dedicated release manifest file
3. Export is read-only and must never mutate revision versions, release status, timestamps, or search state.
4. `scope=current` does not export draft releases because draft releases are mutable assembly state, not the default portability target.
5. `scope=release` may export `DRAFT`, `ACTIVE`, or `ARCHIVED` releases for author-admin operators, but the manifest must record the original status explicitly.

## 2.2 Import command

| Property | Value |
|---|---|
| Command | `pnpm portability:import` |
| Backing script | `scripts/importPortability.ts` |
| Primary consumer | author-admin operator on the repo host |
| Result | validates and applies a portability package into database-backed draft-safe state |

**Required arguments**

- `--format=json|markdown`
- `--input=<path>`
- `--actor-email=<email>`

**Optional arguments**

- `--dry-run`
- `--report=<path>`
- `--conflict=fail|create-revision` with default `fail`

**Behavior**

1. `--actor-email` must resolve to an existing `AUTHOR_ADMIN` user. The import uses that user as `createdById` for created revisions and releases.
2. The command validates the full package before applying changes.
3. Without `--dry-run`, the apply phase runs in a single database transaction.
4. The default conflict mode is `fail`; no silent overwrite is allowed.
5. `create-revision` may create a new draft revision when a stable record match is found and the imported content differs.
6. Importing a release manifest never activates or archives a release. Imported releases are created only as `DRAFT` records.
7. If a package contains release manifests, referenced entities, manuscripts, and relationships must resolve within the same import run or already exist in the database.

## 2.3 Bootstrap admin command

| Property | Value |
|---|---|
| Command | `pnpm auth:bootstrap-admin` |
| Backing script | `scripts/bootstrapAuthorAdmin.ts` |
| Primary consumer | self-host operator on a clean install |
| Result | creates the first `AUTHOR_ADMIN` user without seeding demo content |

**Required contract**

- must create exactly one author-admin user when the email does not already exist
- must fail clearly when the email already exists
- must not seed example content, releases, or relationships
- must use the existing password hashing and user persistence helpers

This command is required because the current repo only provisions an author-admin through the Phase 0 seed, which is not appropriate as the default self-host bootstrap path.

## 2.4 Backup and restore commands

| Property | Value |
|---|---|
| Commands | `pnpm db:backup`, `pnpm db:restore` |
| Backing scripts | `scripts/backupDatabase.mjs`, `scripts/restoreDatabase.mjs` |
| Primary consumer | operator |
| Result | database dump and restore wrappers for the authoritative data store |

**Required behavior**

1. `db:backup` creates a PostgreSQL dump at a caller-provided path.
2. `db:restore` restores a PostgreSQL dump from a caller-provided path and is documented as an offline operation.
3. Docs must state that database backup/restore is the authoritative disaster-recovery path.
4. Docs must state that portability export/import is for content movement and editorial portability, not a substitute for full operational backup.

Implementation note: these scripts may shell out to `pg_dump` and `psql`/`pg_restore`, but the operator docs must then make those host dependencies explicit.

---

## 3. Portability Package Contracts

## 3.1 Shared manifest requirements

Every export package must include `manifests/export-manifest.json` with at least:

```json
{
	"schemaVersion": 1,
	"format": "json",
	"scope": "release",
	"exportedAt": "2026-03-19T00:00:00.000Z",
	"release": {
		"slug": "spring-arc",
		"status": "ARCHIVED"
	},
	"counts": {
		"entities": 42,
		"manuscripts": 18,
		"relationships": 21,
		"releases": 1
	}
}
```

Required rules:

1. `schemaVersion` is mandatory and validated on import.
2. `format` must match the selected export mode.
3. `scope` must be `current` or `release`.
4. `release` is required only for `scope=release`.
5. `counts` must reflect actual serialized record totals.

## 3.2 JSON export layout

`format=json` should emit deterministic machine-readable files under this layout:

- `manifests/export-manifest.json`
- `entities/<entity-type>/<slug>.json`
- `manuscripts/<manuscript-type>/<slug>.json`
- `relationships/<source-slug>--<relation-type>--<target-slug>.json`
- `releases/<release-slug>.json` for `scope=release` only

Each JSON document must include stable identity where available:

- internal record ID
- public/editorial slug
- latest or selected revision ID
- revision version
- visibility and metadata fields
- retirement or relationship state where applicable

## 3.3 Markdown export layout

`format=markdown` should emit a mixed package aligned with the previously resolved portability direction:

- `manifests/export-manifest.json`
- `entities/<entity-type>/<slug>.md`
- `chapters/<slug>.md`
- `scenes/<slug>.md`
- `relationships/<source-slug>--<relation-type>--<target-slug>.json`
- `releases/<release-slug>.json` for `scope=release` only

Required Markdown rules:

1. Entity and manuscript records use front matter plus body content.
2. Structural records that are not naturally body-oriented remain JSON in Markdown packages:
	 - relationship revisions
	 - release manifests
	 - package manifest
3. Front matter must preserve fields already represented in the current domain model, including visibility and metadata.
4. The body must round-trip the narrative or summary-bearing fields without stripping significant text.

## 3.4 Identity and matching rules

Imports must resolve identity in this order:

1. internal ID when present and trusted
2. stable slug
3. explicit package-local mapping reference if introduced by the implementation

Required constraints:

1. Ambiguous matches fail the import.
2. Slug-only matches may not silently attach to a different internal ID.
3. Release manifests must never remap an existing release slug in place.
4. Relationship matching must use source slug, target slug, and relation type together.

---

## 4. Import Semantics and Failure Handling

## 4.1 Apply order

Import applies in this order:

1. validate manifest and file layout
2. validate actor and conflict policy
3. import entities
4. import manuscripts
5. import relationships
6. import releases
7. write final report

This order is required because relationships depend on entities and release manifests depend on revision resolution across all supported content types.

## 4.2 Entity and manuscript behavior

Required behavior for imported entities and manuscripts:

1. New slugs create new base rows and version 1 revisions.
2. Existing stable matches create a new revision when content differs and conflict mode allows `create-revision`.
3. If imported content is identical to the latest stored revision, the item is reported as `NO_CHANGE` and no duplicate revision is created.
4. Entity-level `retiredAt` must round-trip when present.
5. Existing release composition is not mutated implicitly by entity or manuscript import.

## 4.3 Relationship behavior

Required behavior for imported relationships:

1. Relationship identity is based on source entity, target entity, and relation type.
2. The latest relationship revision state must round-trip, including `CREATE`, `UPDATE`, and `DELETE`.
3. Missing source or target entities fail validation before any write occurs.
4. Relationship revisions create new revision versions when imported content differs and the conflict policy allows it.

## 4.4 Release behavior

Required behavior for imported releases:

1. Release manifests may only create new `DRAFT` releases.
2. Original source status and activation timestamp are imported as descriptive metadata in the manifest context only; they are not re-applied to the runtime release row.
3. If a target release slug already exists in any status, import fails for that release.
4. Release manifests must bind only to imported or pre-existing revisions that resolve exactly.
5. Imported release composition must remain subject to the same dependency and immutability checks already used by the release system.

## 4.5 Failure contract

The import command must produce a deterministic report to stdout and optionally to `--report` path with:

- summary counts
- planned changes or applied changes
- warnings
- errors with file path and error code

Minimum error codes for the baseline:

- `MANIFEST_INVALID`
- `FORMAT_UNSUPPORTED`
- `SCHEMA_VERSION_UNSUPPORTED`
- `ACTOR_NOT_FOUND`
- `ACTOR_FORBIDDEN`
- `IDENTITY_AMBIGUOUS`
- `DEPENDENCY_MISSING`
- `RELEASE_CONFLICT`
- `PAYLOAD_INVALID`
- `PATH_UNSAFE`

Required failure rules:

1. Default mode is fail-fast after validation completes and before writes begin.
2. Any validation or conflict error aborts the transactional apply.
3. Partial writes are not allowed in the MVP baseline.
4. `--dry-run` returns the same report shape without database writes.

---

## 5. Self-Hosting and Operator Baseline

## 5.1 Documented environment expectations

The self-hosting baseline must document these concrete requirements:

- Node.js 22 or newer
- pnpm 10.7.0
- reachable PostgreSQL database for `DATABASE_URL`
- API environment values from `.env.example`
- writable local filesystem paths for exports, dumps, and reports
- `pg_dump` and restore tooling when using the backup/restore scripts

No additional search service or object storage dependency should be documented for Phase 2 because the current implementation does not require them.

## 5.2 Clean-start startup flow

The operator guide must document this exact clean-start sequence for a non-demo installation:

1. copy `.env.example` to `.env`
2. run `pnpm install`
3. provision PostgreSQL and set `DATABASE_URL`
4. run `pnpm db:generate`
5. run `pnpm db:migrate`
6. run `pnpm auth:bootstrap-admin`
7. optionally run `pnpm portability:import --dry-run` against initial content
8. run `pnpm portability:import` if applying initial content
9. run `pnpm dev` for local hosting or `pnpm build` plus package start commands for a built run
10. verify API health and representative public reads

`pnpm db:seed` must remain documented as deterministic fixture setup, not as the default self-host bootstrap path.

## 5.3 Migration and upgrade flow

The operator guide must also document an upgrade-safe flow:

1. stop the running application
2. run `pnpm db:backup`
3. pull updated code and install dependencies
4. run `pnpm db:generate`
5. run `pnpm db:migrate`
6. restart the application
7. verify `/health` and a representative public route

## 5.4 Backup and restore baseline

Required operator guidance:

1. Database dump/restore is the authoritative recovery path.
2. Portability export/import is a content mobility path and should not be described as disaster recovery.
3. Restore requires the application to be stopped.
4. After restore, restart the API so the search index rebuilds from restored data.
5. Because there is no separate media system in the current repo, backup scope is limited to the PostgreSQL database plus any operator-managed export or dump directories.

---

## 6. File Layout and Likely Touch Points

| File | Action | Why |
|---|---|---|
| `package.json` | Change | add root scripts for `portability:export`, `portability:import`, `auth:bootstrap-admin`, `db:backup`, and `db:restore` |
| `apps/api/package.json` | Change | add portability parser/serializer dependency if needed, such as a Markdown front matter parser |
| `apps/api/src/services/portabilityExportService.ts` | Create | orchestrate export scope resolution and serialization-ready shaping |
| `apps/api/src/services/portabilityImportService.ts` | Create | orchestrate validation, identity matching, transaction-safe apply, and import reporting |
| `apps/api/src/services/bootstrapAuthorAdminService.ts` | Create | encapsulate clean-install author-admin bootstrap rules |
| `apps/api/src/repositories/portabilityExportRepository.ts` | Create | centralize Prisma reads for latest-state and release-bound exports |
| `apps/api/src/repositories/portabilityImportRepository.ts` | Create | centralize Prisma writes and lookups required for import matching and apply |
| `apps/api/src/lib/portability/portabilityTypes.ts` | Create | shared manifest, report, and record contract types |
| `apps/api/src/lib/portability/jsonPortabilitySerializer.ts` | Create | deterministic JSON output shaping |
| `apps/api/src/lib/portability/markdownPortabilitySerializer.ts` | Create | Markdown plus front matter serialization |
| `apps/api/src/lib/portability/jsonPortabilityParser.ts` | Create | JSON package parsing and validation |
| `apps/api/src/lib/portability/markdownPortabilityParser.ts` | Create | Markdown front matter parsing and validation |
| `scripts/exportPortability.ts` | Create | CLI entrypoint for export |
| `scripts/importPortability.ts` | Create | CLI entrypoint for import |
| `scripts/bootstrapAuthorAdmin.ts` | Create | CLI entrypoint for bootstrap admin creation |
| `scripts/backupDatabase.mjs` | Create | operator-facing PostgreSQL dump wrapper |
| `scripts/restoreDatabase.mjs` | Create | operator-facing restore wrapper |
| `README.md` | Change | replace Phase 0/1-biased startup guidance with current self-host baseline links and command flow |
| `scripts/README.md` | Change | document new portability, bootstrap, backup, and restore scripts |
| `.env.example` | Change if needed | keep the checked-in environment contract synchronized with the self-host guide |
| `tests/phase2PortabilityExportBaseline.test.ts` | Create | verify current and release export behavior |
| `tests/phase2PortabilityImportJsonBaseline.test.ts` | Create | verify JSON import behavior, constraints, and failure reporting |
| `tests/phase2PortabilityImportMarkdownBaseline.test.ts` | Create | verify Markdown package parsing and import behavior |
| `tests/phase2SelfHostingBaseline.test.ts` | Create | verify bootstrap and backup/restore script argument contracts and operator-critical safeguards |
| `tests/README.md` | Change | document the expanded Phase 2 portability and operator test coverage |

Implementation note: if portability repositories become too broad, split read and write responsibilities by concern, but keep Prisma access out of the CLI scripts.

---

## 7. Acceptance Criteria

1. `pnpm portability:export --scope=current --format=json` produces a deterministic package containing implemented entity, manuscript, and relationship content with a valid manifest.
2. `pnpm portability:export --scope=release --release-slug=<slug> --format=json` produces a release-bound package containing only the selected release composition plus release metadata.
3. `pnpm portability:export --scope=release --release-slug=<slug> --format=markdown` emits Markdown for entities and manuscripts while preserving relationship and release structure in JSON files.
4. Export preserves stable identity fields, revision version, visibility, metadata, and retirement or relationship state where applicable.
5. `pnpm portability:import --format=json --dry-run` validates a JSON package and returns a structured report without writes.
6. JSON import creates new rows for new records and new revisions for changed matching records when conflict policy allows it.
7. Markdown import accepts front matter plus body for entities and manuscripts and rejects malformed front matter or unsupported fields with file-specific errors.
8. Relationship imports fail when referenced entities are missing and do not perform partial writes.
9. Release imports never create `ACTIVE` or `ARCHIVED` releases directly and fail on release slug collisions.
10. Import operations require an existing `AUTHOR_ADMIN` actor and fail clearly otherwise.
11. `pnpm auth:bootstrap-admin` creates the first author-admin without demo content and fails cleanly on duplicate email.
12. `pnpm db:backup` and `pnpm db:restore` are documented and implemented as the authoritative operational backup path for the current stack.
13. Self-hosting docs describe the clean-start, upgrade, backup, and restore flow without relying on the Phase 0 demo seed as the default installation path.
14. Docs explicitly state that import/restore are offline operations and that API restart rebuilds the search index.

---

## 8. Required Test Coverage

### 8.1 Export baseline

**Test file:** `tests/phase2PortabilityExportBaseline.test.ts`

Minimum scenarios:

- current JSON export includes implemented entities, manuscripts, relationships, and manifest counts
- release JSON export includes only the selected release composition
- Markdown export writes `.md` for entities and manuscripts and `.json` for relationships and releases
- export preserves visibility, metadata, revision version, and retirement state
- unknown release slug fails for `scope=release`

### 8.2 JSON import baseline

**Test file:** `tests/phase2PortabilityImportJsonBaseline.test.ts`

Minimum scenarios:

- dry-run validates without writes
- new record import creates expected rows and revisions
- matching changed record creates a new revision under `create-revision`
- identical record reports `NO_CHANGE`
- ambiguous identity fails
- missing dependency fails and rolls back
- release slug collision fails
- imported release is created only as `DRAFT`

### 8.3 Markdown import baseline

**Test file:** `tests/phase2PortabilityImportMarkdownBaseline.test.ts`

Minimum scenarios:

- valid front matter and body import successfully
- malformed front matter fails with file path in the report
- unsupported metadata field fails validation
- mixed Markdown plus JSON package layout is accepted
- release manifest in a Markdown package still imports only as draft

### 8.4 Self-host/operator baseline

**Test file:** `tests/phase2SelfHostingBaseline.test.ts`

Minimum scenarios:

- bootstrap admin command creates one `AUTHOR_ADMIN` user
- duplicate bootstrap email fails
- backup script rejects missing output path
- restore script rejects missing input path
- import command rejects non-admin actor email
- docs-driven command sequence remains aligned with the scripts exposed in `package.json`

Optional split: if the operator coverage becomes too large, keep CLI argument validation in one test file and keep database-backed bootstrap assertions in another, but preserve the acceptance matrix above.

---

## 9. Validation Commands

```bash
pnpm test --test-name-pattern "phase2PortabilityExportBaseline|phase2PortabilityImportJsonBaseline|phase2PortabilityImportMarkdownBaseline|phase2SelfHostingBaseline" 2>&1
pnpm lint
pnpm type-check
```

Manual operator validation expected during implementation:

```bash
pnpm auth:bootstrap-admin --email <email> --display-name <name> --password <password>
pnpm portability:export --scope current --format json --output ./tmp/portability-current-json
pnpm portability:export --scope release --release-slug <slug> --format markdown --output ./tmp/portability-release-md
pnpm portability:import --format=json --input ./tmp/portability-current-json --actor-email <author-admin-email> --dry-run
pnpm db:backup --output ./tmp/backups/bookworm.dump
```

Audit note: successful execution evidence belongs in implementation logs or CI output, not in this planning document.

---

## 10. Code-vs-Doc Contradictions To Resolve During Implementation

1. `README.md` should describe the current bootstrap and export baseline truthfully and must not imply that portability export can delete arbitrary existing directories.
2. `scripts/README.md` only documents seed and early verification scripts. It must expand to cover portability, bootstrap, and backup/restore.
3. The current repo has no operator guide despite Phase 2 and Stage 04 explicitly promising self-hostability. Part 02 implementation must add that documentation rather than assuming the root README is sufficient.
4. The broader build-system docs mention media-aware import/export and richer ops automation, but this repo does not yet implement object storage or a separate search service. Part 02 must keep MVP scope limited to what the codebase actually supports.

---

## 11. Completion Check

- author-admin operators can export the implemented content model into documented JSON and Markdown portability packages
- author-admin operators can import supported JSON and Markdown packages into draft-safe database state with explicit reporting and rollback-on-failure semantics
- a clean self-host install can bootstrap its first admin without using demo content
- operators can follow documented startup, migration, backup, and restore steps for the current stack
- the portability and self-hosting baseline is verified by dedicated tests and ready to feed Stage 04 Part 03 verification work
