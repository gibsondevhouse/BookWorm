# Part 02: Release Review Surface

## Objective
Provide a minimal review surface for release composition so admins can inspect a release before activation.

## Work To Be Done
- create a route, page, or response shape that summarizes release entries
- show readiness information from the validation baseline
- define how draft, included, and missing dependency states are represented
- keep the surface narrow enough to support later diff and proposal tooling
- add verification for the review summary behavior

## Deliverables
- release review summary surface
- readiness and dependency status representation
- verification coverage for release review output

## Dependencies
- Part 01 complete

## Completion Check
- admins can inspect what a release contains before activation
- review output reflects release readiness status accurately

## Review Surface Shape
- review is exposed through `GET /admin/releases/:slug/review`
- the response includes release metadata, validation summary, entity entries, and relationship entries
- release metadata carries the release `status`, which is how draft review state is represented in the baseline surface
- included entity and relationship rows expose `inclusionStatus: INCLUDED`
- rows with unresolved validation failures expose `dependencyState: MISSING_DEPENDENCIES` and a `blockingDependencies` list
- rows with no blocking failures expose `dependencyState: READY`

## Covered Behavior
- admins can inspect draft composition without activating the release
- review output reuses the validation baseline rather than recomputing dependency failures independently
- entity and relationship revisions both surface missing dependency state in a summary-friendly shape for later UI work