# Phase 6 Stage 05: Accessibility System Formalization & WCAG Hardening

## Planning Target

Upgrade BookWorm's accessibility from scattered keyboard-navigation and focus patterns into a **cohesive accessibility token system** covering focus/outline styles, motion preferences, semantic patterns, and WCAG AA+ conformance. This stage formalizes Phase 5's foundational keyboard work into a reusable system and hardens all surfaces against accessibility gaps.

## Purpose

BookWorm currently has:
- ✓ Keyboard navigation hardening (Phase 5 Part 01) with focus traps, shortcuts, and list cursors
- ✓ Semantic structure (landmarks, labels, ARIA) across P1 admin surfaces
- ✓ Partial reduced-motion support in `globals.css`
- ✗ No systematic accessibility token architecture
- ✗ Scattered accessibility styles across CSS Modules and globals
- ✗ No formalized WCAG audit or conformance checklist
- ✗ Accessibility CSS patterns not layered or scoped correctly

**Stage 05's job:** Build the token system, audit the full app against WCAG AA+, create semantic patterns as a reusable layer, fix CSS architecture, and produce a living accessibility standard document.

## Repository Evidence Summary

**Current State (as of 2026-03-22):**

| Artifact | Status | Location | Notes |
|---|---|---|---|
| Focus styling | Partial | `apps/web/src/app/globals.css` line 88–92 | `:focus-visible:not(.composer-field)` rule with 2px blue outline + glow; works but not systemized |
| Color tokens | Partial | `apps/web/src/app/globals.css` @theme block | Design tokens exist (`--color-primary`, `--color-accent`, etc.) but not accessibility-specific |
| Reduced motion | Partial | `apps/web/src/app/globals.css` lines 372–387 | `@media (prefers-reduced-motion: reduce)` covers some animations but incomplete coverage |
| Keyboard navigation | Complete | Phase 5 Part 01 ✓ | Focus traps, list cursors, Alt+ shortcuts in Review Inbox, Proposal Review, Entity List, Edit Entity |
| Semantic structure | Complete | Phase 5 Part 01 ✓ | ARIA roles, labels, heading hierarchy on P1 surfaces |
| CSS Module error | Outstanding | `apps/web/src/app/admin/adminAccessibility.module.css` line 440s | Selector `:where(button, input, select, textarea, a):focus-visible` violates CSS Module purity; deferred from Stage 03 |
| Readability standards | Partial | `apps/web/src/app/admin/READABILITY_STANDARDS.md` | Documents typography, affordance, error states but not systematically enforced via tokens |
| Deterministic tests | Partial | `tests/phase5AccessibilityKeyboardNavigationPart01.test.ts` + `tests/phase5AdminUsabilityReadabilityPart02.test.ts` | Keyboard and readability tests exist; no WCAG audit or token verification suite |

**API & Focus Management Evidence:**

- Focus trap utility: `apps/web/src/app/admin/_lib/accessibilityKeyboard.ts` exports `moveFocusTrap()`, `moveListCursor()`, `resolveKeyboardShortcut()`
- Focus implementations: ReviewInboxClient, ProposalReviewClient, EntitiesClient, EditEntityPageClient all have raw `addEventListener("keydown", ...)` patterns with focus management logic
- Composer connector popover: Focus trap pattern in `Composer.tsx` lines 70–105

**UI Vision Alignment:**

Phase 6's ethereal fantasy aesthetic is now the visual baseline. Accessibility should reinforce (not compromise) this direction:
- Dark-base palette with luminous blue highlight is established
- Transitions defined as `--transition-spring` cubic-bezier(0.25, 1, 0.5, 1)
- No dark/light theme switching planned; dark-only for now per `color-scheme: dark` in `:root`

## Work To Be Done

### Slice 01: Accessibility Token Architecture & Theming Foundation

**Purpose:** Systematize accessibility-related design tokens (focus, motion, spacing, semantics) into a formal token layer.

**Deliverables:**

1. **Accessibility Tokens Document** (`docs/build-plans/phase-6/stage-05-accessibility-system-formalization-wcag-hardening/accessibility-tokens.md`)
   - Focus tokens (outline color, offset, glow effect, width)
   - Motion tokens (transition timing, animation durations, reduced-motion equivalents)
   - Spacing tokens for affordance (min button height, min touch target, form group spacing)
   - Contrast requirements baseline (WCAG AA+ minimum ratios)
   - Semantic naming convention (e.g., `--focus-outline-primary`, `--motion-standard`, `--affordance-touch-min`)

2. **CSS Token Layer** (`apps/web/src/app/accessibility-tokens.css`)
   - New file: defines all accessibility custom properties in `@theme` or `:root` scope
   - Imports into `globals.css`
   - Covers:
     - Focus and outline styles (replacing hard-coded `2px solid rgba(134, 201, 255, 0.95)`)
     - Animation/transition durations and timing functions
     - Reduced-motion overrides at media-query level
     - Contrast and color ratios (documented but not enforced by CSS, referenced in audit)

3. **Theming & Reduced-Motion Consolidation** (refactor into `accessibility-tokens.css`)
   - Move prefers-reduced-motion rules from globals.css lines 372–387 into systematic token-driven approach
   - Add dark-theme basis (no light mode yet, but architecture ready for future `color-scheme: light` switch)
   - Document motion strategy: smooth transitions on motion-safe, instant on motion-reduce

4. **Evidence:**
   - `accessibility-tokens.md` checklist of all tokens defined
   - `accessibility-tokens.css` file with all custom properties + @media (prefers-reduced-motion) applied at token level
   - Update `globals.css` focus rule to reference new tokens: `:focus-visible:not(.composer-field) { outline: var(--focus-outline-width) solid var(--focus-outline-color); outline-offset: var(--focus-outline-offset); box-shadow: var(--focus-outline-glow); }`

**Acceptance Criteria:**

- [ ] All accessibility tokens (focus, motion, affordance, contrast) are documented in `accessibility-tokens.md`
- [ ] CSS tokens are defined in `accessibility-tokens.css` and imported into globals
- [ ] `:focus-visible` rule in globals uses token references, not hard-coded values
- [ ] `@media (prefers-reduced-motion: reduce)` rules are consolidated into token-driven approach
- [ ] `pnpm lint` and `pnpm type-check` pass with no new violations
- [ ] Focus styling visually unchanged; prefers-reduced-motion behavior preserved

**Dependencies:** None (Stage 02/03 complete)

**Target Files:**
- Create: `apps/web/src/app/accessibility-tokens.css`
- Create: `docs/build-plans/phase-6/stage-05-accessibility-system-formalization-wcag-hardening/accessibility-tokens.md`
- Update: `apps/web/src/app/globals.css` (refactor focus and motion rules to use tokens)

---

### Slice 02: CSS Architecture Cleanup & CSS Module Issue Resolution

**Purpose:** Fix the CSS Module purity violation and establish correct scoping for accessibility styles.

**Deliverables:**

1. **CSS Module Selector Refactor** (`apps/web/src/app/admin/adminAccessibility.module.css`)
   - Issue: Line ~440 has `:where(button, input, select, textarea, a):focus-visible` which violates CSS Module purity (pseudo-elements/pseudo-classes that reference multiple selectors are not allowed)
   - Root cause: Focus styling was originally in a global stylesheet but migrated to a Module without proper scoping
   - Fix: Extract focus-visible styles from CSS Module into a scoped, component-level approach OR move to global layer with a proper BEM-style class
   - Decision matrix:
     - Option A (Recommended): Move all `:focus-visible` styling to `accessibility-tokens.css` (global) + let CSS inheritance apply
     - Option B: Create a utility class `.focus-visible-admin` scoped in globals and consumed by adminAccessibility components
     - Option C: Keep CSS Module but use child selectors only (not pseudo-class pipes): `.button:focus-visible` etc. (more verbose but CSS Module–compatible)
   - Chosen approach: **Option A** — Consolidate all focus styling into the global accessibility tokens layer; CSS Modules for admin components remain pure (layout/color/spacing only)

2. **CSS Architecture Blueprint** (`docs/build-plans/phase-6/stage-05-accessibility-system-formalization-wcag-hardening/css-architecture.md`)
   - Document the correct layering:
     - **Global Layer** (`globals.css`, `accessibility-tokens.css`): Color tokens, focus/outline, motion, spacing baselines, headings, prose
     - **Feature CSS Modules** (e.g., `adminAccessibility.module.css`, `layout.module.css`): Component-specific layout, color application, typography variants — NOT focus/motion/outline rules
     - **Scoped Component Styles** (if needed): BEM-style utility classes for complex affordance patterns
   - Constraint: CSS Modules remain pure (no `:where()` with pseudo-classes, no `:global()` escapes for focus)

3. **adminAccessibility.module.css Cleanup**
   - Remove the problematic `:where(...)` pseudo-class rule
   - For button/input focus styling: inherit from global `:focus-visible` rule (or add a scoped class if component-specific override needed)
   - Verify that `.button`, `.input`, `.select`, `.rowButton`, `.actionButton` classes still receive focus styling via global rule or inherit from parent
   - Test: Verify focus indicators still visible on admin surfaces (no visual regression)

4. **Evidence:**
   - `css-architecture.md` outlines global vs. module scoping rules
   - `adminAccessibility.module.css` cleaned of CSS Module violations; `pnpm lint` passes
   - Deterministic verification: manually tab through admin surfaces (Review Inbox, Entity List, Entity Edit) and confirm focus rings visible on all interactive elements

**Acceptance Criteria:**

- [ ] CSS Module purity violation in `adminAccessibility.module.css` is resolved (no `:where()` with pseudo-classes)
- [ ] Focus styling is correctly layered (global tokens for base, modules for component-specific overrides only)
- [ ] CSS architecture document explains scoping rules and rationale
- [ ] No visual regression: all admin buttons/inputs/selects still show clear focus rings
- [ ] `pnpm lint` and `pnpm type-check` pass (including CSS linting if available)
- [ ] Manual focus-visibility verification on 3+ admin surfaces passes

**Dependencies:** Slice 01 complete (tokens layer ready)

**Target Files:**
- Update: `apps/web/src/app/admin/adminAccessibility.module.css` (remove violating rule)
- Update: `apps/web/src/app/globals.css` (ensure focus rule covers all interactive elements)
- Update or Create: `apps/web/src/app/accessibility-tokens.css` (ensure focus tokens are used)
- Create: `docs/build-plans/phase-6/stage-05-accessibility-system-formalization-wcag-hardening/css-architecture.md`

---

### Slice 03: Semantic Accessibility Patterns Layer

**Purpose:** Codify ARIA, focus management, and keyboard interaction patterns into reusable, shared documentation and utilities.

**Deliverables:**

1. **Semantic Patterns Reference** (`docs/build-plans/phase-6/stage-05-accessibility-system-formalization-wcag-hardening/semantic-patterns-reference.md`)
   - Document proven patterns from Phase 5 Part 01 + new patterns needed for post-Phase-5 surfaces
   - Patterns to document:
     - **Focus Traps:** Modal dialogs, inline editors (when/why to trap, initial focus, escape behavior)
     - **Focus Escape:** Dropdowns, popovers (when/why to escape, focus destination)
     - **ARIA Roles & Attributes:** `role="dialog"`, `aria-modal="true"`, `aria-label`, `aria-describedby`, `aria-live`, `aria-pressed`, `aria-sort`
     - **Keyboard Shortcuts:** Alt+key patterns, list navigation (arrow keys), activation (Enter/Space)
     - **Error & Validation:** Live regions, error associations, field highlighting
     - **Live Regions:** When to use `aria-live="polite"` vs `"assertive"`, atomic updates
   - For each pattern: code snippet, rationale, WCAG reference, browser/AT support notes

2. **Accessibility Utilities Consolidation** (`apps/web/src/shared/accessibility/`)
   - Create new shared utilities directory (parallel to existing `src/shared/hooks`, `src/shared/lib`)
   - Extract and consolidate:
     - `moveFocusTrap()`, `moveListCursor()`, `resolveKeyboardShortcut()` from `admin/_lib/accessibilityKeyboard.ts`
     - New hook: `useFocusTrap(ref, shouldTrap)` — encapsulates focus trap logic for modals
     - New hook: `useKeyboardShortcuts(shortcuts)` — maps Alt+ commands to handlers
     - New hook: `useLiveRegion(message)` — announces changes to screen readers
   - Update admin components to import from shared layer instead of local `_lib`
   - Evidence: Type-safe, exported with clear JSDoc comments

3. **Semantic Markup Checklist** (extension to existing `READABILITY_STANDARDS.md`)
   - Add section: "Accessibility & Semantic Checklist" to `apps/web/src/app/admin/READABILITY_STANDARDS.md`
   - Items:
     - [ ] All form inputs have associated `<label>` or `aria-label`
     - [ ] Headings are semantic (`<h1>`–`<h6>`) and in reading order
     - [ ] Interactive elements are semantic (`<button>`, `<a>`, `<input>`) or have `role="" aria-pressed=""`
     - [ ] Modal dialogs have `role="dialog"` + `aria-modal="true"`
     - [ ] List/table has `role="listbox"` + items have `role="option"` or rows
     - [ ] Error states have `aria-describedby` pointing to error message
     - [ ] Dynamic updates announced via `aria-live="polite"` or `"assertive"`

4. **Component Focus Interview Document** (planning artifact)
   - Brief audit of current focus patterns in Production components:
     - ReviewInboxClient: focus trap on dialog ✓, list cursor ✓, alt-key shortcuts ✓
     - ProposalReviewClient: focus trap on dialog ✓, alt-key shortcuts (Alt+A/D/E) ✓
     - EntitiesClient: focus trap on dialog ✓, no list cursor (table-driven)
     - EditEntityPageClient: inline edit focus management 🟡 (needs verification)
     - Composer connector popover: focus trap ✓, escape → returns focus ✓
   - Document findings; feed into Slice 04 WCAG audit

**Acceptance Criteria:**

- [ ] Semantic patterns reference documents at least 5 reusable interaction patterns with WCAG mappings
- [ ] `apps/web/src/shared/accessibility/` directory created with hooks and utilities exported
- [ ] Admin components updated to import focus/keyboard utilities from shared layer
- [ ] READABILITY_STANDARDS.md includes semantic checklist (at least 7 items)
- [ ] Component focus interview completed and findings documented
- [ ] `pnpm type-check` passes (all hooks are typed)
- [ ] No visual or behavioral regression in admin surfaces

**Dependencies:** Slice 01, 02 complete

**Target Files:**
- Create: `apps/web/src/shared/accessibility/useFocusTrap.ts`
- Create: `apps/web/src/shared/accessibility/useKeyboardShortcuts.ts`
- Create: `apps/web/src/shared/accessibility/useLiveRegion.ts`
- Create: `apps/web/src/shared/accessibility/index.ts` (barrel export)
- Create: `docs/build-plans/phase-6/stage-05-accessibility-system-formalization-wcag-hardening/semantic-patterns-reference.md`
- Update: `apps/web/src/app/admin/READABILITY_STANDARDS.md` (add semantic checklist section)
- Update: Admin components to use shared utilities (ReviewInboxClient, ProposalReviewClient, EntitiesClient, EditEntityPageClient)
- Create: `docs/build-plans/phase-6/stage-05-accessibility-system-formalization-wcag-hardening/component-focus-interview.md`

---

### Slice 04: WCAG AA+ Audit & Conformance Checklist

**Purpose:** Systematically audit the app against WCAG 2.1 AA and AAA criteria, document findings, and create a living conformance checklist.

**Deliverables:**

1. **WCAG Audit Document** (`docs/build-plans/phase-6/stage-05-accessibility-system-formalization-wcag-hardening/wcag-audit.md`)
   - Manual audit of Surface Categories:
     - Public-facing surfaces (home, codex, reader pages)
     - Admin surfaces (entity list, edit, review inbox, proposal review)
     - Shared components (forms, buttons, tables, dialogs)
   - Audit Criteria (organized by WCAG pillar):
     - **Perceivable:** Color contrast, text alternatives, adaptable layouts, distinguishable elements
     - **Operable:** Keyboard accessibility, focus visibility, motion safety, target sizing
     - **Understandable:** Readability, predictability, input assistance, error prevention
     - **Robust:** Compatibility with assistive technology, semantic HTML, ARIA correctness
   - For each criterion: Current status (✓ Pass / 🟡 Partial / ✗ Fail / ⚪ N/A), evidence reference, remediation plan (if needed)
   - Scope note: Full audit of Phase 5 P1 surfaces + sampled other surfaces; Phase F chat surfaces sampled but not exhaustive

2. **WCAG Conformance Testing Plan** (`docs/build-plans/phase-6/stage-05-accessibility-system-formalization-wcag-hardening/wcag-testing-plan.md`)
   - Deterministic verification steps for key criteria:
     - **Color Contrast:** Use WebAIM contrast checker or axe DevTools; verify min 4.5:1 for normal text, 3:1 for large text (AA+)
     - **Keyboard Navigation:** Tab through 5+ screens; verify focus visible, logical order, no traps (except intentional modals), Escape works
     - **Motion Sensitivity:** Test with `prefers-reduced-motion: reduce` enabled; verify animations stop, transitions become instant
     - **Focus Trapping:** Open modals; verify Tab cycles only within modal, Escape closes and returns focus
     - **ARIA Correctness:** Verify roles, states (aria-pressed, aria-selected), relationships (aria-labelledby, aria-describedby) with screen reader (NVAccess NVDA or JAWS simulation)
     - **Error Messaging:** Trigger validation errors; verify associated with input via aria-describedby, live region announces
     - **Form Labels:** Verify all inputs have associated `<label>` or `aria-label`
   - Browser/AT Matrix (what to test with):
     - Chrome + NVDA (or axe extension)
     - Safari + VoiceOver (if available)
     - Keyboard-only navigation (all browsers)

3. **WCAG Conformance Checklist** (`docs/build-plans/phase-6/stage-05-accessibility-system-formalization-wcag-hardening/wcag-conformance-checklist.md`)
   - WCAG 2.1 AA criteria organized by pillar (Perceivable, Operable, Understandable, Robust)
   - For each criterion: Level (A/AA/AAA), Criterion code (e.g., 1.4.3 Contrast), Status (✓/🟡/✗/⚪), Evidence link, Notes
   - Example rows:
     - 1.4.3 Contrast (AA) ✓ Primary text meets 4.5:1 in dark theme; links via color + underline
     - 1.4.11 Non-text Contrast (AA) ✓ Focus ring 2px opacity, icon status colors have 3:1+
     - 2.1.1 Keyboard (A) ✓ All interactive elements keyboard-accessible; no keyboard traps except intended modals
     - 2.1.2 No Keyboard Trap (A) ✓ Escape closes modals; Tab escapes dropdowns
     - 2.4.3 Focus Order (A) ✓ Focus order follows visual layout; verified on 5+ surfaces
     - 2.4.7 Focus Visible (AA) ✓ Focus ring 2px solid with 5px glow shadow; always visible
     - 2.5.5 Target Size (AAA) 🟡 Most buttons min 44px but some inline actions are smaller; document exemption if intentional
   - End section: Summary (X/Y AA criteria met, Z/W AAA criteria met), High-Priority Remediation Queue, Deferred Items with Rationale

4. **Accessibility Issues Tracker Template** (tracking artifact for future stages)
   - Template for logging discovered issues during audit
   - Columns: Issue ID, Category (Perceivable/Operable/Understandable/Robust), Severity (Critical/High/Medium/Low), Affected Component(s), WCAG Criterion, Description, Remediation Plan, Status, Assigned To
   - Baseline: Pre-populate with any 🟡 (partial) or ✗ (fail) items from checklist

**Acceptance Criteria:**

- [ ] WCAG audit document covers at least 5 distinct surface areas (public home, codex, entity list, entity edit, review inbox)
- [ ] Audit references all 4 WCAG pillars (Perceivable, Operable, Understandable, Robust)
- [ ] WCAG checklist covers at least 30 AA-level criteria with status assignments
- [ ] Conformance testing plan includes deterministic steps for 5+ key criteria
- [ ] Manual testing completed on at least 3 surfaces (Review Inbox keyboard nav, Entity List keyboard nav, Focus visibility verification)
- [ ] High-priority issues identified and logged in tracker template
- [ ] All audit and testing documentation links to relevant code/component locations

**Dependencies:** Slice 01, 02, 03 complete

**Target Files:**
- Create: `docs/build-plans/phase-6/stage-05-accessibility-system-formalization-wcag-hardening/wcag-audit.md`
- Create: `docs/build-plans/phase-6/stage-05-accessibility-system-formalization-wcag-hardening/wcag-testing-plan.md`
- Create: `docs/build-plans/phase-6/stage-05-accessibility-system-formalization-wcag-hardening/wcag-conformance-checklist.md`
- Create: `docs/build-plans/phase-6/stage-05-accessibility-system-formalization-wcag-hardening/accessibility-issues-tracker.md` (template)

---

### Slice 05: Accessibility System Documentation & Living Standard

**Purpose:** Package the accessibility system into a living standard document that teams can reference and extend.

**Deliverables:**

1. **Accessibility System Overview** (`docs/build-plans/phase-6/stage-05-accessibility-system-formalization-wcag-hardening/ACCESSIBILITY_SYSTEM.md`)
   - Master index linking to all planning and implementation artifacts:
     - Token system (Slice 01)
     - CSS architecture (Slice 02)
     - Semantic patterns (Slice 03)
     - WCAG conformance (Slice 04)
   - Quick-reference tables:
     - Token inventory (focus, motion, affordance, spacing)
     - Semantic pattern quick links (focus trap, live region, keyboard shortcuts, ARIA roles)
     - WCAG status summary (X% AA conformance, Y% AAA conformance)
   - How to extend: Adding a new component with accessible patterns, adding a new surface area, updating tokens for new visual direction

2. **Implementation Guidelines for Future Surfaces** (part of ACCESSIBILITY_SYSTEM.md)
   - Checklist for engineers adding new admin surfaces or public pages:
     - [ ] Import accessibility tokens from `accessibility-tokens.css`
     - [ ] Use semantic HTML (`<button>`, `<label>`, `<section>`, etc.)
     - [ ] Apply ARIA patterns from semantic-patterns-reference.md
     - [ ] Use shared accessibility hooks from `src/shared/accessibility/`
     - [ ] Test keyboard navigation (Tab, arrow keys, Escape) on your surface
     - [ ] Test with `prefers-reduced-motion: reduce` enabled
     - [ ] Verify focus visible on all interactive elements
     - [ ] Run contrast checker on text and UI elements
     - [ ] Manually verify with NVDA/JAWS or axe browser extension

3. **Accessibility Living Standard Maintenance Policy** (part of ACCESSIBILITY_SYSTEM.md)
   - When to update the system:
     - New design tokens added → update `accessibility-tokens.md` + `accessibility-tokens.css` → update token inventory in ACCESSIBILITY_SYSTEM.md
     - New UI pattern discovered → add to semantic-patterns-reference.md + add to guidelines checklist
     - WCAG criterion becomes relevant → add to conformance checklist + add test case to testing-plan.md
     - Bug or regression discovered → log in accessibility-issues-tracker.md + document remediation
   - Review cadence: quarterly accessibility audit refresh + per-release accessibility regression sweep

4. **Evidence & Sign-Off Summary** (part of Slice 05 closeout)
   - Accessibility system is now documented, indexed, and linked from main ACCESSIBILITY_SYSTEM.md entry point
   - All components have reference implementations (reviewed in manual testing)
   - Conformance checklist establishes baseline for ongoing compliance
   - Team has clear guidance for extending the system in future phases

**Acceptance Criteria:**

- [ ] ACCESSIBILITY_SYSTEM.md serves as the master system index with links to all sub-documents
- [ ] Implementation guidelines checklist covers at least 8 items and is actionable for new surfaces
- [ ] Maintenance policy defines update triggers, review cadence, and escalation path
- [ ] All Stage 05 artifacts are cross-linked and discoverable
- [ ] `pnpm lint` and `pnpm type-check` pass across all changes

**Dependencies:** Slices 01–04 complete

**Target Files:**
- Create: `docs/build-plans/phase-6/stage-05-accessibility-system-formalization-wcag-hardening/ACCESSIBILITY_SYSTEM.md` (master index)

---

## Stage Sequencing

Execute slices in dependency order:

1. **Slice 01** (Accessibility Token Architecture) — 2–3 days
   - No dependencies; foundational
   - Creates token definitions used by subsequent slices

2. **Slice 02** (CSS Architecture & Module Fix) — 1–2 days
   - Depends on: Slice 01 (tokens available)
   - Unblocks: Admin accessibility.test suite from erroring on CSS Module violation

3. **Slice 03** (Semantic Patterns Layer) — 2–3 days
   - Depends on: Slices 01–02 (tokens and architecture established)
   - Creates reusable patterns for Slice 04 audit

4. **Slice 04** (WCAG Audit) — 3–4 days
   - Depends on: Slices 01–03 (system foundation complete; patterns documented)
   - Manual testing + documentation; no code changes required
   - Produces conformance checklist as artifact for ongoing compliance

5. **Slice 05** (System Documentation) — 1 day
   - Depends on: Slices 01–04 (all artifacts complete)
   - Assembly and indexing work only
   - Closes Stage 05

**Total Estimated Effort:** 9–13 days for full architecture + audit + documentation

---

## Exit Criteria

### Code Quality

- [ ] `pnpm lint` passes across all new CSS and TS files
- [ ] `pnpm type-check` passes (all accessibility hooks typed strictly)
- [ ] No new accessibility-related test failures (Phase 5 baseline maintained)
- [ ] CSS Module purity violation resolved in adminAccessibility.module.css

### Testing & Verification

- [ ] Manual keyboard navigation test on 5+ surfaces: Tab order logical, focus visible, Escape/arrow keys work as documented ✓
- [ ] Manual test with `prefers-reduced-motion: reduce` enabled: animations off, transitions instant ✓
- [ ] Manual focus visibility test: all interactive elements show clear 2px blue outline + glow on Tab ✓
- [ ] WCAG checklist completed with at least 30 AA criteria assessed
- [ ] High-priority accessibility issues identified and logged (if any)

### Documentation

- [ ] Accessibility Tokens document lists all custom properties with values and CSS @theme or :root usage
- [ ] CSS Architecture document explains global vs. module scoping and why
- [ ] Semantic Patterns Reference documents 5+ interaction patterns with WCAG mappings and code examples
- [ ] WCAG Audit document covers 5+ surface areas and all 4 WCAG pillars
- [ ] WCAG Conformance Checklist captures status of 30+ AA criteria + at least 10 AAA criteria
- [ ] Implementation Guidelines provide actionable checklist for future surfaces
- [ ] ACCESSIBILITY_SYSTEM.md serves as master index linking all artifacts

### Alignment with Phase 6 Vision

- [ ] Accessibility system reinforces (does not compromise) ethereal fantasy aesthetic
- [ ] Dark-only theming basis established; architecture supports future light-mode addition
- [ ] Motion tokens align with Phase 6's spring timing function and glow effects
- [ ] Focus styling (blue luminous outline + glow) reinforces visual brand while meeting WCAG contrast

---

## Known Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| WCAG audit reveals many ✗ (fail) items requiring extensive remediation | Medium | High | Scope audit narrowly (Phase 5 P1 surfaces + sampled others); capture 🟡 (partial) generously; defer non-critical items to post-Phase-6 roadmap |
| Shared accessibility hooks refactoring breaks existing admin components | Low | High | Keep existing `admin/_lib/accessibilityKeyboard.ts` intact; new shared hooks are *additive* not *replacing*; test all admin surfaces after refactoring |
| `prefers-reduced-motion` media-query layering causes unintended animation re-activation | Low | Medium | Test with browser DevTools prefers-reduced-motion toggle; verify `animation: none; transition: none` applied at token level |
| WCAG conformance becomes too opinionated or blocking upstream designers | Medium | Low | Frame WCAG as floor (AA required, AAA aspirational); focus on WCAG A/AA; defer AAA polish to later phases |

---

## Success Narrative

After Stage 05 completes, BookWorm will:

1. **Have Systematic Accessibility:** All focus, motion, affordance, and semantic patterns flow from a single token/utilities layer, not scattered across component files
2. **Be WCAG-Audited:** A documented conformance baseline exists, with high-priority issues surfaced and actionable
3. **Have CSS Architecture Clarity:** Global vs. module scoping is explicit; CSS Module violations are resolved
4. **Be Extensible:** New surfaces can follow the Implementation Guidelines checklist and inherit accessibility-by-design
5. **Support Accessibility Preferences:** `prefers-reduced-motion: reduce` works across all surfaces; future dark/light switching is architecturally possible
6. **Reinforce Visual Brand:** Ethereal aesthetic (dark base, luminous blue focus rings, spring motion) is now accessibility-first; neither compromises the other

---

## Appendix: Planning Artifacts & File Structure

```
docs/build-plans/phase-6/stage-05-accessibility-system-formalization-wcag-hardening/
├── stage-05.md (this file)
├── accessibility-tokens.md (Slice 01 deliverable)
├── css-architecture.md (Slice 02 deliverable)
├── semantic-patterns-reference.md (Slice 03 deliverable)
├── component-focus-interview.md (Slice 03 artifact)
├── wcag-audit.md (Slice 04 deliverable)
├── wcag-testing-plan.md (Slice 04 deliverable)
├── wcag-conformance-checklist.md (Slice 04 deliverable)
├── accessibility-issues-tracker.md (Slice 04 template)
└── ACCESSIBILITY_SYSTEM.md (Slice 05 master index)

apps/web/src/app/
├── globals.css (updated: use tokens for focus, motion)
├── accessibility-tokens.css (new: all accessibility custom properties)
└── admin/
    └── adminAccessibility.module.css (updated: remove CSS Module purity violation)

apps/web/src/shared/accessibility/ (new directory)
├── useFocusTrap.ts
├── useKeyboardShortcuts.ts
├── useLiveRegion.ts
└── index.ts

tests/ (future)
├── phase6AccessibilityTokens.test.ts (possible future test suite)
└── (existing Phase 5 tests remain, no breaking changes)
```

---

## References

- **Phase 6 Master Plan:** `docs/build-plans/phase-6/phase-6.md`
- **Phase 5 Accessibility Hardening (Part 01):** `docs/build-plans/phase-5/stage-04-ux-accessibility-and-feedback-integration/part-01-accessibility-and-keyboard-navigation-hardening/part-01-accessibility-and-keyboard-navigation-hardening.md`
- **UI Vision Document:** `docs/build-system/book-worm-build-system/ui-vision.md`
- **WCAG 2.1 Standard:** https://www.w3.org/WAI/WCAG21/quickref/
- **Semantic HTML Foundation:** https://www.w3.org/WAI/fundamentals/accessibility-intro/
- **ARIA Authoring Practices Guide:** https://www.w3.org/WAI/ARIA/apg/

