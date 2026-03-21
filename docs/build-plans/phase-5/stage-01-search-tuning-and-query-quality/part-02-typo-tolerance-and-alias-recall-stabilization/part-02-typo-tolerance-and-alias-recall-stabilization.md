# Part 02: Typo Tolerance and Alias Recall Stabilization

## Objective

Introduce bounded typo-tolerance behavior and stabilize alias-driven recall so near-match queries improve retrieval quality without degrading deterministic ranking or policy-filter guarantees established in Part 01.

## Why This Slice Is Next

- Part 01 established deterministic query expansion and ranking precedence needed before adding fuzzier matching
- typo-tolerance must be layered after expansion so edit-distance behavior can be constrained against normalized terms
- this slice isolates recall-quality risk to search tuning while deferring full Stage 01 closure checks to Part 03

## Work To Be Done

- define typo-tolerance matching contract with explicit bounds (max edit distance and token-length safeguards)
- define alias-recall stabilization rules so canonical aliases are consistently retrievable under minor misspellings
- codify deterministic fallback ordering for typo matches versus exact and expansion matches from Part 01
- add guardrails preventing typo tolerance from widening results beyond existing release/visibility/spoiler eligibility rules
- publish fixture-backed acceptance scenarios covering typo recall gains and false-positive suppression

## Deliverables

- service-level typo-tolerance contract with explicit thresholds and deterministic matching behavior
- alias-recall stabilization rules documenting canonical alias matching and tie-break precedence
- integration tests for typo recall, alias stabilization, deterministic ordering, and policy-filter invariants

## Dependencies

- Part 01 complete and serving as ranking/expansion baseline
- Phase 2 search baseline contracts remain unchanged for compatibility
- deterministic fixture data available for typo and alias recall assertions

## Acceptance Criteria

- AC-01: bounded typo tolerance is applied only after query normalization/expansion and respects configured edit-distance/token guards
- AC-02: canonical alias queries with single-edit misspellings return the expected target records under the same policy eligibility as exact alias queries
- AC-03: typo-matched results rank below exact matches and below deterministic expansion matches when they target equivalent eligible content
- AC-04: typo tolerance does not introduce release-ineligible, visibility-ineligible, or spoiler-blocked records into results
- AC-05: repeated runs with identical fixtures produce stable ordering for typo and alias recall scenarios
- AC-06: existing Phase 2 search contracts remain intact, verified by bounded local compatibility assertions in Part 02 (active-release resolution, entity/manuscript document contracts, and policy filters) plus the Phase 2 search baseline suite

## Validation Commands

- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 /Users/gibdevlite/Documents/BookWorm/tests/phase5SearchTypoToleranceAliasRecallPart02.test.ts`
- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 /Users/gibdevlite/Documents/BookWorm/tests/phase2SearchApiSlice.test.ts`
- `pnpm lint`
- `pnpm type-check`

## Verification Evidence

- AC-06 local compatibility evidence hardened and validated (2026-03-20): `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 /Users/gibdevlite/Documents/BookWorm/tests/phase5SearchTypoToleranceAliasRecallPart02.test.ts` completed with AC-06 passing coverage for default active-release resolution, entity contract compatibility (`documentType`, `detailPath`, `spoilerTier`), and manuscript contract compatibility (`documentType`, `detailPath`).
- AC-06 regression guardrail validated (2026-03-20): `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 /Users/gibdevlite/Documents/BookWorm/tests/phase2SearchApiSlice.test.ts` completed with the Phase 2 search baseline suite passing and no contract regressions after Part 02 changes.

## Implementation Notes

- keep typo-tolerance thresholds and alias-stabilization rules explicit and version-controlled for reproducible CI behavior
- avoid introducing probabilistic ranking signals in this slice; deterministic tie-breakers are required
- keep scope bounded to search-service and query evaluation behavior; Stage 01 final verification remains in Part 03

## Status

User Approved: True
Status: Complete [x]
