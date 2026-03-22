# Stage-f0-03 Slice-01: Root Shell Behavioral Polish

**Slice ID:** Stage-f0-03-Slice-01  
**Status:** [x] Complete  
**Stage:** Stage-f0-03 (Root Shell Behavioral Polish)  
**Phase:** Phase-f-0  
**Target files:**
- `apps/web/src/app/page.tsx`

---

## What This Slice Delivers

This single slice covers the entirety of Stage-f0-03 (Items 9 and 10). It is one atomic unit —
do not split it.

**Item 9 — Empty-state collapse:** The hero `<li>` (badge + heading + description + aside card)
is conditionally rendered only when `messages.length === 0`. No animation. The message list
renders independently of the hero.

**Item 10 — Quick-chip seeding:** Each `.quick-chip` button receives an `onClick` that (a)
sets `value` to the chip's action label, (b) manually recalculates the textarea height via
`textareaRef` (because `onChange` does not fire on a programmatic `setValue` call), and (c)
focuses the textarea so the user can continue typing immediately.

---

## Code-vs-Doc Contradiction: Item 9 and Stage-f0-02

> **⚠ Contradiction to resolve before starting.**

The Stage-f0-03 overview states that the hero section is "currently always rendered" and directs
the delivery agent to introduce conditional rendering. However, Stage-f0-02 already implemented
a ternary that conditionallly renders the hero — the current `page.tsx` reads:

```tsx
{messages.length === 0 ? (
  <li>...hero...</li>
) : (
  messages.map((msg) => <li key={msg.id}>...</li>)
)}
```

This means the DOM-level behavior of Item 9 (hero gone once messages exist) is **already
satisfied** by the Stage-f0-02 ternary. The Stage-f0-03 overview's `&&`-plus-independent-map
pattern and the Stage-f0-02 ternary produce identical rendered output for all states of
`messages`.

**Resolution:** The delivery agent must verify that the existing ternary satisfies every Item 9
acceptance criterion. If it does, no refactor is required for Item 9 — the AC is accepted on
its current implementation. The delivery agent must note if any criterion is unmet and refactor
accordingly. Do not refactor solely to change the syntactic pattern.

The sole remaining work in this slice is **Item 10**.

---

## Dependencies

- **Stage-f0-01 must be complete.** The chip `onClick` handler reads `textareaRef` (introduced in
  Stage-f0-01) and writes to `value`/`setValue` (also introduced in Stage-f0-01). Executing this
  slice before Stage-f0-01 is complete will produce missing-reference errors.
- **Stage-f0-02 must be complete.** The hero conditional (Item 9) reads `messages.length`
  (introduced in Stage-f0-02). Executing this slice before Stage-f0-02 is complete will produce
  a missing-state error.
- No package installations are required. All state and refs are already present.

---

## Acceptance Criteria

### Item 9 — Empty-state collapse

**AC-01.** When `messages` is an empty array (`messages.length === 0`), the hero `<li>` is
present in the DOM and visible. The hero contains: (a) the badge element with text "Writing
companion online", (b) the `<h1>` heading, (c) the description `<p>`, and (d) the `<aside>` card
with the three "Entry cadence" entries.

**AC-02.** When `messages` contains at least one entry (`messages.length > 0`), the hero `<li>`
is **not** present in the DOM. The `<ol>` contains only message bubble `<li>` elements.

**AC-03.** There is no animation, transition, or CSS class toggling on the hero collapse. The
collapse is a strict conditional render — the element either exists or it does not.

**AC-04.** The `<ol>` flex layout expands to fill the full available height once the hero
collapses. No layout shift or overflow occurs on the message list when the hero disappears.

### Item 10 — Quick-chip seeding

**AC-05.** Each of the four `.quick-chip` buttons ("Brainstorm", "Draft", "Edit", "Research")
has an `onClick` handler.

**AC-06.** Clicking any chip sets the composer `value` state to the **exact** string that is the
chip's action label (`"Brainstorm"`, `"Draft"`, `"Edit"`, or `"Research"`). The label is sourced
from the same `action` variable used to render the button text — it is not hardcoded per button.

**AC-07.** After `setValue(action)` is called, the textarea height is recalculated manually
using the following sequence (in this order):

```ts
const el = textareaRef.current;
if (el) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}
```

The `if (el)` null-check is required; no non-null assertion (`!`) is permitted.

**AC-08.** After the height recalculation, `textareaRef.current?.focus()` is called, moving
keyboard focus to the textarea.

**AC-09.** The textarea visually reflects the seeded content: the chip label is visible in the
textarea and the height matches the content (single-line for all four labels).

**AC-10.** Clicking a chip when the textarea already contains text **replaces** the entire
content with the chip label (standard `setValue` behavior — no append).

### Validation

**AC-11.** `pnpm lint` exits 0 with no ESLint errors or warnings introduced by this slice.

**AC-12.** `pnpm type-check` exits 0 with no TypeScript errors introduced by this slice.

---

## Implementation Notes

### Item 9 — Verify the existing conditional

Before writing any code, confirm the current ternary satisfies AC-01 through AC-04:

1. Trace `messages.length === 0 ? <heroLi> : messages.map(...)` in the current file.
2. Confirm the hero `<li>` is the exclusive first branch (no other content rendered when
   `messages` is empty).
3. Confirm the message list is the exclusive second branch (hero absent when messages exist).
4. Confirm no CSS class toggling or transition is applied to the hero.

If all four ACs pass on the current implementation, this item requires **no code change**.

---

### Item 10 — Add `onClick` to each quick-chip

The `quickActions.map` block currently renders each chip as:

```tsx
<button
  key={action}
  type="button"
  className="quick-chip rounded-full px-5 py-2.5 text-sm tracking-[0.16em] text-text"
>
  {action}
</button>
```

Add the `onClick` handler to each chip by modifying **only** the `<button>` element:

```tsx
<button
  key={action}
  type="button"
  className="quick-chip rounded-full px-5 py-2.5 text-sm tracking-[0.16em] text-text"
  onClick={() => {
    setValue(action);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
    textareaRef.current?.focus();
  }}
>
  {action}
</button>
```

The handler must follow this exact order:
1. `setValue(action)` — seed the value state.
2. Manual height recalculation via `el.style.height` — must happen before `focus()` to avoid a
   layout flash.
3. `textareaRef.current?.focus()` — focus after resize is applied.

No helper function extraction is needed; the inline arrow function is the appropriate scope.

---

## Validation Checklist

Before marking this slice complete, confirm the following in the workspace:

- [ ] `pnpm lint` exits 0 (run from repo root or `apps/web/`).
- [ ] `pnpm type-check` exits 0 (run from repo root or `apps/web/`).
- [ ] Manual smoke test: open the app in the browser, verify the hero is visible with an empty
  chat, send a message, verify the hero collapses and only message bubbles appear.
- [ ] Manual smoke test: click "Brainstorm" — the textarea fills with "Brainstorm" and receives
  focus. Click "Research" — the textarea replaces to "Research". Height is single-line for both.
