# Stage-f0-01: Composer Interaction Baseline

**Status:** [x] Completed  
**Phase:** Phase-f-0  
**Target files:** `apps/web/src/app/page.tsx`, `apps/web/src/app/globals.css`

---

## Purpose

Make the composer feel like a real manuscript input surface. The current state has a static
single-row textarea, a visible border that duplicates the panel boundary, no focus feedback,
a text-label Send CTA that compresses input width, and no line-height treatment.

This stage ships six interaction improvements in a single slice. All changes are confined to
`page.tsx` and `globals.css`.

---

## Scope (Items 1–6)

| # | Item | Change Surface |
|---|---|---|
| 1 | Auto-expanding textarea | `page.tsx` — React ref + `onChange` height recalculation |
| 2 | Borderless composer input | `page.tsx` JSX + `globals.css` `.composer-field` |
| 3 | Spectral typography with `leading-loose` | `globals.css` `.font-body` + `page.tsx` textarea class |
| 4 | Floating action bar (send icon) | `page.tsx` — restructure composer row, absolute-position send |
| 5 | Ghostly icon controls | `page.tsx` — SVG send icon + `opacity-50 hover:opacity-100` on both icons |
| 6 | Focus-glow on `.composer-panel` | `globals.css` — `:focus-within` background + glow rule |

Out of scope for this stage: message dispatch wiring (Stage-f0-02), quick-chip seeding
(Stage-f0-03), settings popover (future phase).

---

## Slices

### Slice-01: Composer Interaction and Typography Baseline

**Status:** [x] Completed  
**Doc:** [stage-f0-01-slice-01-composer-interaction-and-typography-baseline.md](./stage-f0-01-slice-01-composer-interaction-and-typography-baseline.md)

This slice delivers all six items in one atomic commit. The changes are tightly coupled — the
auto-expanding textarea, the floating send button, the borderless style, and the focus-glow all
form a single interaction contract. Splitting them would leave the composer in an inconsistent
intermediate state.

---

## Exit Criteria

Stage-f0-01 is complete when:

1. ✅ Slice-01 is marked `[x]` in this document and in `frontend-plan-tracker.md`.
2. `pnpm lint` exits 0.
3. `pnpm type-check` exits 0.
4. All six acceptance criteria from Slice-01 pass on manual inspection.

---

## Risk Notes

- The textarea auto-expansion sets `el.style.height = el.scrollHeight + 'px'` inline. Because the
  textarea uses `resize-none`, there is no user-resize conflict. Reset on clear sets height back to
  `auto` (or `''`) so the single-row default is restored.
- The floating send button is absolutely positioned inside a `relative` wrapper that contains only
  the textarea. The model-settings button remains as a flex sibling to the left of that wrapper.
  This preserves the left-icon / wide-input pattern without adding layout complexity.
- Adding `.composer-panel:focus-within` in `globals.css` has no effect on any surface other than
  the composer panel — the class is not reused on any other element in the current codebase.
