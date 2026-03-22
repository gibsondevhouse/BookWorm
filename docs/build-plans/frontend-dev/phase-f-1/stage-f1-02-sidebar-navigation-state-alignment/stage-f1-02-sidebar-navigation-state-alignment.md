# Stage-f1-02: Sidebar Navigation State Alignment

**Status:** [x] Completed  
**Phase:** Phase-f-1  
**Depends on:** Stage-f1-01 complete  
**Target files:** `apps/web/src/app/AppSidebar.tsx`, `apps/web/src/app/layout.tsx`, frontend-only sidebar support modules under `apps/web/src/`

---

## Purpose

Stage-f1-02 aligns sidebar behavior with route context and reusable frontend state boundaries,
reducing hardcoded coupling in `AppSidebar.tsx` while keeping the existing visual language.

---

## Repository Evidence Baseline

| File | Relevant State |
|---|---|
| `apps/web/src/app/AppSidebar.tsx` | Navigation groups, labels, recent items, and interaction state are all defined inline in one component |
| `apps/web/src/app/AppSidebar.tsx` | Collapse/open behavior is local state only; no route-aware active-link highlighting is implemented |
| `apps/web/src/app/layout.tsx` | Sidebar is mounted in a stable root-shell slot and can support extracted navigation concerns |

---

## Scope

| # | Item | Change Surface |
|---|---|---|
| 1 | Extract navigation data/config from sidebar render logic | sidebar support modules + `AppSidebar.tsx` |
| 2 | Add route-aware active-link styling/semantics for primary nav entries | `AppSidebar.tsx` |
| 3 | Normalize collapsed/expanded behavior and keyboard affordances across viewport sizes | `AppSidebar.tsx`, optional supporting hook |

Out of scope: backend route creation, admin permissions, API-driven nav payloads.

---

## Slices

### Slice-01: Sidebar Navigation Data Extraction and Active Link Semantics

**Status:** [x] Completed  
**Doc:** [stage-f1-02-slice-01-sidebar-navigation-data-extraction-and-active-link-semantics.md](./stage-f1-02-slice-01-sidebar-navigation-data-extraction-and-active-link-semantics.md)

### Slice-02: Collapsed Mode Interaction and Keyboard Navigation Hardening

**Status:** [x] Completed  
**Doc:** [stage-f1-02-slice-02-collapsed-mode-interaction-and-keyboard-navigation-hardening.md](./stage-f1-02-slice-02-collapsed-mode-interaction-and-keyboard-navigation-hardening.md)

---

## Dependencies

- Stage-f1-01 complete to avoid concurrent high-churn edits in root-shell primary interaction code.

---

## Acceptance Criteria

1. Sidebar navigation structure is no longer entirely hardcoded inside one render block.
2. Active route is visually and semantically identifiable in sidebar nav links.
3. Collapsed mode remains usable with keyboard and pointer interactions.
4. No modifications occur outside `apps/web`.
5. `pnpm lint` and `pnpm type-check` pass after stage completion.

---

## Validation Record (validated during execution)

This record reflects checks run during Stage-f1-02 execution and completion sign-off. It is an auditable completion log, not a blanket guarantee for future repository changes.

- [x] `pnpm lint` (exit 0)
- [x] `pnpm type-check` (exit 0; run from workspace root, recursively checks `apps/api` and `apps/web`)
- [ ] Manual smoke test: active route indicator updates when navigating between Chat, Codex, and Review Inbox links. (recommended, not executed in implementation runs)
- [ ] Manual smoke test: collapsed sidebar remains operable with keyboard focus. (recommended, not executed in implementation runs)
