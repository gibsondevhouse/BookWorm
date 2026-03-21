# Stage 01: Product-Facing Landing Page Refactor

## Purpose

Deliver a full refactor target for the web landing page so BookWorm starts with a product-facing experience rather than an internal tracker/dashboard orientation.

Stage 01 governs the landing page contract for information architecture, value framing, CTA routing, and responsive accessibility baseline. Phase 5 deferred-risk artifacts are treated as historical context, not the primary execution target for this stage.

## Slice-02 Implementation Delivered

- full landing-page refactor implemented in `apps/web/src/app/page.tsx` and `apps/web/src/app/page.module.css`
- internal tracker/dashboard framing replaced with product-value narrative blocks and explicit CTA paths
- section-level requirements and CTA route mappings executed in the root route surface
- acceptance checks and validation command set recorded in Stage-01-Slice-02 contract

## Remaining Work

- execute Stage-01-Slice-03 post-implementation verification and disposition
- lock Stage 02 handoff inputs from implemented landing-page typography, spacing, and emphasis patterns

## Deliverables

- approved Stage-01-Slice-02 execution plan for the landing-page full refactor
- section and CTA contract for the landing page, mapped to currently available routes
- Stage 02 handoff inputs identifying style-system decisions exposed by the landing-page refactor

### Slice 01 Execution Pack Artifacts

Legacy artifact set from prior Stage 01 scope. Retained for audit traceability.

- `stage-01-slice-01-verification-execution-pack.md`
- `stage-01-unblock-checklist-template.md`
- `stage-01-findings-and-stage-02-handoff-template.md`

## Dependencies

- current landing-page implementation in `apps/web/src/app/page.tsx` and `apps/web/src/app/page.module.css`
- route availability in `apps/web/src/app` for product-facing CTA destinations
- Phase 5 Stage 04 Part 03 closeout artifacts as contextual input only:
  - `docs/build-plans/phase-5/stage-04-ux-accessibility-and-feedback-integration/part-03-feedback-integration-and-phase-5-verification-gate/acceptance-and-sign-off-checklist.md`
  - `docs/build-plans/phase-5/stage-04-ux-accessibility-and-feedback-integration/part-03-feedback-integration-and-phase-5-verification-gate/ac-01-feedback-consolidation.md`

## Exit Criteria

- landing page IA and section contract is approved for implementation without unresolved scope ambiguity
- dashboard/tracker language is removed from Stage 01 active scope and replaced with product-facing landing-page framing
- CTA mappings reference existing app routes only and include rationale per path
- acceptance criteria and validation commands for the approved execution slice are explicit and runnable

## Status Snapshot

- Status: In Progress [-] (landing-page refactor contract executed in Stage-01-Slice-02; verification and Stage 02 handoff sequencing remain open)
- Risk posture: Medium (final landing-page IA/copy/CTA contract must be locked before Stage 02 styling decisions)
- Primary unlock: establish a product-facing entry surface that Stage 02 can style systematically instead of inheriting tracker-era framing

## Slice 01 Execution Evidence (Completed)

This completed evidence is retained as historical context from the original Stage 01 scope.

- execution-pack artifacts added:
  - `stage-01-slice-01-verification-execution-pack.md`
  - `stage-01-unblock-checklist-template.md`
  - `stage-01-findings-and-stage-02-handoff-template.md`
- deterministic test added:
  - `tests/phase6Stage01Slice01ExecutionPack.test.ts`
- validation command set recorded for Slice-01 contract coverage:
  - `phase6Stage01Slice01ExecutionPack`
  - `phase5AccessibilityKeyboardNavigationPart01`
  - `phase5AdminUsabilityReadabilityPart02`
  - `pnpm lint`
  - `pnpm type-check`

Scope continuity note:

- Slice-01 completion defined a verification-pack contract for the prior scope.
- Stage 01 active execution scope is now landing-page refactor delivery via Stage-01-Slice-02.

## Completed First Planning Slice

Slice ID: Stage-01-Slice-01

- status: Completed [x]
- objective: define and approve the manual verification execution pack for the original Stage 01 scope
- tasks:
  - codify reviewer roles and required evidence fields for visual/usability and assistive-technology runs
  - sequence review order by workflow criticality (Review Inbox -> Proposal Review Dialog -> Admin Entity List -> Edit Entity Dialog)
  - define disposition rubric and handoff format into Stage 02
- acceptance checks:
  - Stage 01 checklist format approved
  - reviewer roster and evidence schema approved
  - sequencing and handoff rules approved
- validation commands to run once execution begins:
  - `pnpm lint`
  - `pnpm type-check`
  - `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase5AccessibilityKeyboardNavigationPart01.test.ts`
  - `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase5AdminUsabilityReadabilityPart02.test.ts`

## Archived Prior-Scope Notes

- Stage-01-Slice-04 remains archived as a prior-scope closeout carry-forward item and is not the active next ordered slice for landing-page refactor execution.
- If this archived item is reactivated, it must be planned explicitly as a separate dependency thread and must not replace Stage-01-Slice-02 as the active Stage 01 target.

## Next-Slice Sequencing

1. Stage-01-Slice-01 [x]: verification execution pack approved and validated
2. Stage-01-Slice-02 [x]: full landing-page refactor execution contract implemented in root route and local page styles
3. Stage-01-Slice-03 [ ]: post-implementation verification, disposition, and Stage 02 handoff lock
4. Stage-01-Slice-04 [ ]: follow-on Stage 01 remediation only if Slice-03 verification identifies blocking findings

## Approved Next Ordered Slice

Slice ID: Stage-01-Slice-03

- name: Post-Implementation Verification and Stage 02 Handoff Lock
- status: Not Started [ ]
- execution document: `stage-01-slice-02-product-facing-landing-page-full-refactor-contract.md`

## Status

Status: In Progress [-] (Stage 01 landing-page refactor scope is active; Slice-02 delivery is complete and verification/handoff slices remain open)
