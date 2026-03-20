# Stage 01: Review Request and Assignment Foundation

## Purpose

Establish formal review-request objects and assignment workflows so change proposals move through explicit reviewer queues rather than implicit ad-hoc review.

## Work To Be Done

- define review-request schema linked to proposal and target content
- add service and API flows to create, list, and fetch review requests
- implement approver assignment actions with role and ownership validation
- provide queue views for assigned reviewer workload and pending review requests
- add lifecycle states for review requests with deterministic transitions and timestamps

## Deliverables

- review-request data model and migration plan
- review-request repository/service/route contracts
- assignment and queue endpoints with authorization coverage
- baseline tests for request creation, assignment, queue visibility, and lifecycle guards

## Dependencies

- Phase 3 proposal workflows and role gates in place
- existing proposal identifiers and revision linkage available
- audit metadata conventions from prior phases reused for attribution fields

## Exit Criteria

- review requests can be created against eligible proposals
- approvers can be assigned and reassigned within policy constraints
- assigned-reviewer and admin queue views return deterministic pending lists
- invalid assignment and transition paths fail with explicit errors
- Stage 01 part docs and tracker entries remain aligned with implementation progress

## Parts

1. Part 01: Review Request Model and API
2. Part 02: Approver Assignment and Queue Views
3. Part 03: Review Request Lifecycle and Guards

## Progress Snapshot

- Part 01 is complete.
- Part 02 is complete.
- Part 03 is complete.

## Status

Status: Complete [x]
