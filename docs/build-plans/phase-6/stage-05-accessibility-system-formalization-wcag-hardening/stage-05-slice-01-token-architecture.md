# Stage 05 Slice 01: Accessibility Token Architecture & Theming Foundation

## Purpose

Systematize accessibility-related design tokens (focus, motion, spacing, affordance) into a formal token layer that replaces hard-coded values in `globals.css` and provides a foundation for all subsequent Stage 05 slices. This slice establishes the CSS custom property infrastructure for the entire accessibility system.

## Deliverables

### 1. Accessibility Tokens Document

**File:** `docs/build-plans/phase-6/stage-05-accessibility-system-formalization-wcag-hardening/accessibility-tokens.md`

This document defines all accessibility-related design tokens with their values, usage, and rationale. It serves as the specification for the CSS token layer.

**Sections:**

1. **Focus & Outline Tokens**
   - `--focus-outline-width`: `2px` (current hard-coded value in globals.css line 88)
   - `--focus-outline-color`: `rgba(134, 201, 255, 0.95)` (luminous blue)
   - `--focus-outline-offset`: `2px` (current value)
   - `--focus-outline-glow`: `0 0 0 5px rgba(134, 201, 255, 0.18)` (current box-shadow value)
   - Additional tokens for focus visibility edge cases (`.composer-field` exemption policy documented)

2. **Motion & Animation Tokens**
   - `--motion-standard-duration`: `160ms` (commonly used across components)
   - `--motion-slow-duration`: `180ms–200ms` (transitions, hover effects)
   - `--motion-fast-duration`: `120ms–140ms` (quick feedback)
   - `--motion-spring-timing`: `cubic-bezier(0.25, 1, 0.5, 1)` (current `--transition-spring` in globals.css)
   - `--motion-ease-in-out`: `cubic-bezier(0.25, 0.46, 0.45, 0.94)` (standard easing)
   - Reduced-motion equivalents: `--motion-reduce-duration: 0ms`, `--motion-reduce-timing: cubic-bezier(0, 0, 1, 1)`

3. **Affordance & Interaction Tokens**
   - `--affordance-touch-min-height`: `44px` (min button/input height for keyboard accessibility)
   - `--affordance-touch-min-width`: `44px` (min button width)
   - `--affordance-focus-ring-width`: `2px` (same as outline-width)
   - `--affordance-form-group-spacing`: `1rem` (16px)
   - `--affordance-section-spacing`: `1.5rem` (24px)

4. **Contrast & Color Tokens for Accessibility**
   - Reference existing tokens from `globals.css` @theme block
   - Verify WCAG AA minimum ratios:
     - Primary text (`--color-text` #edf5ff) on background (`--color-bg-base` #060b14): ~12:1 ✓
     - Primary action (`--color-primary` #86c9ff) on surface (`--color-bg-surface` #0a101d): ~4.5:1 ✓
   - Document any borderline ratios (3:1–4.5:1 range) with context (large text, UI components, etc.)

5. **Semantic Naming Convention**
   - Pattern: `--{category}-{property}-{state}` or `--{category}-{property}`
   - Examples:
     - `--focus-outline-color` (focus behavior, outline property, default state)
     - `--motion-spring-timing` (motion category, timing property, spring style)
     - `--affordance-touch-min-height` (affordance category, touch sizing, min)
   - Avoid element-specific names (e.g., ✗ `--button-focus-color`); use semantic names for reusability

6. **Reduced-Motion Support**
   - Document how `@media (prefers-reduced-motion: reduce)` applies token overrides
   - Token layer defines `--motion-reduce-*` variants
   - Components using motion tokens automatically inherit reduced-motion behavior when media query activates

7. **Dark-Only Theming (Current) + Light-Mode Readiness**
   - Currently: `:root { color-scheme: dark; }`
   - Future-ready: Document how new tokens could be added under `@media (prefers-color-scheme: light)` without changing CSS logic
   - Note: Light-mode implementation deferred to post-Phase-6

**Acceptance Criteria:**
   - [ ] All focus tokens defined with values and CSS custom property names
   - [ ] All motion tokens defined; reduced-motion variants documented
   - [ ] All affordance tokens defined with accessibility rationale
   - [ ] Existing color tokens reviewed for WCAG AA minimum contrast
   - [ ] Semantic naming convention established and applied consistently
   - [ ] Document links to WCAG references where applicable

### 2. CSS Token Layer File

**File:** `apps/web/src/app/accessibility-tokens.css` (NEW)

Create a new CSS file that defines all accessibility custom properties. This file will be imported into `globals.css`.

**Structure:**

```css
/* Accessibility Tokens Layer */

:root {
  /* Focus & Outline Tokens */
  --focus-outline-width: 2px;
  --focus-outline-color: rgba(134, 201, 255, 0.95);
  --focus-outline-offset: 2px;
  --focus-outline-glow: 0 0 0 5px rgba(134, 201, 255, 0.18);

  /* Motion & Animation Tokens */
  --motion-standard-duration: 160ms;
  --motion-slow-duration: 180ms;
  --motion-fast-duration: 120ms;
  --motion-spring-timing: cubic-bezier(0.25, 1, 0.5, 1);
  --motion-ease-in-out: cubic-bezier(0.25, 0.46, 0.45, 0.94);

  /* Affordance & Interaction Tokens */
  --affordance-touch-min-height: 44px;
  --affordance-touch-min-width: 44px;
  --affordance-focus-ring-width: 2px;
  --affordance-form-group-spacing: 1rem;
  --affordance-section-spacing: 1.5rem;

  /* Reduced-Motion Overrides (default, will be overridden by media query) */
  --motion-reduce-duration: var(--motion-standard-duration);
  --motion-reduce-timing: var(--motion-spring-timing);
}

/* Reduced-Motion Support: Override motion tokens when user prefers reduced motion */
@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-standard-duration: 0ms;
    --motion-slow-duration: 0ms;
    --motion-fast-duration: 0ms;
    --motion-spring-timing: cubic-bezier(0, 0, 1, 1);
    --motion-ease-in-out: cubic-bezier(0, 0, 1, 1);
    --motion-reduce-duration: 0ms;
    --motion-reduce-timing: cubic-bezier(0, 0, 1, 1);
  }
}

/* Future: Dark/Light Theme Support (foundation for post-Phase-6 implementation) */
/* @media (prefers-color-scheme: light) { ... } */
```

**Acceptance Criteria:**
   - [ ] `accessibility-tokens.css` created with all custom properties defined
   - [ ] File imported into `globals.css` (add `@import "accessibility-tokens.css";` at top)
   - [ ] All values match current hard-coded values in globals.css (no visual change)
   - [ ] `@media (prefers-reduced-motion: reduce)` rules override motion tokens to 0ms/instant timing

### 3. Refactor globals.css to Use Tokens

**File:** `apps/web/src/app/globals.css` (UPDATE)

Update the focus-visible rule and motion rules in globals.css to reference the new token variables instead of hard-coded values.

**Current (lines 88–92):**
```css
:focus-visible:not(.composer-field) {
  outline: 2px solid rgba(134, 201, 255, 0.95);
  outline-offset: 2px;
  box-shadow: 0 0 0 5px rgba(134, 201, 255, 0.18);
}
```

**Updated:**
```css
:focus-visible:not(.composer-field) {
  outline: var(--focus-outline-width) solid var(--focus-outline-color);
  outline-offset: var(--focus-outline-offset);
  box-shadow: var(--focus-outline-glow);
}
```

**Current (lines 372–387, prefers-reduced-motion):**
```css
@media (prefers-reduced-motion: reduce) {
  .transition-spring,
  .tactile-press,
  .spotlight-surface::before,
  .composer-shimmer::after,
  .stagger-fade-up {
    transition: none;
    animation: none;
    transform: none;
    opacity: 1;
  }
  /* ... more rules ... */
}
```

**Updated** (can stay largely the same, but verify that token-level overrides take effect):
```css
@media (prefers-reduced-motion: reduce) {
  /* Token overrides are now defined in accessibility-tokens.css */
  /* Component-level rules remain here for specificity where needed */
  .transition-spring,
  .tactile-press,
  .spotlight-surface::before,
  .composer-shimmer::after,
  .stagger-fade-up {
    transition: var(--motion-reduce-duration) var(--motion-reduce-timing) !important;
    animation: none !important;
    transform: none !important;
    opacity: 1 !important;
  }
  /* ... more rules ... */
}
```

**Acceptance Criteria:**
   - [ ] Focus rule refactored to use token variables
   - [ ] Motion rules use token overrides (or at least don't break due to token definitions)
   - [ ] No visual change (all values identical to current hard-coded ones)
   - [ ] `pnpm lint` passes
   - [ ] `pnpm type-check` passes

### 4. Consolidate Theming & Reduced-Motion Support

**Deliverable:** Update to `accessibility-tokens.css` (already above) + documentation in `accessibility-tokens.md`

**No breaking changes:** The existing `:root { color-scheme: dark; }` in globals.css remains. The new tokens layer simply provides custom properties for use throughout the app.

**Reduced-Motion Consolidation:**
   - All motion token overrides happen in `accessibility-tokens.css` @media query
   - Component styles can reference `--motion-standard-duration`, etc., and automatically inherit reduced-motion behavior
   - No scattered `@media (prefers-reduced-motion: reduce)` blocks in component CSS Modules (centralized in token layer and globals.css)

**Theming Readiness:**
   - Document in `accessibility-tokens.md` how light-mode support could be added in future
   - Current implementation: `:root` block only; future can add `@media (prefers-color-scheme: light)` without changing architecture

**Acceptance Criteria:**
   - [ ] All motion tokens consolidated in `accessibility-tokens.css`
   - [ ] Reduced-motion behavior verified: test with browser DevTools `prefers-reduced-motion: reduce` enabled
   - [ ] Dark-theme basis complete; light-mode architecture documented as future-ready
   - [ ] No regressions: animations/transitions on all surfaces still work correctly

---

## Implementation Checklist

- [ ] **Create accessibility-tokens.md** — Comprehensive token specification with sections on focus, motion, affordance, theming, and naming convention
- [ ] **Create accessibility-tokens.css** — New CSS file with all custom properties and @media (prefers-reduced-motion: reduce) overrides
- [ ] **Import accessibility-tokens.css into globals.css** — Add import at top of globals.css
- [ ] **Refactor :focus-visible rule in globals.css** — Replace hard-coded values with token variables
- [ ] **Verify prefers-reduced-motion behavior** — Test with DevTools; ensure animations stop, transitions become instant
- [ ] **Run pnpm lint** — Verify no CSS linting errors
- [ ] **Run pnpm type-check** — Verify no TypeScript errors (if applicable)
- [ ] **Manual visual regression test** — Verify focus rings still visible, animations/transitions unchanged when prefers-reduced-motion is NOT set

---

## Testing & Verification

### Token Verification
- [ ] All token values match current hard-coded values (copy-paste verification)
- [ ] Token names follow semantic naming convention (check against accessibility-tokens.md naming rules)
- [ ] No undefined variables or circular references

### Functional Testing
- [ ] **Focus Visibility:** Tab through admin surfaces (Review Inbox, Entity List); verify blue 2px outline + glow visible on all focusable elements
- [ ] **Prefers-Reduced-Motion:**
  1. Enable `prefers-reduced-motion: reduce` in browser DevTools (or system settings)
  2. Trigger any animated component (e.g., Composer popover, sidebar transitions)
  3. Verify animations are instant (0ms), transitions have no delay, opacity jumps to final state
  4. Disable `prefers-reduced-motion: reduce`; verify animations resume normal speed
- [ ] **No Regressions:** Existing animation/transition effects on public home, codex, chat surfaces should be unchanged

### Linting & Type Checking
- [ ] `pnpm lint` passes
- [ ] `pnpm type-check` passes

---

## Acceptance Criteria (Slice 01 Complete)

- [ ] ✓ All accessibility tokens (focus, motion, affordance, contrast) documented in `accessibility-tokens.md`
- [ ] ✓ CSS tokens defined in `accessibility-tokens.css` and imported into `globals.css`
- [ ] ✓ `:focus-visible` rule in `globals.css` uses token references (no hard-coded values)
- [ ] ✓ `@media (prefers-reduced-motion: reduce)` rules consolidated into token-driven approach
- [ ] ✓ `pnpm lint` and `pnpm type-check` pass with no new violations
- [ ] ✓ Focus styling visually unchanged; `prefers-reduced-motion` behavior preserved
- [ ] ✓ Manual verification: focus rings visible on 3+ surfaces; reduced-motion toggle verified

---

## Dependencies & Handoff

**Incoming Dependencies:** None (Stage 04 complete)

**Outgoing Handoff to Slice 02:** 
- Token definitions in `accessibility-tokens.md`
- Token CSS layer in `accessibility-tokens.css`
- `globals.css` updated to reference tokens
- Ready for CSS Module cleanup and focus-styling verification in Slice 02

---

## Related Documents

- [Stage 05 Master Plan](stage-05.md)
- [Accessibility Tokens Specification](accessibility-tokens.md) (created by this slice)
- [UI Vision Document](../../build-system/book-worm-build-system/ui-vision.md) — Dark-base + luminous blue aesthetic baseline
- [Phase 5 Part 01 Keyboard Navigation](../../phase-5/stage-04-ux-accessibility-and-feedback-integration/part-01-accessibility-and-keyboard-navigation-hardening/part-01-accessibility-and-keyboard-navigation-hardening.md) — Foundation for accessibility in Phase 5

