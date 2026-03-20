# Part 01: Multi-Stage Approval Schema and Transitions

## Objective

Model approval chains as explicit ordered steps so each proposal follows a deterministic sign-off path.

## Work To Be Done

- add approval-chain and approval-step schema linked to review requests
- define step-level statuses and progression rules
- enforce ordered transition logic (no skipping required steps)
- expose endpoints for step acknowledgment and approval decisions
- record actor attribution and timestamps for each step change

## Deliverables

- schema migration for approval-chain entities
- service and API layer for step progression and decision capture
- tests covering ordered progression, rejection handling, and invalid step access

## Dependencies

- Stage 01 review-request lifecycle available
- role model supports reviewer/admin differentiation
- proposal decision semantics available for integration mapping

## Completion Check

- [x] approval chains can be created and progressed in sequence
- [x] required steps cannot be skipped or signed by unauthorized users
- [x] rejection at a required step produces deterministic downstream state

## Implemented Evidence

- automated coverage exists in tests/phase4MultiStageApprovalSchemaTransitionsPart01.test.ts
- ordered progression enforcement is validated by AC-01 (step skipping blocked with conflict response)
- reviewer authorization enforcement is validated by AC-02 (unauthorized actor blocked)
- acknowledgment attribution and timestamps are validated by AC-03
- deterministic rejection downstream behavior is validated by AC-04 (chain rejected and remaining step canceled)
- in-order approval finalization is validated by AC-05 (chain reaches approved state)
- invalid step access handling is validated by AC-06 (not found response)

## Scope Boundary

- delegation and escalation workflows remain in Stage 02 Part 02
- policy-driven proposal application gates remain in Stage 02 Part 03

## Status

Status: Complete [x]
