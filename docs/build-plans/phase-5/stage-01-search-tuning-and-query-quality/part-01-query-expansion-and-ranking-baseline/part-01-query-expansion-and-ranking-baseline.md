# Part 01: Query Expansion and Ranking Baseline

## Objective

Establish the first deterministic search-tuning slice by introducing controlled query expansion and ranking behavior that improves recall/ordering while keeping all existing policy and release constraints intact.

## Why This Slice Is First

- it builds directly on already-implemented Phase 2 search endpoints and contracts
- it is a prerequisite for typo-tolerance tuning because expansion and ranking signals must be stable first
- it has a narrow, testable boundary at service and query-contract level, making it the safest entry point for Phase 5 execution

## Work To Be Done

- define initial synonym and alias expansion contract for search input normalization
- define deterministic ranking precedence for exact, alias-expanded, and metadata matches
- implement regression guardrails so expansion cannot surface release-ineligible or visibility-ineligible records
- publish acceptance scenarios and expected ordering behaviors for fixture-backed tests

## Deliverables

- search query-expansion contract at service layer with explicit allowed expansion sources
- deterministic ranking-rules baseline and ordering tie-break policy
- integration tests for expansion recall, ranking order, and policy-filter invariants

## Dependencies

- Stage 01 overview approved
- existing search API baseline tests remain green before adding this slice
- release, visibility, and spoiler policy enforcement remains source-of-truth for result filtering

## Acceptance Criteria

- AC-01: search queries apply configured synonym/alias expansion in the service layer before adapter search evaluation
- AC-02: exact title matches rank above expanded alias/synonym matches for equivalent policy eligibility
- AC-03: expanded matches never include content blocked by release, visibility, or spoiler rules
- AC-04: result ordering is deterministic across repeated runs with identical fixture state
- AC-05: existing Phase 2 search baseline tests continue passing without contract regressions (validated via the Phase 2 search baseline test command)

## Validation Commands

- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 /Users/gibdevlite/Documents/BookWorm/tests/phase5SearchQueryExpansionRankingPart01.test.ts`
- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 /Users/gibdevlite/Documents/BookWorm/tests/phase2SearchApiSlice.test.ts`
- `pnpm lint`
- `pnpm type-check`

## Verification Evidence

- AC-05 regression guardrail: run `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 /Users/gibdevlite/Documents/BookWorm/tests/phase2SearchApiSlice.test.ts`; expected outcome is a passing Phase 2 search baseline suite with no contract regressions after Part 01 changes.

## Implementation Notes

- keep expansion dictionaries/configuration under version-controlled repository state so behavior is reproducible in CI and local runs
- avoid introducing backend infrastructure dependencies; this slice should run on the current search architecture
- keep ranking factors explicit and bounded to prevent hidden relevance drift across releases

## Status

User Approved: True
Status: Complete [x]
