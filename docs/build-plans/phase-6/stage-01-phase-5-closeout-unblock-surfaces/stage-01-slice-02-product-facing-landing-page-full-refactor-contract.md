# Stage 01 Slice 02: Landing-Page Stabilization Contract

## Slice Status

- Status: Completed [x]
- Stage: Phase 6 Stage 01
- Execution type: implementation contract executed with landing-shell stabilization delivery

## Objective

Define the implementation-ready contract that matches the shipped Stage 01 milestone: stabilize the root web surface as a two-column chat-style shell and explicitly defer any broader product-facing landing-page refactor work.

## Repository Evidence Baseline

The current shipped shell is implemented in these files:

- `apps/web/src/app/page.tsx`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/AppSidebar.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/postcss.config.ts`

Stage 01 planning and tracker artifacts currently exist under:

- `docs/build-plans/phase-6/stage-01-phase-5-closeout-unblock-surfaces/stage-01-phase-5-closeout-unblock-surfaces.md`
- `docs/build-plans/phase-6/phase-6.md`
- `docs/build-plans/master-plan-tracker.md`

## In Scope

- stabilize the root layout shell and sidebar framing used by the landing surface
- document the chat-style empty-state and input-shell baseline rendered by the root route
- capture the shared theme/token baseline in `globals.css` and the Tailwind CSS v4 setup in `postcss.config.ts`
- define accessibility and responsiveness checks appropriate to the shipped shell implementation
- record that broader marketing/CTA landing-page requirements are deferred, not delivered

## Out of Scope

- implementing hero, proof, CTA, or other product-marketing sections that do not exist in the current root route
- adding routes, backend APIs, or data models that are not already present in the app tree
- broad Stage 02 style-system decision work outside the current shell baseline

## Execution Tasks

1. Stabilize the root two-column shell in `layout.tsx` so the sidebar and main surface render consistently.
2. Implement the sidebar navigation/state baseline in `AppSidebar.tsx` for the shell now used across the root surface.
3. Implement the landing surface in `page.tsx` as a chat-style empty state with quick-action chips and an input/send control row.
4. Consolidate the color, typography, and spacing baseline in `globals.css` with Tailwind CSS v4 tokens/utilities.
5. Lock acceptance criteria and validation steps around the shipped shell, and explicitly defer broader refactor requirements.

## Executed Shell Baseline

1. Root Layout Shell
   - Implemented in `apps/web/src/app/layout.tsx`.
   - Purpose: provide a fixed two-column frame with sidebar and main content regions.
2. Sidebar Navigation Baseline
   - Implemented in `apps/web/src/app/AppSidebar.tsx`.
   - Purpose: provide stable navigation, search, collections, recents, and collapsed-state behavior for the shell.
3. Chat-Style Landing Surface
   - Implemented in `apps/web/src/app/page.tsx`.
   - Purpose: provide an empty-state chat surface with quick-action chips and an input/send row rather than marketing sections.
4. Global Styling Baseline
   - Implemented in `apps/web/src/app/globals.css` with Tailwind CSS v4 configured through `apps/web/postcss.config.ts`.
   - Purpose: centralize tokens, typography, paper/background treatment, and utility availability for the current shell.

## Scope Rebaseline Note

This slice supersedes the earlier claim that Stage 01 delivered a full product-facing landing-page refactor. The shipped implementation is a stable app shell, not a hero/CTA marketing page, and downstream planning must treat broader landing-page refactor work as deferred until separately approved.

## Approved Acceptance Criteria

1. Stage 01 planning artifacts describe Stage 01 as landing-shell stabilization, not a completed marketing/CTA refactor.
2. The contract references the actual shipped implementation files: `page.tsx`, `layout.tsx`, `AppSidebar.tsx`, `globals.css`, and `postcss.config.ts`.
3. The root route renders a chat-style empty state, quick-action chips, and an input/send row without claiming unimplemented hero or CTA sections.
4. Shared theme and layout primitives are sourced from `globals.css` and the Tailwind CSS v4 setup, not a local `page.module.css` contract.
5. Validation commands and completion checks are listed and executable without adding new infrastructure.

## Validation Steps

Run the following during implementation and closeout:

- `pnpm lint`
- `pnpm type-check`

Manual verification checklist at implementation closeout:

- root layout renders the sidebar/main two-column shell without overlap or overflow regressions
- root route (`/`) presents the implemented chat-style surface and input row consistently
- mobile and narrow viewport layouts remain readable and operable
- keyboard focus order for sidebar controls, quick-action chips, textarea, and send button is visible and logical

## Handoff to Stage 02

Provide these locked outputs to Stage 02:

- shell structure summary (`layout.tsx`, `AppSidebar.tsx`, `page.tsx`)
- styling implications list (typography hierarchy, spacing rhythm, sidebar states, input-row emphasis patterns)
- global token and Tailwind CSS v4 baseline summary (`globals.css`, `postcss.config.ts`)
- unresolved decisions list with owner and due date

## Blockers and Assumptions

- Assumption: the current root-shell implementation remains the canonical frontend baseline until a later Phase 6 slice explicitly replaces it.
- Assumption: Stage 01 implementation remains bounded to root-shell stabilization and does not expand into Stage 02 global styling rollout scope.
- Blocker condition: if product-owner approval requires hero/CTA marketing sections, that work must be planned as a new slice rather than retroactively claimed here.
