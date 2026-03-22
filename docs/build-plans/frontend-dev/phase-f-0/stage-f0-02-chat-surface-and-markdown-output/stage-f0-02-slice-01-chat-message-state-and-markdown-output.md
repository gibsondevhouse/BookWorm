# Stage-f0-02 Slice-01: Chat Message State, User/Assistant Layout, and Markdown Output

**Slice ID:** Stage-f0-02-Slice-01  
**Status:** Completed [x]  
**Stage:** Stage-f0-02 (Chat Surface and Markdown Output)  
**Phase:** Phase-f-0  
**Target files:**
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/package.json` (via `pnpm --filter @book-worm/web add react-markdown`)

---

## What This Slice Delivers

This single slice covers the entirety of Stage-f0-02 (items 7 and 8). It is one atomic unit — do
not split it.

**Item 7 — Structured message list:** Introduce a `Message` type and `messages` state in
`page.tsx`. Wire the send button to append user messages and clear the composer. Render the `<ol>`
as a conditional: show the hero `<li>` when empty, render message bubbles when messages exist.
User messages are right-aligned with accent-border treatment; assistant messages are left-aligned
with primary-border treatment.

**Item 8 — Markdown output rendering:** Install `react-markdown`. Apply `<ReactMarkdown>` to
assistant message content wrapped in a `.prose-shell` div. User messages render as
`<p className="whitespace-pre-wrap">`. The `.prose-shell` CSS class is added to `globals.css`
using existing design tokens — no `@tailwindcss/typography` plugin.

---

## Dependency

The `react-markdown` package must be installed before making any code changes:

```bash
pnpm --filter @book-worm/web add react-markdown
```

Confirm the install produces no peer-dependency warnings with Next.js 15. As of authoring,
`react-markdown ^10.x` is compatible (installed version is `^10.1.0`). If a conflict surfaces, resolve it and note the resolution
before proceeding.

---

## Acceptance Criteria

1. `Message` type is defined in `page.tsx` with exactly three fields: `role: "user" | "assistant"`,
   `content: string`, and `id: string`.
2. `const [messages, setMessages] = useState<Message[]>([])` is present in the component.
3. The send button `onClick` handler appends a `{ role: "user", content: trimmed, id: crypto.randomUUID() }`
   entry to `messages`, clears `value` to `""`, and resets `textareaRef.current.style.height` to
   `"auto"` — it does nothing when `value.trim()` is empty.
4. When `messages.length === 0`, the `<ol>` renders the existing hero `<li>` (unchanged hero JSX,
   same class names).
5. When `messages.length > 0`, the `<ol>` renders the message list; the hero `<li>` is not present
   in the DOM.
6. User messages are rendered right-aligned (`justify-end` on the `<li>`, `text-right` on the
   inner `<div>`) with `border border-[rgba(217,195,127,0.28)]` accent-border treatment.
7. Assistant messages are rendered left-aligned (`justify-start` on the `<li>`) with
   `border border-[rgba(134,201,255,0.2)]` primary-border treatment and `mr-auto`.
8. Both user and assistant bubble `<div>` elements have `max-w-[80%]`.
9. `<ReactMarkdown>` is applied to assistant message content inside a
   `<div className="prose-shell">` wrapper; user messages render as
   `<p className="whitespace-pre-wrap">{msg.content}</p>`.
10. `.prose-shell` exists in `globals.css` and covers: `h1`–`h3` (font-display, sized 1.5/1.25/1.1 rem),
    `strong` (`var(--color-accent)`), `em` (italic), `p` (line-height 1.75), `ul`/`ol` (padding-left
    1.5rem), `li` (line-height 1.7), and `code` (subtle background hint using
    `rgba(134,201,255,0.08)`).
11. `react-markdown` is listed in the `dependencies` section of `apps/web/package.json`.
12. `pnpm --filter @book-worm/web lint` exits 0.
13. `pnpm --filter @book-worm/web type-check` exits 0.

---

## Implementation Contract

### Step 0 — Install package

```bash
pnpm --filter @book-worm/web add react-markdown
```

---

### Step 1 — `globals.css`: Add `.prose-shell` class

Add the following block after the `.font-body` block (before the next top-level rule or at the end
of the custom class section):

```css
.prose-shell h1,
.prose-shell h2,
.prose-shell h3 {
  font-family: var(--font-display);
  color: var(--color-text);
  margin-top: 1.25em;
  margin-bottom: 0.5em;
}
.prose-shell h1 { font-size: 1.5rem; }
.prose-shell h2 { font-size: 1.25rem; }
.prose-shell h3 { font-size: 1.1rem; }
.prose-shell strong { color: var(--color-accent); font-weight: 600; }
.prose-shell em { font-style: italic; }
.prose-shell p { line-height: 1.75; margin-bottom: 0.75em; }
.prose-shell ul,
.prose-shell ol { padding-left: 1.5rem; margin-bottom: 0.75em; }
.prose-shell li { line-height: 1.7; margin-bottom: 0.25em; }
.prose-shell code { font-size: 0.875em; background: rgba(134,201,255,0.08); padding: 0.1em 0.35em; border-radius: 0.25rem; }
```

---

### Step 2 — `page.tsx`: Add `ReactMarkdown` import and `Message` type

Add the `ReactMarkdown` import immediately after the existing React import line:

```tsx
import ReactMarkdown from "react-markdown";
```

Add the `Message` type immediately before the `Page` component declaration:

```tsx
type Message = { role: "user" | "assistant"; content: string; id: string };
```

---

### Step 3 — `page.tsx`: Add `messages` state

After the existing `const [value, setValue] = useState("")` line, add:

```tsx
const [messages, setMessages] = useState<Message[]>([]);
```

---

### Step 4 — `page.tsx`: Wire the send button

Replace the send button's `onClick={() => void 0}` stub with:

```tsx
onClick={() => {
  const trimmed = value.trim();
  if (!trimmed) return;
  setMessages((prev) => [
    ...prev,
    { role: "user", content: trimmed, id: crypto.randomUUID() },
  ]);
  setValue("");
  if (textareaRef.current) {
    textareaRef.current.style.height = "auto";
  }
}}
```

---

### Step 5 — `page.tsx`: Conditional `<ol>` content

Replace the single `<li>` inside `<ol aria-label="Chat messages">` with a conditional block. The
hero section JSX must remain byte-for-byte identical inside the empty-state branch — do not alter
class names, copy, or structure.

```tsx
{messages.length === 0 ? (
  <li className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center">
    {/* existing hero section JSX — unchanged */}
  </li>
) : (
  messages.map((msg) => (
    <li
      key={msg.id}
      className={`mx-auto w-full max-w-6xl flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] rounded-[1.5rem] px-5 py-4 text-base text-text ${
          msg.role === "user"
            ? "border border-[rgba(217,195,127,0.28)] bg-[rgba(14,24,38,0.92)] text-right"
            : "border border-[rgba(134,201,255,0.2)] bg-[rgba(8,16,27,0.88)]"
        }`}
      >
        {msg.role === "user" ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="prose-shell">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </li>
  ))
)}
```

---

### Component extraction note

After applying all changes, check the line count of `page.tsx`. If it exceeds ~250 lines, extract
the message list rendering into `apps/web/src/app/ChatMessageList.tsx` (a named export matching the
filename) and import it in `page.tsx`. The `Message` type should be co-located with
`ChatMessageList.tsx` if extraction happens — move it from `page.tsx` and re-import where needed.
Do not extract preemptively if the file stays under the 250-line limit.

---

## Verification Steps

Run these commands after applying all changes:

```bash
pnpm --filter @book-worm/web add react-markdown
pnpm --filter @book-worm/web lint
pnpm --filter @book-worm/web type-check
```

All three must exit 0 before the slice is marked complete.

---

## Validation Results

- **Lint:** `pnpm --filter @book-worm/web lint` — ✅ exit 0
- **Type-check:** `pnpm --filter @book-worm/web type-check` — ✅ exit 0
- **All 13 acceptance criteria:** ✅ verified
- **Package install:** `react-markdown` added to `apps/web/package.json` — no peer-dependency conflicts

---

## Status: Completed [x]
