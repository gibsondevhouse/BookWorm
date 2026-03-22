# Stage 03: High-Impact Surface Alignment

## Purpose

Apply the Stage 02 visual system to the next audited screens with the highest workflow impact after the root shell: the entity list, the entity edit flow, the review inbox, and the shared admin surface primitives they depend on.

## Work To Be Done

- align `apps/web/src/app/admin/adminAccessibility.module.css` with the approved Phase 6 token and surface language, including the deferred global focus-indicator styling expectation that remained out of scope in `Stage-02-Slice-01`
- apply the visual system to `EntitiesClient.tsx`, `EditEntityPageClient.tsx`, and `ReviewInboxClient.tsx`
- preserve the accessibility and keyboard-navigation behaviors already encoded in those screens while replacing utilitarian styling
- resolve token and visual mismatches between the root shell and the admin modules

## Deliverables

- vision-aligned shared admin surface primitives
- updated entity list, entity edit, and review inbox screens
- verification log covering visual regressions, responsiveness, and keyboard/focus behavior

## Dependencies

- Stage 02 root-shell alignment complete
- Stage 02 audit findings and defer list locked
- the known out-of-scope failure from `phase5AccessibilityKeyboardNavigationPart01` is carried forward and points to `apps/web/src/app/admin/adminAccessibility.module.css`, not the root-shell files
- existing UI behavior and type-safety checks remain the regression floor

## Exit Criteria

- the entity list, entity edit flow, and review inbox no longer rely on the old flat parchment/white utilitarian presentation
- shared admin surfaces use the same palette, typography hierarchy, and panel treatment established in Stage 02
- accessibility-critical interactions still behave correctly after the visual refactor
- Stage 04 receives a stable system for remaining rollout and closeout work

## Status Snapshot

- Status: Complete [x] (Slices 01, 02, and 03 all shipped; Stage 03 closed 2026-03-22)
- Entry gate: Stage 02 complete ✓
- Slice 03 verification outcome: `pnpm lint` PASS, `pnpm type-check` PASS, Stage 03 core regression suite 70/70 PASS, broader Phase 5 suite 72/72 PASS; phasefComposerFloatingBaseline regression resolved; 15 pre-existing Phase 3 and Phase 5 doc-text failures documented as non-blocking
- Recorded verification state: all 4 admin surfaces (entity list, entity edit, review inbox, proposal review) cohere with ethereal aesthetic; focus-visible selector confirmed global; visual consistency spot-checked; Stage 04 handoff package recorded in stage-03-slice-03 closure doc

## Next-Slice Sequencing

1. Stage-03-Slice-01 [x]: shared admin surface primitives and entity-list alignment — adminAccessibility.module.css updated; ethereal aesthetic applied
2. Stage-03-Slice-02 [x]: entity edit and secondary surface alignment — visual coherence verified; secondary surfaces inherit aesthetic through shared primitives
3. Stage-03-Slice-03 [x]: verification, regression cleanup, and Stage 04 handoff — complete; 1 regression resolved (phasefComposerFloatingBaseline border-transparent fix); 15 pre-existing failures documented; Stage 04 handoff package shipped

## Approved Next Ordered Slice

Slice ID: Stage-04-Slice-01

- name: Remaining-Surface Rollout Plan and Defer-List Lock
- status: Approved [ ] — ready for execution (Stage 03 gate closed)
- scope: audit remaining chat/composer surfaces for visual token alignment; lock defer list for any surfaces explicitly not included in Phase 6; produce surface-by-surface disposition log before implementation begins

## Status

Status: Complete [x] — Closed 2026-03-22. All three slices delivered. Ethereal aesthetic applied to all four high-impact admin surfaces. Focus-visible selector fixed. All target regression suites pass. Stage 04 handoff package locked.
