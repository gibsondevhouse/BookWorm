# Continuity Engine Specification

The continuity engine validates narrative consistency across entities, manuscripts, relationships, and releases. It runs deterministic rules and persists issues by stable fingerprint.

## Current Implemented Rule Pack (Phase 2 Baseline + Phase 5 Stage 02 Part 01)

1. `REQ_META_CHRONOLOGY_ANCHOR` (BLOCKING)
2. `DATE_ORDER_SORT_KEY_REGRESSION` (BLOCKING)
3. `REQ_META_SPOILER_TIER_PUBLIC` (BLOCKING)
4. `REVEAL_TIMING_DEPENDENCY_PRESENT` (BLOCKING)
5. `DUPLICATE_ENTITY_SLUG_IN_RELEASE` (BLOCKING)
6. `DUPLICATE_MANUSCRIPT_SLUG_IN_RELEASE` (BLOCKING)
7. `ENTITY_KNOWLEDGE_STATE_REGRESSION` (WARNING)
8. `MANUSCRIPT_CHAPTER_SEQUENCING_ANOMALY` (WARNING)
9. `RELATIONSHIP_REVEAL_CONSISTENCY_INCOMPLETE` (WARNING)

Summary response currently reports `ruleCount: 9`.

## Rule Execution

- Rules run against a release context through continuity run endpoints.
- Issues are persisted by deterministic fingerprint; reruns with unchanged state resolve to the same issue identities.
- Blocking behavior is based on issue severity and status:
  - `BLOCKING` + `OPEN` or `ACKNOWLEDGED` counts toward release activation blockers.
  - `WARNING` issues do not block activation.
- Current lifecycle statuses are `OPEN`, `ACKNOWLEDGED`, `RESOLVED`, and `DISMISSED`.
- Reruns preserve `DISMISSED` for matching fingerprints (issues are not auto-reopened), and low-value dismissed warning patterns are suppression-filtered from rerun emission noise.

## Continuity Dashboard

- Baseline supports run execution, issue listing, and status transitions for continuity issues.
- Stage 02 Part 03 suppression determinism is implemented.
- Stage 02 Part 02 triage/aggregation API enhancements remain planned.

## Future Extensions (Planned, Not Yet Implemented)

- Additional domain rules (for example genealogical consistency or allegiance conflict checks).
- Configuration-driven rule parameters where appropriate, without breaking deterministic baseline behavior.
