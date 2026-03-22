# Stage 04 Slice 01: Remaining-Surface Rollout Plan and Defer-List Lock

**Executed:** 2026-03-22  
**Scope:** Audit all non-admin surfaces for ethereal token alignment; lock defer list; produce implementation order for Slice 02.

---

## Disposition Matrix

### Surfaces Confirmed Fully Aligned (no changes needed)

| Surface | Files | Alignment Method | Evidence |
|---------|-------|-----------------|----------|
| Root layout | `apps/web/src/app/layout.tsx` | `shell-panel` glass card, `bg-body` dark foundation | Inspected — all ethereal tokens |
| AppSidebar | `apps/web/src/app/AppSidebar.tsx` | `sidebar-shell`, `spotlight-surface`, design tokens throughout | Stage 02 Slice 02 |
| Chat entry page | `apps/web/src/app/page.tsx` | Thin composition layer; defers to ChatMessages + Composer | Inspected |
| ChatMessages | `apps/web/src/features/chat-surface/components/ChatMessages.tsx` | `shell-panel`, `hero-badge`, `quick-chip`, `prose-shell`, `stagger-fade-up` global classes | Inspected |
| Composer | `apps/web/src/features/chat-surface/composer/components/Composer.tsx` | `composer-panel`, `composer-shimmer`, `spotlight-surface`, full token coverage | phasefComposerFloatingBaseline — PASS |
| AutoResizeTextarea | `apps/web/src/features/chat-surface/composer/components/AutoResizeTextarea.tsx` | `composer-field` class; transparent textarea background | Inspected |
| Admin CSS module | `apps/web/src/app/admin/adminAccessibility.module.css` | All 53+ references replaced with `var(--color-*)` tokens | Stage 03 Slice 01 |
| Admin feature components (Shell, Header, SectionCard, SummaryPanel) | `apps/web/src/features/admin-surface/components/` | All inherit CSS module; no inline hardcodes | Stage 03 Slice 01 |
| Admin client pages (Entities, ReviewInbox, ProposalReview, EditEntity) | `apps/web/src/app/admin/` | All inherit CSS module | Stage 03 Slice 01–02 |

### Surfaces Requiring Manual Adjustment (Slice 02 scope)

| Surface | Gap | Priority | Action |
|---------|-----|----------|--------|
| `/settings` route | Page does not exist — sidebar link yields Next.js 404 in production | **P1 — production visible** | Create `apps/web/src/app/settings/page.tsx` with ethereal aesthetic placeholder |

### Deferred Items (locked with rationale)

| Item | Rationale | Re-open Condition |
|------|-----------|-------------------|
| `ConnectorSelector.tsx` (standalone) | Not rendered in any active route; uses correct tokens (`border-border`, `bg-paper` → dark tokens) but lacks richer compositor styling | Wire into production Composer |
| `AttachmentManager.tsx` (standalone) | Not rendered in any active route; uses correct tokens | Wire into production Composer |
| `AudioDictation.tsx` (standalone) | Not rendered in any active route; uses correct tokens | Wire into production Composer |
| `ModeToggle.tsx` (standalone) | Not rendered in any active route; uses correct tokens | Wire into production Composer |
| Pre-existing 15 test failures | Phase 3 state-ordering (409 conflicts) and Phase 5 doc-text regex — non-blocking, unrelated to Phase 6 visual work | Separate triage sprint |

---

## Slice 02 Implementation Order

1. **Create `/settings` route** — `apps/web/src/app/settings/page.tsx`
   - Ethereal-aligned placeholder: `shell-panel`, `hero-badge`, `stagger-fade-up`, design tokens
   - Content: heading, description, "coming soon" feature list with glassmorphic card
   - Server component; no client interactions needed

---

## Validation

- `pnpm lint` — PASS (pre-implementation baseline confirmed)
- `pnpm type-check` — PASS
- `pnpm test` — 363/378 pass; 15 pre-existing failures (non-blocking, documented)
- `phasefComposerFloatingBaseline` — PASS (5/5)

---

## Status

Slice 01 complete. All surfaces dispositioned. Defer list locked. Slice 02 implementation order confirmed.
