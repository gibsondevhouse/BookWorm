# Part 01: Zip Package Portability Foundation

## Objective

Define the first Stage 03 portability slice by adding a deterministic zip package foundation that wraps the existing portability formats and can be executed safely in operator workflows.

## Scope

In scope for this part:

- zip package contract for portability payloads that preserves current manifest semantics
- import-side zip parsing and extraction safety rules (path traversal prevention, deterministic layout checks, bounded extraction expectations)
- export-side zip assembly rules that produce reproducible package structure and manifest metadata
- CLI contract updates for zip portability usage in current operator tooling

Out of scope for this part:

- web upload flows or async portability jobs
- conflict policy expansion beyond baseline import behavior
- rollback reporting format design beyond what is required for foundational zip import/export success/failure output

## Work To Be Done

- specify zip container structure around existing `json` and `markdown` portability layouts
- define service-layer orchestration for zip import/export flows while preserving repository boundaries
- define parser and validation behavior for malformed archives, unsupported schema versions, and missing manifests
- publish acceptance scenarios for deterministic zip round-trip and policy-safe import outcomes

## Deliverables

- Stage 03 zip package contract documented with file layout and manifest requirements
- planned CLI interface update for zip handling in portability commands
- test plan for zip export generation, zip import parsing, and baseline portability regressions

## Implemented Zip Contract

Zip package layout for Stage 03 Part 01:

- `package-manifest.json`
- `payload/manifests/export-manifest.json`
- `payload/**` (existing JSON/Markdown portability payload tree)

`package-manifest.json` contract:

- `schemaVersion: 1`
- `container: "bookworm-portability-zip"`
- `payload.format: "json" | "markdown"`
- `payload.scope: "current" | "release"`
- `payload.exportedAt` (ISO timestamp)
- `payload.rootPath: "payload"`
- `payload.manifestPath: "payload/manifests/export-manifest.json"`
- `payload.counts` mirrors export-manifest counts

Determinism and safety implemented:

- deterministic zip entry ordering (sorted paths)
- deterministic zip timestamps for reproducible byte output when exportedAt and payload are unchanged
- bounded extraction limits (entry count, per-file bytes, total extracted bytes)
- archive path traversal rejection (`..`, absolute paths, drive-prefix paths, NUL, backslashes)
- strict layout checks requiring `package-manifest.json` and payload manifest path
- actionable import error codes (`ARCHIVE_INVALID`, `PATH_UNSAFE`, `PACKAGE_LAYOUT_INVALID`, `MANIFEST_INVALID`, `ARCHIVE_TOO_LARGE`, `PAYLOAD_INVALID`)

CLI contract updates implemented:

- `pnpm portability:export --package-format=directory|zip --scope <current|release> --format <json|markdown> --output <path>`
- `pnpm portability:import --package-format=directory|zip --input <path> --actor-email <email> [--format <json|markdown>]`
- for `--package-format=zip`, `--format` is optional and defaults to package-manifest payload format
- zip export requires an output path ending in `.zip`

## Dependencies

- Phase 2 Stage 04 Part 02 import/export portability baseline
- Phase 4 Stage 04 Part 02 portability schema extensions for governance artifacts
- existing portability scripts and service boundaries remain the implementation substrate

## Acceptance Criteria

- AC-01: zip package structure is explicitly defined and deterministic for both export and import paths
- AC-02: zip import validation rejects malformed or unsafe archives with actionable operator errors
- AC-03: zip export output preserves manifest/version metadata and required package counts
- AC-04: import through zip path preserves existing portability invariants (draft-safe behavior, no implicit release activation)
- AC-05: existing JSON/Markdown portability baseline behavior remains compatible

## Validation Commands

- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 /Users/gibdevlite/Documents/BookWorm/tests/phase5PortabilityZipFoundationPart01.test.ts`
- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 /Users/gibdevlite/Documents/BookWorm/tests/phase2PortabilityExportBaseline.test.ts`
- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 /Users/gibdevlite/Documents/BookWorm/tests/phase2PortabilityImportJsonBaseline.test.ts`
- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 /Users/gibdevlite/Documents/BookWorm/tests/phase2PortabilityImportMarkdownBaseline.test.ts`
- `pnpm lint`
- `pnpm type-check`

## Status

User Approved: True
Status: Complete [x]
Implementation Date: 2026-03-20

### Implementation Summary

- zip package foundation implemented via `portabilityZipPackage` utility
- export service now supports deterministic zip package assembly (`prepareZipExport`)
- import service now supports safe zip parsing/extraction (`runZipImport`) and preserves existing apply semantics
- portability CLI supports `--package-format=zip` for both export and import flows
- acceptance suite added at `tests/phase5PortabilityZipFoundationPart01.test.ts`
