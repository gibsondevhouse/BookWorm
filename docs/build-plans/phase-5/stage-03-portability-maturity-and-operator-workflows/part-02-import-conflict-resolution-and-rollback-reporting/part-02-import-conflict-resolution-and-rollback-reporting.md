# Part 02: Import Conflict Resolution and Rollback Reporting

## Objective

Define deterministic import conflict outcomes and transaction rollback reporting so operators can predict, audit, and trust portability execution results.

## Scope

In scope for this part:

- explicit conflict taxonomy for portability import (identity mismatch, duplicate slug, release slug collision, unresolved relationship references, schema-version incompatibility)
- deterministic resolution outcomes aligned with supported import conflict policies
- rollback reporting contract for failed apply operations and partial-plan visibility
- operator-facing reporting semantics for dry-run versus apply mode

Out of scope for this part:

- introducing non-transactional partial apply behavior
- queueing or resumable background import jobs
- UI dashboard implementation for import run history

## Work To Be Done

- define conflict matrix mapping each conflict class to allowed policy outcomes
- define import report schema for conflict summaries, rollback status, and per-record decision traces
- specify rollback guarantees for failure paths in apply mode
- define compatibility behavior for packages lacking new Stage 03 report metadata

## Deliverables

- conflict-resolution matrix documentation for import operations
- rollback-reporting schema and operator output contract
- implemented integration test matrix for conflict policy determinism and rollback verification

## Implemented Conflict and Rollback Contract

Implemented report contract additions:

- stable execution envelope shared by dry-run and apply (`execution.mode`, `execution.status`, `execution.rollback.status`, `execution.rollback.transactionality`)
- deterministic conflict summaries (`conflicts[]`) grouped by conflict class, policy, and outcome
- per-record decision trace (`decisions[]`) with policy, outcome, file/record key, and reason details
- failure-path partial-plan visibility via `changes[]` even when apply fails before completion

Implemented conflict taxonomy mapping:

- identity mismatch (`IDENTITY_AMBIGUOUS` -> `IDENTITY_MISMATCH`)
- duplicate slug/content conflict (`PAYLOAD_INVALID` content conflict -> `DUPLICATE_SLUG`)
- release slug collision (`RELEASE_CONFLICT` -> `RELEASE_SLUG_COLLISION`)
- unresolved relationship references (`DEPENDENCY_MISSING` relationship paths -> `UNRESOLVED_RELATIONSHIP_REFERENCE`)
- schema-version incompatibility (`MANIFEST_INVALID` schemaVersion failures -> `SCHEMA_VERSION_INCOMPATIBLE`)

Rollback and failure reporting guarantees:

- apply mode retains transactional safety and now reports explicit rollback confirmation on apply failure (`APPLY_ROLLED_BACK` with `execution.rollback.status = "confirmed"`)
- no non-transactional partial apply behavior introduced
- dry-run and apply return the same top-level report structure with mode-specific execution semantics

Compatibility behavior:

- Stage 03 report fields are additive; legacy JSON/Markdown packages import with the same parser and baseline behavior
- existing Phase 2 and Phase 4 portability baselines remain compatible with the updated report envelope

## Dependencies

- Stage 03 Part 01 zip package foundation complete
- Phase 2 import portability baseline behavior and existing `--conflict` policy contract
- Phase 4 portability extension baseline remains compatible

## Acceptance Criteria

- AC-01: each supported conflict class has exactly one deterministic outcome per configured conflict policy
- AC-02: failed apply operations produce rollback-confirmed reports without leaving partial data mutations
- AC-03: dry-run reports and apply reports share stable structure with clear status semantics
- AC-04: operator report output includes enough detail to identify failed records and conflict reasons without database inspection
- AC-05: baseline import compatibility remains intact for JSON/Markdown packages without Stage 03-specific metadata

## Validation Commands

- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 /Users/gibdevlite/Documents/BookWorm/tests/phase5PortabilityConflictResolutionRollbackPart02.test.ts`
- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 /Users/gibdevlite/Documents/BookWorm/tests/phase2PortabilityImportJsonBaseline.test.ts`
- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 /Users/gibdevlite/Documents/BookWorm/tests/phase2PortabilityImportMarkdownBaseline.test.ts`
- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 /Users/gibdevlite/Documents/BookWorm/tests/phase4AuditRetentionPortabilityExtensionsPart02.test.ts`
- `pnpm lint`
- `pnpm type-check`

## Status

User Approved: True
Status: Complete [x]
Implementation Date: 2026-03-20

### Implementation Summary

- extended `portabilityImportService` report contract with deterministic conflict summaries, per-record decisions, and rollback status reporting
- added apply-failure rollback reporting path with transaction rollback confirmation semantics
- added Phase 5 Stage 03 Part 02 acceptance suite at `tests/phase5PortabilityConflictResolutionRollbackPart02.test.ts`
- validated compatibility by running required Phase 2/4 portability regressions plus lint and type-check
