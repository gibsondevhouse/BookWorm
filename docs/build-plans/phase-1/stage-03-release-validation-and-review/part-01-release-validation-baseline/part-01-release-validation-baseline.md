# Part 01: Release Validation Baseline

## Objective

Create the first explicit release validation path so dependency completeness is verified before a release becomes active.

## Work To Be Done

- add validation logic that inspects release entries and their required dependencies
- define pass and fail response behavior for release readiness checks
- ensure validation considers relationship revisions where required
- capture the minimum reporting shape needed by later review surfaces
- add verification coverage for incomplete release scenarios

## Deliverables

- release readiness validation path
- pass and fail response shape for validation
- coverage for missing-dependency cases

## Dependencies

- Stage 01 Part 03 complete
- Stage 02 broad enough to create representative release content

## Completion Check

- a release can be evaluated for readiness before activation
- validation failures identify at least the missing dependency category or record

## Baseline Response Shape

- validation is exposed through `GET /admin/releases/:slug/validation`
- pass responses include `releaseSlug`, `isReady`, and a `summary` with dependency check counts
- fail responses keep the same top-level shape and add `failures` entries with `MISSING_DEPENDENCY` plus the owning revision and dependency keys
- validation remains pre-activation only; activation continues to enforce the same dependency baseline independently

## Covered Behavior

- validation reuses the dependency-resolution baseline rather than duplicating resolution rules
- relationship-linked entity requirements remain part of readiness evaluation
- incomplete releases can be inspected for blocking failures without attempting activation
