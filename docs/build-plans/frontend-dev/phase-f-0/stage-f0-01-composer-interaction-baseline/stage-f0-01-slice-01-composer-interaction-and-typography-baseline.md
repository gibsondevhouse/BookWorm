# Stage-f0-01 Slice-01: Composer Interaction and Typography Baseline

**Status:** Completed [x]  
**Stage:** Stage-f0-01  
**Phase:** Phase-f-0  
**Slice ID:** Stage-f0-01-Slice-01  
**Target files:**
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/globals.css`

---

## What This Slice Delivers

Six interaction improvements that form a single atomic unit:

1. Auto-expanding textarea
2. Borderless composer input (visual boundary on the panel, not the field)
3. Spectral manuscript typography with `leading-loose` in the input area
4. Floating send icon button (absolute bottom-right inside the textarea wrapper)
5. Ghostly opacity treatment on icon controls
6. Focus-glow on `.composer-panel` via `:focus-within`

---

## Acceptance Criteria

All six criteria must pass before this slice is marked `[x]`.

### AC-01: Auto-Expanding Textarea

- The `<textarea>` is a **controlled component**: a `useState<string>("")` state variable (`value`)
  drives its `value` prop.
- A `useRef<HTMLTextAreaElement>(null)` (`textareaRef`) is attached to the textarea.
- On every `onChange`, the handler: (a) calls `setValue(e.target.value)`, (b) resets `el.style.height`
  to `"auto"`, then sets `el.style.height` to `el.scrollHeight + "px"`.
- When `value` is empty (after clear/submit), the textarea returns to single-row height.
- The textarea retains `resize-none` so user-drag resizing does not conflict.
- TypeScript: the `onChange` handler is typed as `(e: React.ChangeEvent<HTMLTextAreaElement>) => void`.

### AC-02: Borderless Composer Input

- The `<textarea>` JSX class does **not** include `border-border`. The border utility on the
  textarea itself is `border-transparent`.
- The `.composer-field` rule in `globals.css` does **not** contain `box-shadow: 0 0 0 1px rgba(164, 193, 229, 0.06)` — that sub-rule is removed so the inset shadow no longer draws a visible outline around the field.
- Visual boundary remains expressed by `.composer-panel` (border-t on the panel container).

### AC-03: Spectral Typography with `leading-loose`

- `globals.css` defines a `.font-body` utility class:
  ```css
  .font-body {
    font-family: var(--font-body);
  }
  ```
  This mirrors the existing `.font-display` class pattern.
- The `<textarea>` JSX class list includes `font-body leading-loose`.
- `pnpm type-check` exits 0 — no type impact from this CSS addition.

### AC-04: Floating Send Icon Button

- The composer flex row structure is:
  ```
  [model-settings button] [relative wrapper]
     └── <textarea> (w-full)
     └── send icon button (absolute bottom-2 right-2)
  ```
- The outer flex `div` retains `items-end` so the model-settings button aligns to the textarea bottom.
- The `relative wrapper` div holds `relative flex-1` classes.
- The `<textarea>` inside the wrapper holds `w-full` (not `flex-1`) and sufficient `pb` padding
  (e.g. `pb-10`) so text does not slide under the floating button.
- The send button is `type="button"`, `aria-label="Send message"`, and has `absolute bottom-2 right-2`.
- The send button's `onClick` is a no-op stub (`() => void 0`) — wiring to message dispatch is
  Stage-f0-02's responsibility.

### AC-05: Ghostly Icon Controls

- The model-settings button SVG has classes `opacity-50 hover:opacity-100 transition-opacity` (or
  these classes are on the `<button>` itself — either is acceptable as long as the visual result
  is the same).
- The send button SVG (a paper-airplane or forward-arrow icon) has the same `opacity-50
  hover:opacity-100 transition-opacity` treatment.
- The send button does **not** retain the previous gradient background
  (`bg-[linear-gradient(135deg,#86c9ff,#5ca7de)]`) or the outer padding CTA styling. It is
  a minimal icon button: `rounded-full p-2` or similar.
- The text label "Send" is **removed** entirely. The `aria-label="Send message"` on the button
  provides the accessible name.

### AC-06: Focus-Glow on `.composer-panel`

- `globals.css` adds a `.composer-panel:focus-within` rule. The rule applies:
  - A subtly lighter background gradient (shift the first stop toward `rgba(16, 29, 44, 0.98)` or
    add a soft `--color-glow` radial overlay).
  - OR a `box-shadow` addition (e.g. `inset 0 1px 0 rgba(134, 201, 255, 0.12)`) — either visual
    approach is acceptable as long as there is a *perceptible* background shift when focus enters.
- The `:focus-within` rule must be placed directly after the base `.composer-panel` rule block to
  keep the CSS organized.
- No JavaScript is required — this is a pure CSS state change.

---

## Implementation Contract

### `apps/web/src/app/globals.css`

**Change 1 — Add `.font-body` utility class** (after the existing `.font-display` block):

```css
.font-body {
  font-family: var(--font-body);
}
```

**Change 2 — Modify `.composer-field`** (remove the `0 0 0 1px` sub-shadow):

Before:
```css
.composer-field {
  background: rgba(7, 14, 24, 0.88);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 0 0 1px rgba(164, 193, 229, 0.06);
}
```

After:
```css
.composer-field {
  background: rgba(7, 14, 24, 0.88);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}
```

**Change 3 — Add `.composer-panel:focus-within`** (directly after the `.composer-panel` block):

```css
.composer-panel:focus-within {
  background:
    linear-gradient(180deg, rgba(10, 20, 34, 0.97) 0%, rgba(6, 13, 22, 0.98) 100%);
  box-shadow:
    inset 0 1px 0 rgba(134, 201, 255, 0.12),
    inset 0 0 0 1px rgba(134, 201, 255, 0.06);
}
```

---

### `apps/web/src/app/page.tsx`

**Change 1 — Add state and ref imports + declarations**

Add to imports: `useRef, useState, useCallback` (React is already `"use client"`).

Add before the return:

```tsx
const [value, setValue] = useState("");
const textareaRef = useRef<HTMLTextAreaElement>(null);

const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
  setValue(e.target.value);
  const el = e.currentTarget;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}, []);
```

**Change 2 — Update the `<textarea>` element**

Before:
```tsx
<textarea
  className="composer-field flex-1 resize-none rounded-[1.6rem] border border-border px-4 py-3 text-base text-text outline-none focus:border-primary"
  placeholder="Ask your AI for the next clue, draft, or revision pass"
  rows={1}
  aria-label="Message input"
/>
```

After:
```tsx
<textarea
  ref={textareaRef}
  className="composer-field font-body w-full resize-none rounded-[1.6rem] border border-transparent px-4 py-3 pb-10 text-base leading-loose text-text outline-none"
  placeholder="Ask your AI for the next clue, draft, or revision pass"
  rows={1}
  value={value}
  onChange={handleChange}
  aria-label="Message input"
/>
```

Note: `focus:border-primary` is removed — focus feedback moves to `.composer-panel:focus-within`
in CSS. `border-border` replaced with `border-transparent`. `pb-10` reserves space for the
floating send button. `flex-1` replaced with `w-full` (the textarea is now inside a wrapper div
that holds `flex-1`).

**Change 3 — Restructure the composer flex row**

Before (the inner content of the `mx-auto flex w-full max-w-6xl gap-3 items-end` div):
```tsx
<button
  type="button"
  className="shrink-0 rounded-lg p-2 hover:bg-subtle"
  aria-label="Model settings"
>
  <svg className="h-5 w-5 text-text-muted" ...> ... </svg>
</button>

<textarea className="composer-field flex-1 ..." ... />

<button
  type="button"
  className="shrink-0 rounded-[1.6rem] border border-[rgba(217,195,127,0.24)] bg-[linear-gradient(135deg,#86c9ff,#5ca7de)] px-6 py-3 text-sm font-semibold tracking-[0.16em] text-slate-950 shadow-[0_18px_36px_rgba(92,167,222,0.28)] transition-colors hover:bg-primary-dark"
  aria-label="Send message"
>
  Send
</button>
```

After:
```tsx
{/* Model settings icon — ghostly opacity treatment */}
<button
  type="button"
  className="shrink-0 rounded-lg p-2 opacity-50 transition-opacity hover:opacity-100"
  aria-label="Model settings"
>
  <svg className="h-5 w-5 text-text-muted" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
    <path
      fillRule="evenodd"
      d="M12 3a9 9 0 110 18 9 9 0 010-18zm0-2C6.477 1 2 5.477 2 12s4.477 11 10 11 10-4.477 10-10S17.523 1 12 1z"
    />
  </svg>
</button>

{/* Textarea wrapper — relative container for the floating send button */}
<div className="relative flex-1">
  <textarea
    ref={textareaRef}
    className="composer-field font-body w-full resize-none rounded-[1.6rem] border border-transparent px-4 py-3 pb-10 text-base leading-loose text-text outline-none"
    placeholder="Ask your AI for the next clue, draft, or revision pass"
    rows={1}
    value={value}
    onChange={handleChange}
    aria-label="Message input"
  />

  {/* Floating send icon — absolute bottom-right inside the textarea */}
  <button
    type="button"
    className="absolute bottom-2 right-2 rounded-full p-2 opacity-50 transition-opacity hover:opacity-100"
    aria-label="Send message"
    onClick={() => void 0}
  >
    <svg
      className="h-5 w-5 text-primary"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 19V5m0 0l-7 7m7-7l7 7"
      />
    </svg>
  </button>
</div>
```

---

## Verification Steps

Run these after the delivery agent completes changes:

```bash
# From workspace root
pnpm lint
pnpm type-check
```

Both must exit 0.

Manual inspection checklist:
- [ ] Typing multiple lines in the textarea causes it to grow in height
- [ ] Clearing the textarea returns it to single-row height
- [ ] No visible border ring around the textarea (only the panel outline is visible)
- [ ] Input text renders in Spectral with generous line height
- [ ] Send button is a small SVG icon in the bottom-right of the composer, not a text CTA
- [ ] Model settings icon is dim at rest; both icons brighten on hover
- [ ] Typing in the composer causes a subtle background shift on the panel

---

## Validation Results

**Completed:** 2026-03-21

| Check | Result |
|---|---|
| `pnpm lint` | ✅ exit 0 |
| `pnpm type-check` | ✅ exit 0 |
| AC-01: Auto-expanding textarea | ✅ Verified |
| AC-02: Borderless composer input | ✅ Verified |
| AC-03: Spectral typography with `leading-loose` | ✅ Verified |
| AC-04: Floating send icon button | ✅ Verified |
| AC-05: Ghostly icon controls | ✅ Verified |
| AC-06: Focus-glow on `.composer-panel` | ✅ Verified |

---

## Constraints

- Do NOT add `react-markdown` — that belongs to Stage-f0-02.
- Do NOT add `messages` state or any chat logic — that belongs to Stage-f0-02.
- Do NOT add quick-chip `onClick` handlers — that belongs to Stage-f0-03.
- Do NOT modify `AppSidebar.tsx`, `layout.tsx`, or any file under `admin/`.
- The `quickActions` array and the quick-chip rendering block remain as-is in this slice.
- TypeScript strict mode: no `any`, no non-null assertions without comment justification.
