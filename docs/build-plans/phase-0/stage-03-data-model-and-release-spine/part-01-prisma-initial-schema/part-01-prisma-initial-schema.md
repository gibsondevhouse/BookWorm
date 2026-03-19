# Part 01: Prisma Initial Schema

## Objective
Define the first schema that is small enough to implement quickly but large enough to support the Phase 0 vertical slice.

## Work To Be Done
- create Prisma configuration
- define models for users, sessions, entities, entity revisions, releases, and release entries
- define initial enums or lookup structures for role, visibility, release status, and representative entity type
- define constraints needed for stable identity and release-safe reads

## Deliverables
- Prisma schema file
- first migration
- schema notes for the representative entity type

## Dependencies
- Stage 01 complete
- Stage 02 runtime decisions fixed

## Completion Check
- migrations succeed on a clean database
- the schema can represent one entity through draft and release states