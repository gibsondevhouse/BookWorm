# Stage-f1-02 Slice-02: Collapsed Mode Interaction and Keyboard Navigation Hardening

**Slice ID:** Stage-f1-02-Slice-02  
**Status:** [x] Completed  
**Approval:** Approved for execution  
**Stage:** Stage-f1-02 (Sidebar Navigation State Alignment)  
**Phase:** Phase-f-1  
**Depends on:** Stage-f1-02 Slice-01 complete  
**Target files (apps/web only):**
- `apps/web/src/app/AppSidebar.tsx`
- `apps/web/src/app/sidebarRouteState.ts` (if route-state refinements are needed for collapsed affordances)
- Optional sidebar support modules under `apps/web/src/app/` used only to harden collapsed-mode interaction and semantics

---

## What This Slice Delivers

This slice hardens collapsed sidebar behavior so keyboard and pointer users can reliably discover and operate navigation controls without changing the established visual language from prior slices.

Primary outcomes:

1. Collapsed mode exposes operable, semantically labeled navigation controls for primary destinations.
2. Keyboard behavior is predictable and complete for collapsed controls (focus, activation, and disclosure handling where applicable).
3. Pointer behavior in collapsed mode remains consistent with expanded-mode intent and existing route state semantics.

---

## Repository Evidence Baseline

Baseline captured at planning time (March 21, 2026):

| File | Evidence |
|---|---|
| `apps/web/src/app/AppSidebar.tsx` | Collapsed mode currently shows only icon/new-chat style controls and avatar affordance, with no explicit collapsed navigation set matching primary destinations |
| `apps/web/src/app/AppSidebar.tsx` | Expanded mode owns route-aware primary navigation state and Codex disclosure behavior; collapsed mode does not yet mirror those semantics |
| `apps/web/src/app/sidebarRouteState.ts` | Route-derived active state exists and can be reused by collapsed-mode controls to preserve navigation-state alignment |

---

## Dependencies

- Stage-f1-02 Slice-01 completed and provides extracted navigation config plus route-aware active semantics.
- No backend/API/schema updates are required for this slice.

---

## Acceptance Criteria

1. Collapsed-mode primary navigation operability:
   1. Collapsed sidebar presents pointer-operable controls for the same primary navigation destinations represented in expanded mode (Chat, Codex context entry, Review Inbox).
   2. Controls in collapsed mode preserve current visual language (existing color system, density, and shell style) while remaining recognizably interactive.
   3. Active destination is still discernible in collapsed mode via non-hover-only treatment.

2. Keyboard navigation hardening:
   1. Every collapsed-mode interactive control is reachable in a logical Tab sequence without skips or dead ends.
   2. Enter/Space activation works for button-like controls, and Enter activation works for link controls.
   3. No keyboard trap is introduced while moving between header toggle, collapsed navigation controls, and footer/profile affordances.

3. Semantic and accessible naming expectations:
   1. Icon-only collapsed controls expose accessible names through visible text alternatives or ARIA labeling.
   2. Active/selected state semantics are surfaced where appropriate (for example `aria-current` on active links).
   3. Disclosure-like interactions in collapsed mode (if present) expose correct expanded/collapsed semantics.

4. Pointer interaction parity:
   1. Pointer users can reach key destinations directly from collapsed mode without requiring a forced expand cycle.
   2. Hover/focus styling does not become the sole indicator of actionable controls.
   3. Existing collapse toggle behavior remains stable when repeatedly switching between expanded and collapsed states.

5. Change boundary:
   1. All implementation edits remain limited to `apps/web`.
   2. No edits are made to backend routes, Prisma schema, or non-frontend execution docs.

---

## Validation Record (validated during execution)

This record reflects checks run during Slice-02 execution and completion sign-off. It is an auditable completion log, not a blanket guarantee for future repository changes.

- [x] `pnpm lint` (exit 0)
- [x] `pnpm type-check` (exit 0; run from workspace root, recursively checks `apps/api` and `apps/web`)
- [ ] Manual smoke check: with sidebar collapsed, Tab through all controls and confirm focus visibility/order are logical and complete. (recommended, not executed in implementation run)
- [ ] Manual smoke check: activate collapsed controls by keyboard (Enter/Space where applicable) and confirm destination/action correctness. (recommended, not executed in implementation run)
- [ ] Manual smoke check: activate collapsed controls by pointer and confirm direct navigation parity for Chat, Codex, and Review Inbox pathways. (recommended, not executed in implementation run)
- [ ] Manual smoke check: toggle expanded/collapsed repeatedly and verify no interaction regressions or stuck disclosure state. (recommended, not executed in implementation run)

---

## Out-of-Scope Guardrails

- Redesigning sidebar aesthetics, typography system, or global theme tokens.
- Replacing existing navigation IA or introducing new destinations unrelated to Stage-f1-02.
- Backend/API-driven sidebar data loading.
- Changes outside `apps/web`.
- Any route architecture changes beyond what is required to preserve existing sidebar navigation intent.

---

## Execution Notes

- Implemented in `apps/web/src/app/AppSidebar.tsx` to harden collapsed-mode navigation parity, keyboard semantics, accessible naming, and active-state signaling.
- Stage-f1-02 is complete now that Slice-01 and Slice-02 are both completed.
