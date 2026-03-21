# Part 01: Continuity Rule Pack Expansion

## Objective

Expand continuity detection beyond the Phase 2 baseline by adding the next deterministic rule pack, while preserving existing issue lifecycle behavior, release activation guardrails, and policy compatibility.

## Scope

This part covers only rule-pack expansion and deterministic rule execution behavior. It does not include dashboard UX surfaces or suppression workflow controls beyond what is needed to persist new rule outputs.

## Work To Be Done

- define and document the Stage 02 Part 01 rule inventory with deterministic fingerprints and severity mapping (see inventory table below)
- extend continuity rule evaluation to run new rules against release composition and revision metadata
- preserve existing issue upsert/reopen/auto-resolve behavior for all baseline and newly introduced rules
- ensure activation blocking semantics remain unchanged (`BLOCKING` + open/acknowledged issues block activation)
- add fixture-backed tests for positive detections, no-regression cases, deterministic re-run behavior, and warning-rule non-blocking behavior

## Deliverables

- expanded continuity rule pack specification aligned with existing issue model contract
- service-level rule execution updates with deterministic fingerprints for each new rule
- regression-safe integration tests proving new detections, baseline continuity compatibility, and unchanged activation-blocking guardrails

## Dependencies

- Stage 02 overview approved
- Phase 2 continuity baseline contracts in place (`/admin/releases/:slug/continuity/runs`, issue listing, issue status transitions)
- Stage 01 search tuning complete where continuity rule discovery depends on search-backed lookup behavior

## Acceptance Criteria

- AC-01: new rule-pack detections are produced deterministically for identical release fixture state
- AC-02: each new rule emits stable `ruleCode`, `severity`, `subjectType`, `subjectId`, and fingerprint-compatible issue payloads matching the specification above
- AC-03: baseline issue lifecycle behavior remains intact when new rules are added; no regression in Phase 2 continuity issue handling
- AC-04: release activation blocking semantics remain unchanged and are verified: existing `BLOCKING` issues continue to block when open or acknowledged, while new Part 01 `WARNING` rules do not block activation
- AC-05: existing Phase 2 continuity baseline tests remain passing after Part 01 implementation changes

## Part 01 Rule Inventory

| Rule Code                                    | Severity | Subject Type                          | Detection Trigger                                                                                                        | Notes                                                                                        |
| -------------------------------------------- | -------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `REQ_META_CHRONOLOGY_ANCHOR`                 | BLOCKING | Entity Revision                       | Missing timeline anchor on release entry                                                                                 | Baseline; Phase 2 implementation                                                             |
| `DATE_ORDER_SORT_KEY_REGRESSION`             | BLOCKING | Entity Revision                       | Timeline sort-order violation across entries                                                                             | Baseline; Phase 2 implementation                                                             |
| `REQ_META_SPOILER_TIER_PUBLIC`               | BLOCKING | Entity Revision / Manuscript Revision | Public release contains untiered entity                                                                                  | Baseline; Phase 2 implementation                                                             |
| `REVEAL_TIMING_DEPENDENCY_PRESENT`           | BLOCKING | Entity Revision                       | Reveal dependency precedes unlock                                                                                        | Baseline; Phase 2 implementation                                                             |
| `DUPLICATE_ENTITY_SLUG_IN_RELEASE`           | BLOCKING | Release                               | Release contains duplicate entity slugs                                                                                  | Baseline; Phase 2 implementation                                                             |
| `DUPLICATE_MANUSCRIPT_SLUG_IN_RELEASE`       | BLOCKING | Release                               | Release contains duplicate manuscript slugs                                                                              | Baseline; Phase 2 implementation                                                             |
| `ENTITY_KNOWLEDGE_STATE_REGRESSION`          | WARNING  | Entity Revision                       | Entity appears in release with lower knowledge-state tier than same entity in prior release                              | Stage 02 expansion; detects unintended knowledge degradation across release boundaries       |
| `MANUSCRIPT_CHAPTER_SEQUENCING_ANOMALY`      | WARNING  | Manuscript Revision                   | Manuscript chapters exhibit non-contiguous sequence numbers or missing chapter identifiers in release composition        | Stage 02 expansion; catches chapter indexing inconsistencies that may cause reader confusion |
| `RELATIONSHIP_REVEAL_CONSISTENCY_INCOMPLETE` | WARNING  | Relationship Revision                 | Relationship marked as unrevealed/restricted but appears to be exposed via unrestricted related entities in same release | Stage 02 expansion; detects information leakage through relationship tier misconfigurations  |

**Inventory Scope:**

- **Baseline rules (rows 1-6):** Already implemented in Phase 2 and retained unchanged during Part 01. Part 01 does not modify baseline rule logic, fingerprinting, or severity. These are prerequisites, not Stage 02 deliverables.
- **Expansion rules (rows 7-9):** Stage 02 Part 01 implemented deliverables. Rules and fingerprint generation logic are implemented and verified with deterministic behavior.
  - `ENTITY_KNOWLEDGE_STATE_REGRESSION`: Compares entity spoiler tier in current release against maximum tier seen in prior release history. Detects unintended knowledge degradation.
  - `MANUSCRIPT_CHAPTER_SEQUENCING_ANOMALY`: Validates chapter sequence continuity. Flags missing sequence numbers or non-contiguous ranges within a manuscript's release composition.
  - `RELATIONSHIP_REVEAL_CONSISTENCY_INCOMPLETE`: Cross-checks relationship reveal state against related entity visibility. Flags disclosed relationships tied to restricted entities or vice versa.
- **Acceptance gates:** Detection accuracy, baseline compatibility, and deterministic fingerprinting are verified by the Part 01 suite and baseline regression suite.

**Fingerprint Composition Details for Expansion Rules:**

- `ENTITY_KNOWLEDGE_STATE_REGRESSION`: fingerprint = `(ruleCode, entityRevisionId, currentTier, priorMaxTier)` — ensures one issue per entity-tier state pair; stable across reruns for same release/prior-release comparison
- `MANUSCRIPT_CHAPTER_SEQUENCING_ANOMALY`: fingerprint = `(ruleCode, manuscriptRevisionId, anomalyType, position)` where anomalyType is "MISSING" or "DUPLICATE" — ensures one issue per specific sequence anomaly; stable for same manuscript structure
- `RELATIONSHIP_REVEAL_CONSISTENCY_INCOMPLETE`: fingerprint = `(ruleCode, relationshipId, violatingEntityId, relationshipTier, entityTier)` — one issue per relationship-entity tier mismatch; stable for same relationship/entity metadata state

## Validation Commands

- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 /Users/gibdevlite/Documents/BookWorm/tests/phase5ContinuityRulePackExpansionPart01.test.ts` (verifies expansion-rule detection, deterministic reruns, and warning/non-blocking behavior)
- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 /Users/gibdevlite/Documents/BookWorm/tests/phase2ContinuityIssueBaseline.test.ts` (ensures baseline regression protection)
- `pnpm lint`
- `pnpm type-check`

## Status Markers

User Approved: True
Status: Complete [✓]
Implementation Date: 2026-03-20

### Implementation Summary

- All 3 expansion rules implemented with deterministic fingerprints
- Rule execution verified with comprehensive test coverage
- All acceptance criteria satisfied (AC-01 through AC-05)
- Phase 2 baseline compatibility maintained (zero regression)
- Type-check and lint validation pass
