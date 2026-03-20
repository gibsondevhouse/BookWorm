# Part 02: Audit Retention and Portability Extensions

## Objective

Extend existing portability and retention capabilities so Phase 4 governance artifacts are preserved, exportable, and restorable.

## Work To Be Done

- define retention expectations for review requests, approval steps, and notification events
- extend export/import schemas to include new Phase 4 collaboration artifacts
- verify backup/restore scripts preserve referential integrity for added tables
- document operator expectations for retention windows and archival behavior
- add compatibility checks for import of payloads without Phase 4 artifacts

## Deliverables

- portability schema updates for Phase 4 governance records
- backup/restore validation results for new relationships
- retention and archival operational guidance updates

## Dependencies

- Part 01 performance hardening complete
- Phase 2 portability baseline available for extension
- data-model contracts from Stages 01 to 03 finalized

## Completion Check

- export output includes complete Phase 4 governance artifacts
- import/restore paths preserve relationship integrity and attribution metadata
- retention behavior is explicit and test-verified for supported scenarios
- backward compatibility behavior is documented and validated

## Status

User Approved: True
Status: **COMPLETE** [x]

## Implementation Evidence

**Validated:** portability export/import now covers Phase 4 governance records with backward-compatible import behavior and verified referential-retention semantics under tested import/delete paths.

Scope note: this slice validates portability export/import behavior and relational retention outcomes via integration tests; it does not claim separate execution of standalone backup/restore scripts.

### Portability Coverage
- Updated export snapshots and serializers to include governance artifacts:
	- review requests
	- approval chains
	- approval steps
	- approval step events
	- notification events
	- notification preferences
- Added manifest governance counts to make retention/export coverage explicit at package level.

### Import Compatibility and Integrity
- Extended JSON/Markdown portability parsers to load optional governance payloads.
- Extended import planning and repository apply path to create governance records with dependency checks and attribution-aware references.
- Maintained compatibility for payloads that omit governance blocks (import succeeds with governance no-ops).

### Retention / Referential Semantics
- Added regression coverage proving cascade/set-null behavior across Phase 4 governance tables under supported deletion paths.
- Verified imported governance attribution fields and relationship integrity are preserved when dependencies exist.

### Test Evidence
- Added `tests/phase4AuditRetentionPortabilityExtensionsPart02.test.ts` covering:
	- governance artifact export presence/counts
	- backward-compatible import without governance artifacts
	- governance import referential/attribution integrity plus retention semantics
