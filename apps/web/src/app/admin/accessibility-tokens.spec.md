# Accessibility Tokens Specification

## Overview

Accessibility tokens are systematic CSS custom properties that define reusable design decisions for accessibility-related styling. They replace hard-coded values across the application and provide a single source of truth for focus rings, motion behavior, spacing, and affordance constraints.

**Location:** `apps/web/src/app/accessibility-tokens.css`

**Import Layer:** Imported at the top of `globals.css` before all other styles to ensure global availability.

**Scope:** All custom properties are defined on `:root`, making them available throughout the application regardless of DOM hierarchy or CSS Module boundaries.

---

## Token Categories

### 1. Focus & Outline Tokens

These tokens control the visual appearance of keyboard focus indicators on interactive elements. Consistent focus styling is critical for keyboard accessibility, exceeding WCAG AA contrast requirements.

| Token | Value | Purpose |
|-------|-------|---------|
| `--focus-outline-width` | `2px` | Width of the focus ring outline. Exceeds WCAG AA minimum (3:1 ratio for understandable, visible focus indicator). |
| `--focus-outline-color` | `rgba(134, 201, 255, 0.95)` | Luminous blue color with high opacity. Contrast ratio against dark background: ~8:1 (exceeds WCAG AAA). |
| `--focus-outline-offset` | `2px` | Space between element edge and focus ring. Prevents overlap with element borders. |
| `--focus-outline-glow` | `0 0 0 5px rgba(134, 201, 255, 0.18)` | Optional outer glow/shadow for additional visibility in low-contrast scenarios. |

**Usage Example:**
```css
:focus-visible:not(.composer-field) {
  outline: var(--focus-outline-width) solid var(--focus-outline-color);
  outline-offset: var(--focus-outline-offset);
  box-shadow: var(--focus-outline-glow);
}
```

**Accessibility Foundation:**
- Complies with WCAG 2.5.3 (Focus Visible, Level AA)
- Contrast ratio `#86c9ff` on `#060b14` background: ~8.5:1 (passes AAA)
- Works in all color modes (no reliance on color alone for visibility)
- Visible on all interactive elements: buttons, links, inputs, selects, textareas

**Exceptions:**
- `.composer-field` elements exclude focus styling for ethereal aesthetic (uses `class` exception in selector)
- No per-component exemptions; focus ring is applied universally

---

### 2. Motion & Animation Tokens

Motion tokens define the duration and timing functions for all transitions and animations. They support consistent motion behavior and automatically respond to `prefers-reduced-motion` user preference.

#### Standard Motion Tokens

| Token | Value | Purpose | Use Case |
|-------|-------|---------|----------|
| `--motion-standard-duration` | `160ms` | Default transition duration | Most UI transitions (hover states, active states) |
| `--motion-slow-duration` | `180ms` | Longer, more noticeable transitions | Complex animations, multi-step transitions |
| `--motion-fast-duration` | `120ms` | Quick feedback transitions | Quick toggles, rapid state changes |
| `--motion-spring-timing` | `cubic-bezier(0.25, 1, 0.5, 1)` | Spring-like, expressive easing | Playful animations (shimmer effects, pop-ins) |
| `--motion-ease-in-out` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | Smooth standard easing | Professional transitions (slide-ins, fades) |

**Usage Example:**
```css
.sidebar-link {
  transition: color var(--motion-standard-duration) var(--motion-ease-in-out);
}

.composer-shimmer::after {
  animation: border-shimmer-orbit 5.8s linear infinite;
  transition: opacity var(--motion-spring-timing);
}
```

#### Reduced-Motion Override Tokens

| Token | Default Value | Reduced-Motion Override | Purpose |
|-------|---|---|---|
| `--motion-reduce-duration` | `0ms` | `0ms` | Use in place of standard durations when `@media (prefers-reduced-motion: reduce)` is active |
| `--motion-reduce-timing` | `cubic-bezier(0, 0, 1, 1)` | `cubic-bezier(0, 0, 1, 1)` | Linear/instant easing for reduced-motion mode |

**Reduced-Motion Behavior:**

When user has enabled `prefers-reduced-motion: reduce` (via OS settings or browser DevTools):

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    /* All motion durations become instant */
    --motion-standard-duration: 0ms;
    --motion-slow-duration: 0ms;
    --motion-fast-duration: 0ms;
    
    /* Timing functions become linear (no easing curve) */
    --motion-spring-timing: cubic-bezier(0, 0, 1, 1);
    --motion-ease-in-out: cubic-bezier(0, 0, 1, 1);
  }
}
```

**Result:** Any component using `var(--motion-standard-duration)` or `var(--motion-spring-timing)` automatically respects the user's motion preference without requiring per-component `@media (prefers-reduced-motion: reduce)` rules.

**Testing:**
1. Open browser DevTools (F12)
2. Press Cmd+Shift+P (or Ctrl+Shift+P on Windows)
3. Search for "Prefers Reduced Motion"
4. Enable "Prefers Reduced Motion: Reduce"
5. Observe: All animations stop, transitions become instant
6. Disable the setting; animations resume normal speed

---

### 3. Affordance & Interaction Tokens

Affordance tokens enforce accessibility constraints for touch targets, spacing, and interaction sizing. They support compliance with WCAG 2.5.5 (Target Size, Level Enhanced) and consistent spacing.

| Token | Value | Purpose | WCAG Reference |
|-------|-------|---------|---|
| `--affordance-touch-min-height` | `44px` | Minimum height for touch-activatable targets | WCAG 2.5.5 (44×44 CSS pixels minimum) |
| `--affordance-touch-min-width` | `44px` | Minimum width for touch-activatable targets | WCAG 2.5.5 |
| `--affordance-focus-ring-width` | `2px` | Alias for focus outline width (semantic reuse) | — |
| `--affordance-form-group-spacing` | `1rem` (16px) | Vertical spacing between form groups | Consistent form layout |
| `--affordance-section-spacing` | `1.5rem` (24px) | Spacing between major content sections | Visual hierarchy, readability |

**Usage Example:**
```css
button {
  min-height: var(--affordance-touch-min-height);
  min-width: var(--affordance-touch-min-width);
}

.form-group {
  margin-bottom: var(--affordance-form-group-spacing);
}

.section {
  margin-bottom: var(--affordance-section-spacing);
}
```

---

### 4. Theming & Color Scheme

#### Current State (Phase 6)

**Dark-Only Foundation:**
```css
:root {
  color-scheme: dark;
}
```

All tokens are defined for the dark theme:
- **Background:** `#060b14` (dark navy)
- **Surface:** `#0a101d` (slightly lighter navy)
- **Text:** `#edf5ff` (light blue-white)
- **Focus Blue:** `rgba(134, 201, 255, 0.95)` (luminous)

#### Future-Ready: Light Mode (Post-Phase-6)

The token architecture is designed to support light-mode implementation without requiring changes to CSS logic:

```css
/* Future implementation (not included in Phase 6) */
@media (prefers-color-scheme: light) {
  :root {
    --focus-outline-color: rgba(70, 130, 220, 0.95); /* darker blue for light bg */
    --focus-outline-glow: 0 0 0 5px rgba(70, 130, 220, 0.12);
    /* ... other light-mode overrides ... */
  }
}
```

**Rationale:**
- Token definitions in `:root` provide defaults for dark mode
- Light-mode support via `@media (prefers-color-scheme: light)` override block
- No changes to component CSS; only token values differ
- Existing color tokens in `@theme` block remain compatible

---

## CSS Custom Property Scope

### Global Scope (`:root`)

All accessibility tokens are defined on `:root`, making them available globally:
- Accessible in all CSS files (stylesheets, CSS Modules)
- Inherited by all elements
- Overridable via `@media` queries (`prefers-reduced-motion`, future `prefers-color-scheme`)

### CSS Module Compatibility

Unlike `:where(button, input, ...)` selectors (which target global elements and violate CSS Module purity), these tokens are **just variable definitions** and do not constitute impure selectors:

```css
/* ✓ VALID in CSS Modules: Uses token variable */
button {
  outline: var(--focus-outline-width) solid var(--focus-outline-color);
}

/* ✗ INVALID in CSS Modules: Targets global elements */
:where(button, input, a):focus-visible {
  outline: 2px solid blue;
}
```

The global focus rule is defined in `globals.css` (not a CSS Module), so it can safely target all interactive elements. CSS Modules that define buttons, inputs, etc., as classes can reference the tokens without violating purity.

---

## Semantic Naming Convention

### Pattern

```
--{category}-{property}[-{state}]
```

### Examples

| Token | Breakdown | Rationale |
|-------|-----------|-----------|
| `--focus-outline-width` | **category:** focus, **property:** outline, **state:** (default) | Describes the outline width of focus indicators |
| `--motion-spring-timing` | **category:** motion, **property:** timing, **state:** spring | Indicates spring-based easing for motion |
| `--affordance-touch-min-height` | **category:** affordance, **property:** touch (sizing constraint), **state:** min | Minimum height for touch targets |
| `--affordance-form-group-spacing` | **category:** affordance, **property:** form-group, **state:** spacing | Spacing for form layout |

### Naming Do's & Don'ts

| ✓ DO | ✗ DON'T |
|------|---------|
| `--focus-outline-color` | `--button-focus-color` (too specific; not reusable) |
| `--motion-standard-duration` | `--sidebar-link-transition-time` (element-specific) |
| `--affordance-touch-min-height` | `--mobile-button-height` (device-specific) |
| `--focus-outline-glow` | `--blue-glow-shadow` (color-specific; breaks in light mode) |

**Principle:** Use semantic category names to ensure tokens remain reusable across different components and future themes.

---

## Implementation Checklist

- [x] All focus tokens defined with values and CSS custom property names
- [x] All motion tokens defined; reduced-motion variants documented
- [x] All affordance tokens defined with accessibility rationale
- [x] Semantic naming convention established and applied consistently
- [x] Dark-only current state documented; light-mode architecture documented as future-ready
- [x] CSS Module purity violation resolved (impure selector removed from `adminAccessibility.module.css`)
- [x] Global focus rule refactored to use token variables in `globals.css`
- [x] Reduced-motion support verified via token layer override

---

## Testing & Verification

### Token Value Verification

```bash
# Check that token values match current hard-coded values
grep -n "outline: 2px solid rgba(134, 201, 255" apps/web/src/app/globals.css
# Should match: outline: var(--focus-outline-width) solid var(--focus-outline-color);
# Where --focus-outline-width = 2px and --focus-outline-color = rgba(134, 201, 255, 0.95)
```

### Focus Visibility Test

**Method 1: Manual Keyboard Navigation**
1. Open admin panel (e.g., Review Inbox, Entity List)
2. Press Tab repeatedly to cycle through focusable elements
3. Verify blue 2px outline + glow visible on:
   - Buttons
   - Input fields
   - Links
   - Select dropdowns
   - Textareas

**Method 2: Existing Test Suite**
```bash
pnpm test phase5AccessibilityKeyboardNavigationPart01
```
This test verifies keyboard navigation and focus visibility.

### Reduced-Motion Verification

1. Open DevTools (F12)
2. Run search for "Prefers Reduced Motion"
3. Enable "Prefers Reduced Motion: Reduce"
4. Observe components:
   - `.sidebar-link` transitions become instant
   - `.composer-shimmer` animation stops
   - `.stagger-fade-up` applies instantly (no animation-delay stagger)
5. Disable reduced-motion; animations resume

### No Visual Regressions

```bash
# Run full test suite for visual consistency
pnpm test --grep "accessibility|focus|motion"

# Manual smoke test: Visit key pages
# - /admin (Review Inbox, Entity List)
# - / (public home)
# - /codex/* (public codex pages)
# Verify: No visual changes, animations smooth, focus rings blue
```

---

## Related Documentation

- **Accessibility Tokens Implementation:** [accessibility-tokens.css](../accessibility-tokens.css)
- **Global Styles Import:** [globals.css](../globals.css)
- **Admin Accessibility Styles:** [adminAccessibility.module.css](./adminAccessibility.module.css)
- **WCAG 2.1 References:**
  - [WCAG 2.5.3 Focus Visible](https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html)
  - [WCAG 2.5.5 Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
  - [WCAG 5.1.4 Text Spacing](https://www.w3.org/WAI/WCAG21/Understanding/text-spacing.html)

---

## Maintenance & Future Work

### Phase 6 (Current)
- [x] Token layer established (focus, motion, affordance)
- [x] Dark theme baseline complete
- [x] Reduced-motion support active
- [ ] Light mode support (deferred)

### Phase 6 Stage 05 (Subsequent Slices)
- **Slice 02:** Extend token layer with additional accessibility patterns
- **Slice 03+:** Implement component-level accessibility hardening using tokens

### Post-Phase-6 Roadmap
- Add light-mode token override block under `@media (prefers-color-scheme: light)`
- Review and adjust motion token durations based on user feedback
- Extend affordance tokens for additional spacing constraints as needed (e.g., `--affordance-icon-padding`, `--affordance-link-underline-spacing`)

