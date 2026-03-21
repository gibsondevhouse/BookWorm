# Part 03: Phase 1 Verification Gate

## Objective

Validate that the broader Phase 1 implementation still preserves the architectural rules established in Phase 0 while expanding the supported content set.

## Work To Be Done

- verify local stack startup from documented commands
- verify expanded draft authoring behavior for the Phase 1 content model
- verify relationship revisions and dependency-aware release validation
- verify activation guardrails for incomplete releases
- verify broader public read and discovery behavior remain release-bound
- record any architecture-level failures discovered during Phase 1 implementation

## Deliverables

- Phase 1 verification checklist
- recorded pass or fail status for the broader architectural assertions

## Dependencies

- all prior Phase 1 parts complete

## Completion Check

- the Phase 1 exit criteria are demonstrably satisfied
- the project is ready to move into the next implementation phase without unresolved production-baseline ambiguity

## Verification Checklist

- seed the deterministic baseline before verification begins
- confirm API health and database reachability through `/health`
- confirm active-release public character, faction, relationship, and discovery responses from the seeded baseline
- confirm `RELEASE_EMPTY` blocks activation of an empty draft release
- confirm relationship-only release composition surfaces dependency failures through validation and review
- confirm required entity inclusion clears validation failures
- confirm public faction, public relationship, and discovery outputs remain unchanged before activation
- confirm activation publishes the updated faction and relationship revisions and changes discovery output only after activation
- confirm post-activation release mutation is blocked with `RELEASE_NOT_DRAFT`

## Recorded Baseline

- `pnpm phase1:verify` is the scripted verification entry point for the broader Phase 1 slice
- the verification gate reuses the seeded Phase 0 character, faction, and relationship baseline rather than creating a second fixture universe
- remaining local-runtime failures should be recorded separately if the API startup command or verification command cannot reach a running server
