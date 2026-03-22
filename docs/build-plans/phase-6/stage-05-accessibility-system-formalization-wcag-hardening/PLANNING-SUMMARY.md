# BookWorm Phase 6 Stage 05 Planning Summary

## Executive Summary

**Planning Target:** Phase 6 Stage 05 — Accessibility System Formalization & WCAG Hardening

**Current Problem:**
BookWorm has functional keyboard navigation and focus management (Phase 5 Part 01 ✓) but lacks systematic accessibility architecture. Styles are scattered (globals.css, CSS Modules), CSS Module purity is violated, and there is no WCAG audit baseline or formalized semantic patterns layer. The issue in `adminAccessibility.module.css` (`:where(button, input, select, textarea, a):focus-visible` violating CSS Module purity) is a symptom of unstructured accessibility CSS organization.

**Solution Approach:**
Create a five-slice phase that systematizes accessibility into:
1. **Token Architecture** — All accessibility properties (focus, motion, affordance, spacing) as reusable CSS custom properties
2. **CSS Architecture** — Fix CSS Module violations; establish global vs. module scoping rules
3. **Semantic Patterns** — Codify ARIA, keyboard, focus patterns into documented, shared utilities
4. **WCAG Audit** — Manual audit against WCAG 2.1 AA+; produce conformance checklist
5. **Living Standard** — Master documentation and implementation guidelines for future teams

**Estimated Effort:** 9–13 days for full execution  
**Status:** Planned, ready for delivery team handoff

---

## Planning Evidence

### Repository State (as of 2026-03-22)

| Artifact | Current State | Location | Issue |
|---|---|---|---|
| **Focus styling** | Hard-coded values in global rule | `globals.css:88–92` | `:focus-visible:not(.composer-field)` with `2px solid rgba(134, 201, 255, 0.95)` + box-shadow. Works but not systemized. |
| **Accessibility CSS Module** | Violates CSS Module purity | `apps/web/src/app/admin/adminAccessibility.module.css:440s` | `:where(button, input, select, textarea, a):focus-visible` selector is impure (pseudo-class with multiple selectors). Lint error waiting to happen. |
| **Reduced-motion support** | Partial, scattered | `globals.css:372–387` | @media rules exist but not token-driven; inconsistent coverage of animations. |
| **Design tokens** | Partial | `globals.css:@theme` block | Color tokens exist (`--color-primary`, `--color-text`, etc.) but no accessibility-specific tokens. |
| **Keyboard utilities** | Scattered across admin | `apps/web/src/app/admin/_lib/accessibilityKeyboard.ts` | `moveFocusTrap()`, `moveListCursor()`, `resolveKeyboardShortcut()` are ad-hoc; not in shared layer. |
| **Focus management** | Implemented in components | ReviewInboxClient, ProposalReviewClient, EntitiesClient, EditEntityPageClient | Raw `addEventListener("keydown", ...)` patterns; no hook abstraction. |
| **ARIA & semantics** | Implemented on P1 surfaces | Phase 5 Part 01 ✓ | Roles, labels, hierarchies in place; not documented as reusable patterns. |
| **Accessibility documentation** | Partial | `apps/web/src/app/admin/READABILITY_STANDARDS.md` | Documents typography, affordance, error patterns but not semantic accessibility checklist. |
| **WCAG audit** | None | — | No baseline conformance assessment; no systematic coverage of WCAG criteria. |

### Phase 6 Context

**Visual Direction (Shipped):**
- Dark base (#060b14) + luminous blue highlight (#86c9ff) + restrained gold (#d4af37)
- Spectral + Cormorant Garamond typography
- Spring cubic-bezier motion; glassmorphic panels with backdrop-filter
- No dark/light switching planned (yet)

**Accessibility Foundation (Phase 5 ✓):**
- Keyboard navigation: Tab order, arrow keys, Alt+key shortcuts, Escape handling
- Focus trapping: Modal dialogs trap Tab/Shift+Tab; escape returns focus
- Semantic structure: ARIA roles (dialog, option, listbox), labels, aria-live announcements
- Deterministic testing: `tests/phase5AccessibilityKeyboardNavigationPart01.test.ts` validates patterns

**Outstanding Blocker (Stage 03 Deferred):**
- CSS Module purity violation in `adminAccessibility.module.css` — ready for Stage 05 Slice 02 resolution

---

## Planning Artifacts Created

All planning documents are in: `docs/build-plans/phase-6/stage-05-accessibility-system-formalization-wcag-hardening/`

| Artifact | Purpose | Status |
|---|---|---|
| **stage-05.md** | Master stage plan with 5 slices, sequencing, exit criteria, risks, appendix | ✓ Created |
| **README.md** | Stage overview, quick reference, next steps | ✓ Created |
| **stage-05-slice-01-token-architecture.md** | Detailed execution plan for Slice 01 (token system creation) | ✓ Created |
| **accessibility-tokens.md** | Specification for accessibility tokens (focus, motion, affordance, spacing, theming) | Ready for Slice 01 delivery agent to populate |
| **css-architecture.md** | Documentation of CSS layering rules and rationale | Ready for Slice 02 delivery agent |
| **semantic-patterns-reference.md** | Codified ARIA, keyboard, and focus patterns with WCAG mappings | Ready for Slice 03 delivery agent |
| **component-focus-interview.md** | Brief audit of current focus implementations in production components | Ready for Slice 03 delivery agent |
| **wcag-audit.md** | Manual audit findings against WCAG 2.1 AA/AAA criteria | Ready for Slice 04 delivery agent |
| **wcag-testing-plan.md** | Deterministic testing steps for key WCAG criteria | Ready for Slice 04 delivery agent |
| **wcag-conformance-checklist.md** | Status of 30+ WCAG AA criteria + 10+ AAA criteria | Ready for Slice 04 delivery agent |
| **accessibility-issues-tracker.md** | Template for logging discovered issues | Ready for Slice 04 delivery agent |
| **ACCESSIBILITY_SYSTEM.md** | Master index linking all artifacts + implementation guidelines + maintenance policy | Ready for Slice 05 delivery agent |

### Updated Dev Tracker

[dev-tracker.md](../../dev-tracker.md) now includes Phase 6 Stage 05 with all 5 slices:
- Status: Ready (RD)
- Dependencies clearly chained: Slice 01 → 02 → 03 → 04 → 05
- Evidence links point to planning documents above

---

## Slice Breakdown & Execution Sequencing

### Slice 01: Accessibility Token Architecture & Theming Foundation (2–3 days)
**Owner:** Lead Frontend Coder  
**Deliverables:**
- `accessibility-tokens.md` — Specification of all tokens (focus, motion, affordance, contrast)
- `accessibility-tokens.css` — New CSS file with @theme block defining all custom properties
- Updated `globals.css` — Refactor `:focus-visible` and motion rules to use tokens
- Consolidated reduced-motion support at token layer
- **Acceptance:** All tokens defined, imported correctly, `pnpm lint/type-check` pass, no visual regression

**Key Decisions:**
- Focus token values = current hard-coded values (no visual change)
- Reduced-motion overrides happen at token level (`--motion-standard-duration: 0ms` when prefers-reduced-motion)
- No light-mode implementation yet; architecture ready for future addition

### Slice 02: CSS Architecture Cleanup & CSS Module Issue Resolution (1–2 days)
**Owner:** Lead Frontend Coder  
**Deliverables:**
- `css-architecture.md` — Document establishing global vs. module scoping rules
- Updated `adminAccessibility.module.css` — Remove `:where(...)` pseudo-class violating purity
- Updated `globals.css` — Ensure focus rule covers all admin interactive elements
- Verified focus styling on 3+ admin surfaces (Review Inbox, Entity List, Entity Edit)
- **Acceptance:** No CSS Module lint errors, focus rings visible on all buttons/inputs, `pnpm lint/type-check` pass

**Key Decisions:**
- **Option chosen:** Move all `:focus-visible` styling to global layer (Slice 01 token foundation)
- CSS Modules remain pure: layout, color application, spacing only — not focus/motion rules
- No per-component focus overrides needed (inheritance from global rule sufficient)

### Slice 03: Semantic Accessibility Patterns Layer (2–3 days)
**Owner:** Lead Frontend Coder  
**Deliverables:**
- `semantic-patterns-reference.md` — Document 5+ reusable patterns (focus trap, live region, keyboard shortcuts, ARIA roles, error handling)
- `apps/web/src/shared/accessibility/useFocusTrap.ts` — Custom hook encapsulating focus trap logic
- `apps/web/src/shared/accessibility/useKeyboardShortcuts.ts` — Custom hook for Alt+key mapping
- `apps/web/src/shared/accessibility/useLiveRegion.ts` — Custom hook for screen reader announcements
- Updated admin components (ReviewInboxClient, ProposalReviewClient, EntitiesClient, EditEntityPageClient) to import from shared layer
- Updated `READABILITY_STANDARDS.md` — Add semantic accessibility checklist section
- **Acceptance:** Hooks typed, admin components refactored, no behavioral regression, `pnpm type-check` pass

**Key Decisions:**
- Keep existing `admin/_lib/accessibilityKeyboard.ts` intact (not replaced); new shared hooks are additive
- Extract only focus/keyboard logic; component-specific styles remain in modules
- Hooks typed with strict TypeScript; clear JSDoc for contract

### Slice 04: WCAG AA+ Audit & Conformance Checklist (3–4 days)
**Owner:** Lead QA / Accessibility Reviewer  
**Deliverables:**
- `wcag-audit.md` — Manual audit of 5+ surface areas against WCAG pillars (Perceivable, Operable, Understandable, Robust)
- `wcag-testing-plan.md` — Deterministic verification steps (color contrast, keyboard nav, focus visibility, ARIA, motion, error messaging)
- `wcag-conformance-checklist.md` — Status of 30+ AA criteria + 10+ AAA criteria (✓/🟡/✗/⚪)
- `accessibility-issues-tracker.md` — Template for logging discovered issues
- High-priority remediation queue identified and documented
- **Acceptance:** Audit covers 5+ surfaces, testing plan has 5+ deterministic steps per criterion, checklist captures 40+ WCAG criteria

**Key Decisions:**
- Scope: Phase 5 P1 surfaces (Review Inbox, Proposal Review, Entity List, Entity Edit) + sampled public surfaces (home, codex)
- Scope: For now, no exhaustive Phase-f chat surfaces (noted as future work)
- High-priority failures drive post-Phase-6 roadmap; AAA criteria aspirational, not blocking
- Non-critical issues logged with "Deferred" rationale

### Slice 05: Accessibility System Documentation & Living Standard (1 day)
**Owner:** Technical Writer / Lead Coder  
**Deliverables:**
- `ACCESSIBILITY_SYSTEM.md` — Master index linking all Slices 01–04 artifacts
- Implementation Guidelines checklist for future teams (8+ items: import tokens, semantic HTML, ARIA patterns, test keyboard nav, test prefers-reduced-motion, etc.)
- Maintenance Policy (update triggers, review cadence, escalation path)
- Cross-linked artifact discovery
- **Acceptance:** All 4 previous slices discoverable from master index, guidelines actionable, maintenance policy clear

---

## Communication Plan for Delivery Team

### Handoff Package Contents

1. **README Summary** (this document)
2. **Master Planning Document** (`stage-05.md` — 300+ lines with all context)
3. **Slice 01 Execution Plan** (`stage-05-slice-01-token-architecture.md` — ready to execute)
4. **Updated Dev Tracker** (now includes Stage 05 with status = Ready)
5. **Planning Artifacts** (all 10+ supporting documents with templates/specifications)

### For Lead Frontend Coder (Slices 01–03)

**Slice 01 Start:** 
- Read `stage-05-slice-01-token-architecture.md` for full execution checklist
- Spec file: Use `accessibility-tokens.md` section breakdown as template; fill in values (mostly copy-paste from current globals.css)
- Deliverables: Two CSS files + one MD document + updated globals.css
- Estimated time: 2–3 days, mostly straightforward refactoring

**Slice 02 Start** (after Slice 01):
- Issue: `:where(...)` selector in adminAccessibility.module.css violates CSS Module purity
- Solution: Move focus styling to global layer (already done in Slice 01 via tokens)
- Cleanup: Remove problematic selector from CSS Module; manually verify focus rings on admin surfaces
- Estimated time: 1–2 days

**Slice 03 Start** (after Slices 01–02):
- Extract keyboard utilities into `src/shared/accessibility/` directory
- Create 3 custom hooks (useFocusTrap, useKeyboardShortcuts, useLiveRegion)
- Update 4 admin components to import from shared layer
- Estimated time: 2–3 days

### For QA / Accessibility Reviewer (Slice 04)

**Slice 04 Start** (after Slices 01–03):
- Audit surfaces: Review Inbox, Entity List, Entity Edit, Proposal Review, Codex home (5 surfaces)
- Audit criteria: All 4 WCAG pillars (Perceivable, Operable, Understandable, Robust)
- Testing tools: axe DevTools, NVDA/JAWS (or simulation), browser DevTools contrast checker
- Deliverables: 4 documents capturing audit findings, testing methodology, checklist with 40+ WCAG criteria
- Estimated time: 3–4 days (mostly manual testing + documentation)

### For Technical Writer (Slice 05)

**Slice 05 Start** (after Slices 01–04):
- Create master index document linking all 10+ planning + implementation artifacts
- Write Implementation Guidelines (8+ items for future teams)
- Document Maintenance Policy (what triggers updates, review cadence)
- Estimated time: 1 day (assembly + light writing)

---

## Integration with Existing Work

### Phase 5 Compatibility (✓ Maintained)

- **Keyboard Navigation (Phase 5 Part 01):** Existing shortcuts, focus traps, list cursors remain intact
- **Semantic Structure:** Existing ARIA roles, labels, heading hierarchy remain intact
- **Deterministic Tests:** `tests/phase5AccessibilityKeyboardNavigationPart01.test.ts` will continue to pass (no breaking changes)
- **Readability Standards:** `READABILITY_STANDARDS.md` extended, not replaced

### Phase 6 Visual Alignment (✓ Reinforced)

- **Ethereal Aesthetic:** Accessibility system reinforces (does not compromise) dark-base + luminous blue + spring motion
- **Focus Styling:** Blue 2px luminous outline + glow shadow continues; now token-driven for consistency
- **Motion:** Ethereal smooth transitions respected; reduced-motion support added without breaking existing animations
- **Dark Theme:** Currently the only theme; light-mode architecture documented for post-Phase-6

---

## Success Criteria @ Completion

### Code Quality ✓
- `pnpm lint` passes across all new files (CSS, TS)
- `pnpm type-check` passes (all accessibility hooks strictly typed)
- No new test failures (Phase 5 baseline maintained)
- CSS Module purity violation resolved

### Testing & Verification ✓
- Manual keyboard navigation test on 5+ surfaces: Tab/arrows work, focus visible, Escape/Enter activate
- Manual test with `prefers-reduced-motion: reduce`: animations stop, transitions instant
- Focus visibility verified: 2px blue outline + glow on all interactive elements
- WCAG conformance: 30+ AA criteria assessed, high-priority issues identified

### Documentation ✓
- Accessibility Tokens specification complete
- CSS Architecture rules documented
- Semantic Patterns Reference (5+ patterns with WCAG mappings)
- WCAG Audit (5+ surfaces, all 4 WCAG pillars)
- WCAG Conformance Checklist (40+ criteria)
- Implementation Guidelines for future teams
- Maintenance Policy for ongoing compliance

---

## Open Questions & Decisions for Stakeholders

1. **WCAG Conformance Level Target:** Is AA the required baseline? Should AAA be attempted? 
   - *Recommendation:* AA (required), AAA (aspirational). High-priority failures drive next phase; AAA polish deferred.

2. **Future Dark/Light Switching:** Should token architecture support light-mode from day one?
   - *Recommendation:* Dark-only for Phase 6; architecture documented as light-mode–ready. Post-Phase-6 implementation adds `@media (prefers-color-scheme: light)` block.

3. **Shared Accessibility Hooks:** Should existing `admin/_lib/accessibilityKeyboard.ts` be deprecated or kept alongside new shared layer?
   - *Recommendation:* Keep both for now (backwards compat); document migration path. Future refactoring can consolidate.

4. **Scope of Slice 04 WCAG Audit:** Should Phase-f chat/composer surfaces be included?
   - *Recommendation:* Sampled only (not exhaustive). Phase-f is separate roadmap; full audit deferred to post-Phase-6.

---

## Next Steps (Handoff to Delivery Team)

1. **Review & Approval** (24 hrs)
   - Stakeholders review this summary + `stage-05.md`
   - Confirm token definitions, WCAG target level, scope decisions

2. **Assign Delivery Team** (ASAP)
   - Lead Frontend Coder → Slices 01–03
   - QA / Accessibility Reviewer → Slice 04
   - Technical Writer → Slice 05

3. **Execute Slice 01** (Day 1)
   - Start with `stage-05-slice-01-token-architecture.md`
   - Create token documents and CSS layer
   - Target completion: 2–3 days

4. **Monitor Progress**
   - Weekly standups tracking Slices 01–05 progress
   - Verify accept criteria pass before moving to next slice
   - Escalate any blocking issues (WCAG audit findings, CSS linting, etc.)

5. **Final Verification & Closeout**
   - After all 5 slices complete: Run full test suite, manual verification on 5+ surfaces
   - Archive all planning + implementation artifacts
   - Update dev-tracker to Stage 05 = Done
   - Brief Phase 6 Closeout review before final release

---

## Appendix: File Structure for Reference

```
docs/build-plans/phase-6/stage-05-accessibility-system-formalization-wcag-hardening/
├── README.md (overview)
├── stage-05.md (master plan, 300+ lines)
├── stage-05-slice-01-token-architecture.md (delivery-ready)
├── accessibility-tokens.md (template, Slice 01 fills in)
├── css-architecture.md (template, Slice 02 fills in)
├── semantic-patterns-reference.md (template, Slice 03 fills in)
├── component-focus-interview.md (template, Slice 03 fills in)
├── wcag-audit.md (template, Slice 04 fills in)
├── wcag-testing-plan.md (template, Slice 04 fills in)
├── wcag-conformance-checklist.md (template, Slice 04 fills in)
├── accessibility-issues-tracker.md (template, Slice 04 fills in)
└── ACCESSIBILITY_SYSTEM.md (master index, Slice 05 fills in)

apps/web/src/app/
├── accessibility-tokens.css (NEW, Slice 01)
├── globals.css (UPDATE, Slice 01: use tokens)
└── admin/
    └── adminAccessibility.module.css (UPDATE, Slice 02: remove violations)

apps/web/src/shared/accessibility/ (NEW directory, Slice 03)
├── useFocusTrap.ts
├── useKeyboardShortcuts.ts
├── useLiveRegion.ts
└── index.ts

Admin Components (UPDATE, Slice 03)
├── apps/web/src/app/admin/review-inbox/ReviewInboxClient.tsx
├── apps/web/src/app/admin/review/[proposalId]/ProposalReviewClient.tsx
├── apps/web/src/app/admin/entities/EntitiesClient.tsx
└── apps/web/src/app/admin/entities/[slug]/edit/EditEntityPageClient.tsx

apps/web/src/app/admin/
└── READABILITY_STANDARDS.md (UPDATE, Slice 03: add semantic checklist)
```

---

## References & Resources

- **WCAG 2.1 AA Standard:** https://www.w3.org/WAI/WCAG21/quickref/
- **ARIA Authoring Practices Guide:** https://www.w3.org/WAI/ARIA/apg/
- **WebAIM Keyboard Accessibility:** https://webaim.org/articles/keyboard/
- **Phase 6 Master Plan:** [phase-6.md](../phase-6.md)
- **Phase 5 Accessibility Hardening:** [part-01-accessibility-and-keyboard-navigation-hardening](../../phase-5/stage-04-ux-accessibility-and-feedback-integration/part-01-accessibility-and-keyboard-navigation-hardening/)
- **UI Vision Document:** [ui-vision.md](../../build-system/book-worm-build-system/ui-vision.md)

---

## Version & Archive

- **Plan Created:** 2026-03-22
- **Status:** Ready for Delivery Team Handoff
- **Phase:** 6 (Active)
- **Stage:** 05 (Proposed)
- **Estimated Duration:** 9–13 days
- **Next Review:** Upon Stage 04 Slice 04 completion, begin Stage 05 Slice 01

