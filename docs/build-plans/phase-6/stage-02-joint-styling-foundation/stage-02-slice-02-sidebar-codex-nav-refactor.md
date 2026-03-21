# Stage 02 Slice 02: Sidebar Codex Navigation Refactor

## Slice Status

- Status: Completed [x]
- Approval state: Shipped
- Stage: Phase 6 Stage 02
- Execution type: implementation slice (single file, no route changes)

## Objective

Refactor `apps/web/src/app/AppSidebar.tsx` so that the sidebar navigation reflects what the app is actually built for. The stale "Collections" section (static "Projects" and "Artifacts" placeholders) is removed and replaced with a collapsible "Codex" group in the Navigate section. The Codex group links to `/admin/entities` with entity-type query parameters, clustered into three conceptual groups: Story, World, and Lore. Chat stays at the top of the nav; Review Inbox stays at the bottom.

## Repository Evidence Baseline

Target file:

- `apps/web/src/app/AppSidebar.tsx` (220 lines, `'use client'` component)

Existing routes this slice links against (no new routes created):

- `/` — Chat surface (`apps/web/src/app/page.tsx`)
- `/admin/entities` — Entity list (`apps/web/src/app/admin/entities/EntitiesClient.tsx`)
- `/admin/review-inbox` — Review inbox (`apps/web/src/app/admin/review-inbox/ReviewInboxClient.tsx`)

Prisma entity types referenced for sub-links (from `prisma/schema.prisma`):

`CHARACTER`, `FACTION`, `EVENT`, `LOCATION`, `CREATURE`, `TIMELINE_ERA`, `BELIEF_SYSTEM`, `LANGUAGE`, `POLITICAL_BODY`, `SECRET`, `REVEAL`, `ARTIFACT`

(`TAG` is omitted from nav sub-links as it is a cross-cutting classification, not a navigable lore type.)

Planning and tracker artifacts touched by this slice:

- `docs/build-plans/phase-6/stage-02-joint-styling-foundation/stage-02-joint-styling-foundation.md`
- `docs/build-plans/master-plan-tracker.md`

## Scope

Single file only: `apps/web/src/app/AppSidebar.tsx`.

Changes are limited to:

1. Removing the `collectionItems` constant and its corresponding JSX block
2. Restructuring the Navigate section to introduce a collapsible Codex group
3. Adding a `codexGroups` constant for the three entity-type clusters
4. Adding `isCodexOpen` state for the inline Codex group toggle
5. Updating the "Recents" section heading label to "Recent Threads"

## Out of Scope

- New routes or page files
- New API endpoints
- Dynamic data loading (recents, entity counts, etc.)
- Changes to any other component, hook, or CSS file
- Removing or modifying the sidebar collapse toggle (`isCollapsed` state)
- Changing the collapsed sidebar view (icon-only strip)
- Manuscripts or any other nav section not already present

## Implementation Contract

### Constants to remove

```ts
// DELETE this constant — stale, never linked
const collectionItems = ["Projects", "Artifacts"];
```

### Constants to add

```ts
// Replace flat Codex link with a structured group definition
const codexGroups = [
  {
    label: "Story",
    types: ["CHARACTER", "FACTION", "EVENT"],
  },
  {
    label: "World",
    types: ["LOCATION", "CREATURE", "TIMELINE_ERA"],
  },
  {
    label: "Lore",
    types: ["BELIEF_SYSTEM", "LANGUAGE", "POLITICAL_BODY", "SECRET", "REVEAL", "ARTIFACT"],
  },
] as const;
```

The display label for each type should be derived from the type string using a simple
`toDisplayLabel` helper inline (replace underscores with spaces, title-case each word).

### State to add

```ts
const [isCodexOpen, setIsCodexOpen] = useState(false);
```

### `navigationLinks` constant to update

Remove the current `{ href: "/admin/entities", label: "Codex" }` entry. Chat (`/`) and Review
Inbox (`/admin/review-inbox`) remain as flat links; the Codex entry is replaced by the
expandable group rendered inline in the nav JSX.

Updated flat links array:

```ts
const navigationLinks = [
  { href: "/", label: "Chat" },
  { href: "/admin/review-inbox", label: "Review Inbox" },
];
```

### Navigate section JSX changes

The current nav renders `navigationLinks` as a flat map, then the `sidebar-card` "Collections"
block. The new structure is:

1. "Chat" flat link (rendered first from the updated `navigationLinks` or explicitly)
2. Codex disclosure group:
   - A `<button>` toggle with label "Codex" and a chevron icon that fires `setIsCodexOpen`
   - When `isCodexOpen`, render an indented list of cluster headers and their type sub-links
   - Each sub-link goes to `/admin/entities?type=<TYPE>`
3. "Review Inbox" flat link (rendered last from the updated `navigationLinks` or explicitly)
4. The `sidebar-card` "Collections" block is deleted entirely

Recommended nav rendering strategy — split the flat links and render the Codex disclosure group
between them explicitly rather than mapping all three together, since Codex requires different
markup:

```tsx
{/* Chat */}
<Link href="/" className="sidebar-link block rounded-2xl border border-transparent px-4 py-3 text-sm text-text-muted">
  Chat
</Link>

{/* Codex expandable group */}
<div>
  <button
    type="button"
    onClick={() => setIsCodexOpen(!isCodexOpen)}
    className="sidebar-link flex w-full items-center justify-between rounded-2xl border border-transparent px-4 py-3 text-sm text-text-muted"
    aria-expanded={isCodexOpen}
  >
    <span>Codex</span>
    <svg className={`h-4 w-4 transition-transform ${isCodexOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  </button>
  {isCodexOpen && (
    <div className="ml-4 mt-1 space-y-3 border-l border-border pl-3">
      {codexGroups.map((group) => (
        <div key={group.label}>
          <div className="px-2 py-1 text-[0.6rem] uppercase tracking-[0.28em] text-text-muted">
            {group.label}
          </div>
          <div className="space-y-0.5">
            {group.types.map((type) => (
              <Link
                key={type}
                href={`/admin/entities?type=${type}`}
                className="sidebar-link block rounded-xl px-3 py-2 text-xs text-text-muted"
              >
                {type
                  .split("_")
                  .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
                  .join(" ")}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )}
</div>

{/* Review Inbox */}
<Link href="/admin/review-inbox" className="sidebar-link block rounded-2xl border border-transparent px-4 py-3 text-sm text-text-muted">
  Review Inbox
</Link>
```

The above is illustrative markup used for contract clarity. The delivery agent must ensure
it integrates cleanly with the existing `space-y-1.5` container and passes lint/type-check
without modification.

### Recents section label

Change the heading inside the recents `div` from:

```tsx
<div className="px-4 py-2 text-[0.68rem] uppercase tracking-[0.3em] text-text-muted">
  Recents
</div>
```

to:

```tsx
<div className="px-4 py-2 text-[0.68rem] uppercase tracking-[0.3em] text-text-muted">
  Recent Threads
</div>
```

The `recentItems` array and its rendering remain unchanged.

## Acceptance Criteria

1. The `collectionItems` constant is removed and no reference to it remains in the file.
2. The "Collections" `sidebar-card` block (containing the "Projects" and "Artifacts" items) is
   gone from the rendered nav.
3. "Chat" appears as the first item in the Navigate section and links to `/`.
4. A "Codex" entry appears in the Navigate section below "Chat". It is a button (not a `<Link>`)
   that toggles the sub-items open and closed inline within the sidebar nav.
5. The Codex group has `aria-expanded` set to the current open/close state.
6. When the Codex group is expanded, three cluster headings are shown: "Story", "World", "Lore".
7. Under "Story": Character, Faction, Event — each linking to `/admin/entities?type=<TYPE>`.
8. Under "World": Location, Creature, Timeline Era — each linking to `/admin/entities?type=<TYPE>`.
9. Under "Lore": Belief System, Language, Political Body, Secret, Reveal, Artifact — each linking
   to `/admin/entities?type=<TYPE>`.
10. Each entity-type sub-link navigates to the correct filtered URL using the all-caps underscore-
    separated `type` query parameter value (e.g. `BELIEF_SYSTEM`, `TIMELINE_ERA`).
11. "Review Inbox" appears as the last item in the Navigate section and links to `/admin/review-inbox`.
12. The "Recents" section heading reads "Recent Threads". The five placeholder items remain.
13. The sidebar collapse toggle (`isCollapsed` button) continues to work identically.
14. The collapsed sidebar view (icon-only strip) is unaffected.
15. `pnpm --filter @book-worm/web lint` exits 0.
16. `pnpm --filter @book-worm/web type-check` exits 0.

## Verification Steps

```bash
# Lint
pnpm --filter @book-worm/web lint

# Type check
pnpm --filter @book-worm/web type-check
```

Both commands must exit with code 0. No manual visual verification protocol is defined for this
slice beyond confirming the lint/type-check gate; the acceptance criteria above are the testable
contract.

## Validation Results

- `pnpm --filter @book-worm/web lint` — exit 0 ✅
- `pnpm --filter @book-worm/web type-check` — exit 0 ✅
- `collectionItems` constant removed; no reference remains in the file ✅
- `navigationLinks` constant removed; Chat and Review Inbox rendered explicitly in JSX ✅
- `codexGroups` constant added with three clusters: Story (CHARACTER, FACTION, EVENT), World (LOCATION, CREATURE, TIMELINE_ERA), Lore (BELIEF_SYSTEM, LANGUAGE, POLITICAL_BODY, SECRET, REVEAL, ARTIFACT) ✅
- `isCodexOpen` state added for the inline Codex group toggle ✅
- "Collections" sidebar-card JSX removed ✅
- Navigate section restructured: Chat → Codex disclosure group → Review Inbox ✅
- "Recents" heading updated to "Recent Threads" ✅

## Exit Criteria

- All 16 acceptance criteria are satisfied.
- `pnpm --filter @book-worm/web lint` exits 0.
- `pnpm --filter @book-worm/web type-check` exits 0.
- `stage-02-joint-styling-foundation.md` Next-Slice Sequencing section lists this slice with `[-]`
  or `[x]` depending on completion state at closeout.
- `master-plan-tracker.md` Stage 02 status line reflects this slice as the approved next step.

## Status

Status: Completed [x]
