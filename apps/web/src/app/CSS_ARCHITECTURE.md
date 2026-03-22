# CSS Architecture: Layering & Accessibility Integration

## Overview

BookWorm's CSS is organized into **three strictly-layered levels**, each with specific responsibilities. This separation ensures:
- **Global consistency** for accessibility features (focus, motion, affordance)
- **CSS Module purity** (no global selectors in component-scoped styles)
- **Maintainability** (clear rationale for where each style lives)
- **Future scalability** (architecture ready for theming, dark/light mode, etc.)

---

## Layer 1: Global Accessibility Tokens

**File:** `accessibility-tokens.css`

**Responsibility:** Define **reusable CSS custom properties** for focus, motion, affordance, and theming.

**Contents:**
- **Focus tokens:** `--focus-outline-width`, `--focus-outline-color`, `--focus-outline-offset`, `--focus-outline-glow`
- **Motion tokens:** `--motion-standard-duration`, `--motion-slow-duration`, `--motion-fast-duration`, `--motion-spring-timing`, `--motion-ease-in-out`
- **Affordance tokens:** `--affordance-touch-min-height`, `--affordance-touch-min-width`, `--affordance-form-group-spacing`, `--affordance-section-spacing`
- **Theming:** Dark-only foundation (currently); architecture supports future light mode via `@media (prefers-color-scheme: light)`

**Key Feature - Automatic Reduced-Motion Support:**
```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-standard-duration: 0ms;  /* Instant transitions */
    --motion-spring-timing: cubic-bezier(0, 0, 1, 1);  /* No easing */
  }
}
```

Any component using motion tokens automatically respects the user's `prefers-reduced-motion` setting without needing per-component `@media` queries.

**Example:** A button with `transition: all var(--motion-standard-duration) var(--motion-spring-timing)` will:
- Smoothly animate in motion-safe environments
- Transition instantly when `prefers-reduced-motion: reduce` is enabled

---

## Layer 2: Global Baseline Styles

**Files:** `globals.css` (imports `accessibility-tokens.css` at the top)

**Responsibility:** Define **global element behavior and base styles** that apply universally.

**Contains:**
- **Reset & base styles:** Box-sizing, HTML/body margin/padding, background colors
- **Focus styling:** `:focus-visible:not(.composer-field)` rule using token variables
- **Form element normalization:** Button, input, textarea font inheritance
- **Prose composition:** Display fonts, heading hierarchy, list/paragraph spacing
- **Glassmorphic & ambient styling:** backdrop-filter, gradient surfaces, shadow shells

**Critical Rule: Global Focus Styling**
```css
:focus-visible:not(.composer-field) {
  outline: var(--focus-outline-width) solid var(--focus-outline-color);
  outline-offset: var(--focus-outline-offset);
  box-shadow: var(--focus-outline-glow);
}
```

**How It Works:**
- Applies to **all interactive elements** (button, input, select, textarea, a, and any element with `tabindex`)
- Automatically inherits throughout the DOM tree
- CSS Modules do not need to redefine this; it cascades into their scoped elements
- Exception class `.composer-field` is excluded because the Composer widget manages its own focus behavior

**Example - Component Focus Visibility:**
```tsx
// Button in a CSS Module
export const Button = () => (
  <button className={styles.button}>Click me</button>
);

// styles.button in adminAccessibility.module.css
.button {
  background: var(--color-surface-strong);
  color: var(--color-text);
  padding: 0.65rem 1rem;
  /* NO :focus-visible rule here! Focus comes from globals.css */
}

// When focused, the button automatically gets the ethereal blue outline from globals.css
```

---

## Layer 3: CSS Modules (Component-Scoped Styling)

**Files:** `*.module.css` in component directories (e.g., `admin/adminAccessibility.module.css`)

**Responsibility:** Define **layout, color application, typography variants, and component-specific spacing** only.

**Contains:**
- `.button`, `.input`, `.select` — color, padding, hover states (no focus rules)
- `.layout`, `.shell`, `.page` — grid, display, positioning
- `.typography` classes (`.prose-shell`, `.font-display`) — font family, spacing
- `.status*`, `.priority*` — semantic color variants
- State classes like `.rowActive`, `.dialogBackdrop`

**CONSTRAINT: CSS Modules Must Remain Pure**

**✅ DO:**
```css
.button {
  background: var(--color-surface-strong);
  padding: 0.65rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
}

.button:hover {
  background: var(--color-bg-surface);
  border-color: var(--color-primary);
}
```

**❌ DON'T:**
```css
/* ❌ Cannot use pseudo-classes with complex selectors in CSS Modules */
.button:focus-visible { outline: 2px solid blue; }

/* ❌ Cannot use :where() to reference pseudo-classes (CSS Module purity violation) */
:where(.button, .input):focus-visible { outline: 2px solid blue; }

/* ❌ Cannot escape module scope with :global() for focus rules */
:global(.interactive:focus-visible) { outline: 2px solid blue; }
```

---

## Focus Styling Inheritance Flow

Here's how focus styling automatically propagates:

```
accessibility-tokens.css
  ↓
  Defines: --focus-outline-width, --focus-outline-color, etc.

globals.css (imports tokens)
  ↓
  Defines: :focus-visible:not(.composer-field) { outline: var(--focus-outline-width) ... }
  ↓
  Applies to ALL interactive elements globally

CSS Modules (adminAccessibility.module.css, etc.)
  ↓
  .button, .input, .select classes receive outline from globals
  ↓
  User focus navigates through button → automatic inheritance ✓
```

**Why This Works:**
- CSS inheritance cascades from global `:focus-visible` rule
- CSS Module scoping does NOT prevent inheritance of global pseudo-class styles
- Components never need to redefine focus styling

---

## Element Types Covered by Global Focus Rule

The `:focus-visible:not(.composer-field)` rule automatically handles:

1. **Native interactive elements:**
   - `button`, `input`, `select`, `textarea`, `a`
   - Built-in browser focus styling is replaced with ethereal tokens

2. **ARIA interactive elements:**
   - Elements with `role="button"`, `role="tab"`, `role="menuitem"`
   - Requires `tabindex` when not semantic HTML

3. **Custom interactive components:**
   - Admin surface actions (`.button`, `.rowButton`, `.actionButton`)
   - Properly tagged with semantic HTML or ARIA

4. **Exception - Composer:**
   - `.composer-field` elements are excluded (`:not(.composer-field)`)
   - Composer widget manages its own focus trap and styling

---

## Verification: Manual Focus Testing

To verify focus styling is working correctly:

1. **Open admin surface** (e.g., `/admin/review-inbox` or `/admin/entities`)
2. **Press Tab key** to navigate through interactive elements
3. **Observe focus indicator:**
   - Ethereal blue outline should appear around focused element
   - Outline should have 2px width with luminous blue glow
   - Outline should be visible and distinguishable from element border

4. **Test element types:**
   - Buttons in list (`.button`, `.rowButton`, `.actionButton`)
   - Input fields (`.input`, `.select`, `textarea`)
   - Anchor links (native `<a>` elements)
   - Dialog close buttons (`.closeButton`)

5. **Test Composer exception:**
   - Open Composer connector popover
   - Focus should not display global outline (managed by Composer)

---

## CSS Architecture Rules for Future Development

When adding new components:

1. **Always use semantic HTML** - `<button>`, `<input>`, `<a>`, `<label>` whenever possible
2. **Never put `:focus-visible` in CSS Modules** - focus styling lives in globals.css
3. **Reference accessibility tokens** - use `var(--focus-outline-color)`, `var(--motion-standard-duration)`, etc.
4. **Keep CSS Modules scoped** - no `:global()` escapes, no pseudo-class pipes to multiple selectors
5. **Rely on inheritance** - focus, motion, and base affordance styles cascade from Layer 2 automatically

---

## Example: Adding a New Interactive Component

**Goal:** Add a custom toggle switch with proper focus styling.

**Step 1: Define markup**
```tsx
export const Toggle = ({ checked, onChange }) => (
  <button
    className={styles.toggle}
    role="switch"
    aria-checked={checked}
    onClick={onChange}
  >
    {checked ? 'On' : 'Off'}
  </button>
);
```

**Step 2: Style in CSS Module (no focus rule needed)**
```css
.toggle {
  background: var(--color-surface-strong);
  border: 1px solid var(--color-border);
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: background var(--motion-standard-duration) var(--motion-spring-timing);
}

.toggle:hover {
  background: var(--color-primary);
}

.toggle[aria-checked='true'] {
  background: var(--color-primary);
}
```

**Step 3: Focus styling is automatic**
- When user tabs to the toggle, `:focus-visible` from globals.css applies
- Ethereal blue outline appears automatically
- No additional CSS Module rule needed

---

## Reduced-Motion & Accessibility

All motion tokens have automatic reduced-motion support. If a component uses motion tokens, it respects user preferences automatically:

```css
.card {
  transition: transform var(--motion-standard-duration) var(--motion-ease-in-out);
}
```

In motion-safe environment: Smooth 160ms transition  
In reduced-motion preference: Instant (0ms) transition  
No per-component `@media (prefers-reduced-motion)` needed!

---

## Future Theming Readiness

The architecture is ready for:

- **Dark/Light Mode:** Add `@media (prefers-color-scheme: light) { :root { --color-primary: ... } }`
- **High Contrast Mode:** Add token overrides for `@media (prefers-contrast: more)`
- **Custom Color Schemes:** Users could override tokens via `--color-primary: red` etc.
- **Composable Themes:** Add theme layers without changing component code

---

## Technical Debt & Known Limitations

1. **`.composer-field` Exception:** The Composer widget is excluded from global focus (`:not(.composer-field)`). Future refactors should consider consolidating Composer focus into the global system.

2. **Focus Trap Management:** Focus management logic (Tab wrapping, escape handling) lives in component event handlers (`ReviewInboxClient`, `ProposalReviewClient`, etc.). Future work (Slice 03) will extract this into reusable hooks.

3. **WCAG Audit:** Slice 04 will conduct a formal WCAG AA+ audit. Current focus styling meets visual requirements but semantic completeness will be verified then.

---

## References

- Accessibility tokens definition: `apps/web/src/app/accessibility-tokens.css`
- Global baseline styles: `apps/web/src/app/globals.css`
- Admin component module: `apps/web/src/app/admin/adminAccessibility.module.css`
- Accessibility keyboard utilities: `apps/web/src/app/admin/_lib/accessibilityKeyboard.ts`
- Phase 5 keyboard navigation test: `tests/phase5AccessibilityKeyboardNavigationPart01.test.ts`
- Phase 6 Stage 05 build plan: `docs/build-plans/phase-6/stage-05-accessibility-system-formalization-wcag-hardening/`
