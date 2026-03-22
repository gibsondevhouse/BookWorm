# Stage-f1-03 Slice-02: Proposal Review Surface Alignment and Regression Pass

**Slice ID:** Stage-f1-03-Slice-02  
**Status:** [ ] Not started  
**Approval:** Pending human approval for execution  
**Stage:** Stage-f1-03 (Admin Surface Cohesion)  
**Phase:** Phase-f-1  
**Depends on:** Stage-f1-03 Slice-01 complete  
**Target files (apps/web only):**
- `apps/web/src/app/admin/review/[proposalId]/ProposalReviewClient.tsx`
- `apps/web/src/app/admin/adminAccessibility.module.css`
- existing shared admin surface primitive files under `apps/web/src/features/admin-surface/components/` only if proposal review alignment requires small primitive refinements

---

## What This Slice Delivers

This slice closes Stage-f1-03 by adopting the shared admin surface primitives in the proposal
review route and running the remaining regression pass for the last admin surface that still owns
its own shell and section framing.

Primary outcomes:

1. `ProposalReviewClient.tsx` adopts the shared admin shell/header/section-card structure introduced
   in Slice-01.
2. Proposal review dialog, focus-trap behavior, and decision shortcut handling remain functionally
   equivalent after the structural alignment.
3. Stage-f1-03 ends with all three targeted admin surfaces using the same composition primitives
   without introducing backend or schema changes.

This is the next executable frontend slice after Stage-f1-03 Slice-01 completion.

---

## Repository Evidence Baseline

Baseline captured after Slice-01 completion (March 21, 2026):

| File | Evidence |
|---|---|
| `apps/web/src/app/admin/review/[proposalId]/ProposalReviewClient.tsx` | Proposal review still renders its own page shell, dialog framing, and repeated section-card markup directly against the CSS module |
| `apps/web/src/features/admin-surface/components/AdminSurfaceShell.tsx` | Shared admin shell primitive now exists and is already adopted by entities and review inbox |
| `apps/web/src/features/admin-surface/components/AdminSurfaceHeader.tsx` | Shared admin header primitive now exists for consistent route title/description framing |
| `apps/web/src/features/admin-surface/components/AdminSurfaceSectionCard.tsx` | Shared section-card primitive now exists for repeated admin content regions |
| `apps/web/src/app/admin/adminAccessibility.module.css` | Shared admin style module still owns dialog, meta row, section, action, and focus-state classes needed for proposal review parity |

---

## Dependencies

- Stage-f1-03 Slice-01 is complete and provides the shared admin surface primitives already proven in
  entities and review inbox.
- No backend endpoints, API handlers, database schema updates, or data-shape changes are required
  for this slice.

---

## Acceptance Criteria

1. Shared primitive adoption in proposal review:
   1. `apps/web/src/app/admin/review/[proposalId]/ProposalReviewClient.tsx` adopts the extracted
      admin surface primitives for top-level route framing and repeated content regions.
   2. Any primitive refinements remain small, reusable, and limited to `apps/web/src/features/admin-surface/components/`.
   3. Route-specific business behavior stays inside proposal review and is not pushed into the shared
      primitives.

2. Dialog and keyboard/focus parity:
   1. Existing focus-trap behavior remains intact, including initial focus placement, Tab/Shift+Tab
      cycling, and Escape handling.
   2. Existing keyboard shortcuts remain intact, including Alt+A, Alt+D, and Alt+E decision flows.
   3. Decision-note input and decision action controls remain reachable in a logical keyboard order.

3. Semantic and readability continuity:
   1. Proposal review continues to expose dialog semantics and labeled descriptive text for review
      instructions.
   2. Section titles and grouped content remain clear after primitive adoption.
   3. Shared admin surface treatment remains visually coherent with the entities and review inbox
      routes.

4. Change boundary and contract safety:
   1. All implementation edits remain limited to `apps/web`.
   2. No backend contract changes occur: no admin API changes, no route-handler changes, no schema
      updates, and no data-shape changes required from `apps/api`.
   3. Stage-f1-03 completes only when this slice is complete and the stage tracker is synchronized.

5. Validation readiness:
   1. `pnpm lint` passes.
   2. `pnpm type-check` passes.
   3. Targeted admin accessibility/usability regression coverage is rerun after the proposal review
      alignment.

---

## Validation Checklist

- [ ] `pnpm lint`
- [ ] `pnpm type-check`
- [ ] `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase5AccessibilityKeyboardNavigationPart01.test.ts`
- [ ] `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase5AdminUsabilityReadabilityPart02.test.ts`
- [ ] Manual smoke check: proposal review dialog still traps focus correctly and restores expected keyboard navigation behavior.
- [ ] Manual smoke check: decision shortcuts and action buttons still produce the expected review-state messaging.
- [ ] Manual smoke check: proposal review now matches the shared admin shell/header/section-card presentation used by entities and review inbox.

---

## Out of Scope

- Review workflow business-logic redesign or server-side proposal state changes.
- Admin API contract changes, Prisma updates, or database migrations.
- New admin routes beyond the existing proposal review surface.
- Non-frontend repository changes outside `apps/web`.