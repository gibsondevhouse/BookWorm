# Stage 02 Slice 03: Root-Shell Verification Closeout and Stage 03 Handoff Lock

## Slice Status

- Status: Completed [x]
- Approval state: Verified & locked
- Stage: Phase 6 Stage 02
- Execution type: verification and handoff documentation
- Execution date: 2026-03-22

## Objective

Disposit all open verification items from Stage 02 (Slices 01 and 02), document the known out-of-scope work that transfers to Stage 03, produce the ranked handoff order for the next high-impact admin surfaces, and lock Stage 02 ready for Stage 03 entry.

## Verification Summary

### Test Validation

**Command: `pnpm lint`**
- Result: **PASS** ✓
- Scope: All workspace projects (api, web)
- Evidence: Both apps/api and apps/web lint steps completed without errors

**Command: `pnpm type-check`**
- Result: **PASS** ✓
- Scope: All workspace projects (api, web)
- Evidence: Both apps/api and apps/web type-check steps completed without errors

**Command: `pnpm test -- phase5AdminUsabilityReadabilityPart02 --no-coverage`**
- Result: **PASS** ✓
- Test suite: Phase 5 Stage 04 Part 02 (admin usability and readability)
- All assertions covering UI readability, heading hierarchy, and visual structure pass

**Command: `pnpm test -- phase5AccessibilityKeyboardNavigationPart01 --no-coverage`**
- Result: **FAIL** (expected, deferred to Stage 03)
- Test suite: Phase 5 Stage 04 Part 01 (accessibility and keyboard navigation)
- Failure point: AC-03 "Focus Lifecycle Requirements" → "global focus indicator style is present for keyboard users"
- Failure reason: Test expects `:where(button, input, select, textarea, a):focus-visible` selector in `apps/web/src/app/admin/adminAccessibility.module.css` without namespace, but current implementation has `.page :where(button, input, select, textarea, a):focus-visible`
- Disposition: **Out of scope for Stage 02**. This is the deferred admin global focus-indicator styling expectation documented in Stage 02 snapshot. Transferred to Stage 03 Slice 01 as priority fix.
- Impact: Only affects admin surfaces (not root shell); accessibility behavior is correct, only selector namespace differs

### Root Shell Deliverables Verification

Target files (Stage 02 Slice 01):
- `apps/web/src/app/globals.css` — Design tokens, palette, typography, ethereal aesthetic base ✓
- `apps/web/src/app/layout.tsx` — Root layout with vision-aligned DOM structure ✓
- `apps/web/src/app/AppSidebar.tsx` — Ethereal-styled sidebar navigation (Slice 02) ✓
- `apps/web/src/app/page.tsx` — Root landing/chat surface with ethereal UI system ✓

Verification narrative:
- Root shell applies the approved Phase 6 visual direction (dark navy, luminous blue, Cormorant/Spectral typography)
- Sidebar refactor (Slice 02) completes the navigation surface coherence
- Navigation structure, keyboard reachability, and responsive behavior preserved
- All root shell surfaces now use the unified token system from `globals.css`
- Lint and type-check gates confirm code quality

## Known Out-of-Scope Carry-Forward to Stage 03

### Item 1: Admin Global Focus Indicator Selector Normalization

**Location:** `apps/web/src/app/admin/adminAccessibility.module.css`

**Current state:**
```css
.page :where(button, input, select, textarea, a):focus-visible {
  outline: 3px solid #2f5d8a;
  outline-offset: 2px;
}
```

**Expected state (per test):**
```css
:where(button, input, select, textarea, a):focus-visible {
  outline: 3px solid #2f5d8a;
  outline-offset: 2px;
}
```

**Why deferred:** The selector namespace reflects the current admin stylistic scope (scoped to `.page`). Moving to an unscooped `:where()` selector is part of the broader admin surface realignment to match root-shell tokens and palette in Stage 03. Fixing only the selector without updating the palette and surfaces would leave the admin inconsistent.

**Handoff dependency:** Stage 03 Slice 01 must address this first before running phase5AccessibilityKeyboardNavigationPart01 to close all open verification gates.

## Stage 03 Ranked Handoff Order

### Rank 1: Stage 03 Slice 01 — Shared Admin Primitives + Entity List Alignment

**Target surfaces:**
1. `apps/web/src/app/admin/adminAccessibility.module.css` — Consolidate shared admin styling; apply root-shell palette + ethereal tokens; fix focus-indicator selector as top priority
2. `apps/web/src/app/admin/entities/EntitiesClient.tsx` — Align entity list UI to ethereal aesthetic; preserve keyboard/list navigation
3. `apps/web/src/app/admin/review-inbox/ReviewInboxClient.tsx` — Align review inbox to ethereal aesthetic; preserve dialog/focus trap
4. `apps/web/src/app/admin/review/[proposalId]/ProposalReviewClient.tsx` — Align proposal review to ethereal aesthetic (part of review inbox flow)

**Entry gate:** Stage 02 Slices 01 and 02 complete; root shell visual system locked

**Exit gate:** Visual alignment with root shell across all targeted surfaces; keyboard/focus verified; phase5AccessibilityKeyboardNavigationPart01 passes; phase5AdminUsabilityReadabilityPart02 regression confirmed

**Workflow impact:** Highest. Entity list, review inbox, and proposal review are primary admin workflows users navigate daily after release.

### Rank 2: Stage 03 Slice 02 — Entity Edit and Secondary Surface Alignment

**Target surfaces:**
1. `apps/web/src/app/admin/entities/[slug]/edit/EditEntityPageClient.tsx` — Align entity edit form to ethereal aesthetic; preserve form validation and keyboard navigation
2. Other admin secondary surfaces (settings, logs, diagnostics per Stage 03 audit)

**Entry gate:** Stage 03 Slice 01 complete and verified

**Exit gate:** Edit form UI coherent with list/inbox/proposal surfaces; all styles derive from shared primitives

### Rank 3: Stage 03 Slice 03 — Verification, Regression Cleanup, and Stage 04 Handoff

**Scope:**
- Regression testing across all updated admin surfaces
- Visual consistency spot checks (responsive, dark vs. light contexts, etc.)
- Documentation of verified surfaces and known cosmetic deferral (if any)
- Stage 04 readiness assessment and handoff lock

**Entry gate:** Slices 01 and 02 complete

**Exit gate:** All regressions closed; Stage 04 prerequisites documented

## Documentation Updated

- `docs/dev-tracker.md` — Stage 02 Slice 03 status set to "DN" (Done); notes updated with verification disposition; Stage 03 Slice 01 status set to "RD" (Ready)
- `docs/build-plans/phase-6/stage-02-joint-styling-foundation/stage-02-joint-styling-foundation.md` — Status snapshot updated to reflect Slice 03 completion; Stage 03 handoff locked
- `docs/build-plans/phase-6/stage-03-global-styling-implementation/stage-03-global-styling-implementation.md` — Handoff order and entry prerequisites confirmed

## Exit Criteria Met

✓ Disposition of all open verification items documented  
✓ Known out-of-scope failure (admin focus-indicator selector) explicitly carried forward with rationale  
✓ Ranked Stage 03 handoff produced, grounded in audited high-impact admin surfaces  
✓ Root shell visual system confirmed stable; lint, type-check, and readability tests pass  
✓ Stage 02 marked complete; Stage 03 locked for entry  

## Next Slice

**Execution sequence continues to:** Phase 6 Stage 03 Slice 01 (Shared Admin Primitives + Entity List Alignment)

**Status:** Ready for execution  
**Priority:** Highest (visual coherence gap closes consumer-facing perception)  
**Owner:** Lead Coder
