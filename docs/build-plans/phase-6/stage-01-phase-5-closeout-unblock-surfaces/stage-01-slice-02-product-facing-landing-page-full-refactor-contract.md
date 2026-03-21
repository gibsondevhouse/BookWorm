# Stage 01 Slice 02: Product-Facing Landing Page Full Refactor Contract

## Slice Status

- Status: Completed [x]
- Stage: Phase 6 Stage 01
- Execution type: implementation contract executed with landing-page refactor delivery

## Objective

Define an implementation-ready contract for a full refactor of the web landing page so it functions as a product-facing entry surface, replacing internal tracker/dashboard framing.

## Repository Evidence Baseline

The current root route implementation and style module are the active refactor targets:

- `apps/web/src/app/page.tsx`
- `apps/web/src/app/page.module.css`

Stage 01 planning and tracker artifacts currently exist under:

- `docs/build-plans/phase-6/stage-01-phase-5-closeout-unblock-surfaces/stage-01-phase-5-closeout-unblock-surfaces.md`
- `docs/build-plans/phase-6/phase-6.md`
- `docs/build-plans/master-plan-tracker.md`

## In Scope

- define section-level landing-page architecture with explicit purpose per section
- define product-facing copy intent and prohibited tracker/dashboard framing language
- define CTA contract (label, destination route, user intent) using existing routes only
- define accessibility and responsiveness acceptance checks specific to the landing-page refactor
- define deterministic verification command set required for delivery sign-off

## Out of Scope

- implementing net-new backend APIs or data models
- adding routes that do not already exist in the current app tree
- broad Stage 02 style-system decision work outside landing-page contract needs

## Execution Tasks

1. Produce a section inventory for the refactored landing page:
   - hero/value proposition
   - capability framing
   - trust/proof or workflow-confidence section
   - CTA section with primary and secondary user paths
2. Replace tracker/dashboard terminology with product-facing vocabulary in Stage 01 planning artifacts.
3. Define CTA mapping table with route evidence and intent narrative.
4. Define acceptance criteria and failure conditions for implementation completion.
5. Lock validation steps and command set for Slice Executor handoff.

## Executed Landing-Page Section Architecture

1. Hero / Value Proposition
   - Implemented label: `Build living story worlds with editorial confidence.`
   - Purpose: establish product value in one scan and orient first-time users to BookWorm as an editorial workflow product.
2. Capability Framing
   - Implemented labels: `Structured Codex Editing`, `Editorial Proposal Workflow`, `Continuity Visibility`.
   - Purpose: communicate the three core capability pillars users can act on immediately after entry.
3. Workflow Confidence
   - Implemented sequence: 3-step confidence list covering source-of-truth start, proposal review context, and traceable publishing.
   - Purpose: provide trust/proof framing through a concrete workflow narrative instead of internal status reporting.
4. CTA and Route Selection
   - Implemented section: `Start Your First Session` with two explicit paths.
   - Purpose: convert landing-page intent into immediate product navigation without introducing new routes.

## Product Copy Intent and Prohibited Framing

- Copy intent: present BookWorm as a product entry surface focused on codex authoring, review flow, and continuity governance.
- Prohibited language in landing-page copy: `tracker`, `dashboard`, `snapshot`, `readout`, and other internal-only planning terminology.
- Enforcement check: root route copy in `apps/web/src/app/page.tsx` uses product narrative blocks and route intent, not planning/status phrasing.

## CTA Mapping (Executed)

| CTA role | Label | Route | Intent | Route rationale |
| --- | --- | --- | --- | --- |
| Primary | Primary Path: Open Entity Workspace | `/admin/entities` | Start codex creation and editing work immediately. | Existing admin entity route already supports core authoring flow and is the lowest-friction starting point. |
| Secondary | Secondary Path: Review Incoming Proposals | `/admin/review-inbox` | Triage and process pending editorial proposals. | Existing review inbox route is the correct proposal intake and decision surface. |

Route evidence is present in `apps/web/src/app/page.tsx` via `Link` targets that resolve to existing app routes.

## Approved Acceptance Criteria

1. Stage 01 planning artifacts describe Stage 01 as a full landing-page refactor target, not a dashboard-unblock verification target.
2. The landing-page refactor contract includes a section architecture with at least four named sections and purpose statements.
3. The contract includes a CTA map with:
   - a primary CTA route
   - a secondary CTA route
   - route rationale tied to existing route structure
4. The contract explicitly bans internal-only tracker/dashboard framing in landing-page copy intent.
5. Validation commands and completion checks are listed and executable without adding new infrastructure.

## Validation Steps

Run the following during implementation and closeout:

- `pnpm lint`
- `pnpm type-check`
- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase6Stage01Slice01ExecutionPack.test.ts`

Manual verification checklist at implementation closeout:

- root route (`/`) presents product-facing narrative blocks, not internal tracker framing
- all CTA links from root route resolve to existing destinations
- mobile layout remains readable and operable at narrow viewport widths
- keyboard focus order for CTA controls is visible and logical

## Handoff to Stage 02

Provide these locked outputs to Stage 02:

- landing-page section architecture and copy intent summary
- CTA mapping table and route rationale
- styling implications list (typography hierarchy, spacing rhythm, emphasis patterns)
- unresolved decisions list with owner and due date

## Blockers and Assumptions

- Assumption: existing route destinations used by landing-page CTAs remain available during Stage 01 execution.
- Assumption: Stage 01 implementation remains bounded to root route surface and does not expand into Stage 02 global styling scope.
- Blocker condition: if required CTA destinations are renamed or removed, Stage 01 slice must be re-baselined before implementation.
