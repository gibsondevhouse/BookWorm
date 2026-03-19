# Part 02: Revision and Release Composition

## Objective
Implement the minimum release composition model that proves public content is release-bound rather than draft-bound.

## Work To Be Done
- define revision creation flow for the representative entity type
- define how a release includes a chosen revision
- define active release resolution behavior
- define query path for public reads through active release composition rather than through live draft rows
- define the first integrity checks for release composition

## Deliverables
- revision write path definition
- release inclusion model
- active-release read path plan

## Dependencies
- Part 01 complete

## Completion Check
- the system can distinguish current draft state from public active-release state
- public reads do not depend on mutable draft records