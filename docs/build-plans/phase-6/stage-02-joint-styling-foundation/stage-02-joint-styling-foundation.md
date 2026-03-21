# Stage 02: UI Vision Checklist, Gap Audit, and Root Shell Alignment

## Purpose

Stage 02 is the first post-freeze execution stage. It converts `docs/build-system/book-worm-build-system/ui-vision.md` into an implementation-ready checklist, audits the current UI against that checklist, and applies the approved visual direction first to the shipped root shell surfaces.

This stage is intentionally narrow: it does not attempt a phase-wide restyle. It establishes the actual visual system in code where BookWorm is most visible, then hands the audited high-impact admin surfaces into Stage 03.

## Repository Evidence Baseline

- UX/UI source of truth: `docs/build-system/book-worm-build-system/ui-vision.md`
- shipped root shell baseline: `apps/web/src/app/layout.tsx`, `apps/web/src/app/AppSidebar.tsx`, `apps/web/src/app/page.tsx`, `apps/web/src/app/globals.css`
- high-impact follow-on surfaces already present in the repository:
  - `apps/web/src/app/admin/entities/EntitiesClient.tsx`
  - `apps/web/src/app/admin/entities/[slug]/edit/EditEntityPageClient.tsx`
  - `apps/web/src/app/admin/review-inbox/ReviewInboxClient.tsx`
  - `apps/web/src/app/admin/adminAccessibility.module.css`

## Work To Be Done

- translate `ui-vision.md` into a concrete implementation checklist covering palette, typography, surfaces, navigation, atmosphere, motion restraint, accessibility, and performance
- audit the current root shell and high-impact admin screens against that checklist and separate immediate fixes from deferred follow-on work
- apply the approved visual direction to the root shell files: `globals.css`, `layout.tsx`, `AppSidebar.tsx`, and `page.tsx`
- preserve existing navigation structure, keyboard reachability, and responsive behavior while replacing the outdated visual language
- produce an ordered Stage 03 handoff for the entity list, entity edit form, review inbox, and shared admin styling primitives

## Deliverables

- Stage-02-Slice-01 execution document containing the implementation checklist and audit baseline
- root-shell implementation contract for the first vision-aligned code slice
- explicit Stage 03 target order grounded in the audited high-impact screens

## Dependencies

- Stage 01 baseline must remain the structural starting point
- `ui-vision.md` must be treated as canonical for visual direction
- existing lint, type-check, and accessibility-sensitive UI behavior remain required compatibility checks

## Exit Criteria

- the implementation checklist is explicit, actionable, and tied to actual target files
- the current-state audit names concrete gaps on the root shell, sidebar, entities list, edit form, review inbox, and shared admin styles
- the first approved implementation slice applies the vision to the root shell without inventing unsupported product features
- Stage 03 receives a ranked handoff of the next high-impact surfaces to align

## Status Snapshot

- Status: In Progress [-]
- Entry gate: satisfied by the Stage 01 shipped baseline and the Phase 6 vision rebaseline
- Active boundary: `Stage-02-Slice-01` implementation is complete; verification closeout and Stage 03 handoff lock remain
- Recorded verification state: `pnpm lint`, `pnpm type-check`, and `phase5AdminUsabilityReadabilityPart02` passed; `phase5AccessibilityKeyboardNavigationPart01` remains open only on the out-of-scope admin expectation for a global focus-indicator style in `apps/web/src/app/admin/adminAccessibility.module.css`

## Next-Slice Sequencing

1. Stage-02-Slice-01 [x]: UI vision checklist, gap audit, and root shell alignment
2. Stage-02-Slice-02 [ ]: root-shell verification closeout and Stage 03 handoff lock
3. Stage-02-Slice-03 [ ]: Stage 03 execution-pack update and tracker alignment after Slice-02 disposition

## Approved Next Ordered Slice

Slice ID: Stage-02-Slice-02

- name: Root-Shell Verification Closeout and Stage 03 Handoff Lock
- status: Not Started [ ]
- execution document: pending creation; must lock the Stage 02 verification disposition and the carry-forward boundary into Stage 03

## Status

Status: In Progress [-] (the first implementation slice has shipped; Stage 02 remains open until verification closeout is dispositioned and the Stage 03 handoff is locked)
