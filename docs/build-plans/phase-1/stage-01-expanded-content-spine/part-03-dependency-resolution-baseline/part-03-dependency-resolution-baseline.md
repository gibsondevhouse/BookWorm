# Part 03: Dependency Resolution Baseline

## Objective

Create the dependency-resolution baseline needed so release validation can detect missing required content before activation.

## Work To Be Done

- define how revisions describe required dependencies
- implement repository or service queries that resolve dependency completeness
- define negative-case behavior for missing dependencies
- capture the minimum validation rules needed for Phase 1 release readiness
- ensure the dependency model stays compatible with later continuity expansion

## Deliverables

- dependency-resolution rules
- query path for required dependency checks
- documented failure behavior for incomplete release composition

## Dependencies

- Part 01 complete
- Part 02 complete enough to include relationship dependencies

## Completion Check

- the system can detect when a release is missing required linked revisions
- dependency checks can be invoked without activating the release

## Baseline Rules

- entity revisions describe explicit required dependencies in `payload.requiredDependencies`
- relationship revisions describe explicit required dependencies in `metadata.requiredDependencies`
- relationship revisions also implicitly depend on the source and target entities being included in the same release
- dependency descriptors support `ENTITY` references by `entitySlug` and `RELATIONSHIP` references by source slug, target slug, and relation type
- malformed dependency descriptors are treated as incomplete release composition and must fail readiness checks

## Failure Behavior

- release dependency status can be queried before activation through the admin release surface
- activation returns a conflict when any required dependency is missing or malformed
- failure details identify the owning revision and unresolved dependency key so later review surfaces can render readiness state without recomputing the rules
