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

- Status: Complete [x]
- Entry gate: satisfied by the Stage 01 shipped baseline and the Phase 6 vision rebaseline
- Active boundary: All three slices (verification closeout, root shell alignment, sidebar nav refactor) are complete; Stage 02 handoff locked for Stage 03 entry
- Recorded verification state: `pnpm lint`, `pnpm type-check`, and `phase5AdminUsabilityReadabilityPart02` all passed; `phase5AccessibilityKeyboardNavigationPart01` contains expected out-of-scope admin focus-indicator selector issue carried forward to Stage 03 Slice 01 (documented in stage-02-slice-03 closure)

## Next-Slice Sequencing

1. Stage-02-Slice-01 [x]: UI vision checklist, gap audit, and root shell alignment
2. Stage-02-Slice-02 [x]: Sidebar Codex Navigation Refactor — `AppSidebar.tsx` refactored; stale Collections section removed; collapsible Codex entity-type group (Story / World / Lore) in the Navigate section
3. Stage-02-Slice-03 [x]: Root-shell verification closeout and Stage 03 handoff lock — documented in stage-02-slice-03-root-shell-verification-closeout.md

## Next Ordered Stage

Stage ID: Stage-03

- name: High-Impact Surface Alignment (Shared Admin Primitives + Entity List Alignment)
- status: Approved [Ready] — entry gate satisfied
- scope: Apply Stage 02 visual system to entity list, review inbox, proposal review, entity edit form, and consolidate admin surface primitives with corrected focus-indicator selector
- handoff order: Ranked per stage-02-slice-03-root-shell-verification-closeout.md

## Status

Status: Complete [x] (Stage 02 locked; all root shell and sidebar surfaces now ship with ethereal aesthetic; admin surfaces ready for Stage 03 alignment; known out-of-scope focus-indicator issue documented and deferred)
