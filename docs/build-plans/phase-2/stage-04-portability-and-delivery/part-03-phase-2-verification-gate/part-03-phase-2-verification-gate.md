# Part 03: Phase 2 Verification Gate

## Objective

Validate that the broader MVP-shaped Phase 2 implementation still preserves Book Worm’s release safety, visibility safety, and architectural separation rules.

## Work To Be Done

- verify local stack startup from documented commands
- verify representative admin CRUD behavior for the supported MVP content model
- verify public codex, timeline, archive, and reader behavior remain release-bound
- verify search results remain aligned with release, visibility, and spoiler rules
- verify continuity issues are recorded and blocking failures affect publication readiness
- verify import/export and self-host documentation are sufficient to reproduce the implemented slice
- record any architecture-level failures discovered during Phase 2 implementation

## Deliverables

- Phase 2 verification checklist
- recorded pass or fail status for the MVP-critical architectural assertions

## Dependencies

- all prior Phase 2 parts complete

## Completion Check

- the Phase 2 exit criteria are demonstrably satisfied
- the project is ready to move into later-phase hardening without unresolved MVP-scope ambiguity

## Verification Checklist

- seed or load the deterministic baseline required by the implemented MVP slice
- confirm API health and public web reachability from documented startup commands
- confirm representative admin CRUD behavior for the supported content types
- confirm public codex, timeline, archive, and reader output changes only through release selection or activation
- confirm search results never expose hidden or unreleased content for public users
- confirm blocking continuity issues prevent release publication while reviewable issues remain visible
- confirm export output can be produced for the implemented scope and import failure behavior is explicit
- confirm another local operator can reproduce the implemented slice from repository documentation

## Recorded Baseline

- the Phase 2 verification entry point should become the scripted MVP-slice gate once implementation is underway
- verification should continue to reuse deterministic fixtures rather than introducing multiple incompatible content universes unless Phase 2 explicitly requires it
- runtime or deployment failures discovered during verification should be recorded separately from product-behavior failures so MVP readiness remains diagnosable
