# Stage-f1-02 Slice-01: Sidebar Navigation Data Extraction and Active Link Semantics

**Slice ID:** Stage-f1-02-Slice-01  
**Status:** [x] Completed  
**Approval:** Approved for execution  
**Stage:** Stage-f1-02 (Sidebar Navigation State Alignment)  
**Phase:** Phase-f-1  
**Depends on:** Stage-f1-01 complete  
**Target files (apps/web only):**
- `apps/web/src/app/AppSidebar.tsx`
- `apps/web/src/app/sidebarNavigationConfig.ts`
- `apps/web/src/app/sidebarRouteState.ts`

---

## What This Slice Delivers

This slice is the first executable unit of Stage-f1-02 and is scoped to frontend-only sidebar behavior:

1. Extracts sidebar navigation configuration data out of the monolithic render block in `AppSidebar.tsx`.
2. Introduces route-aware active-link semantics and visible active state for Chat, Codex, and Review Inbox.
3. Preserves existing collapse toggle and Codex disclosure behavior while ensuring collapsed-mode interactions remain operable for keyboard and pointer users.

---

## Repository Evidence Baseline

Pre-execution baseline at planning kickoff (March 21, 2026):

| File | Evidence |
|---|---|
| `apps/web/src/app/AppSidebar.tsx` | Primary nav links (Chat, Codex, Review Inbox), Codex group definitions, and recent thread labels are hardcoded inline in one component |
| `apps/web/src/app/AppSidebar.tsx` | `isCollapsed` and `isCodexOpen` local state exist and currently drive sidebar mode and Codex disclosure |
| `apps/web/src/app/AppSidebar.tsx` | Main navigation links use static classes and do not apply route-aware active semantics |
| `apps/web/src/app/layout.tsx` | Sidebar is mounted in a stable root-shell container, so extraction can be isolated to sidebar-owned modules |

---

## Dependencies

- Stage-f1-01 is complete and provides the stabilized root shell/chat baseline this slice builds on.
- No backend API, schema, or permission changes are required for this slice.

---

## Acceptance Criteria

1. Navigation data extraction:
   1. Navigation definitions required for rendering primary links and Codex grouped links are moved out of the inline `AppSidebar.tsx` render block into sidebar support module(s) under `apps/web/src/`.
   2. `AppSidebar.tsx` consumes extracted config/data and maps over it for rendering instead of duplicating hardcoded nav literals in the JSX render tree.
   3. The extraction preserves existing labels and destination intent for Chat, Codex grouped entity links, and Review Inbox.

2. Route-aware active-link semantics and visual state:
   1. Chat (`/`), Codex (admin entity browsing path family), and Review Inbox (`/admin/review-inbox`) expose an active state derived from current route context.
   2. Active nav items include semantic markers for assistive tech (for example `aria-current="page"` on active links where appropriate).
   3. Active state is visually distinguishable from inactive state without relying on hover-only affordances.
   4. Codex parent nav state reflects active context when the current route is within the Codex route family.

3. Collapse and Codex disclosure behavior parity:
   1. Sidebar collapse toggle continues to switch between expanded and collapsed shells without regressions.
   2. Codex disclosure remains user-toggleable in expanded mode and does not break under the extracted-data structure.
   3. Existing Codex group rendering remains intact when disclosure is open.

4. Collapsed-mode keyboard and pointer operability:
   1. Collapsed-mode interactive controls remain reachable and operable by keyboard (Tab and Enter/Space where applicable).
   2. Pointer interactions in collapsed mode continue to function for existing controls.
   3. No newly introduced hidden focus traps or unreachable controls occur in collapsed mode.

5. Change boundary:
   1. All modifications for this slice are limited to `apps/web`.
   2. No files in `apps/api`, `prisma`, `tests`, or root-level build/config docs are edited for implementation.

6. Validation commands:
   1. `pnpm lint`
   2. `pnpm type-check`

---

## Validation Record (validated during execution)

This record reflects checks run during Slice-01 execution and completion sign-off. It is an auditable completion log, not a blanket guarantee for future repository changes.

- [x] `pnpm lint` (exit 0)
- [x] `pnpm type-check` (exit 0; run from workspace root, recursively checks `apps/api` and `apps/web`)
- [ ] Manual smoke test: navigate to Chat, Review Inbox, and a Codex entity page; confirm active nav indication updates correctly each time. (recommended, not executed in implementation run)
- [ ] Manual smoke test: on a Codex entity page, confirm Codex parent item indicates active context and grouped links remain navigable. (recommended, not executed in implementation run)
- [ ] Manual smoke test: toggle sidebar collapsed/expanded repeatedly; confirm no visual or interaction regressions. (recommended, not executed in implementation run)
- [ ] Manual smoke test: in collapsed mode, traverse controls with keyboard and activate available controls via keyboard and pointer. (recommended, not executed in implementation run)

---

## Out-of-Scope Guardrails

- Backend route creation or changes.
- Admin permission model or auth behavior changes.
- API-driven or server-fetched sidebar payloads.
- Non-sidebar UI redesign beyond active-state semantics required by this slice.
- Any modification outside `apps/web`.

---

## Execution Notes

- Implemented in `apps/web` using:
   - `apps/web/src/app/sidebarNavigationConfig.ts` (new)
   - `apps/web/src/app/sidebarRouteState.ts` (new)
   - `apps/web/src/app/AppSidebar.tsx` (updated)
- Stage-f1-02 Slice-02 (Collapsed Mode Interaction and Keyboard Navigation Hardening) remains next and keeps Stage-f1-02 in progress.