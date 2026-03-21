# Part 02: Public Discovery Baseline

## Objective

Create the first narrow public discovery surface for release-bound content without committing to the final search engine implementation.

## Work To Be Done

- define a minimal public listing or discovery path for release-safe content
- keep the discovery contract compatible with later search infrastructure
- ensure only active-release public content appears in discovery results
- define behavior for empty or sparse result sets
- add verification coverage for public discovery output

## Deliverables

- minimal public discovery path
- release-safe discovery contract
- coverage for discovery filtering behavior

## Dependencies

- Part 01 complete

## Completion Check

- public discovery surfaces only active-release public content
- the discovery contract is usable before a final search backend is selected

## Discovery Contract

- `GET /discover` returns the active release slug and a flat `items` list of release-safe public entities
- discovery items currently cover `CHARACTER` and `FACTION` entity revisions from the active release
- `type` can narrow results to a single entity type
- `q` performs a case-insensitive substring filter across active-release slug, name, and summary fields
- `limit` bounds the response size without committing to a future ranking strategy

## Covered Behavior

- discovery returns an empty `items` list when no active-release content matches the current filter
- unreleased draft revisions do not appear in discovery until the containing release becomes active
- the response shape is narrow enough to swap in a dedicated search backend later without changing the public release-safety rule
