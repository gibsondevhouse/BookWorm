# Phase-f-0: Interaction Quality Baseline

**Status:** [x] Complete  
**Track:** Frontend (`apps/web`)  
**Parallel to:** Phase 6 Stage 03 (admin visual alignment — non-overlapping surfaces)

---

## Purpose

Phase-f-0 establishes the **interaction-quality baseline** for the three primary surfaces in `apps/web`:

1. **Composer** — the textarea + controls at the bottom of `page.tsx`
2. **Chat output surface** — the message list area above the composer (currently a static hero placeholder)
3. **Root shell** — the full-page layout: empty-state hero vs. active-conversation mode

This phase advances *behavior and interaction quality*, not visual styling. The dark atmospheric
palette (`--color-primary: #86c9ff`, `--color-paper: #08111b`, Cormorant Garamond + Spectral) and
the custom surface classes (`.composer-panel`, `.composer-field`, `.shell-panel`, `.hero-badge`,
`.quick-chip`) are already in place from Phase 6 Stage 02. Phase-f-0 operates on top of that
foundation without changing the visual language.

---

## Repository Evidence Baseline

All claims in this phase are anchored in the following files as they exist when phase-f-0 planning
was authored (March 21, 2026):

| File | Relevant State |
|---|---|
| `apps/web/src/app/page.tsx` | `"use client"` component; static `quickActions` array; `<textarea>` with `rows={1}` `resize-none`; Send as a full-width CTA button in the composer flex row; no `useState`/`useRef`/`useCallback`; hero section always visible |
| `apps/web/src/app/globals.css` | `.composer-panel` — background + shadow, no `:focus-within` rule; `.composer-field` — background + inset shadow, no `border-transparent`; `.quick-chip` — hover transition defined, no active/click state; `.font-display` utility class present; **no `.font-body` utility class** |
| `apps/web/src/app/layout.tsx` | `Cormorant_Garamond` (variable `--font-display`) + `Spectral` (variable `--font-body`) loaded via `next/font/google`; both applied as CSS variables on `<body>` |
| `apps/web/src/app/AppSidebar.tsx` | Refactored Codex nav (Story / World / Lore clusters); collapse toggle via `useState`; no changes needed for phase-f-0 |

### Known Gaps Addressed by This Phase

- Textarea **does not expand** as the user types — height is fixed at `rows={1}`
- Textarea **shows a visible border** that duplicates the `.composer-panel` boundary
- Textarea **lacks manuscript leading** (`leading-loose`) despite Spectral being available
- Send button **occupies horizontal space** in the composer row, compressing the input width
- Icon controls (model settings, send) **use inconsistent visual weight** — model settings is an icon, send is a text-label CTA
- `.composer-panel` **has no focus state** — no visual feedback when the user begins typing
- Chat area is a **static hero placeholder** — no concept of message state, no message list
- Hero section is **always rendered** regardless of whether there are messages
- Quick-chip buttons have **no `onClick`** — they do nothing when clicked

---

## Stage Breakdown

### Stage-f0-01: Composer Interaction Baseline

**Scope:** Items 1–6. Textarea auto-expansion, borderless input, Spectral typography with
`leading-loose`, floating send icon button, ghostly opacity controls, `.composer-panel`
`:focus-within` glow. Target files: `page.tsx`, `globals.css`.

**Status:** [x] Complete  
**Doc:** [stage-f0-01-composer-interaction-baseline.md](./stage-f0-01-composer-interaction-baseline/stage-f0-01-composer-interaction-baseline.md)

### Stage-f0-02: Chat Surface and Markdown Output

**Scope:** Items 7–8. Introduce `messages` state as an array, render a structured message list
(user/assistant layout), install `react-markdown`, wire it to AI response rendering.  
Target files: `page.tsx`, possibly a new `ChatMessageList` component.

**Status:** [x] Complete  
**Doc:** [stage-f0-02-chat-surface-and-markdown-output.md](./stage-f0-02-chat-surface-and-markdown-output/stage-f0-02-chat-surface-and-markdown-output.md)

### Stage-f0-03: Root Shell Behavioral Polish

**Scope:** Items 9–10. Empty-state collapse (hero hidden when messages exist), quick-chip onClick
seeding the composer textarea.  
Target files: `page.tsx`.

**Status:** [x] Complete  
**Doc:** [stage-f0-03-root-shell-behavioral-polish.md](./stage-f0-03-root-shell-behavioral-polish/stage-f0-03-root-shell-behavioral-polish.md)

---

## Dependencies

- **Phase 6 Stage 02 Slice 02** must be complete (Sidebar Codex Navigation Refactor) — confirmed
  complete per `master-plan-tracker.md`.
- `react-markdown` package install is required before Stage-f0-02 Slice execution. This is a
  dependency install step (`pnpm add react-markdown` in `apps/web`). It is documented as a
  prerequisite in the Stage-f0-02 overview and must be executed before Stage-f0-02 code changes.
- Stage-f0-03 depends on Stage-f0-02 being complete because it references the `messages` state
  array introduced in Stage-f0-02 to determine empty-state visibility.

---

## Exit Criteria

Phase-f-0 is complete when:

1. All three stages are marked `[x]` in `frontend-plan-tracker.md`.
2. `pnpm lint` exits 0 from the workspace root.
3. `pnpm type-check` exits 0 from the workspace root.
4. The composer textarea auto-expands, renders in Spectral with `leading-loose`, has a transparent
   border, and shows a floating send icon button.
5. AI responses are rendered via `react-markdown` in a structured message list.
6. The hero section is hidden when messages exist; clicking a quick-chip seeds the composer.

---

## Open Questions

- **react-markdown version**: Installed at `^10.1.0`. Confirm no peer-dep
  conflict with Next.js 15 before executing Stage-f0-02.
- **Send button wiring**: Stage-f0-01 makes the send button a ghost icon; Stage-f0-02 wires it to
  actual message dispatch. The send button's `onClick` is intentionally left as a no-op stub in
  Slice-01 — this is not a gap, it is by design.
- **Model settings button**: Phase-f-0 does not implement the settings popover. The button remains
  a styled stub. A settings integration is out of scope for this phase.
