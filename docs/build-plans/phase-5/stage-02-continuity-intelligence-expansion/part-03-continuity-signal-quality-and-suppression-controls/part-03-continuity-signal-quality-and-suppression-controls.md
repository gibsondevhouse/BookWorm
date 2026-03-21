# Part 03: Continuity Signal Quality and Suppression Controls

## Objective

Reduce continuity noise and false-positive pressure by introducing explicit suppression controls and signal-quality guardrails that keep issue triage actionable at editorial scale.

## Scope

This part covers suppression/state controls, rule-level signal-quality protections, and verification of bounded false-positive behavior. It does not introduce unrelated governance features or non-continuity moderation systems.

## Baseline Behavior vs. Planned Change

**Current Phase 2 Implementation (Baseline):**

- The `DISMISSED` status enum exists and transitions are supported (OPEN ↔ DISMISSED).
- When a continuity run re-detects an issue (matching fingerprint), the current code **automatically reopens it to `OPEN` status regardless of its previous state**, including DISMISSED issues.
- This means a user cannot permanently suppress a continuity issue via DISMISSED: the next run will reopen it, causing repeated noise in the triage workflow.

**Part 03 Planned Change:**

- Implement deterministic suppression persistence: when an issue is in DISMISSED status, rerunning continuity detection will honor that suppression and NOT auto-reopen the issue.
- Add signal-quality guardrails to prevent noisy re-emission of known-dismissed low-value patterns (rule-specific thresholds).
- Ensure activation-blocking safety is not bypassed: unsuppressed BLOCKING issues continue to prevent release activation even if other BLOCKING issues are suppressed.

## Suppression Model: DISMISSED Status [Implemented]

**Suppression Mechanism:** BookWorm continuity issues already support a `DISMISSED` status (Phase 2 baseline). This part operationalizes `DISMISSED` as the explicit suppression mechanism for Part 03 signal-quality work.

**Suppression Scope Definition [Implemented]:**

- **Scope Type:** Per-issue (individual issue state, not rule-level or release-level suppression)
- **Scope Applicability:** Any continuity issue may be dismissed when its current lifecycle state allows a transition to `DISMISSED` (for example, `OPEN` and `ACKNOWLEDGED`), regardless of severity or rule code
- **Scope Lifetime:** Indefinite until manually reopened to `OPEN`; `DISMISSED` does **not auto-revert or reset across continuity reruns**

**Suppression Semantics [Implemented Behavior]:**

- Transitioning an issue to `DISMISSED` removes it from activation-blocking calculations (e.g., does not prevent release activation even if `DISMISSED` issue would otherwise be `BLOCKING`)
- When a release continuity run detects the same issue again (matched by fingerprint):
  - **If existing issue is `DISMISSED`:** the run will **NOT auto-reopen it**; `DISMISSED` status persists across the rerun
  - **If existing issue is `OPEN`, `ACKNOWLEDGED`, or `RESOLVED`:** the run re-detects it on the same fingerprint and sets status to `OPEN` (existing record is updated, not duplicated)
- Operators can reopen any `DISMISSED` issue by transitioning it back to `OPEN` at any time via the existing status transition endpoint

**Implementation Detail:** The baseline `persistRun` repository logic (Phase 2) auto-reopened all re-detected issues to `OPEN` regardless of prior status. Part 03 now changes this logic to check current status and skip re-opening when status is `DISMISSED`.

**Implementation Sequencing:** Part 02 and Part 03 can be developed in parallel. However, Part 02 final acceptance depends on Part 03's `persistRun` fix being merged (see Part 02 Enabling Dependency above). Part 02 stabilizes the status-transition API and triage query contract (`OPEN ↔ DISMISSED` semantics already supported in Phase 2); Part 03 fixes the auto-reopen behavior (core behavioral change) and adds signal-quality validation.

## Work Completed

- updated baseline `persistRun` logic to honor `DISMISSED` status: when an issue is re-detected (same fingerprint), existing `DISMISSED` status is preserved instead of auto-reopening to `OPEN`
- operationalized `DISMISSED` suppression status for editorial signal filtering with explicit scope/lifetime documentation
- added rule-quality guardrails to prevent noisy re-emission of known-dismissed low-value warning patterns
- preserved activation safety semantics so unsuppressed blocking issues continue to block release activation
- published deterministic tests for suppression transitions, rerun behavior with suppressed/unsuppressed mix, and activation-blocking invariants

## Deliverables

- suppression controls contract for continuity issues with explicit lifecycle transitions and scope documentation; fixes to `persistRun` logic to honor DISMISSED status across reruns (not auto-reopening)
- service/repository behavior for suppression-aware continuity run outcomes: detection → upsert logic respecting DISMISSED status as suppression scope
- rule-quality guardrails and signal-quality metrics to bound false-positive repeat pressure and noise
- integration tests validating suppression correctness (DISMISSED persists, is not reopened), signal-quality improvements (noise reduction), and no-regression activation safeguards (unsuppressed blocking issues still block)

## Dependencies

- Part 01 complete (expanded rule inventory provides broader signal volume for suppression testing)
- Part 03 implementation merged; Part 02 final acceptance dependency on suppression persistence is now satisfied (see Part 02 Enabling Dependency section below)
- existing release activation continuity blocker semantics remain the safety baseline
- Phase 2 baseline status transition contract (`DISMISSED ↔ OPEN` already supported)

### Part 02 Enabling Dependency: Suppression as Prerequisite for Determinism

**Reverse Dependency Statement:** Part 03 changes to `persistRun` logic (skipping auto-reopen when issue status is `DISMISSED`) are a prerequisite for Part 02 determinism guarantees. Part 02 AC-01 and AC-05 specify that repeated queries with identical parameters must produce identical results across continuity reruns. Without Part 03's suppression persistence fix in place, reruns will randomly reopen `DISMISSED` issues, causing non-deterministic aggregation counts and sort instability. **Therefore, Part 03 implementation must be complete and merged before Part 02 can achieve acceptance.**

## Acceptance Criteria [Implementation Status]

- AC-01: Completed [x] suppression controls are explicit and deterministic: an issue in `DISMISSED` status persists across continuity reruns, can be manually reopened to `OPEN`, and does not block release activation
- AC-02: Completed [x] continuity reruns honor suppression for matching fingerprints in `DISMISSED` state while unsuppressed blocking issues are still detected and persisted
- AC-03: Completed [x] activation guardrails continue blocking releases when unsuppressed blocking continuity issues exist, including mixed suppressed/unsuppressed blocking sets
- AC-04: Completed [x] signal-quality controls reduce repeat low-value warning noise after dismissal while newly introduced BLOCKING issues remain detectable and unsuppressed
- AC-05: Completed [x] Phase 2 continuity contracts remain compatible while run semantics now preserve `DISMISSED` status instead of auto-reopening

## Validation Evidence

- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 /Users/gibdevlite/Documents/BookWorm/tests/phase5ContinuitySignalQualitySuppressionPart03.test.ts` (reported pass during execution; verifies suppression persistence, deterministic reruns, mixed suppressed/unsuppressed blocking activation safeguards, and low-value warning suppression)
- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 /Users/gibdevlite/Documents/BookWorm/tests/phase2ContinuityIssueBaseline.test.ts` (reported pass during execution; baseline continuity regression)
- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 /Users/gibdevlite/Documents/BookWorm/tests/phase5ContinuityRulePackExpansionPart01.test.ts` (reported pass during execution; Stage 02 Part 01 regression)
- `pnpm lint` (reported pass during execution)
- `pnpm type-check` (reported pass during execution)

## Status Markers

User Approved: True
Status: Complete [x]
