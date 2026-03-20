# Stage 02: Continuity Intelligence Expansion

## Purpose

Expand continuity coverage from baseline checks into a broader ruleset and triage workflow that remains actionable for editors.

## Work To Be Done

- add next-wave continuity rules aligned with existing configuration and release validation flow (documented rule inventory in Part 01)
- improve issue-surface ergonomics for prioritization, suppression, and editorial triage with deterministic API contract (Part 02 Triage API Specification)
- validate continuity signal quality to reduce avoidable false positives and noise through explicit DISMISSED-status suppression semantics (Part 03 Suppression Model)

## Deliverables

- expanded continuity rule pack and config evolution notes with new rule inventory
- continuity issue query/read enhancements for triage workflows with explicit filtering, sorting, and aggregation semantics
- deterministic tests for new rule detections, suppression/state transitions, and activation-blocking verification

## Dependencies

- current continuity rule baseline and issue model from Phase 2
- role and release policy semantics from prior phases
- Stage 01 search tuning complete where continuity surfacing depends on search-backed discovery affordances

## Exit Criteria

- expanded rules detect additional high-value narrative consistency issues with deterministic fingerprints
- triage surfaces support operational prioritization with explicit API contract (query params, aggregation, sorting, filtering)
- suppression (DISMISSED status) is operationalized with scope/lifetime clarity: per-issue, indefinite, manually resettable
- false-positive pressure is bounded through explicit suppression/state controls without bypassing activation-blocking safety
- implemented blocking-rule scenarios are verified to prevent release activation when unsuppressed; additional future Stage 02 blocking rules must add equivalent coverage when introduced

## Parts

1. [Part 01: Continuity Rule Pack Expansion](./part-01-continuity-rule-pack-expansion/part-01-continuity-rule-pack-expansion.md)
   - Rule inventory table defining baseline and Phase 5 expansion rules
   - Strengthened AC-04 for new-rule activation-blocking verification
2. [Part 02: Continuity Dashboard and Triage Surfaces](./part-02-continuity-dashboard-and-triage-surfaces/part-02-continuity-dashboard-and-triage-surfaces.md)
   - Full triage API specification: routes, query parameters, response aggregation, sorting/filtering semantics
3. [Part 03: Continuity Signal Quality and Suppression Controls](./part-03-continuity-signal-quality-and-suppression-controls/part-03-continuity-signal-quality-and-suppression-controls.md)
   - Suppression Model section: DISMISSED as suppression mechanism with explicit scope/lifetime
   - Per-issue scope, indefinite lifetime, manual reopening supported

## Progress Snapshot

- Stage 01 dependency is satisfied (query quality gate complete), and Stage 02 closeout is complete.
- **Phase 2 baseline capabilities are prerequisites, not Stage 02 deliverables:**
  - Continuity issue model, lifecycle, and Phase 2 rule baselines exist and remain unchanged by Stage 02
  - Status transition API (including `DISMISSED ↔ OPEN` support) exists in Phase 2
  - Basic continuity runs and issue listing exist in Phase 2
  - Release activation blocking enforcement based on `BLOCKING` + open/acknowledged issues exists in Phase 2
- **Part 01: COMPLETE [✓]** (2026-03-20) — All 3 expansion rules implemented with deterministic fingerprints and comprehensive tests
- **Part 02: COMPLETE [x]** (2026-03-20) — Deterministic triage list sorting/filtering/pagination, summary aggregation, and status-transition contract behavior validated with fixture-backed tests.
- **Part 03: COMPLETE [x]** (2026-03-20) — `persistRun` now preserves `DISMISSED` across reruns, low-value dismissed warning re-emission is suppressed, and activation safety with mixed suppressed/unsuppressed blockers is verified.

## Status

User Approved: True  
Status: Complete [x] — Parts 01, 02, and 03 complete

**Planning Gate Clearance:**
- All parts have explicit dependency trees and enabling conditions documented
- Acceptance criteria are clearly marked as target implementation outcomes
- Plan distinguishes Phase 2 baseline (prerequisites) from Stage 02 work (deliverables)
- Stage 02 implementation and validation evidence are complete; Stage 03 can proceed when approved
