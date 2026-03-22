# Stage-f1-01 Slice-01: Chat Surface Component Extraction and Submit Flow

**Slice ID:** Stage-f1-01-Slice-01  
**Status:** [x] Completed  
**Approval:** Approved for execution  
**Stage:** Stage-f1-01 (Chat Surface Modularization)  
**Phase:** Phase-f-1  
**Target files:**
- `apps/web/src/app/page.tsx`
- new chat surface files under `apps/web/src/` (component and/or hook extraction)

---

## What This Slice Delivers

This slice establishes the first executable modernization step for the chat surface:

1. Extracts hero/message rendering and composer behavior out of the monolithic `page.tsx`.
2. Introduces a shared submit handler used by both icon-click and keyboard submit paths.
3. Preserves all Phase-f-0 UX contracts (hero collapse, quick-chip seeding, textarea resize).

This is an atomic slice for Stage-f1-01 and should be completed before Stage-f1-02 begins.

---

## Repository Evidence Baseline

Pre-execution baseline at planning kickoff (March 21, 2026):

| File | Evidence |
|---|---|
| `apps/web/src/app/page.tsx` | Chat behaviors and rendering are currently co-located in one component, increasing refactor risk and reducing testability |
| `apps/web/src/app/page.tsx` | Current send path is button-click based; keyboard submit behavior is not formalized in the same handler flow |
| `apps/web/src/app/globals.css` | Existing style classes (`composer-panel`, `composer-field`, `quick-chip`, `prose-shell`) are sufficient for extraction without new design token work |

---

## Dependencies

- Stage-f0-03 behavior must remain intact and serves as baseline parity criteria.
- No backend endpoints or schema ownership is required for this slice.

---

## Acceptance Criteria

1. `page.tsx` delegates chat rendering responsibilities to extracted named units (components and/or
   hooks) rather than owning all JSX and interaction logic directly.
2. A single submit function handles message dispatch for both:
   1. send icon button click
   2. keyboard submit (Enter)
3. Keyboard behavior follows:
   1. Enter without Shift submits when input is non-empty
   2. Shift+Enter inserts newline and does not submit
4. Quick-chip buttons still seed the textarea value, recalculate textarea height, and focus the
   textarea after click.
5. Empty-state hero remains visible only while `messages.length === 0` and is absent once a message
   exists.
6. Textarea reset behavior after submit remains intact (`value` cleared and height reset).
7. No files outside `apps/web` are modified for this slice.
8. Lint and type-check pass:
   1. `pnpm lint`
   2. `pnpm type-check`

---

## Validation Record (validated during execution)

This record reflects checks run during Slice-01 execution and completion sign-off. It is an auditable completion log, not a blanket guarantee for future repository changes.

- [x] `pnpm lint`
- [x] `pnpm type-check`
- [x] Manual smoke test: click send icon adds user message and clears input.
- [x] Manual smoke test: Enter submits; Shift+Enter keeps multiline content.
- [x] Manual smoke test: hero disappears immediately after first submitted message.
- [x] Manual smoke test: quick-chip still sets value and restores input focus.

---

## Out of Scope

- Streaming assistant responses
- Message persistence or history loading
- API contract or transport changes
- Admin route changes
