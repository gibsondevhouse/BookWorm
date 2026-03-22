# Stage-f1-01: Chat Surface Modularization

**Status:** [x] Completed  
**Phase:** Phase-f-1  
**Target files:** `apps/web/src/app/page.tsx`, new chat UI modules under `apps/web/src/`

---

## Purpose

Stage-f1-01 breaks the chat surface into maintainable frontend units while preserving the
Phase-f-0 interaction behavior. The stage removes single-file ownership pressure from
`page.tsx` and standardizes send/submit interaction paths.

---

## Repository Evidence Baseline

Pre-execution baseline at planning kickoff (March 21, 2026):

| File | Relevant State |
|---|---|
| `apps/web/src/app/page.tsx` | Hero empty state, message rendering, quick-chip seeding, textarea sizing, and submit behavior are tightly coupled in one component |
| `apps/web/src/app/page.tsx` | Send is click-only; keyboard submit flow is not defined as a first-class interaction contract |
| `apps/web/src/app/globals.css` | Message and composer styling primitives already exist and can be reused during component extraction |

---

## Scope

| # | Item | Change Surface |
|---|---|---|
| 1 | Extract chat message list and empty-state hero rendering into dedicated components | `apps/web/src/` chat component files + `page.tsx` integration |
| 2 | Extract composer controls and submit behavior into a dedicated component or hook | `apps/web/src/` chat component/hook files + `page.tsx` integration |
| 3 | Normalize submit flow so click and keyboard path share one handler | `page.tsx` + extracted chat modules |
| 4 | Preserve existing quick-chip seed + textarea auto-resize behavior after extraction | extracted chat modules |

Out of scope: backend chat streaming, persistence, API contract changes.

---

## Slices

### Slice-01: Chat Surface Component Extraction and Submit Flow

**Status:** [x] Completed  
**Doc:** [stage-f1-01-slice-01-chat-surface-component-extraction-and-submit-flow.md](./stage-f1-01-slice-01-chat-surface-component-extraction-and-submit-flow.md)

---

## Dependencies

- Phase-f-0 Stage-f0-03 must remain complete because this stage preserves (not redefines)
  quick-chip and empty-state behavior.
- No package installs are required for Slice-01.

---

## Acceptance Criteria

1. Chat shell logic in `page.tsx` is reduced through extraction of message/hero and composer
   responsibilities into named frontend units.
2. Submit behavior is handled through one shared function used by both send button and keyboard
   interaction.
3. Existing Phase-f-0 behavior remains intact: hero collapse rules, quick-chip seeding, and
   textarea auto-resize.
4. No backend or schema changes are introduced.
5. `pnpm lint` and `pnpm type-check` pass after stage slice completion.

---

## Validation Record (validated during execution)

This record reflects checks run during Stage-f1-01 execution and completion sign-off. It is an auditable completion log, not a blanket guarantee for future repository changes.

- [x] `pnpm lint`
- [x] `pnpm type-check`
- [x] Manual smoke test: empty hero renders with no messages and collapses after first send.
- [x] Manual smoke test: send works via icon button and Enter key path (Shift+Enter remains newline).

---

## Risk Notes

- Extracting UI code can accidentally change class composition; preserve all existing Tailwind class
  contracts while moving JSX.
- Keyboard submit must not break multiline authoring behavior; Enter and Shift+Enter handling must
  be explicit.
