# Stage-f1-03 Slice-01: Admin Surface Primitive Extraction and Entities/Inbox Adoption

**Slice ID:** Stage-f1-03-Slice-01  
**Status:** [x] Completed  
**Approval:** Approved for execution  
**Stage:** Stage-f1-03 (Admin Surface Cohesion)  
**Phase:** Phase-f-1  
**Depends on:** Stage-f1-02 complete  
**Target files (apps/web only):**
- `apps/web/src/app/admin/entities/EntitiesClient.tsx`
- `apps/web/src/app/admin/review-inbox/ReviewInboxClient.tsx`
- `apps/web/src/app/admin/adminAccessibility.module.css`
- `apps/web/src/features/admin-surface/components/AdminSurfaceShell.tsx`
- `apps/web/src/features/admin-surface/components/AdminSurfaceHeader.tsx`
- `apps/web/src/features/admin-surface/components/AdminSurfaceSectionCard.tsx`
- `apps/web/src/features/admin-surface/components/AdminSurfaceSummaryPanel.tsx`

---

## What This Slice Delivers

This slice establishes the first executable step for Stage-f1-03 by extracting reusable admin
surface primitives and adopting them in the two admin routes with the clearest repeated structural
patterns today: entities and review inbox.

Primary outcomes:

1. Shared admin shell/layout primitives exist for repeated page-level structure such as route
   headers, section cards, and summary panels.
2. `EntitiesClient.tsx` and `ReviewInboxClient.tsx` adopt those primitives instead of continuing to
   own duplicated structural markup.
3. Existing keyboard and focus behaviors remain functionally equivalent after the extraction,
   including route-level shortcuts, list navigation, and dialog focus management.
4. No backend or API contract changes are introduced while improving frontend admin cohesion.

This is the next executable frontend slice after Stage-f1-02 completion and should be completed
before Stage-f1-03 Slice-02 begins.

---

## Repository Evidence Baseline

Baseline captured at planning time (March 21, 2026):

| File | Evidence |
|---|---|
| `apps/web/src/app/admin/entities/EntitiesClient.tsx` | Route owns its own page shell, controls region, summary panel, and table section structure inside one large client component |
| `apps/web/src/app/admin/review-inbox/ReviewInboxClient.tsx` | Route repeats the same page shell and summary/section framing patterns while keeping its own list and dialog interactions |
| `apps/web/src/app/admin/adminAccessibility.module.css` | Shared admin style tokens already include header, controls row, summary panel, section card, list, table, and dialog classes that can support primitive extraction without backend work |

---

## Dependencies

- Stage-f1-02 is complete, so sidebar and shell semantics are stable enough to reuse while aligning
  admin route composition.
- No backend endpoints, API handlers, database schema, or portability flows are required for this
  slice.

---

## Acceptance Criteria

1. Shared admin shell/layout primitive extraction:
   1. Reusable frontend primitives are introduced for at least the repeated admin page header,
      summary panel, and section-card/container structure.
   2. Extracted primitives live only under `apps/web/src/` and are named/scoped specifically for
      admin surface composition.
   3. Primitive extraction does not absorb route-specific business behavior such as entity-table
      selection logic, review-inbox filtering logic, or dialog decision handling.

2. Entities route adoption:
   1. `apps/web/src/app/admin/entities/EntitiesClient.tsx` adopts the extracted primitives for its
      top-level page framing and repeated structural regions.
   2. Existing entity interactions remain intact, including search, sort toggle, working-set
      summary, row selection, keyboard row navigation, and edit-dialog entry points.
   3. Entity route content hierarchy remains clear after extraction, with headings and section
      labeling preserved or improved.

3. Review inbox route adoption:
   1. `apps/web/src/app/admin/review-inbox/ReviewInboxClient.tsx` adopts the same extracted
      primitives for top-level page framing and repeated structural regions.
   2. Existing inbox interactions remain intact, including search, status filtering, queue summary,
      arrow-key list navigation, and proposal review dialog entry points.
   3. Review inbox live-region and listbox semantics remain present after the structural refactor.

4. Keyboard and focus behavior preservation:
   1. Entities keyboard flows remain functionally equivalent, including `Alt+N`, row navigation via
      arrow keys, Space-based row selection, Enter-to-edit, and dialog focus return to the trigger.
   2. Review inbox keyboard flows remain functionally equivalent, including `Alt+I`, arrow-key
      focused-row movement, Enter-to-open-review, Escape-to-close dialog, and trapped Tab behavior
      inside the dialog.
   3. No new keyboard trap, focus loss, or inaccessible heading/region regression is introduced by
      the primitive adoption.

5. Change boundary and contract safety:
   1. All implementation edits remain limited to `apps/web`.
   2. No backend contract changes occur: no admin API changes, no route-handler changes, no schema
      updates, and no data-shape changes required from `apps/api`.
   3. Proposal review route alignment remains deferred to Stage-f1-03 Slice-02.

6. Validation readiness:
   1. `pnpm lint` passes.
   2. `pnpm type-check` passes.


## Validation Record (validated during execution)

This record reflects checks run during Slice-01 execution and completion sign-off. It is an auditable completion log, not a blanket guarantee for future repository changes.

- [x] `pnpm lint` (exit 0)
- [x] `pnpm type-check` (exit 0)
- [x] `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase5AccessibilityKeyboardNavigationPart01.test.ts` (exit 0)
- [x] `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase5AdminUsabilityReadabilityPart02.test.ts` (exit 0)
- [ ] Manual smoke check: entities route still supports search, sort, row selection, arrow-key row movement, Enter-to-edit, and dialog close/focus return. (recommended, not executed in this run)
- [ ] Manual smoke check: review inbox still supports search, status filtering, arrow-key focused-row movement, Enter-to-open-review, and dialog Escape/Tab behavior. (recommended, not executed in this run)
- [ ] Manual smoke check: extracted admin header, summary, and section-card primitives render consistently across entities and review inbox. (recommended, not executed in this run)
- [ ] Manual smoke check: no network/backend contract changes were required to load or operate the targeted admin surfaces. (recommended, not executed in this run)

---

## Out of Scope

- `apps/web/src/app/admin/review/[proposalId]/ProposalReviewClient.tsx` adoption or proposal review
  surface alignment work beyond preserving compatibility with shared styles.
- Any redesign of admin information architecture, workflow rules, or route ownership.
- Backend/API/schema changes, including admin endpoints, Prisma updates, or contract reshaping.
- Non-frontend repository changes outside `apps/web`.

---

## Execution Notes

- Added shared admin primitives under `apps/web/src/features/admin-surface/components/`: `AdminSurfaceShell.tsx`, `AdminSurfaceHeader.tsx`, `AdminSurfaceSectionCard.tsx`, and `AdminSurfaceSummaryPanel.tsx`.
- Adopted the shared primitives in `apps/web/src/app/admin/entities/EntitiesClient.tsx` and `apps/web/src/app/admin/review-inbox/ReviewInboxClient.tsx`.
- Updated `apps/web/src/app/admin/adminAccessibility.module.css` to support the extracted admin surface structure while preserving existing admin interaction classes.