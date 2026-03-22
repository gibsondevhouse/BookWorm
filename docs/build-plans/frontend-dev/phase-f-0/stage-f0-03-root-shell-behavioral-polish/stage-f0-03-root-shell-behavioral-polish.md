# Stage-f0-03: Root Shell Behavioral Polish

**Status:** [ ] Not started  
**Phase:** Phase-f-0  
**Depends on:** Stage-f0-02 complete (requires `messages` state from Stage-f0-02)  
**Target files:** `apps/web/src/app/page.tsx`

---

## Purpose

With Stage-f0-02 delivering the `messages` state array, Stage-f0-03 wires two behavioral
improvements to it:

1. **Empty-state collapse** — the hero section (badge + heading + description + aside card)
   is visible only when `messages.length === 0`. Once messages exist, the hero collapses to
   maximize the message list area.
2. **Quick-chip seeding** — clicking a quick-chip populates the composer textarea with the
   chip's label as a prompt seed and focuses the input.

Both are `page.tsx`-only changes. No CSS additions are required unless the hero needs a
`hidden`/`visible` wrapper class.

---

## Scope (Items 9–10)

| # | Item | Change Surface |
|---|---|---|
| 9 | Empty-state collapse | `page.tsx` — `messages.length === 0` conditional on hero `<section>` |
| 10 | Quick-chip seeding | `page.tsx` — `onClick` on `.quick-chip` buttons sets `value` + focuses `textareaRef` |

### Item 9 Detail: Empty-State Collapse

The hero `<section>` inside the first `<li>` is currently always rendered. Replace the `<li>` with
conditional rendering:

```tsx
{messages.length === 0 && (
  <li className="...">
    <section className="..."> {/* hero content */} </section>
  </li>
)}
```

When `messages.length > 0`, the `<ol>` contains only the message `<li>` items from Stage-f0-02.
The `<ol>` flex layout (currently `flex-1 flex-col gap-4`) naturally expands to fill the freed
space.

Do not animate the collapse in this stage. A simple conditional render is sufficient.

### Item 10 Detail: Quick-Chip Seeding

The `textareaRef` already exists from Stage-f0-01. The `value` state already exists from
Stage-f0-01. Add an `onClick` to each quick-chip:

```tsx
onClick={() => {
  setValue(action);
  textareaRef.current?.focus();
}}
```

The auto-expand logic from Stage-f0-01 triggers via `onChange`, not on programmatic `setValue`.
After seeding, the agent **must** trigger the height recalculation manually:

```ts
// after setValue(action):
const el = textareaRef.current;
if (el) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}
```

This ensures the textarea expands correctly when a chip sets a multi-word seed.

---

## Exit Criteria

Stage-f0-03 is complete when:

1. With `messages = []`, the hero section (badge, heading, description, aside) is visible.
2. After one message is added (from Stage-f0-02 send wiring), the hero section is no longer rendered.
3. Clicking "Brainstorm", "Draft", "Edit", or "Research" populates the composer textarea with
   that exact label string and moves focus to the textarea.
4. After chip-seeding, the textarea height reflects the content height (auto-expand firing).
5. `pnpm lint` exits 0.
6. `pnpm type-check` exits 0.

---

## Risk Notes

- The chip `onClick` handler uses `textareaRef`, which is defined in Stage-f0-01. Stage-f0-03
  must not be executed before Stage-f0-01 is complete.
- The `messages` array referenced in item 9 is introduced in Stage-f0-02. Stage-f0-03 must not
  be executed before Stage-f0-02 is complete.
- The `value`/`setValue` state is introduced in Stage-f0-01 (for the controlled textarea). This
  is the same state variable updated by the chip `onClick`.
