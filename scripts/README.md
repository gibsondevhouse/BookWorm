# Scripts

This directory is reserved for repo-managed automation scripts as the runtime and release workflow expand.

## Phase 0

- `pnpm db:seed` writes the deterministic Phase 0 fixture set for the Character release slice.
- `pnpm db:reset` clears the database through Prisma migrations and then prompts for reseeding.
- `pnpm phase0:verify` exercises the draft-to-release flow against a running local API.

The Phase 0 seed creates:

- one `AUTHOR_ADMIN` user
- one `EDITOR` user
- one Character entity with a released public revision
- one later draft-only revision for the same Character
- one active release that points at the released revision

Seeded credentials:

- `author@example.com` / `phase0-author-password`
- `editor@example.com` / `phase0-editor-password`

Expected verification result after seeding:

- `GET /characters/captain-mirelle-vale` returns the released revision
- the later draft revision exists in the database but does not appear publicly until a release is updated and activated

Expected verification result after running `pnpm phase0:verify` with the API and PostgreSQL running:

- a session is created through `POST /auth/session`
- the seeded public response is observed first
- a newer draft revision is created successfully
- the public response remains unchanged before release activation
- a new release is created, receives the draft revision, and becomes active
- the public response updates only after the new release is activated

## Phase 1

- `pnpm phase1:verify` exercises the broader Phase 1 release workflow against a running local API.

Expected verification result after running `pnpm phase1:verify` with the API and PostgreSQL running:

- the Phase 0 seed baseline is refreshed before verification begins
- health, public character, public faction, public relationship, and public discovery all resolve against the active seeded release
- an empty draft release is blocked from activation with `RELEASE_EMPTY`
- a relationship-only draft release reports missing dependency failures through validation and review
- adding the required character and faction revisions clears validation failures
- public faction, public relationship, and public discovery remain unchanged before activation
- the new release activates successfully and the public faction, relationship, and discovery outputs update only after activation
- post-activation draft mutation is blocked with `RELEASE_NOT_DRAFT`

## Port Fallback

- API startup now probes the configured port and automatically moves to the next available port when the preferred port is occupied.
- Web `dev` and `start` scripts now use the same fallback policy through `scripts/runWithAvailablePort.mjs`.
- Repo-managed launches probe up to 20 sequential ports before failing.
- Launchers log a one-line `[port-fallback]` summary that shows the preferred port, selected port, and whether fallback was required.
- Root `pnpm dev` now prints a one-line `[dev-summary]` line once both API and web have selected their final ports.

## Phase 2 Stage 04 Part 02 Slice 1

- `pnpm portability:export --scope current --format json --output <path>` writes a deterministic JSON portability package for the latest authored entities, manuscripts, and relationships.
- The export target must be a missing or empty directory; the script refuses to delete or overwrite existing contents.
- `pnpm portability:export --scope release --format json --release-slug <slug> --output <path>` writes the selected release composition plus a release manifest file.
- `pnpm auth:bootstrap-admin --email <email> --display-name <name> --password <password>` creates one `AUTHOR_ADMIN` user without seeding demo content.
- Duplicate bootstrap email attempts fail without modifying content tables.

## Phase 2 Stage 04 Part 02 Slice 2

- `pnpm portability:import --format=json --input <path> --actor-email <email>` validates and applies a JSON portability package into draft-safe database state.
- `--dry-run` validates the full package and returns a structured report without any database writes. The report shape is identical to the live-run report.
- `--conflict=create-revision` allows importing changed records by creating a new draft revision when content differs. The default `--conflict=fail` rejects any changed match.
- `--report=<path>` writes the import report JSON to a file in addition to stdout.
- Imports require an existing `AUTHOR_ADMIN` actor. Non-admin or unknown actor emails fail with `ACTOR_FORBIDDEN` or `ACTOR_NOT_FOUND`.
- Apply order inside a single transaction: entities → manuscripts → relationships → releases.
- Imported releases are always created as `DRAFT` regardless of the original source status.
- Validation errors abort all writes; partial writes are not allowed.
- The API process must be stopped before running `portability:import` and restarted afterward so the in-memory search index rebuilds from the new data.

## Phase 2 Stage 04 Part 02 Slice 3

- `pnpm portability:export --scope current --format markdown --output <path>` writes Markdown entity/manuscript files, JSON relationship files, JSON release files, and a JSON package manifest.
- `pnpm portability:export --scope release --format markdown --release-slug <slug> --output <path>` exports release-bound Markdown content and JSON structural files.
- `pnpm portability:import --format=markdown --input <path> --actor-email <email>` imports Markdown front matter + body for entities/manuscripts while still reading relationship and release JSON files.
- Markdown import rejects malformed front matter and unsupported metadata fields with file-specific `PAYLOAD_INVALID` errors.
- `pnpm db:backup --output <path>` is a thin wrapper around `pg_dump` and requires an explicit output path.
- `pnpm db:restore --input <path>` is a thin wrapper around `pg_restore` (or `psql` for `.sql`) and requires an explicit input path.
- `pnpm db:restore` and `pnpm portability:import` are offline operations: stop the API before running them.
- After import or restore, restart the API so startup rebuilds the in-memory search index from restored/imported database state.
- Backup and restore are the authoritative disaster-recovery path; portability packages are for content mobility between environments.

## Phase 5 Stage 03 Part 01

- `pnpm portability:export --package-format=zip --scope <current|release> --format <json|markdown> --output <path>.zip` writes a deterministic zip package with `package-manifest.json` and `payload/**` content.
- `pnpm portability:import --package-format=zip --input <path>.zip --actor-email <email> [--format <json|markdown>]` validates and imports zip payloads; when `--format` is omitted the package manifest format is used.
- zip import rejects malformed archives and unsafe paths with actionable codes (`ARCHIVE_INVALID`, `PATH_UNSAFE`, `PACKAGE_LAYOUT_INVALID`, `MANIFEST_INVALID`, `ARCHIVE_TOO_LARGE`, `PAYLOAD_INVALID`).

## Phase 5 Stage 03 Part 02

- `pnpm portability:import` now emits deterministic `conflicts[]` summaries grouped by conflict class, policy, and outcome for both directory and zip package imports.
- Import reports now include a stable execution envelope across dry-run and apply modes: `execution.mode`, `execution.status`, and `execution.rollback.status` (`not-applicable`, `not-required`, `confirmed`).
- Apply failures now return `APPLY_ROLLED_BACK` with `execution.rollback.status="confirmed"` and preserve transactional guarantees (no partial writes).
- Report payloads include per-record `decisions[]` and planned `changes[]` so operators can audit attempted actions and failure causes without direct database inspection.
- Conflict taxonomy reported by import includes `IDENTITY_MISMATCH`, `DUPLICATE_SLUG`, `RELEASE_SLUG_COLLISION`, `UNRESOLVED_RELATIONSHIP_REFERENCE`, and `SCHEMA_VERSION_INCOMPATIBLE` (with non-mapped failures grouped as `OTHER`).

## Phase 5 Stage 03 Part 03

- Stage 03 closeout is gated by executing the documented verification sequence in `docs/build-plans/phase-5/stage-03-portability-maturity-and-operator-workflows/part-03-portability-operations-verification-gate/part-03-portability-operations-verification-gate.md`.
- Required gate suites include the Phase 5 Stage 03 Part 01 and Part 02 tests plus portability regressions from Phase 2 (`phase2PortabilityExportBaseline`, `phase2PortabilityImportJsonBaseline`, `phase2PortabilityImportMarkdownBaseline`) and Phase 4 (`phase4AuditRetentionPortabilityExtensionsPart02`).
- Lint and type-check must pass as part of the gate (`pnpm lint`, `pnpm type-check`).
- Stage 03 should only be marked complete when gate evidence records pass/fail outcomes for every required command.
