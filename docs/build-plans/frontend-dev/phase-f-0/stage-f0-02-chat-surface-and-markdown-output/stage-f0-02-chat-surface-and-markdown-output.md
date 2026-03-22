# Stage-f0-02: Chat Surface and Markdown Output

**Status:** [x] Completed  
**Phase:** Phase-f-0  
**Depends on:** Stage-f0-01 complete  
**Approved Next Ordered Slice:** [Stage-f0-03: Root Shell Behavioral Polish](../stage-f0-03-root-shell-behavioral-polish/stage-f0-03-root-shell-behavioral-polish.md)  
**Target files:** `apps/web/src/app/page.tsx`, new `apps/web/src/app/ChatMessageList.tsx` (if extracted)

---

## Purpose

The `page.tsx` chat area currently renders a static hero section with no message concept. This
stage introduces a `messages` state array, a structured user/assistant message list, and
`react-markdown` rendering for AI responses. It turns the page from a styled placeholder into a
functional chat surface that can later be wired to real API calls.

---

## Dependency: `react-markdown` Package Install

Before executing any code changes in this stage, the delivery agent must install `react-markdown`:

```bash
cd apps/web && pnpm add react-markdown
```

Confirm the install produces no peer-dependency conflicts with Next.js 15 before proceeding. As of
authoring, `react-markdown ^10.x` is compatible (installed: `^10.1.0`). If a conflict is found, document the resolution in
a revision note before executing.

---

## Scope (Items 7–8)

| # | Item | Change Surface |
|---|---|---|
| 7 | Structured message list (user/assistant layout) | `page.tsx` messages state + render logic |
| 8 | Markdown rendering for AI responses | `react-markdown` imported and applied to assistant messages |

### Item 7 Detail: Structured Message List

Introduce a `messages` state:

```ts
type Message = { role: "user" | "assistant"; content: string; id: string };
const [messages, setMessages] = useState<Message[]>([]);
```

The `<ol aria-label="Chat messages">` already exists in `page.tsx`. When `messages.length > 0`:
- Replace the hero `<li>` with mapped `<li>` elements for each message
- User messages: right-aligned, accent border, `bg-surface`
- Assistant messages: left-aligned, primary border, `bg-paper-light`

### Item 8 Detail: Markdown Output Rendering

Import `ReactMarkdown` from `react-markdown`. Apply it as the content renderer for assistant
messages. User messages render as plain text (`<p>` with whitespace pre-wrap).

Prose styling for markdown output should follow the existing Spectral body font and `--color-text`
token. No `@tailwindcss/typography` plugin — style markdown elements directly via Tailwind utility
classes on a wrapping `<div className="prose-shell">` custom class, keeping dependencies minimal.

---

## Exit Criteria

Stage-f0-02 is complete when:

1. `messages` state is defined with `Message` type in `page.tsx`.
2. When messages exist, the `<ol>` renders message bubbles instead of the hero `<li>`.
3. User and assistant messages are visually distinct (alignment or color treatment).
4. Assistant message content is passed through `react-markdown`.
5. `pnpm lint` exits 0.
6. `pnpm type-check` exits 0.
7. `react-markdown` is listed in `apps/web/package.json` dependencies.

---

## Open Questions

- **Component extraction**: If the message list JSX grows beyond ~50 lines, extract a
  `ChatMessageList` component to keep `page.tsx` under 250 lines per the repo convention. The
  delivery agent should make this call at execution time based on the actual line count.
- **Stub messages for testing**: Stage-f0-02 may seed a few stub messages in `useState` initial
  value to validate the layout during development. These must be removed before the slice is marked
  complete — the initial state must be `[]`.
- **Send wiring**: Stage-f0-02 wires the send button `onClick` to push a user message into `messages`
  and append a stub assistant response. Real API wiring is out of scope for phase-f-0.
