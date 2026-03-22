# Stage-f1-03: Admin Surface Cohesion

**Status:** [-] In progress  
**Phase:** Phase-f-1  
**Depends on:** Stage-f1-02 complete  
**Target files:** admin frontend routes/components under `apps/web/src/app/admin/`, shared frontend UI primitives under `apps/web/src/`

---

## Purpose

Stage-f1-03 aligns admin route presentation with the chat/root-shell frontend system by introducing
shared frontend composition patterns and reducing one-off admin surface divergence.

---

## Repository Evidence Baseline

| File | Relevant State |
|---|---|
| `apps/web/src/app/admin/entities/EntitiesClient.tsx` | Large client component with local interaction logic and dedicated CSS module class usage |
| `apps/web/src/app/admin/review-inbox/ReviewInboxClient.tsx` | Similar pattern: large local stateful component with repeated structural patterns |
| `apps/web/src/app/admin/review/[proposalId]/ProposalReviewClient.tsx` | Dialog and review layout patterns overlap with other admin surfaces but are independently authored |
| `apps/web/src/app/admin/adminAccessibility.module.css` | Admin styles are centralized but not yet explicitly harmonized with root shell tokens and composition primitives |

---

## Scope

| # | Item | Change Surface |
|---|---|---|
| 1 | Define reusable admin shell/layout primitives (headers, summary panels, section cards) | `apps/web/src/` shared frontend modules + admin route integration |
| 2 | Consolidate repeated interaction-presentational patterns without changing backend contracts | admin client components |
| 3 | Preserve accessibility patterns while improving consistency with active frontend shell language | admin client components + supporting styles |

Out of scope: admin API behavior changes, proposal workflow business-logic ownership, schema updates.

---

## Current State After Slice-01 Completion

| File | Relevant State |
|---|---|
| `apps/web/src/features/admin-surface/components/AdminSurfaceShell.tsx` | Shared shell primitive now exists for admin route composition |
| `apps/web/src/features/admin-surface/components/AdminSurfaceHeader.tsx` | Shared header primitive now exists for route title/description framing |
| `apps/web/src/features/admin-surface/components/AdminSurfaceSectionCard.tsx` | Shared section-card primitive now exists for repeated admin content regions |
| `apps/web/src/features/admin-surface/components/AdminSurfaceSummaryPanel.tsx` | Shared summary-panel primitive now exists for route-level summaries and status framing |
| `apps/web/src/app/admin/entities/EntitiesClient.tsx` | Entities route now adopts the shared primitives while preserving search, sort, selection, and dialog behavior |
| `apps/web/src/app/admin/review-inbox/ReviewInboxClient.tsx` | Review inbox now adopts the shared primitives while preserving filter, listbox, live-region, and review-dialog behavior |
| `apps/web/src/app/admin/review/[proposalId]/ProposalReviewClient.tsx` | Proposal review route still uses local shell/dialog framing and is the remaining Stage-f1-03 adoption target |

## Slices

### Slice-01: [Admin Surface Primitive Extraction and Entities/Inbox Adoption](./stage-f1-03-slice-01-admin-surface-primitive-extraction-and-entities-inbox-adoption.md)

**Status:** [x] Completed  
**Approval:** Approved for execution

This slice extracts shared admin shell/layout primitives and adopts them in the entities and review
inbox admin surfaces without changing backend contracts.

### Slice-02: [Proposal Review Surface Alignment and Regression Pass](./stage-f1-03-slice-02-proposal-review-surface-alignment-and-regression-pass.md)

**Status:** [ ] Not started  
**Approval:** Pending human approval for execution

This slice adopts the shared admin primitives in the proposal review route and closes the remaining
Stage-f1-03 regression pass for dialog, focus-trap, and decision shortcut behavior.

---

## Dependencies

- Stage-f1-02 must be complete so route and sidebar semantics are stable before admin cohesion work.

---

## Acceptance Criteria

1. Entities, review inbox, and proposal review routes all reuse shared frontend primitives rather than duplicating route shell structure.
2. Existing keyboard/focus behavior remains functionally equivalent across the targeted admin routes after extraction and alignment.
3. Visual hierarchy between admin surfaces and root shell is coherent without introducing backend coupling.
4. No modifications occur outside `apps/web`.
5. `pnpm lint` and `pnpm type-check` pass after stage completion.

## Validation Record (current stage execution evidence)

This record reflects checks run through Stage-f1-03 Slice-01 completion. Additional verification for
proposal review alignment remains pending until Slice-02 executes and the stage is signed off.

- [x] `pnpm lint` (exit 0)
- [x] `pnpm type-check` (exit 0)
- [x] `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase5AccessibilityKeyboardNavigationPart01.test.ts` (exit 0)
- [x] `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase5AdminUsabilityReadabilityPart02.test.ts` (exit 0)
- [ ] Manual smoke test: entities, review inbox, and proposal review routes retain expected keyboard flows. (recommended, not executed in Slice-01 run)
- [ ] Manual smoke test: extracted primitives render consistently across targeted admin routes. (recommended, not executed in Slice-01 run)
- [ ] Proposal review route alignment and regression validation remain pending Slice-02 execution.
