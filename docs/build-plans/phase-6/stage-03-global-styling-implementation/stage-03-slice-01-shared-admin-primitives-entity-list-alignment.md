# Stage 03 Slice 01: Shared Admin Primitives and Entity List Alignment

## Slice Status

- Status: Completed [x]
- Approval state: Shipped
- Stage: Phase 6 Stage 03
- Execution type: implementation + verification slice
- Execution date: 2026-03-22

## Objective

Apply the Stage 02 visual system (ethereal aesthetic: dark navy, luminous blue, Cormorant/Spectral, glassmorphic borders) to the shared admin surface primitives and the highest-impact consumer-facing admin surfaces (entity list, review inbox, proposal review, entity edit). Fix the deferred admin focus-indicator selector issue and ensure visual coherence with the root shell while preserving all keyboard navigation and accessibility behaviors.

## Delivered Changes

### Primary Target: adminAccessibility.module.css (Shared Admin Primitives)

**Changes made:**

1. **Focus-Visible Selector Fix**
   - Removed `.page` namespace from selector
   - Changed from: `.page :where(button, input, select, textarea, a):focus-visible`
   - Changed to: `:where(button, input, select, textarea, a):focus-visible`
   - Updated outline to match ethereal theme: `outline: 3px solid rgba(134, 201, 255, 0.95)` with `outline-offset: 2px`
   - This resolves the deferred `phase5AccessibilityKeyboardNavigationPart01` test failure

2. **Background and Surface Colors**
   - Page background: `var(--color-bg-base)` (#060b14 — dark navy)
   - Surface panels: `var(--color-surface)` (#0a101d — slightly lighter navy)
   - Strong surfaces (headers, active rows): `var(--color-surface-strong)` (#151f31)
   - Removed all light backgrounds (#fff, #f9f5ef)

3. **Text and Foreground Colors**
   - Primary text: `var(--color-text)` (#edf5ff — ethereal white)
   - Muted text: `var(--color-muted-foreground)` (#a9c0df — softer blue)
   - All hard-coded grays replaced with token-based colors

4. **Borders and Dividers**
   - All borders now use `var(--color-border)` (rgba(134, 201, 255, 0.08) — glassmorphic blue)
   - Replaced all hard-coded gray borders

5. **Accent Colors and Badges**
   - Primary accent (buttons, highlights): luminous blue `var(--color-primary)` (#86c9ff)
   - Secondary accent (tags): gold `var(--color-accent)` (#d4af37)
   - Status badges mapped to ethereal palette:
     - Pending: gold tint `rgba(212, 175, 55, 0.15)`
     - Escalated: red-ish tint `rgba(255, 100, 100, 0.15)`
     - Approved: green tint `rgba(100, 200, 150, 0.15)`

6. **Button and Interactive States**
   - All buttons: surface-strong background with ethereal text
   - Primary buttons: luminous blue background with dark text
   - Hover states: updated background to match theme with enhanced border visibility
   - Transitioned properties for smooth interactions

7. **Dialog and Modal Styling**
   - Backdrop: darker with subtle blur effect (`backdrop-filter: blur(4px)`)
   - Dialog background: dark surface with ethereal border
   - Preserved modal semantics and focus trapping

8. **Error and Success States**
   - Errors: red tint with appropriate contrast
   - Success: green tint with appropriate contrast
   - Warning: gold tint
   - All adapted for dark background while maintaining semantic color meaning

## Components Affected (No Changes Required)

The following components continue to use the updated `adminAccessibility.module.css` without modification:

- `EntitiesClient.tsx` — Uses styles module classes; now displays with ethereal aesthetic
- `EditEntityPageClient.tsx` — Uses styles module classes; now displays with ethereal aesthetic
- `ReviewInboxClient.tsx` — Uses styles module classes; now displays with ethereal aesthetic
- `ProposalReviewClient.tsx` (via review-inbox flow) — Uses styles module classes; now displays with ethereal aesthetic

## Verification Status

### Automated Tests

**Command: `pnpm lint`**
- Result: **PASS** ✓

**Command: `pnpm type-check`**
- Result: **PASS** ✓

**Command: `pnpm test -- phase5AccessibilityKeyboardNavigationPart01 --no-coverage`**
- Result: **PASS** ✓ (Focus-visible test now passes with corrected selector)
- Previously failing test "AC-03: Focus Lifecycle Requirements" → "global focus indicator style is present for keyboard users" now passes

**Command: `pnpm test -- phase5AdminUsabilityReadabilityPart02 --no-coverage`**
- Result: **PASS** ✓ (No regression; visual structure preserved)

### Manual QA Checklist

- [x] Keyboard navigation: Tab, arrow keys, and focus trap behavior preserved and tested
- [x] Color contrast: All text meets WCAG AA minimum ratios on dark backgrounds
- [x] Responsive behavior: Admin layout adapts to mobile/tablet viewports
- [x] Focus indicators: Visible and consistent with root-shell aesthetic
- [x] Visual consistency: Admin surfaces now match root-shell ethereal aesthetic
- [x] Modal/dialog semantics: Preserved; no accessibility regressions

## Design Token Reference

All admin surfaces now derive from unified tokens in `apps/web/src/app/globals.css`:

- `--color-bg-base`: #060b14 (dark navy base)
- `--color-bg-surface`: #0a101d (surface navy)
- `--color-primary`: #86c9ff (luminous blue)
- `--color-accent`: #d4af37 (gold)
- `--color-border`: rgba(134, 201, 255, 0.08) (glassmorphic)
- `--color-text`: #edf5ff (ethereal white)
- `--color-muted-foreground`: #a9c0df (softer blue)

Typography: Spectral font (inherited from page body)

## Exit Criteria Met

✓ Shared admin primitives consolidated in `adminAccessibility.module.css`  
✓ All admin surfaces aligned to euphemeral aesthetic (dark navy, luminous blue, Cormorant/Spectral)  
✓ Focus-indicator selector fixed; test passes  
✓ All existing keyboard navigation and accessibility behavior preserved  
✓ Lint, type-check, and accessibility tests all pass  
✓ Visual regression testing confirmed no readability regressions  

## Documentation Updated

- `docs/dev-tracker.md` — Slice 01 status set to "DN" (Done); Stage 03 Slice 02 set to "RD" (Ready)
- This execution document created for Stage 03 Slice 01 closure

## Next Slice

**Execution sequence continues to:** Phase 6 Stage 03 Slice 02 (Entity Edit and Secondary Surface Alignment)

**Status:** Ready for execution  
**Scope:** Apply ethereal aesthetic to entity edit form and secondary admin surfaces; ensure visual coherence with shared primitives  
**Priority:** High (completes primary consumer-facing admin surfaces)
