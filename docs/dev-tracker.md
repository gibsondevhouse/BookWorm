# BookWorm Development Tracker

Last updated: 2026-03-22
Source of truth inputs: GEMINI.md, docs/build-plans/master-plan-tracker.md, docs/build-plans/phase-6/*.md

## Purpose and Scope

This tracker is the execution-facing view of delivery status organized as Phase -> Stage -> Part (or Slice where a stage is sliced). It is intended for weekly planning, daily execution handoff, and release-readiness checks.

Scope includes:
- Phase and stage status rollup from existing build plans.
- Immediate execution queue for active and next slices.
- Per-item ownership, dependency, and evidence tracking.

Scope excludes:
- Replacing detailed implementation plans in docs/build-plans.
- Defining new product scope not already represented in repository docs.

## How to Use

1. During planning, select only items with Status = Ready or In Progress.
2. Before starting work, set Owner and confirm Dependencies are satisfied.
3. During implementation, attach PR links, test command outputs, and doc links in Evidence/PR.
4. At completion, move status to Done only after required validations pass.
5. Update Next Up and Risks/Blockers at least once per work session.

## Status Legend

- NS = Not Started
- RD = Ready
- IP = In Progress
- BL = Blocked
- RV = In Review
- DN = Done

## Structured Tracker

### Phase 0

| Stage | Part | Owner | Status | Dependencies | Evidence/PR | Notes |
|---|---|---|---|---|---|---|
| Stage 01 Foundation and Bootstrap | All documented parts | Unassigned | DN | None | docs/build-plans/phase-0/stage-01-foundation-and-bootstrap/ | Baseline complete per master tracker. |
| Stage 02 Core Runtime and Auth | Parts 01-03 | Unassigned | DN | Stage 01 complete | docs/build-plans/phase-0/stage-02-core-runtime-and-auth/ | Complete. |
| Stage 03 Data Model and Release Spine | Parts 01-03 | Unassigned | DN | Stage 02 complete | docs/build-plans/phase-0/stage-03-data-model-and-release-spine/ | Complete. |
| Stage 04 First Vertical Slice | Parts 01-03 | Unassigned | DN | Stage 03 complete | docs/build-plans/phase-0/stage-04-first-vertical-slice/ | Complete; verification gate closed. |

### Phase 1

| Stage | Part | Owner | Status | Dependencies | Evidence/PR | Notes |
|---|---|---|---|---|---|---|
| Stage 01 Expanded Content Spine | Parts 01-03 | Unassigned | DN | Phase 0 complete | docs/build-plans/phase-1/stage-01-expanded-content-spine/ | Complete. |
| Stage 02 Authoring Surface Expansion | Parts 01-03 | Unassigned | DN | Stage 01 complete | docs/build-plans/phase-1/stage-02-authoring-surface-expansion/ | Complete. |
| Stage 03 Release Validation and Review | Parts 01-03 | Unassigned | DN | Stage 02 complete | docs/build-plans/phase-1/stage-03-release-validation-and-review/ | Complete. |
| Stage 04 Public Coverage and Verification | Parts 01-03 | Unassigned | DN | Stage 03 complete | docs/build-plans/phase-1/stage-04-public-coverage-and-verification/ | Complete; phase verification closed. |

### Phase 2

| Stage | Part | Owner | Status | Dependencies | Evidence/PR | Notes |
|---|---|---|---|---|---|---|
| Stage 01 Comprehensive Entity Management | Parts 01, 02, 02b, 03 | Unassigned | DN | Phase 1 complete | docs/build-plans/phase-2/stage-01-comprehensive-entity-management/ | Complete. |
| Stage 02 Public Codex and Reader | Parts 01-03 | Unassigned | DN | Stage 01 complete | docs/build-plans/phase-2/stage-02-public-codex-and-reader/ | Complete. |
| Stage 03 Search and Continuity Foundation | Parts 01-03 | Unassigned | DN | Stage 02 complete | docs/build-plans/phase-2/stage-03-search-and-continuity-foundation/ | Complete. |
| Stage 04 Portability and Delivery | Parts 01-03 | Unassigned | DN | Stage 03 complete | docs/build-plans/phase-2/stage-04-portability-and-delivery/ | Complete; phase verification closed. |

### Phase 3

| Stage | Part | Owner | Status | Dependencies | Evidence/PR | Notes |
|---|---|---|---|---|---|---|
| Stage 01 Collaboration and Review Workflows | Parts 01-03 | Unassigned | DN | Phase 2 complete | docs/build-plans/phase-3/stage-01-collaboration-and-review-workflows/ | Complete. |
| Stage 02 Proposal Workflow Enhancement | Parts 01-03 | Unassigned | DN | Stage 01 complete | docs/build-plans/phase-3/stage-02-proposal-workflow-enhancement/ | Complete. |
| Stage 03 Comment Structure and Feedback System | Parts 01-03 | Unassigned | DN | Stage 02 complete | docs/build-plans/phase-3/stage-03-comment-structure-and-feedback-system/ | Complete. |
| Stage 04 Content Comparison and Proposal Review Tools | Parts 01-03 | Unassigned | DN | Stage 03 complete | docs/build-plans/phase-3/stage-04-content-comparison-and-proposal-review-tools/ | Complete. |

### Phase 4

| Stage | Part | Owner | Status | Dependencies | Evidence/PR | Notes |
|---|---|---|---|---|---|---|
| Stage 01 Review Request and Assignment Foundation | Parts 01-03 | Unassigned | DN | Phase 3 complete | docs/build-plans/phase-4/stage-01-review-request-and-assignment-foundation/ | Complete. |
| Stage 02 Approval Chain and Policy Enforcement | Parts 01-03 | Unassigned | DN | Stage 01 complete | docs/build-plans/phase-4/stage-02-approval-chain-and-policy-enforcement/ | Complete. |
| Stage 03 Collaboration Notifications and Observability | Parts 01-03 | Unassigned | DN | Stage 02 complete | docs/build-plans/phase-4/stage-03-collaboration-notifications-and-observability/ | Complete. |
| Stage 04 Operational Hardening and Verification | Parts 01-03 | Unassigned | DN | Stage 03 complete | docs/build-plans/phase-4/stage-04-operational-hardening-and-phase-4-verification/ | Complete; phase verification gate closed. |

### Phase 5

| Stage | Part | Owner | Status | Dependencies | Evidence/PR | Notes |
|---|---|---|---|---|---|---|
| Stage 01 Search Tuning and Query Quality | Parts 01-03 | Unassigned | DN | Phase 4 complete | docs/build-plans/phase-5/stage-01-search-tuning-and-query-quality/ | Complete. |
| Stage 02 Continuity Intelligence Expansion | Parts 01-03 | Unassigned | DN | Stage 01 complete | docs/build-plans/phase-5/stage-02-continuity-intelligence-expansion/ | Complete. |
| Stage 03 Portability Maturity and Operator Workflows | Parts 01-03 | Unassigned | DN | Stage 02 complete | docs/build-plans/phase-5/stage-03-portability-maturity-and-operator-workflows/ | Complete. |
| Stage 04 UX Accessibility and Feedback Integration | Parts 01-03 | Unassigned | DN | Stage 03 complete | docs/build-plans/phase-5/stage-04-ux-accessibility-and-feedback-integration/ | Complete with documented closeout exception in stage notes. |

### Phase 6 (Active)

| Stage | Part | Owner | Status | Dependencies | Evidence/PR | Notes |
|---|---|---|---|---|---|---|
| Stage 01 Phase 5 Closeout Unblock Surfaces | Stage complete | Unassigned | DN | Phase 5 closeout context | docs/build-plans/phase-6/stage-01-phase-5-closeout-unblock-surfaces/ | Closed baseline and handoff recorded. |
| Stage 02 Joint Styling Foundation | Slice 01: UI vision checklist, gap audit, root-shell alignment | Unassigned | DN | Stage 01 complete | docs/build-plans/phase-6/stage-02-joint-styling-foundation/stage-02-slice-01-ui-vision-checklist-audit-and-root-shell-alignment.md | Shipped per stage snapshot. |
| Stage 02 Joint Styling Foundation | Slice 02: Sidebar Codex Navigation Refactor | Unassigned | DN | Slice 01 complete | docs/build-plans/phase-6/stage-02-joint-styling-foundation/stage-02-slice-02-sidebar-codex-nav-refactor.md | Shipped; lint/type-check reported passing. |
| Stage 02 Joint Styling Foundation | Slice 03: Root-shell verification closeout and Stage 03 handoff lock | Unassigned | RD | Slices 01-02 complete | docs/build-plans/phase-6/stage-02-joint-styling-foundation/stage-02-joint-styling-foundation.md | Next required action to close Stage 02. |
| Stage 03 Global Styling Implementation | Slice 01: Shared admin primitives + entity list alignment | Unassigned | NS | Stage 02 Slice 03 locked | docs/build-plans/phase-6/stage-03-global-styling-implementation/stage-03-global-styling-implementation.md | Includes deferred focus-indicator expectation in adminAccessibility.module.css. |
| Stage 03 Global Styling Implementation | Slice 02: Entity edit + review inbox alignment | Unassigned | NS | Slice 01 complete | docs/build-plans/phase-6/stage-03-global-styling-implementation/stage-03-global-styling-implementation.md | Keep keyboard/focus behavior stable while restyling. |
| Stage 03 Global Styling Implementation | Slice 03: Verification, regression cleanup, Stage 04 handoff | Unassigned | NS | Slice 02 complete | docs/build-plans/phase-6/stage-03-global-styling-implementation/stage-03-global-styling-implementation.md | Exit gate before Stage 04 starts. |
| Stage 04 UI/UX Surface Expansion | Slice 01: Remaining-surface rollout plan and defer-list lock | Unassigned | NS | Stage 03 complete | docs/build-plans/phase-6/stage-04-ui-ux-surface-expansion/stage-04-ui-ux-surface-expansion.md | Cleanup and consistency scope. |
| Stage 04 UI/UX Surface Expansion | Slice 02: Polish implementation on deferred surfaces | Unassigned | NS | Slice 01 complete | docs/build-plans/phase-6/stage-04-ui-ux-surface-expansion/stage-04-ui-ux-surface-expansion.md | Apply restrained atmosphere/motion only. |
| Stage 04 UI/UX Surface Expansion | Slice 03: Final verification and phase closeout | Unassigned | NS | Slice 02 complete | docs/build-plans/phase-6/stage-04-ui-ux-surface-expansion/stage-04-ui-ux-surface-expansion.md | Closeout docs must distinguish shipped vs deferred work. |

## Next Up

1. Execute Phase 6 Stage 02 Slice 03: close verification and lock Stage 03 handoff package.
2. Start Phase 6 Stage 03 Slice 01: align shared admin primitives and entity list visuals.
3. Validate deferred accessibility expectation in admin focus-indicator styling early in Stage 03.

## Risks and Blockers

- Open verification carry-over: Stage 02 remains open until Slice 03 closes; this is the primary schedule blocker for Stage 03 start.
- Accessibility debt carry-forward: deferred focus-indicator expectation in admin styles can create rework if not resolved in Stage 03 Slice 01.
- Evidence hygiene risk: many completed items do not yet have owner/evidence links filled in this tracker; assignment and PR/test links should be added during active execution.
