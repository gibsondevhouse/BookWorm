# Phase-f-1: Frontend Surface Architecture and Navigation Readiness

**Status:** [-] In progress  
**Track:** Frontend (`apps/web`)  
**Depends on:** Phase-f-0 complete

---

## Purpose

Phase-f-1 converts the Phase-f-0 interaction baseline into a maintainable frontend structure across
`apps/web`. The phase is focused on:

1. reducing monolithic UI files in the chat surface,
2. tightening sidebar navigation behavior and state handling,
3. aligning admin UI shell patterns with the active frontend visual system.

This phase remains frontend-only and does not add backend/API/schema ownership.

---

## Repository Evidence Baseline

All planning decisions in Phase-f-1 are anchored in repository state snapshots.

### Pre-slice baseline (at planning kickoff, March 21, 2026)

| File | Relevant State |
|---|---|
| `apps/web/src/app/page.tsx` | Single large client component handling hero, message list rendering, quick-chip behavior, textarea sizing, and send button logic in one file |
| `apps/web/src/app/AppSidebar.tsx` | Sidebar state (`isCollapsed`, `isCodexOpen`), nav groups, and recent items are all local/hardcoded; no route-aware active-link treatment |
| `apps/web/src/app/layout.tsx` | Root shell composes sidebar + main panel correctly and is the stable wrapper surface for further frontend-only refinements |
| `apps/web/src/app/admin/*` clients | Admin surfaces use a separate CSS module and local interaction patterns that are not yet aligned with the chat/root-shell composition model |
| `apps/web/src/app/globals.css` | Frontend tokens and shell styles exist and are usable for shared surface cohesion work |

### Current state after Stage-f1-03 Slice-01 completion

| File | Relevant State |
|---|---|
| `apps/web/src/app/page.tsx` | Orchestrates chat state and delegates rendering/compose responsibilities to extracted feature components |
| `apps/web/src/features/chat-surface/components/ChatMessages.tsx` | Owns chat message + hero empty-state rendering surface extracted from `page.tsx` |
| `apps/web/src/features/chat-surface/components/ChatComposer.tsx` | Owns composer UI and keyboard/button submit wiring through shared submit handling from `page.tsx` |
| `apps/web/src/features/chat-surface/types/ChatMessage.ts` | Centralized chat message type used by extracted chat-surface components |
| `apps/web/src/app/AppSidebar.tsx` | Consumes extracted navigation configuration and route-derived active-link semantics, including collapsed-mode navigation parity and keyboard/accessible-state hardening from Stage-f1-02 Slice-02 |
| `apps/web/src/app/sidebarNavigationConfig.ts` | New sidebar navigation configuration module introduced during Stage-f1-02 Slice-01 |
| `apps/web/src/app/sidebarRouteState.ts` | New route-state helper module introduced during Stage-f1-02 Slice-01 for active-link state derivation |
| `apps/web/src/features/admin-surface/components/*` | Shared admin shell/header/section-card/summary primitives now exist for repeated admin surface composition |
| `apps/web/src/app/admin/entities/EntitiesClient.tsx` | Entities route now uses the shared admin primitives while preserving search, sort, selection, and edit-dialog interaction behavior |
| `apps/web/src/app/admin/review-inbox/ReviewInboxClient.tsx` | Review inbox now uses the shared admin primitives while preserving filter, listbox, live-region, and review-dialog interaction behavior |
| `apps/web/src/app/admin/review/[proposalId]/ProposalReviewClient.tsx` | Proposal review surface remains the outstanding Stage-f1-03 adoption target for the next slice |

---

## Stage Breakdown

### Stage-f1-01: Chat Surface Modularization

**Status:** [x] Completed  
**Doc:** [stage-f1-01-chat-surface-modularization.md](./stage-f1-01-chat-surface-modularization/stage-f1-01-chat-surface-modularization.md)

### Stage-f1-02: Sidebar Navigation State Alignment

**Status:** [x] Completed  
**Doc:** [stage-f1-02-sidebar-navigation-state-alignment.md](./stage-f1-02-sidebar-navigation-state-alignment/stage-f1-02-sidebar-navigation-state-alignment.md)

### Stage-f1-03: Admin Surface Cohesion

**Status:** [-] In progress  
**Doc:** [stage-f1-03-admin-surface-cohesion.md](./stage-f1-03-admin-surface-cohesion/stage-f1-03-admin-surface-cohesion.md)

---

## Dependencies

- Phase-f-0 must remain complete and stable before Phase-f-1 execution starts.
- Stage-f1-02 depends on Stage-f1-01 completion to avoid concurrent churn in root-level shell state
  ownership while chat modularization is in progress.
- Stage-f1-03 depends on Stage-f1-02 completion to reuse finalized navigation/shell patterns across
  admin routes.

---

## Out of Scope

- Backend/API route changes under `apps/api`
- Prisma schema or migrations under `prisma/`
- Database seeding or portability script ownership under `scripts/`
- Any non-frontend phase tracker updates outside `docs/build-plans/frontend-dev/`

---

## Acceptance Criteria

1. Phase-f-1 has stage-level planning docs for Stage-f1-01 through Stage-f1-03.
2. Stage-f1-01 includes at least one executable slice document with implementation-ready acceptance
   criteria.
3. All scope and target files remain within `apps/web`.
4. `frontend-plan-tracker.md` includes synchronized Phase-f-1 phase/stage/slice statuses that match the linked planning docs.
5. Each phase/stage doc contains a repository evidence baseline and explicit dependency notes.

---

## Validation Checklist

- [ ] `pnpm lint`
- [ ] `pnpm type-check`
- [ ] Confirm all new links under `docs/build-plans/frontend-dev/phase-f-1/` resolve.
- [ ] Confirm tracker statuses are synchronized with each new doc header.
