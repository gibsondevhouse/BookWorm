# Part 02: Relationship Revision Foundation

## Objective

Introduce the first implementation path for independently revisioned relationships so release composition can represent canon links explicitly.

## Work To Be Done

- define the persistence model for relationship records and relationship revisions
- add repository access patterns for relationship draft and release inclusion behavior
- establish revision-state handling for create, update, and delete semantics
- align the model with the decision that releases store revision pointers rather than copied rows
- add fixtures that demonstrate relationship revision history

## Deliverables

- relationship and relationship revision persistence model
- repository behavior for relationship revisions
- fixtures for at least one relationship history path

## Dependencies

- Part 01 complete enough to reference the expanded entity model

## Completion Check

- relationship changes create distinct revision records
- release composition can point at a relationship revision without copying relationship data
