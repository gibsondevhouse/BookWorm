# Stage 04 Slice 02: Polish Implementation on Deferred Surfaces

**Executed:** 2026-03-22  
**Scope:** Apply ethereal design tokens to identified production gap; lock deferred-surface rationale.

---

## Work Completed

### P1 Fix: Settings Route (Production 404 Resolved)

**File created:** `apps/web/src/app/settings/page.tsx`

**Problem:** `AppSidebar.tsx` links to `/settings` and the route did not exist, yielding a Next.js 404 for any user who clicked the Settings navigation item.

**Solution:** Created a server-component settings placeholder page following the established ethereal aesthetic:

- `shell-panel` glassmorphic container matching the chat entry surface
- `hero-badge` branded label ("Configuration")
- `font-display` heading (`Settings`) with `stagger-fade-up` entrance animation
- `surface-panel` glassmorphic inner card listing upcoming feature categories
- Design token usage: `text-text`, `text-text-muted`, `bg-primary/50` accent dots, `rounded-[2rem]`
- No client-side code; pure server component
- Accessible: `aria-labelledby` on section, `aria-label` on feature list, `aria-hidden` on decoration

**Visual alignment:** Matches the chat home surface exactly — same container class, same badge pattern, same page structure.

### Deferred Items (rationale locked)

The following standalone feature components exist in `apps/web/src/features/chat-surface/composer/components/` but are not rendered in any active route. Their styling uses correct design tokens (`border-border`, `bg-paper`, `text-text-muted`) and does not require alignment action:

- `ConnectorSelector.tsx` — correct tokens; not rendered
- `AttachmentManager.tsx` — correct tokens; not rendered
- `AudioDictation.tsx` — correct tokens; not rendered
- `ModeToggle.tsx` — correct tokens; not rendered

**Defer rationale:** Aligning unused components carries no user-visible impact. Re-open when these components are wired into a production route.

---

## Validation

| Check | Result |
|-------|--------|
| `pnpm lint` | ✓ PASS |
| `pnpm type-check` | ✓ PASS |
| Settings page renders with ethereal aesthetic | ✓ Confirmed |
| `AppSidebar` Settings link resolves to valid route | ✓ Fixed |
| No new test regressions | ✓ (full suite: 363/378 pass; 15 pre-existing failures unchanged) |

---

## Files Changed

1. `apps/web/src/app/settings/page.tsx` — **Created** (new route, ethereal placeholder)

---

## Status

Slice 02 complete. Production 404 resolved. Deferred items locked with rationale. Slice 03 is complete; Slice 04 final verification and closeout is next.
