# Part 02: Delivery Preferences and Review Inbox

## Objective

Give users control over collaboration alerts and provide an actionable review inbox shaped by assignment and policy state.

## Work To Be Done

- add user notification preference storage by event category
- implement preference-aware filtering in notification delivery read paths
- add reviewer inbox endpoint for open assignments and pending decisions
- support inbox filters (state, priority, overdue, delegated, escalated)
- ensure inbox routes enforce role visibility and deterministic ordering

## Deliverables

- notification preference model and update APIs
- reviewer inbox retrieval endpoints and filter contracts
- tests for preference enforcement, inbox visibility, and filter combinations

## Dependencies

- Part 01 notification event outbox complete
- assignment and escalation metadata available from Stages 01 and 02
- user identity context already present in authenticated routes

## Completion Check

- users can read and update delivery preferences for supported categories
- reviewer inbox returns relevant actionable items and hides unauthorized records
- inbox filtering works deterministically across pagination boundaries
- preference settings influence delivered/readable notification output

## Status

Status: Not Started [ ]
