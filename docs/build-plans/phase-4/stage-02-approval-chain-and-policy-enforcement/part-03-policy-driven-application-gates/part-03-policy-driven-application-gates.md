# Part 03: Policy-Driven Application Gates

## Objective

Prevent proposal application unless all configured policy and approval-chain requirements are satisfied.

## Work To Be Done

- define policy-gate evaluation contract for proposal application
- integrate gate checks into editorial application service
- return machine-readable gate-failure reasons for blocked attempts
- add policy override handling for authorized emergency workflows
- provide read endpoint summarizing gate readiness for a proposal

## Deliverables

- application-gate policy contract and service integration
- readiness endpoint and blocked-application error model
- tests for complete-chain pass, missing-step fail, and unauthorized override fail paths

## Dependencies

- Part 02 delegation and escalation workflows complete
- existing editorial application route from Phase 3 available for integration
- audit trail support reused for policy decision recording

## Completion Check

- [x] application route blocks proposals that are not gate-ready
- [x] gate-readiness summary identifies unmet policy requirements
- [x] authorized override behavior is explicit, audited, and role-limited
- [x] deterministic tests cover pass/fail gate combinations

## Implemented Evidence

- policy gate evaluation is integrated into proposal application service with machine-readable unmet condition codes
- readiness read surface is exposed via admin proposal application-readiness endpoint
- blocked apply responses return structured gate-failure payloads with reasons and readiness snapshot
- authorized override requires explicit reason code and note, and records a policy audit entry in proposal review metadata
- acceptance coverage exists in tests/phase4PolicyDrivenApplicationGatesPart03.test.ts (AC-01 through AC-05)

## Status

Status: Complete [x]

Stage 02 coherence note: With Parts 01 and 02 already complete, Part 03 completion closes Stage 02.
