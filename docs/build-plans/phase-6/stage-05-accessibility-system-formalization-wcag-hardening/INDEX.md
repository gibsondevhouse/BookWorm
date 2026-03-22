# Phase 6 Stage 05 Planning Index

## Quick Navigation

**Start here:**
- 📋 [PLANNING-SUMMARY.md](PLANNING-SUMMARY.md) — Executive summary, evidence, slice breakdown, success criteria
- 🎯 [README.md](README.md) — Stage overview table, key changes, next steps

**Master Plan:**
- 📘 [stage-05.md](stage-05.md) — Full stage plan (300+ lines): purpose, scope, 5 slices with acceptance criteria, sequencing, exit criteria, risks, appendices

**Delivery-Ready Slice Plans:**
- 🔧 [stage-05-slice-01-token-architecture.md](stage-05-slice-01-token-architecture.md) — Token system creation (Slice 01 delivery checklist)
- *(Slice 02–05 templates will be populated by delivery team)*

**Specification Templates (for delivery team to populate):**
- 🎨 [accessibility-tokens.md](accessibility-tokens.md) — Accessibility token specifications (focus, motion, affordance, spacing, theming)
- 🏗️ [css-architecture.md](css-architecture.md) — CSS layering rules (global vs. modules)
- 🔐 [semantic-patterns-reference.md](semantic-patterns-reference.md) — Reusable ARIA/keyboard patterns
- 📊 [component-focus-interview.md](component-focus-interview.md) — Current focus implementation audit
- ✅ [wcag-audit.md](wcag-audit.md) — WCAG criteria audit results
- 🧪 [wcag-testing-plan.md](wcag-testing-plan.md) — Deterministic verification steps
- 📋 [wcag-conformance-checklist.md](wcag-conformance-checklist.md) — WCAG AA/AAA status (40+ criteria)
- 🐛 [accessibility-issues-tracker.md](accessibility-issues-tracker.md) — Issue logging template
- 📚 [ACCESSIBILITY_SYSTEM.md](ACCESSIBILITY_SYSTEM.md) — Master system index + guidelines + maintenance policy

---

## Planning-to-Delivery Flow

### For Stakeholders / Phase Lead
**Time: 24 hrs**
1. Read [PLANNING-SUMMARY.md](PLANNING-SUMMARY.md) — Get executive overview + evidence
2. Review [stage-05.md](stage-05.md) sections: Purpose, Work To Be Done, Exit Criteria
3. Confirm decisions: WCAG target level, scope, token definitions
4. Assign delivery team
5. Proceed to delivery phase

### For Lead Frontend Coder (Slices 01–03)
**Time: Days 1–8**

**Slice 01 (Days 1–3):**
1. Read [stage-05-slice-01-token-architecture.md](stage-05-slice-01-token-architecture.md) — Full execution plan for this slice
2. Follow deliverables checklist:
   - Create [accessibility-tokens.md](accessibility-tokens.md) — Copy template, fill in token definitions
   - Create [accessibility-tokens.css](../../apps/web/src/app/accessibility-tokens.css) — CSS custom properties file
   - Update [globals.css](../../apps/web/src/app/globals.css) — Refactor focus rule to use tokens
3. Test: `pnpm lint`, `pnpm type-check`, manual focus verification
4. Mark Slice 01 Done

**Slice 02 (Days 4–5):**
1. Read [stage-05.md](stage-05.md) Slice 02 section  
2. Fix CSS Module violation in [adminAccessibility.module.css](../../apps/web/src/app/admin/adminAccessibility.module.css)
3. Create [css-architecture.md](css-architecture.md) documenting layering rules
4. Verify focus styling on 3+ admin surfaces
5. Mark Slice 02 Done

**Slice 03 (Days 6–8):**
1. Read [stage-05.md](stage-05.md) Slice 03 section
2. Create shared accessibility utilities:
   - [useFocusTrap.ts](../../apps/web/src/shared/accessibility/useFocusTrap.ts)
   - [useKeyboardShortcuts.ts](../../apps/web/src/shared/accessibility/useKeyboardShortcuts.ts)
   - [useLiveRegion.ts](../../apps/web/src/shared/accessibility/useLiveRegion.ts)
3. Refactor admin components to use shared hooks
4. Populate [semantic-patterns-reference.md](semantic-patterns-reference.md)
5. Extend [READABILITY_STANDARDS.md](../../apps/web/src/app/admin/READABILITY_STANDARDS.md) with semantic checklist
6. Mark Slice 03 Done

### For QA / Accessibility Reviewer (Slice 04)
**Time: Days 9–12**

1. Read [stage-05.md](stage-05.md) Slice 04 section
2. Manual audit using deterministic testing methodology
3. Populate:
   - [wcag-audit.md](wcag-audit.md) — Audit findings
   - [wcag-testing-plan.md](wcag-testing-plan.md) — Testing steps
   - [wcag-conformance-checklist.md](wcag-conformance-checklist.md) — Criteria status (40+ items)
   - [accessibility-issues-tracker.md](accessibility-issues-tracker.md) — High-priority issues + remediation queue
4. Mark Slice 04 Done

### For Technical Writer (Slice 05)
**Time: Day 13**

1. Read [stage-05.md](stage-05.md) Slice 05 section
2. Create master index [ACCESSIBILITY_SYSTEM.md](ACCESSIBILITY_SYSTEM.md):
   - Link all 4 prior slice artifacts
   - Write Implementation Guidelines (8+ items for future teams)
   - Write Maintenance Policy (update triggers, cadence)
3. Mark Slice 05 Done + Stage 05 Complete
4. Archive all artifacts; update tracker

---

## Artifact Purposes at a Glance

| Document | Purpose | Owner | Status |
|---|---|---|---|
| PLANNING-SUMMARY.md | Executive overview; evidence; slice breakdown; decisions | Architect | ✓ Complete |
| README.md | Stage snapshot; quick reference | Architect | ✓ Complete |
| stage-05.md | Full execution plan; 5 slices with context, acceptance criteria, risks | Architect | ✓ Complete |
| stage-05-slice-01-* | Delivery-ready Slice 01 plan with implementation checklist | Frontend Coder | ✓ Complete |
| accessibility-tokens.md | Token specifications (template) | Slice 01 Coder | 🟡 Ready to populate |
| css-architecture.md | CSS layering rules (template) | Slice 02 Coder | 🟡 Ready to populate |
| semantic-patterns-reference.md | ARIA/keyboard patterns (template) | Slice 03 Coder | 🟡 Ready to populate |
| component-focus-interview.md | Current focus audit (template) | Slice 03 Coder | 🟡 Ready to populate |
| wcag-audit.md | WCAG audit findings (template) | Slice 04 QA | 🟡 Ready to populate |
| wcag-testing-plan.md | WCAG testing methodology (template) | Slice 04 QA | 🟡 Ready to populate |
| wcag-conformance-checklist.md | WCAG criteria status (template) | Slice 04 QA | 🟡 Ready to populate |
| accessibility-issues-tracker.md | Issue logging template | Slice 04 QA | 🟡 Ready to populate |
| ACCESSIBILITY_SYSTEM.md | Master system index + guidelines (template) | Slice 05 Writer | 🟡 Ready to populate |

---

## Key Decisions Embedded in Plan

1. **CSS Token Layer Strategy:** All accessibility properties (focus, motion, affordance) defined as reusable CSS custom properties in `accessibility-tokens.css`, imported into `globals.css`
2. **CSS Module Purity:** Focus styling moves to global layer; CSS Modules remain pure (layout, color, spacing only)
3. **Reduced-Motion Consolidation:** All motion token overrides centralized in `@media (prefers-reduced-motion: reduce)` block in token layer
4. **Shared Accessibility Utilities:** New custom hooks (useFocusTrap, useKeyboardShortcuts, useLiveRegion) in `src/shared/accessibility/` directory; existing admin `_lib` left intact (backwards compatible)
5. **WCAG Scope:** Phase 5 P1 surfaces + sampled public surfaces; Phase-f chat surfaces deferred; high-priority failures drive post-Phase-6 roadmap
6. **Theming:** Dark-only for Phase 6; light-mode architecture documented as future-ready

---

## Evidence Sources

- **Current State Snapshot:** `docs/dev-tracker.md` (Phase 6 Stage 03 completion, Stage 04 in progress)
- **CSS Module Violation:** `apps/web/src/app/admin/adminAccessibility.module.css` line ~440
- **Keyboard Navigation Baseline:** [Phase 5 Part 01](../../phase-5/stage-04-ux-accessibility-and-feedback-integration/part-01-accessibility-and-keyboard-navigation-hardening/) ✓
- **Design Tokens Baseline:** `apps/web/src/app/globals.css` @theme block
- **Readability Standards:** [READABILITY_STANDARDS.md](../../apps/web/src/app/admin/READABILITY_STANDARDS.md)
- **UI Vision:** [ui-vision.md](../../build-system/book-worm-build-system/ui-vision.md) — Dark + ethereal aesthetic

---

## Success Handoff Checklist

Before declaring Stage 05 complete:

- [ ] **Slice 01 Complete:** Tokens defined, imported, focus rule uses tokens, tests pass
- [ ] **Slice 02 Complete:** CSS Module fixed, CSS architecture documented, focus visible on admin surfaces
- [ ] **Slice 03 Complete:** Shared hooks extracted, components refactored, semantic patterns documented, READABILITY_STANDARDS extended
- [ ] **Slice 04 Complete:** WCAG audit finished, conformance checklist populated (40+ criteria), high-priority issues identified
- [ ] **Slice 05 Complete:** Master index created, implementation guidelines written, maintenance policy defined
- [ ] **All Tests Pass:** `pnpm lint`, `pnpm type-check`, Phase 5 baseline tests remain passing
- [ ] **Manual Verification:** Focus rings visible on 5+ surfaces; prefers-reduced-motion toggle verified; no visual regressions
- [ ] **Dev Tracker Updated:** Stage 05 status = Done; all slices = Done; links to artifacts recorded
- [ ] **Closeout Documented:** What shipped vs. deferred, dependencies for Phase 7, accessibility system ready for extension

---

## Questions? Escalation Path

- **Token definitions unclear?** → Review `accessibility-tokens.md` template + `globals.css` current values (copy-paste reference)
- **CSS Module fix blocked?** → Reference `css-architecture.md` decision + read `stage-05-slice-02-*` when ready
- **WCAG audit scope too broad?** → Redline in `stage-05.md` Slice 04 "Scope note" section; confirm stakeholder approval
- **Shared hook refactoring risks?** → Mitigation: Keep existing `_lib` intact, new layer is additive, manual regression test all admin components
- **Maintenance policy unclear?** → Template provided in `ACCESSIBILITY_SYSTEM.md` Slice 05 deliverables

---

## Archive & Version

- **Created:** 2026-03-22 by BookWorm Phase Architect
- **Target Delivery Team:** Lead Frontend Coder, QA/Accessibility Reviewer, Technical Writer
- **Estimated Duration:** 9–13 days
- **Next Gate:** Upon Stage 05 completion → Final Phase 6 verification → Release

---

**Ready to handoff to delivery team.** 🚀

