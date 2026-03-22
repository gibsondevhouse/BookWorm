# Stage 04 Slice 03: Codex Dashboard Entry and Sidebar Simplification

## Slice Status

- Status: Done [x]
- Approval state: Executed and complete
- Stage: Phase 6 Stage 04
- Execution type: implementation slice (targeted IA refactor + new admin route)

## Objective

Refactor the sidebar information architecture so Codex is a single dashboard destination in primary navigation, instead of an expanded in-sidebar taxonomy of many entity-type links.

## Repository Evidence Baseline

Baseline (pre-execution state):

- `apps/web/src/app/sidebarNavigationConfig.ts` defines `codexGroups` with Story/World/Lore clusters and many entity-type sub-items.
- `apps/web/src/app/sidebarRouteState.ts` treats Codex context as `/admin/entities*` and computes active Codex type from query params.
- `apps/web/src/app/AppSidebar.tsx` renders Codex as a disclosure with grouped sub-navigation links to `/admin/entities?type=...`.
- `apps/web/src/app/admin/codex/` does not exist.

Post-execution state:

- `apps/web/src/app/sidebarNavigationConfig.ts` uses a single primary Codex entry targeting `/admin/codex`.
- `apps/web/src/app/sidebarRouteState.ts` resolves Codex active state from `/admin/codex` route context.
- `apps/web/src/app/AppSidebar.tsx` renders Codex as a direct primary nav item (expanded and collapsed), without the prior disclosure taxonomy.
- `apps/web/src/app/admin/codex/page.tsx` and `apps/web/src/app/admin/codex/CodexDashboardClient.tsx` exist and provide the dashboard entry surface.

## Scope

Exact file scope for this slice:

1. `apps/web/src/app/sidebarNavigationConfig.ts`
2. `apps/web/src/app/sidebarRouteState.ts`
3. `apps/web/src/app/AppSidebar.tsx`
4. `apps/web/src/app/admin/codex/page.tsx` (new)
5. `apps/web/src/app/admin/codex/CodexDashboardClient.tsx` (new)

## Out of Scope

- Changes to entity CRUD data flows or API contracts
- Changes to review inbox behavior
- Additional navigation redesign beyond Codex-entry simplification
- New backend endpoints or database schema updates

## Implementation Contract

1. Sidebar config is simplified so Codex is represented as one primary navigation link to `/admin/codex`.
2. Route-state logic marks Codex active for `/admin/codex` route context and no longer depends on entity-type query parameters for primary-nav highlighting.
3. Sidebar component removes Codex disclosure toggle and grouped sub-navigation rendering.
4. Sidebar keeps existing Chat and Review Inbox entries and preserves collapsed-sidebar behavior.
5. New `apps/web/src/app/admin/codex/page.tsx` route is added as the Codex dashboard entry point.
6. New `apps/web/src/app/admin/codex/CodexDashboardClient.tsx` provides the dashboard surface for Codex navigation and handoff links to existing codex/admin surfaces.

## Acceptance Criteria

1. `apps/web/src/app/sidebarNavigationConfig.ts` no longer exports a `codexGroups` structure and primary navigation contains a single Codex link target (`/admin/codex`).
2. `apps/web/src/app/sidebarRouteState.ts` identifies Codex active state from `/admin/codex` (and dashboard-owned child routes, if any are introduced during implementation), without relying on `type` query params.
3. `apps/web/src/app/AppSidebar.tsx` no longer renders the Codex disclosure button, Story/World/Lore headers, or per-entity Codex sub-links.
4. Expanded sidebar Navigate section shows Codex as one direct entry between Chat and Review Inbox.
5. Collapsed sidebar still exposes a Codex icon entry that routes to `/admin/codex`.
6. `apps/web/src/app/admin/codex/page.tsx` exists and renders successfully.
7. `apps/web/src/app/admin/codex/CodexDashboardClient.tsx` exists and is used by `page.tsx`.
8. Navigating via sidebar Codex entry loads `/admin/codex` and highlights Codex as the active primary nav item.
9. Existing `/admin/entities` routes remain reachable through Codex dashboard links and are not removed.
10. `pnpm --filter @book-worm/web lint` exits 0.
11. `pnpm --filter @book-worm/web type-check` exits 0.

## Verification Steps

```bash
pnpm --filter @book-worm/web lint
pnpm --filter @book-worm/web type-check
```

Validation evidence:

- `pnpm --filter @book-worm/web lint`: exit status 0 (2026-03-22)
- `pnpm --filter @book-worm/web type-check`: exit status 0 (2026-03-22)

Manual checks:

- Expanded sidebar shows single Codex entry (no disclosure tree)
- Collapsed sidebar Codex icon opens `/admin/codex`
- Codex entry stays active on Codex dashboard route
- Codex dashboard contains links to existing entity management surfaces

## Dependencies

- Stage 04 Slice 01 and Slice 02 completed (disposition and deferred-surface pass)
- No open blockers from Stage 03 handoff

## Status

Status: Done [x]
Approval: Closed; proceed to Stage-04-Slice-04 final verification and closeout
