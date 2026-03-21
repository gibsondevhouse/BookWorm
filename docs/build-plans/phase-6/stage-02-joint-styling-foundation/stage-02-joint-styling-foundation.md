# Stage 02: Joint Styling Foundation

## Purpose

Establish the shared styling contract for Phase 6 through a joint product-owner and implementation effort, so global styling decisions are explicit before broad rollout.

## Work To Be Done

- inventory the styling primitives already visible in `apps/web/src/app/globals.css`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/AppSidebar.tsx`, and `apps/web/src/app/page.tsx`
- define typography, spacing, color intent, shell states, and accessibility expectations for the stabilized two-column chat-style baseline
- confirm Tailwind CSS v4 usage rules and PostCSS setup boundaries from `apps/web/postcss.config.ts`
- capture non-goals and guardrails to prevent ad hoc style drift during Stage 03 and Stage 04

## Deliverables

- Stage 02 styling foundation brief with approved primitives and usage rules for the current shell baseline
- decision log for styling trade-offs and rationale
- implementation handoff checklist for Stage 03 global rollout

## Dependencies

- Stage 01 landing-page stabilization contract and implementation outputs available
- current style baselines in `apps/web/src/app/globals.css`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/AppSidebar.tsx`, `apps/web/src/app/page.tsx`, and `apps/web/postcss.config.ts`
- existing admin/public route structures in `apps/web/src/app`

## Exit Criteria

- typography, spacing, color/state, shell-structure, and accessibility styling primitives are explicitly approved
- styling decisions are mapped to concrete target files/surfaces for Stage 03 starting from the current root shell baseline
- open styling disagreements are resolved or logged with owner and deadline

## Status Snapshot

- Status: Not started [ ]
- Entry gate: Stage 01 landing-page stabilization handoff complete
- Execution note: no styling implementation should begin until this stage decisions set is locked

## Next-Slice Sequencing

1. Stage-02-Slice-01: baseline inventory of existing style patterns and inconsistencies across `globals.css`, `layout.tsx`, `AppSidebar.tsx`, `page.tsx`, and Tailwind CSS v4 setup
2. Stage-02-Slice-02: product-owner/implementation review and decision lock
3. Stage-02-Slice-03: Stage 03 implementation mapping and handoff package

## Status

Status: Not started [ ]
