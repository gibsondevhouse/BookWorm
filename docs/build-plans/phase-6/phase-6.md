# Phase 6

## Purpose

Phase 6 is the UX/UI vision-alignment phase for the web app. Its job is to turn the UX/UI source of truth in `docs/build-system/book-worm-build-system/ui-vision.md` into an implementation-ready plan, audit the current interface against that vision, and roll the approved visual direction through the highest-impact screens in a controlled order.

Phase 6 started from a shipped two-column shell whose pre-Stage-02-Slice-01 baseline used a parchment-heavy palette, default serif typography, and utilitarian surfaces that did not match the documented ethereal fantasy direction. `Stage-02-Slice-01` has now corrected the root shell itself, so the active repository reality is a vision-aligned shell with remaining rollout work focused on the audited admin surfaces and shared styling primitives.

## Outcome

At the end of Phase 6, the project should have:

- a vision-grounded implementation checklist derived from `ui-vision.md`
- an explicit UI audit covering the current root shell and the highest-impact admin surfaces
- the root app shell visually aligned first, so the most visible product entry point matches the approved direction
- the same visual system rolled out next to the entity list, entity edit flow, review inbox, and shared admin surface primitives
- planning and tracker artifacts that distinguish the shipped Stage 01 baseline from the new vision-first implementation work

## Scope

### Included

- convert `docs/build-system/book-worm-build-system/ui-vision.md` into an implementation-ready checklist
- audit the current UI against that checklist using the actual web files in `apps/web/src/app` and `apps/web/src/app/admin`
- apply the approved visual direction in code starting with the root shell surfaces: `layout.tsx`, `AppSidebar.tsx`, `page.tsx`, and `globals.css`
- sequence the next rollout over the highest-impact audited admin surfaces: entity list, entity edit, review inbox, and their shared styling primitives
- preserve existing backend contracts and accessibility-critical interaction patterns while visual alignment proceeds

### Excluded

- backend feature-family expansion unrelated to UI validation needs
- speculative new routes or feature families that are not already present in the repository
- claiming fantasy-specific content features from the vision doc unless the underlying application support already exists
- marking any Phase 6 work complete without execution evidence in code, tests, and docs

## Dependencies

- `docs/build-system/book-worm-build-system/ui-vision.md` is the UX/UI source of truth for this phase
- Stage 01 shipped the current root shell baseline in `apps/web/src/app/layout.tsx`, `apps/web/src/app/AppSidebar.tsx`, `apps/web/src/app/page.tsx`, and `apps/web/src/app/globals.css`
- existing high-impact admin surfaces are present in `apps/web/src/app/admin/entities`, `apps/web/src/app/admin/entities/[slug]/edit`, and `apps/web/src/app/admin/review-inbox`
- deterministic test and type-safety checks from earlier phases remain the compatibility floor during visual refactoring

## Stage Breakdown

1. Stage 01: Root Shell Baseline Freeze and Handoff
2. Stage 02: UI Vision Checklist, Gap Audit, and Root Shell Alignment
3. Stage 03: High-Impact Surface Alignment
4. Stage 04: Remaining Rollout, Verification, and Polish

## Exit Criteria

- the implementation checklist and current-state audit are documented against the actual UI files
- root shell surfaces reflect the approved visual direction from `ui-vision.md`
- highest-impact admin surfaces are sequenced and then aligned using the same token and surface system
- accessibility, responsiveness, and existing workflow behavior remain intact throughout the rollout
- phase, stage, and tracker statuses stay aligned with the work that actually shipped versus the work still planned

## Progress Snapshot

- Stage 01: Completed [x] (the root shell baseline is documented against what shipped and is now the handoff point for all new Phase 6 work)
- Stage 02: In progress [-] (`Stage-02-Slice-01` shipped the root-shell visual alignment and execution audit; `pnpm lint`, `pnpm type-check`, and `phase5AdminUsabilityReadabilityPart02` passed, while `phase5AccessibilityKeyboardNavigationPart01` still fails on the out-of-scope admin focus-indicator expectation deferred to Stage 03)
- Stage 03: Not started [ ] (awaits completion of the Stage 02 root-shell alignment slice and its audit-driven handoff)
- Stage 04: Not started [ ] (awaits Stage 03 alignment across the highest-impact admin surfaces)

## Status

Status: In Progress [-] (`ui-vision.md` is now the planning source of truth, Stage 01 is closed as the shipped baseline, and Stage 02 remains the active stage until verification closeout plus the Stage 03 handoff are locked)
