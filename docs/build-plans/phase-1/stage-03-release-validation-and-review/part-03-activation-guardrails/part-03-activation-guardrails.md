# Part 03: Activation Guardrails

## Objective

Enforce validation outcomes at release activation time so incomplete releases cannot become public canon accidentally.

## Work To Be Done

- wire release activation through readiness checks
- define failure behavior when validation blocks activation
- preserve activation semantics for valid releases
- ensure archived and active release state transitions remain coherent
- extend tests for guarded activation behavior

## Deliverables

- guarded release activation path
- failure behavior for invalid activation attempts
- coverage for valid and invalid activation outcomes

## Dependencies

- Part 01 complete
- Part 02 complete enough to inspect release readiness

## Completion Check

- activation fails when a release is incomplete
- activation still succeeds cleanly for valid releases

## Guardrails

- activation is allowed only for releases in `DRAFT` status
- activation is rejected when a draft contains no entity or relationship entries
- dependency validation still runs after state and composition guards pass
- active and archived releases are immutable through the baseline release entry inclusion path

## Failure Behavior

- invalid activation attempts return a conflict response with a machine-readable `code`
- `RELEASE_NOT_DRAFT` is returned when activation or draft mutation is attempted against `ACTIVE` or `ARCHIVED` releases
- `RELEASE_EMPTY` is returned when activation is attempted before any release composition exists
- dependency failures continue to return conflict responses with the existing dependency status payload
