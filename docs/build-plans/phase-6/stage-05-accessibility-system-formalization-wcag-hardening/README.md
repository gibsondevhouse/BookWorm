# Phase 6 Stage 05: Accessibility System Formalization & WCAG Hardening

This stage consolidates BookWorm's scattered accessibility patterns (keyboard navigation, focus management, reduced-motion support) into a **systematic, reusable accessibility layer** backed by token-driven CSS, semantic patterns, and WCAG AA+ conformance audit.

## Stage Overview

| Aspect | Details |
|---|---|
| **Purpose** | Systematize accessibility from scattered Phase 5 patterns into a coherent token system, formal semantic layer, corrected CSS architecture, and WCAG audit baseline |
| **Entry Gate** | Phase 6 Stage 04 complete; CSS Module purity violation in adminAccessibility.module.css ready for resolution |
| **Sequencing** | 5 slices executed in dependency order (Slice 01 → 05) |
| **Estimated Effort** | 9–13 days |
| **Exit Criteria** | Token system documented, CSS architecture clarified, semantic patterns codified, WCAG audit complete, living standard established |
| **Status** | Not Started |

## Slices

1. **Slice 01: Accessibility Token Architecture & Theming Foundation** (2–3 days)
   - Define accessibility custom properties (focus, motion, affordance, spacing)
   - Create `accessibility-tokens.css` with @theme definitions
   - Refactor `globals.css` focus rule to use tokens
   - Consolidate `prefers-reduced-motion` support into token-driven approach

2. **Slice 02: CSS Architecture Cleanup & CSS Module Issue Resolution** (1–2 days)
   - Fix CSS Module purity violation: `:where(button, input, select, textarea, a):focus-visible` → move to global tokens or utility classes
   - Document CSS layering rules: global (tokens, colors, motion, headings) vs. modules (layout, spacing, typography)
   - Ensure all admin buttons/inputs/selects still receive proper focus styling

3. **Slice 03: Semantic Accessibility Patterns Layer** (2–3 days)
   - Document 5+ reusable ARIA/keyboard patterns with WCAG references (focus traps, shortcuts, live regions, roles)
   - Extract keyboard utilities into shared layer: `src/shared/accessibility/useFocusTrap.ts`, `useKeyboardShortcuts.ts`, `useLiveRegion.ts`
   - Update admin components to use shared utilities
   - Extend `READABILITY_STANDARDS.md` with semantic checklist

4. **Slice 04: WCAG AA+ Audit & Conformance Checklist** (3–4 days)
   - Audit 5+ surface areas against WCAG 2.1 AA/AAA criteria
   - Document testing plan with deterministic steps (color contrast, keyboard nav, motion, focus, ARIA)
   - Produce conformance checklist (30+ criteria with status)
   - Identify high-priority issues and create tracker template

5. **Slice 05: Accessibility System Documentation & Living Standard** (1 day)
   - Create master index document (`ACCESSIBILITY_SYSTEM.md`) linking all artifacts
   - Provide implementation guidelines for future surfaces (checklist)
   - Document maintenance policy (update triggers, review cadence)
   - Close stage with evidence package

## Key Changes

### Files Created
- `apps/web/src/app/accessibility-tokens.css` — All accessibility custom properties defined
- `apps/web/src/shared/accessibility/useFocusTrap.ts` — Shared focus trap hook
- `apps/web/src/shared/accessibility/useKeyboardShortcuts.ts` — Shared keyboard shortcut hook
- `apps/web/src/shared/accessibility/useLiveRegion.ts` — Shared live region announcement hook
- `docs/build-plans/phase-6/stage-05-accessibility-system-formalization-wcag-hardening/accessibility-tokens.md`
- `docs/build-plans/phase-6/stage-05-accessibility-system-formalization-wcag-hardening/css-architecture.md`
- `docs/build-plans/phase-6/stage-05-accessibility-system-formalization-wcag-hardening/semantic-patterns-reference.md`
- `docs/build-plans/phase-6/stage-05-accessibility-system-formalization-wcag-hardening/wcag-audit.md`
- `docs/build-plans/phase-6/stage-05-accessibility-system-formalization-wcag-hardening/wcag-testing-plan.md`
- `docs/build-plans/phase-6/stage-05-accessibility-system-formalization-wcag-hardening/wcag-conformance-checklist.md`
- `docs/build-plans/phase-6/stage-05-accessibility-system-formalization-wcag-hardening/ACCESSIBILITY_SYSTEM.md` (master index)

### Files Updated
- `apps/web/src/app/globals.css` — Refactor focus and motion rules to use tokens
- `apps/web/src/app/admin/adminAccessibility.module.css` — Remove CSS Module purity violations
- `apps/web/src/app/admin/READABILITY_STANDARDS.md` — Add semantic accessibility checklist section
- Admin component imports — Switch from local `_lib/accessibilityKeyboard.ts` to shared `src/shared/accessibility/`

## Alignment with Phase 6 Vision

✓ Ethereal aesthetic reinforced: dark base with luminous blue focus rings, spring motion, glow effects  
✓ Dark-only theming codified; architecture ready for future light-mode addition  
✓ Accessibility-by-design: tokens enforce consistency, prevent regressions  
✓ No visual compromise: focus styling blue luminous outline + glow meet WCAG contrast + reinforce brand  

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| WCAG audit reveals extensive failures | Scope audit to Phase 5 P1 surfaces + samples; capture partial/aspirational items; defer non-critical to post-Phase-6 |
| Shared hooks refactoring breaks admin components | Keep existing `_lib/accessibilityKeyboard.ts` intact; new layer is additive; test all admin surfaces after |
| Animation re-activation due to media-query layering | Test with DevTools prefers-reduced-motion toggle; verify `animation: none; transition: none` at token level |

## Next Steps

1. Assign Slice 01 to delivery team
2. Confirm token definitions with design/product stakeholders
3. Execute Slices 01–05 in sequence per stage-05.md
4. Final verification: lint/type-check pass, manual test on 5+ surfaces, WCAG checklist complete
5. Closeout: Archive artifacts, update dev-tracker, move Phase 6 to final verification stage

---

For detailed execution plan, see [stage-05.md](stage-05.md).
