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

- Status: Not started [ ]
- Entry gate: Stage 02 Slice-01 and Slice-02 complete
- Primary targets: entity list, edit entity, review inbox, and `adminAccessibility.module.css`; resolve the deferred admin focus-style expectation early in Stage 03 rather than reopening Stage 02 scope

## Next-Slice Sequencing

1. Stage-03-Slice-01: shared admin surface primitives and entity-list alignment
2. Stage-03-Slice-02: entity edit and review inbox alignment
3. Stage-03-Slice-03: verification, regression cleanup, and Stage 04 handoff

## Status

Status: Not started [ ]
