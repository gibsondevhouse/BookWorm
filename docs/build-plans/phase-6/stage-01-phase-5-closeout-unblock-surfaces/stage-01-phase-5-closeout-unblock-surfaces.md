# Stage 01: Landing-Page Stabilization and Refactor Rebaseline

## Purpose

Record the actual shipped Stage 01 frontend milestone: a stable two-column chat-style landing shell that replaces the previous planning assumption of a completed product-facing landing-page refactor.

Stage 01 now governs stabilization of the root app shell, the handoff into Stage 02 styling decisions, and the explicit rebaseline of any broader product-facing landing-page refactor into future approved work. Phase 5 deferred-risk artifacts remain historical context, not the active implementation target.

## Stabilization Implementation Delivered

- root layout stabilized as a two-column shell in `apps/web/src/app/layout.tsx`
- persistent navigation/sidebar baseline implemented in `apps/web/src/app/AppSidebar.tsx`
- chat-style landing surface implemented in `apps/web/src/app/page.tsx`
- shared theme tokens and global styling baseline implemented in `apps/web/src/app/globals.css`
- Tailwind CSS v4 PostCSS setup is present in `apps/web/postcss.config.ts`

## Remaining Work

- lock Stage 02 handoff inputs from the shipped shell layout, sidebar structure, typography, spacing, and state patterns
- decide when, or whether, a broader product-facing landing-page refactor re-enters active Phase 6 scope as a separate approved slice

## Deliverables

- Stage 01 documentation that matches the shipped stabilization milestone
- Stage-01-Slice-02 contract rewritten around the implemented shell baseline
- Stage 02 handoff inputs identifying style-system decisions exposed by `layout.tsx`, `AppSidebar.tsx`, `page.tsx`, and `globals.css`

### Slice 01 Execution Pack Artifacts

Legacy artifact set from prior Stage 01 scope. Retained for audit traceability.

- `stage-01-slice-01-verification-execution-pack.md`
- `stage-01-unblock-checklist-template.md`
- `stage-01-findings-and-stage-02-handoff-template.md`

## Dependencies

- current landing-shell implementation in `apps/web/src/app/layout.tsx`, `apps/web/src/app/AppSidebar.tsx`, and `apps/web/src/app/page.tsx`
- global styling and Tailwind CSS v4 setup in `apps/web/src/app/globals.css` and `apps/web/postcss.config.ts`
- Phase 5 Stage 04 Part 03 closeout artifacts as contextual input only:
  - `docs/build-plans/phase-5/stage-04-ux-accessibility-and-feedback-integration/part-03-feedback-integration-and-phase-5-verification-gate/acceptance-and-sign-off-checklist.md`
  - `docs/build-plans/phase-5/stage-04-ux-accessibility-and-feedback-integration/part-03-feedback-integration-and-phase-5-verification-gate/ac-01-feedback-consolidation.md`

## Exit Criteria

- Stage 01 docs describe the shipped landing-shell stabilization rather than a non-existent marketing/CTA implementation
- implementation references point to `layout.tsx`, `AppSidebar.tsx`, `page.tsx`, `globals.css`, and relevant Tailwind setup only
- Stage 02 handoff inputs are explicit about the current shell primitives and the deferred status of any broader landing-page refactor
- acceptance criteria and validation commands for the stabilization baseline are explicit and runnable

## Status Snapshot

- Status: In Progress [-] (landing-page stabilization is shipped; Stage 02 handoff sequencing and future refactor disposition remain open)
- Risk posture: Medium (the current shell is stable, but broader product-facing IA/copy work is still undefined and must not be treated as complete)
- Primary unlock: give Stage 02 a real shell, sidebar, and token baseline to style systematically

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
- Stage 01 active execution scope is now landing-page stabilization reality via Stage-01-Slice-02.

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

- Stage-01-Slice-04 remains archived as a prior-scope closeout carry-forward item and is not the active next ordered slice for landing-shell stabilization follow-through.
- If this archived item is reactivated, it must be planned explicitly as a separate dependency thread and must not replace Stage-01-Slice-02 as the active Stage 01 target.

## Next-Slice Sequencing

1. Stage-01-Slice-01 [x]: verification execution pack approved and validated
2. Stage-01-Slice-02 [x]: landing-page stabilization documented against the shipped root shell implementation
3. Stage-01-Slice-03 [ ]: post-stabilization verification, disposition, and Stage 02 handoff lock
4. Stage-01-Slice-04 [ ]: follow-on Stage 01 remediation only if Slice-03 verification identifies blocking findings or a broader refactor is re-approved

## Approved Next Ordered Slice

Slice ID: Stage-01-Slice-03

- name: Post-Stabilization Verification and Stage 02 Handoff Lock
- status: Not Started [ ]
- execution document: `stage-01-slice-02-product-facing-landing-page-full-refactor-contract.md`

## Status

Status: In Progress [-] (Stage 01 stabilization scope is the active documented baseline; Slice-02 rebaseline is complete and verification/handoff slices remain open)
