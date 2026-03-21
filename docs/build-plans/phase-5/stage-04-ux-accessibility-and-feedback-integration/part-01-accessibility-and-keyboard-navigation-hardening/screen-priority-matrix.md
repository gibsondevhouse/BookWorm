# Screen Priority Matrix for Part 01 Hardening

**Phase 5 / Stage 04 / Part 01**  
**Hardening Target Selection & Prioritization**

## Overview

This matrix identifies the core admin and review screens targeted for Part 01 accessibility and keyboard navigation hardening. Priority is based on:

1. **Frequency:** How often editorial staff use the screen (daily/weekly/monthly)
2. **Complexity:** Keyboard interaction complexity (higher = more needs hardening)
3. **Impact:** How many users or workflows are affected
4. **Dependency:** Whether other screens depend on this one working correctly
5. **Risk:** Current accessibility debt or known usability pain points

---

## Priority Matrix

| Priority | Screen                     | Workflow           | Frequency      | Complexity | Impact    | Dependency    | Known Issues                                                               | Target Completion  |
| -------- | -------------------------- | ------------------ | -------------- | ---------- | --------- | ------------- | -------------------------------------------------------------------------- | ------------------ |
| **P1**   | Review Inbox               | Review & Approval  | Daily          | High       | Very High | Core          | Filter/sort only mouse-accessible; no keyboard shortcuts                   | Part 01, Week 1-2  |
| **P1**   | Proposal Review Dialog     | Review & Approval  | Daily          | High       | Very High | Core          | Tab order unpredictable; focus traps not managed                           | Part 01, Week 1-2  |
| **P1**   | Admin Entity List          | Entity Management  | Daily-Weekly   | Medium     | High      | Core          | Bulk actions require mouse; search debounce delays keyboard input feedback | Part 01, Week 2-3  |
| **P1**   | Edit Entity Dialog         | Entity Management  | Daily-Weekly   | High       | High      | Core          | Form validation not accessible; error messages not keyboard-reachable      | Part 01, Week 2-3  |
| **P2**   | Comment Thread             | Collaboration      | Weekly         | Medium     | Medium    | Secondary     | Reply button buried; keyboard navigation unclear                           | Part 01+, Week 3-4 |
| **P2**   | Approval Chain Editor      | Governance Config  | Weekly-Monthly | High       | Medium    | Configuration | Matrix interface has no keyboard support; drag-drop only                   | Part 01+, Week 4-5 |
| **P2**   | Release/Manuscript List    | Content Management | Weekly         | Medium     | Medium    | Secondary     | Sorting requires mouse; inline text editing not keyboard-manageable        | Part 01+, Week 4-5 |
| **P3**   | Revision Timeline          | Historical Review  | Monthly        | Low        | Low       | Tertiary      | Visual navigation only; no keyboard equivalent                             | Part 02            |
| **P3**   | Relationship Editor        | Entity Management  | Monthly        | High       | Low       | Tertiary      | Relationship graph is SVG; no keyboard alternative                         | Part 02            |
| **P3**   | Metadata Visibility Config | Governance Config  | Monthly        | Medium     | Low       | Configuration | Nested toggles; focus management weak                                      | Part 02            |

---

## Part 01 Scope: P1 Screens

### Rationale

P1 screens are **daily-use paths** that directly impact **approval and proposal workflows**. These are blocking items for editorial velocity and must have fully keyboard-navigable, screen-reader-compatible interfaces.

- **Review Inbox** is the primary entry point for editorial decision-making
- **Proposal Review Dialog** is where reviewers spend 60%+ of review time
- **Admin Entity List/Edit** supports the highest-frequency content authoring operations

Hardening these four screens ensures the core approval workflow is accessible to all users, including those using keyboard-only or assistive devices.

---

## P1 Screen Details & Hardening Targets

### 1. Review Inbox

**Current Path:** `/admin/review-inbox`  
**User Flow:** Editor opens app → navigates to inbox → filters proposals → selects proposal for review

**Accessibility Gaps:**

- Filter buttons and status checkboxes are not clearly labeled with ARIA
- Tab order jumps erratically between list and filters
- List rows are not keyboard-selectable (hover state only)
- Search input does not provide live feedback on filter results
- No keyboard shortcuts to switch between filtered views

**Hardening Requirements:**

- [ ] All filter controls (buttons, checkboxes) have semantic `<button>` or `<input type="checkbox">` with associated labels
- [ ] Tab order: filters → search → list → action buttons (logical, consistent)
- [ ] Arrow-Up/Down navigates list rows; Enter selects current row
- [ ] Search input has live region announcement "N items found"
- [ ] Keyboard shortcuts: Alt+I to focus inbox; Alt+A/D/E for action buttons (when row selected)
- [ ] All interactive elements have visible focus indicator

**Verification:**

- Manual keyboard navigation: Can reach all filters, search, list, and actions with Tab only
- Screen reader: All controls announced with clear labels and purpose
- Automated: Keyboard navigation test covers Tab order and focus movement

---

### 2. Proposal Review Dialog

**Current Path:** `/admin/review/[proposalId]`  
**User Flow:** Editor selects proposal from inbox → opens proposal review panel → reviews content → makes decision (approve/deny/escalate)

**Accessibility Gaps:**

- Modal focus trap not implemented (Tab escapes modal unintentionally)
- Decision buttons (Approve/Deny/Escalate) are visually obvious but not grouped semantically
- Comment section is difficult to navigate; reply buttons are small and hard to tab to
- Approval chain visualization is graphics-based with no text alternative
- Error messages from validation appear only in toast, not in main flow

**Hardening Requirements:**

- [ ] Modal is `<div role="dialog" aria-modal="true" aria-labelledby="proposal-title">`
- [ ] Focus trapped within modal: Tab/Shift+Tab cycles between first and last focusable elements
- [ ] First focusable element (proposal title or first button) receives focus on modal open
- [ ] Decision buttons grouped in `<fieldset>` with legend "Decision"; buttons have clear labels (not just icons)
- [ ] Alt+A/D/E shortcuts trigger approve/deny/escalate decisions
- [ ] Comment section is semantic `<ol>` or `<ul>`; each comment is a `<li>` with author, timestamp, content
- [ ] Reply button per comment is keyboard-accessible; Tab/Enter opens reply editor
- [ ] Escape key closes dialog; if changes exist, shows confirmation dialog
- [ ] Validation errors appear in live region `aria-live="polite"` at top of dialog
- [ ] Approval chain is described in text below the visualization with current step highlighted

**Verification:**

- Manual keyboard: Can open dialog, navigate to all comments, make decision, close without mouse
- Screen reader: Dialog structure, comments, and decision options are clearly announced
- Automated: Focus trap test, Tab order test, decision button test

---

### 3. Admin Entity List

**Current Path:** `/admin/entities` or `/admin/[type]/list`  
**User Flow:** Admin navigates to entity type list → views entities in list → can sort, filter, bulk-select → opens detail/edit view

**Accessibility Gaps:**

- List is HTML table but headers are not properly marked with `<th scope="col">`
- Bulk action checkboxes are present but not properly labeled for screen readers
- Sort controls only work via mouse click (no keyboard activation)
- Delete action requires modal confirmation, but modal is not always keyboard-navigable
- Search input has debounce delay; keyboard input feels sluggish

**Hardening Requirements:**

- [ ] List is semantic `<table>` with `<thead>`, `<tbody`, `<tr>`, `<td>`
- [ ] Column headers are `<th scope="col">` with sort button inside (if sortable)
- [ ] Sort button has `aria-sort="ascending"` or `="descending"` or `="none"`
- [ ] Bulk select checkbox in header has `aria-label="Select all entities"`
- [ ] Row-level checkboxes have `aria-label="Select [Entity Name]"`
- [ ] Tab navigates: search → filter → sort headers → list rows → action buttons
- [ ] From list row: Enter opens detail/edit view; Delete opens confirmation dialog
- [ ] Search input provides immediate feedback in live region while preserving Tab order
- [ ] All bulk actions (copy, delete, archive) are keyboard-accessible via buttons with clear labels
- [ ] Focus returns to list after detail view closes

**Verification:**

- Manual keyboard: Can search, sort, select rows, and perform bulk actions with keyboard only
- Screen reader: Table structure, headers, and row content are properly announced
- Automated: Table semantics test, Tab order test, bulk action test

---

### 4. Edit Entity Dialog/Form

**Current Path:** `/admin/[type]/[slug]/edit` or modal overlay  
**User Flow:** Admin opens entity details → clicks Edit → form appears with fields → admin updates fields → clicks Save or Cancel

**Accessibility Gaps:**

- Form fields lack proper `<label>` elements; labels are embedded in placeholder text
- Required field indicators are visual only (`*`), not semantic (`required` attribute)
- Validation errors appear in red text only; position relative to fields is unclear
- Rich text editor (if present) has no keyboard navigation support
- Submit/Cancel buttons are not clearly distinguished

**Hardening Requirements:**

- [ ] Every form field has explicit `<label for="[id]">` element
- [ ] Required fields have `required` attribute and `aria-required="true"`
- [ ] Visual indicator: Required fields show `*` and label text includes "(required)"
- [ ] Form has notice at top: "\* indicates required field"
- [ ] Validation errors appear in live region `aria-live="assertive"` listing all errors
- [ ] Individual field errors are associated via `aria-describedby="[error-id]"`
- [ ] Error messages positioned immediately after field; use color + icon + text
- [ ] Rich text editor (if present) has keyboard controls: Tab inserts 4 spaces or moves to next field; Ctrl+B/I/U for formatting
- [ ] Submit button is clearly labeled and visually distinct; Tab order ends at Submit/Cancel
- [ ] Escape key closes form with unsaved changes confirmation
- [ ] Focus returns to list or detail view after Save/Cancel

**Verification:**

- Manual keyboard: Can fill all form fields, see validation errors, and submit with keyboard only
- Screen reader: All labels, required indicators, and errors are announced
- Automated: Form label test, validation messaging test, required field test

---

## P2 & P3 Screens (Out of Scope for Part 01)

These screens will be hardened in Part 02 and beyond. They are included here for planning visibility.

- **Comment Thread:** Secondary workflow; most comments are in-context within proposal review
- **Approval Chain Editor:** Configuration feature; less frequent but high complexity
- **Release/Manuscript List:** Secondary workflow; list UI similar to entity list
- **Revision Timeline, Relationship Editor, Metadata Config:** Tertiary features; complex UI patterns require R&D phase

---

## Success Criteria for Part 01 Closure

All P1 screens must pass:

1. ✓ **Keyboard-only navigation test:** Open each screen, disable mouse, successfully complete primary workflow using keyboard only
2. ✓ **Screen reader test:** Open each screen with NVDA (Windows) or VoiceOver (macOS); screen reader user can complete primary workflow
3. ✓ **Automated test suite:** All keyboard navigation, focus management, and error messaging tests require >90% pass rate
4. ✓ **Visual focus indicator:** All focusable elements have visible, persistent focus indicator with ≥3:1 contrast
5. ✓ **Linting & type-check:** No accessibility-related lint errors; TypeScript builds with strict mode

---

## Handoff to Part 02

After Part 01 verification gate passes:

- P2 screens (Comment Thread, Approval Chain, Release List) will follow same hardening pattern
- P3 screens (Timeline, Relationship, Metadata) will be scheduled for Part 02 or Phase 6
- Shared component library updates (if any) will be applied retroactively to existing screens

---

## Related Documents

- [Accessibility Hardening Plan](accessibility-hardening-plan.md) — Detailed keyboard and semantic requirements
- [Acceptance Checklist](acceptance-checklist.md) — Step-by-step verification list
- Part 01 Test Files: `tests/phase5AccessibilityKeyboardNavigationPart01.test.ts`
