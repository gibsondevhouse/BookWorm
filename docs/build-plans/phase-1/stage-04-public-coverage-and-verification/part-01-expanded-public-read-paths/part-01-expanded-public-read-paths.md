# Part 01: Expanded Public Read Paths

## Objective

Add public read coverage for the Phase 1 content model so the broader schema changes are visible through release-bound public routes.

## Work To Be Done

- add public routes or pages for the newly supported content types
- resolve those reads through the active release composition
- preserve visibility and negative-case behavior for missing public content
- ensure unreleased draft changes remain hidden
- add verification coverage for the expanded public reads

## Deliverables

- public read paths for the Phase 1 content model
- active-release resolution behavior for the new content types
- coverage for unreleased-content and missing-content cases

## Dependencies

- Stage 03 complete enough to activate valid releases

## Completion Check

- the new public reads change only when the active release changes
- unreleased edits do not appear on the public surface

## Baseline Public Routes

- `GET /characters/:slug` continues to expose active-release character content
- `GET /factions/:slug` continues to expose active-release faction content
- `GET /relationships/:sourceEntitySlug/:relationType/:targetEntitySlug` exposes active-release relationship content when the relationship revision is public and not deleted

## Covered Behavior

- unreleased relationship revisions remain hidden until the containing release becomes active
- released relationship updates replace earlier public relationship revisions when the active release changes
- released relationship deletes remove the relationship from the public surface without leaking prior active state
