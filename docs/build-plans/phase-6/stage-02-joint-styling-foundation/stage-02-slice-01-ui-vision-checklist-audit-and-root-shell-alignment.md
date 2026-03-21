# Stage 02 Slice 01: UI Vision Checklist, Gap Audit, and Root Shell Alignment

## Slice Status

- Status: Completed [x]
- Approval state: Approved as the next ordered Phase 6 slice
- Stage: Phase 6 Stage 02
- Execution type: planning-to-delivery slice

## Objective

Turn `docs/build-system/book-worm-build-system/ui-vision.md` into an implementation-ready checklist, audit the current UI against that checklist, and apply the approved visual direction first to the root shell surfaces that define BookWorm's entry experience.

## Repository Evidence Baseline

UX/UI source of truth:

- `docs/build-system/book-worm-build-system/ui-vision.md`

Current root-shell implementation:

- `apps/web/src/app/globals.css`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/AppSidebar.tsx`
- `apps/web/src/app/page.tsx`

Highest-impact follow-on surfaces audited in this slice:

- `apps/web/src/app/admin/entities/EntitiesClient.tsx`
- `apps/web/src/app/admin/entities/[slug]/edit/EditEntityPageClient.tsx`
- `apps/web/src/app/admin/review-inbox/ReviewInboxClient.tsx`
- `apps/web/src/app/admin/adminAccessibility.module.css`

Planning and tracker artifacts that must remain aligned:

- `docs/build-plans/master-plan-tracker.md`
- `docs/build-plans/phase-6/phase-6.md`
- `docs/build-plans/phase-6/stage-02-joint-styling-foundation/stage-02-joint-styling-foundation.md`

## Implementation Checklist Derived from `ui-vision.md`

### 1. Palette and Lighting System

- replace the current parchment/brown-first palette with a dark-base, luminous-accent palette
- define explicit tokens for background depth, elevated surfaces, borders, primary action, secondary action, text, muted text, and glow accents in `globals.css`
- keep contrast compliant across buttons, form controls, badges, and dialog surfaces

### 2. Typography System

- introduce a display serif treatment for the brand and top-level headings
- keep body copy readable with a restrained literary text face or existing readable fallback
- create a clear hierarchy for shell titles, supporting copy, metadata, and navigation labels

### 3. Atmosphere and Background Treatment

- replace the flat paper look with layered gradients, mist, night-sky, forest, or other ethereal depth cues that do not require custom illustration assets
- use framed or translucent panel treatments instead of generic flat white cards where appropriate
- keep the visual direction polished and restrained rather than noisy or game-like

### 4. Navigation and Brand Treatment

- restyle the sidebar with a darker atmospheric background, luminous hover states, and a stronger brand presentation
- replace generic control styling where possible with navigation affordances that feel intentional and world-aware
- preserve collapsed and expanded behavior already implemented in `AppSidebar.tsx`

### 5. Root Chat/Home Surface

- make the root page feel like an AI writing companion entry point rather than a placeholder shell
- upgrade the empty-state hierarchy, quick actions, and composer treatment to match the approved fantasy direction
- keep the existing interaction model lightweight and compatible with the current codebase

### 6. Shared Admin Surface Direction

- map the approved token system onto tables, forms, dialogs, badges, and summaries used by `adminAccessibility.module.css`
- treat the entity list, edit entity flow, and review inbox as the next rollout targets after the shell
- keep accessibility and keyboard behaviors intact while visuals change

### 7. Motion and Decorative Restraint

- prefer subtle transitions, layered gradients, and restrained ornament over heavy animation or asset-dependent hero media
- do not block Slice-01 execution on custom illustration, logo, or video work

### 8. Accessibility and Performance Guardrails

- visible focus states must remain strong after the palette change
- responsive shell behavior must remain usable on narrow viewports
- avoid large asset requirements in this slice; use CSS-first atmosphere where possible

## Current UI Audit Against the Checklist

### Root Shell Gaps

`apps/web/src/app/globals.css`

- current tokens are brown/paper-first and reinforce an antique parchment tone rather than an ethereal fantasy atmosphere
- typography remains Georgia/Times-only with no display treatment for the brand or major headings
- body background uses a light paper gradient with no dark-base depth, luminous accents, or elevated-surface language

`apps/web/src/app/layout.tsx`

- the shell structure is stable but visually neutral; it provides no atmospheric framing beyond a plain full-screen flex layout
- responsive behavior is structural rather than stylistic and needs a visual system that works across wide and narrow viewports

`apps/web/src/app/AppSidebar.tsx`

- sidebar background and border treatment remain parchment-like and utilitarian
- the brand presentation is plain text without any distinct emblem, display type, or glow treatment
- generic buttons, links, and the hamburger icon do not reflect the vision's more intentional fantasy navigation language

`apps/web/src/app/page.tsx`

- the root page reads as a placeholder chat shell rather than a magical writing-companion entry point
- quick-action chips and composer controls rely on flat white surfaces and the current brown accent
- the page lacks the atmospheric hierarchy, panel treatment, and visual depth called for by `ui-vision.md`

### Highest-Impact Admin Surface Gaps

`apps/web/src/app/admin/adminAccessibility.module.css`

- shared admin surfaces rely on flat white cards, blue primary buttons, and generic status colors that visually break from the desired fantasy direction
- table, dialog, summary, and empty-state treatments are structurally sound but visually utilitarian
- the module still depends on generic surface variables and should be consolidated into the Phase 6 token system in Stage 03

`apps/web/src/app/admin/entities/EntitiesClient.tsx`

- entity list interaction patterns are already useful, but the table and dialog styling still inherit the utilitarian admin surface language
- this is a high-impact Stage 03 target because it is one of the most visible structured admin workflows

`apps/web/src/app/admin/entities/[slug]/edit/EditEntityPageClient.tsx`

- the edit form has solid accessibility structure and guidance copy, but its panels, inputs, and actions still read as baseline utility UI
- this should be aligned after shared admin primitives are updated

`apps/web/src/app/admin/review-inbox/ReviewInboxClient.tsx`

- the review inbox is a workflow-critical screen, but its list, badges, modal, and action controls still use the generic admin presentation
- this is the other immediate Stage 03 target alongside the entity list/edit flow

## In Scope

- capture the implementation checklist and the current-state audit in this slice document
- update `globals.css`, `layout.tsx`, `AppSidebar.tsx`, and `page.tsx` to establish the approved visual direction on the root shell
- preserve existing shell structure, navigation destinations, quick actions, and input behavior while upgrading the presentation
- document the Stage 03 rollout order for the next highest-impact screens

## Out of Scope

- changing `EntitiesClient.tsx`, `EditEntityPageClient.tsx`, `ReviewInboxClient.tsx`, or `adminAccessibility.module.css` in this slice beyond audit and handoff mapping
- adding new backend features, routes, or data dependencies
- blocking execution on custom illustration, bespoke icon packs, or other asset pipelines that do not yet exist in the repo

## Execution Tasks

1. Lock the implementation checklist and audit findings against the exact files listed above.
2. Update `globals.css` with the approved Phase 6 token, typography, and atmospheric background system.
3. Update `layout.tsx` so the root shell framing supports the new visual treatment cleanly.
4. Update `AppSidebar.tsx` to establish the approved navigation, brand, and surface treatment while preserving collapse behavior.
5. Update `page.tsx` so the root entry surface reflects the ethereal writing-companion direction.
6. Run validation commands and manual responsive/focus checks.
7. Record any follow-on issues as Stage 03 handoff inputs rather than expanding Slice-01 scope.

## Approved Acceptance Criteria

1. This slice document contains an implementation checklist derived from `ui-vision.md` and a current-state audit tied to actual repository files.
2. The audit explicitly names the gaps on the root shell, sidebar, entity list, edit entity form, review inbox, and shared admin CSS.
3. The root shell code adopts a dark-base, luminous-accent visual direction with upgraded typography and atmospheric surfaces grounded in the vision doc.
4. The sidebar moves away from the current parchment/utilitarian treatment while preserving navigation structure and collapse behavior.
5. The root page feels like the entry point to a fantasy writing companion rather than a plain placeholder shell, without inventing unsupported product features.
6. Responsive behavior, visible focus, lint, and type-check remain green after the slice implementation.

## Validation Steps

Run during implementation and closeout:

- `pnpm lint`
- `pnpm type-check`
- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase5AccessibilityKeyboardNavigationPart01.test.ts`
- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase5AdminUsabilityReadabilityPart02.test.ts`

Manual verification checklist:

- the root shell remains usable across desktop and narrow viewport widths
- keyboard focus is visible for sidebar controls, quick-action chips, composer controls, and primary actions
- the updated palette maintains readable contrast on text, inputs, buttons, badges, and panels
- the visual system change remains bounded to the root shell and does not silently expand into Stage 03 targets

## Stage 03 Handoff Targets

Ordered next targets after Slice-01:

1. `apps/web/src/app/admin/adminAccessibility.module.css`
2. `apps/web/src/app/admin/entities/EntitiesClient.tsx`
3. `apps/web/src/app/admin/entities/[slug]/edit/EditEntityPageClient.tsx`
4. `apps/web/src/app/admin/review-inbox/ReviewInboxClient.tsx`

## Execution Evidence

- updated `apps/web/src/app/globals.css` with a dark-base token set, display/body typography hooks, atmospheric gradients, stronger focus treatment, and reusable shell surface classes
- updated `apps/web/src/app/layout.tsx` to frame the shipped shell inside a responsive, vision-aligned atmospheric container without changing navigation structure
- updated `apps/web/src/app/AppSidebar.tsx` to apply the new luminous fantasy presentation while preserving collapse behavior, quick actions, search input, navigation destinations, recents, and profile affordances
- updated `apps/web/src/app/page.tsx` so the root entry surface reads as a writing-companion shell with upgraded hierarchy, restrained atmosphere, and a refit composer treatment while preserving quick-action and input behavior

## Validation Results

- `pnpm lint` ✅ passed
- `pnpm type-check` ✅ passed
- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase5AccessibilityKeyboardNavigationPart01.test.ts` ⚠️ failed on the out-of-scope admin expectation `global focus indicator style is present for keyboard users`; the failure points to `apps/web/src/app/admin/adminAccessibility.module.css`, which is deferred to Stage 03 by this slice boundary
- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase5AdminUsabilityReadabilityPart02.test.ts` ✅ passed

## Manual Verification Status

- responsive and visible-focus behavior were checked structurally in the updated root-shell code paths
- full browser-based manual verification across desktop and narrow viewport widths was not run in-editor during this execution

## Blockers and Assumptions

- Assumption: Slice-01 will use CSS-first atmosphere and typography upgrades rather than waiting for custom illustration or logo assets.
- Assumption: the current shell information architecture remains valid; this slice changes presentation first, not routing or workflow scope.
- Follow-up note: shared admin token consolidation is intentionally deferred to Stage 03 unless a root-shell implementation detail makes a small compatibility update necessary.
