# Accessibility and Keyboard Navigation Hardening Plan

**Part 01 Execution Plan**  
**Phase 5 / Stage 04 / Part 01**  
**Status:** Planning Complete

## Executive Summary

This document establishes the comprehensive accessibility and keyboard navigation hardening baseline for BookWorm's core admin and review workflows. It defines canonical keyboard interaction patterns, semantic markup requirements, focus management rules, and error-state discoverability patterns that will guide implementation across Part 01 target screens.

---

## I. Keyboard Navigation Expectations

### I.1 Core Navigation Patterns

All keyboard-only users must be able to navigate BookWorm admin and review interfaces without a mouse, using only:
- **Tab/Shift+Tab** for forward/backward focus movement
- **Enter/Space** for activation of buttons, links, and toggles
- **Arrow keys** for within-control navigation (lists, dropdowns, trees)
- **Escape** for closing modals, dropdowns, and inline editors
- **Alt+key** combinations for workflow shortcuts (e.g., Alt+S for Save, Alt+C for Cancel)

### I.2 Target Workflow Categories

#### A. Form Submission & Dialogs
- **Tab Order:** Logical top-to-bottom flow through form fields
- **First Focus:** Modal receives keyboard focus; first focusable element is pre-selected
- **Submit/Cancel:** Both buttons keyboard-accessible; Enter triggers primary action only in appropriate contexts
- **Escape Handling:** Pressing Escape dismisses dialog without data loss (if form pristine) or confirmation (if form dirty)
- **Tab Trapping:** Focus is contained within modal; pressing Tab in last field cycles to first focusable element

#### B. Lists & Data Tables
- **Tab Entry:** Tab key enters the list; arrow keys navigate within list
- **Row Activation:** Enter activates/selects current row; Space toggles checkbox/selection state
- **Header Navigation:** Column headers accessible via keyboard; sorting triggers via Enter/Space
- **Pagination:** Next/Previous buttons and page jump fields fully keyboard-accessible
- **Filter/Search:** Search/filter inputs immediately navigate the list based on input

#### C. Dropdowns & Comboboxes
- **Open/Close:** Enter or Space opens dropdown; Arrow-Down or Tab enters list; Escape closes
- **Navigation:** Arrow-Up/Down navigate options; Home/End jump to first/last
- **Selection:** Enter or Tab selects highlighted option; Escape cancels without selecting
- **Typing:** First-letter jump navigates to matching options (ARIA pattern)
- **Search within:** If searchable, type to filter visible options

#### D. Menu Bars & Context Menus
- **Access:** Alt+first-letter or Alt+key for top-level menus
- **Navigation:** Arrow-Left/Right move between menu items; Arrow-Down opens submenu
- **Activation:** Enter or Space selects menu item
- **Escape:** Closes menu and returns focus to trigger

#### E. Inline Editors & Rich Text
- **Entry:** Tab to field; Enter or Space enters edit mode
- **Exit:** Tab or Escape exits edit mode; Escape discards changes; Tab confirms changes
- **Within Editor:** Standard text editing keys (Ctrl+B/I/U for formatting, Ctrl+Z for undo)
- **Toolbar:** Tab navigates toolbar buttons; similar activation rules apply

#### F. Tree/Hierarchical Navigation
- **Navigation:** Arrow-Up/Down move between nodes; Arrow-Right expands; Arrow-Left collapses
- **Jump:** Home/End jump to first/last visible node at current level
- **Selection:** Space toggles node selection; Enter activates/opens node
- **Multi-select:** Shift+Arrow and Shift+Space for range selection

### I.3 Workflow-Specific Shortcuts

**Admin Entity Management:**
- `Alt+N` — New entity
- `Alt+E` — Edit
- `Alt+D` — Delete (with confirmation)
- `Alt+S` — Save
- `Alt+C` — Cancel
- `Alt+R` — Refresh list

**Review Workflows:**
- `Alt+I` — Open Review Inbox
- `Alt+A` — Approve proposal
- `Alt+D` — Deny proposal
- `Alt+E` — Escalate proposal
- `Alt+C` — Add comment

---

## II. Accessibility Semantics Requirements

### II.1 Landmark Roles

All admin and review pages must include:

| Landmark | Purpose | Requirement |
|----------|---------|-------------|
| `<header>` / role="banner" | Site header, branding, top nav | Must contain site title and primary navigation |
| `<nav>` / role="navigation" | Primary and secondary navigation | Must label navigation purpose (e.g., aria-label="Main navigation") |
| `<main>` / role="main" | Page's primary content | Exactly one per page; immediate child of body |
| `<aside>` / role="complementary" | Sidebar filters, related content | Optional; must be relevant to main content |
| `<footer>` / role="contentinfo" | Site footer | Optional; typically contains legal info, copyright |

**Requirement:** Every admin/review screen must have at least `<header>`, `<main>`, and page-level `<nav>`.

### II.2 Heading Hierarchy

- **Page Level:** Exactly one `<h1>` per page (page title)
- **Section Level:** Use `<h2>`, `<h3>` in logical nesting order; never skip a heading level (e.g., don't jump from `<h1>` to `<h3>`)
- **Subsections:** Deep nesting (beyond `<h4>`) indicates need to refactor section structure
- **Headings in Modals:** Modal dialog should have a unique `<h2>` or `<h3>` serving as dialog title; use `aria-labelledby` on modal to reference title

**Requirement:** Every page must have a clear, logical heading hierarchy that can be used to create a page outline.

### II.3 Form Labeling & Semantics

- **Label Association:** Every `<input>`, `<select>`, `<textarea>` must have an associated `<label>` with `for` attribute matching the input's `id`
- **Required Fields:** Use `aria-required="true"` or HTML5 `required` attribute; visually indicate with `*` or text label
- **Validation Messages:** Associate error messages with inputs using `aria-describedby` pointing to message element's `id`
- **Fieldsets & Legends:** Related fields (e.g., radio button groups, checkbox groups) must be wrapped in `<fieldset>` with `<legend>` describing the group
- **Placeholder vs Label:** Never rely on placeholder as label; always use explicit `<label>` element

**Requirement:** All form controls must have programmatically associated labels and clear validation messaging.

### II.4 Interactive Control Semantics

| Control | Element/Role | Required ARIA |
|---------|-------------|---|
| Button | `<button>` or role="button" | role, aria-pressed (if toggle), aria-expanded (if it toggles content) |
| Link | `<a href>` or role="link" | None required if text is descriptive |
| Toggle | `<button role="switch">` or via checkbox styled as toggle | aria-checked, aria-label |
| Menu Button | `<button aria-haspopup="menu">` | aria-expanded, aria-controls |
| Disclosure Button | `<button aria-expanded="bool">` | Points to content ID via aria-controls |
| Tab Bar | `<div role="tablist">` with child tabs | role="tab", role="tabpanel", aria-selected |
| Combobox | `<input role="combobox">` or `<select>` | aria-expanded, aria-owns (for autocomplete) |
| Listbox | `<ul role="listbox">` with `<li role="option">` | aria-selected, aria-multiselectable |
| Dialog | `<div role="dialog">` or `<dialog>` | aria-labelledby, aria-describedby, aria-modal="true" |

**Requirement:** All interactive controls must have the correct semantic role and all required ARIA attributes for their interaction model.

### II.5 Content Relationships

- **Related Content:** Use `aria-label`, `aria-labelledby`, `aria-describedby` to relate form fields to instructions, hints, and error messages
- **Lists & Tables:** Properly semantically structure using `<ul>`, `<ol>`, `<table>` elements; use table headers `<th>` with `scope` attribute
- **Icon-Only Buttons:** If a button contains only an icon, provide `aria-label` describing the action
- **Abbreviations & Terms:** Use `<abbr title="">` for abbreviations; consider tooltips or glossary for domain-specific terms

---

## III. Focus Management Requirements

### III.1 Initial Focus Placement

- **Page Load:** Focus starts on `<main>` or first focusable element within page content (not navigation sidebar)
- **Modal Open:** Focus immediately moves to first focusable element within modal (usually title or first form field)
- **Menu Open:** Focus moves to first menu item
- **Search/Filter Results:** If results dynamically update, announce change and maintain focus or move to results container

**Requirement:** Every interaction that opens a modal, menu, or dynamically loads content must explicitly manage focus.

### III.2 Focus Trap vs Focus Movement

| Scenario | Behavior |
|----------|----------|
| Modal Dialog | Focus trap: Tab/Shift+Tab cycles within modal; cannot escape via Tab alone |
| Dropdown Menu | Focus escape: Tab moves to next page element; Escape closes menu |
| Inline Editor | Focus escape: Tab confirms edit and moves focus; Escape discards and moves focus |
| Search Results | Focus maintain: Results update behind current focus or focus moves to results region |
| Page Transition | Focus reset: After route change, focus returns to top of new page (or first focusable element) |

**Requirement:** Each component must implement the appropriate focus cycle/escape behavior for its interaction pattern.

### III.3 Focus Visibility

- **Indicator:** All focusable elements must have a visible focus indicator (typically a 2-3px outline or underline)
- **Color Contrast:** Focus indicator must have >= 3:1 contrast ratio against background
- **Not Hidden:** Focus indicator cannot be hidden by overflow or shadows; must be fully visible
- **Consistent:** Use the same focus indicator style across all components (or theme-consistent variations)

**Requirement:** Focus indicator must be visible and persistent; never use `outline: none` without providing visible alternative.

---

## IV. Error State & Validation Messaging

### IV.1 Error Message Discoverability

- **At-Submission Validation:** Validation errors must be announced; list all errors at top of form in a live region with role="alert"
- **Field-Level Errors:** Individual field errors must be associated with input via `aria-describedby` and visually adjacent
- **Error Color:** Use color + icon/symbol (not color alone) to indicate error state
- **Clear Recovery:** Error messages must include specific guidance on how to fix the problem

**Requirement:** All validation errors must be discoverable by keyboard-only users within 3 seconds of submission attempt.

### IV.2 Required Field Indication

- **Visual:** Required fields marked with `*` or "(required)" text
- **Semantic:** HTML5 `required` attribute or `aria-required="true"` on input
- **Notice:** Form must have a notice at top stating "* indicates required field" or equivalent

**Requirement:** Both visual and semantic indicators must be present; not one or the other.

### IV.3 State Change Announcements

- **Live Regions:** Use `aria-live="polite"` for non-critical updates (e.g., loading states, filter results count)
- **Alerts:** Use `aria-live="assertive"` for critical errors or validation failures
- **Atomic Updates:** Mark container with `aria-atomic="true"` if entire container content changes
- **Examples:** "3 items loaded", "Save failed: Network error", "Proposal escalated to supervisor"

---

## V. Implementation Checklist by Screen Category

### V.1 Admin Entity List/CRUD Screens

**Keyboard Navigation:**
- [ ] Tab navigates: sidebar → search/filter → list → action buttons
- [ ] Within list: Arrow-Up/Down move between rows; Home/End jump to first/last
- [ ] Enter on row: Opens detail/edit view
- [ ] Alt+N: Opens new entity modal
- [ ] Alt+R: Refreshes list

**Accessibility:**
- [ ] Page `<h1>` is "Entity [Type] List" (e.g., "Character List")
- [ ] List is proper `<table>` or `<ul>` with semantic structure
- [ ] Column headers have `scope="col"` if table
- [ ] Filter inputs have associated labels
- [ ] Delete button triggers confirmation dialog

**Focus:**
- [ ] Initial focus on main search/filter input or list
- [ ] Opening detail view traps focus in new screen
- [ ] Closing detail view returns focus to list

### V.2 Edit/Create Dialogs

**Keyboard Navigation:**
- [ ] Tab flows: Title → text fields → selects → rich editors → buttons
- [ ] Enter in text field continues tabbing (not submitting)
- [ ] Enter on submit button (or when focused on it) submits form
- [ ] Escape closes without losing data (if pristine) or with confirmation (if dirty)

**Accessibility:**
- [ ] Modal has `aria-labelledby` pointing to title
- [ ] All form fields have labels (not placeholders)
- [ ] Submit/Cancel buttons clearly labeled
- [ ] Validation errors appear in live region at top

**Focus:**
- [ ] First focusable element is automatically focused when modal opens
- [ ] Focus cannot escape via Tab (trapped within modal)
- [ ] Closing modal returns focus to triggering element (or list)

### V.3 Review Inbox

**Keyboard Navigation:**
- [ ] Tab navigates: filters → inbox list → actions
- [ ] Arrow-Up/Down within list; Enter opens proposal
- [ ] Alt+I: Focus on inbox (for quick switch)
- [ ] Within inbox row: action buttons (Approve/Deny/Escalate) keyboard-accessible

**Accessibility:**
- [ ] Status filters properly labeled (checkboxes or buttons with `aria-pressed`)
- [ ] Inbox list is semantic `<ul>` or `<table>`
- [ ] Each item shows status, priority, assigner name, and action buttons
- [ ] Live region announces when filters load new results

**Focus:**
- [ ] Initial focus on first filter or inbox list
- [ ] Opening proposal review maintains focus inside review panel

### V.4 Proposal Review & Approval Dialogs

**Keyboard Navigation:**
- [ ] Tab navigates: proposal title → content → comments → approval/decision buttons
- [ ] Within comment section: Alt+C creates new comment; Tab through comment replies
- [ ] Alt+A: Approve; Alt+D: Deny; Alt+E: Escalate (global shortcuts)
- [ ] Escape closes review without committing decision (with confirmation if changes exist)

**Accessibility:**
- [ ] Proposal title is `<h2>` or `<h3>` (modal is `<h2>`)
- [ ] Content sections use semantic headings
- [ ] Comments are in semantic list structure with timestamps and author info
- [ ] Decision buttons clearly labeled and visually distinct

**Focus:**
- [ ] Focus trapped within review modal/panel
- [ ] Approval decision opens confirmation dialog
- [ ] After decision, focus returns to inbox or next proposal

### V.5 Comment Threads

**Keyboard Navigation:**
- [ ] Tab navigates: comment authors → comment text → reply button
- [ ] Within thread: Arrow-Up/Down move between comments
- [ ] Enter on reply button opens inline reply editor
- [ ] Escape exits reply without saving; Tab confirms reply

**Accessibility:**
- [ ] Comments in proper `<ol>` or equivalent semantic list
- [ ] Each comment has author, timestamp, and content clearly marked
- [ ] Reply button per comment is keyboard-accessible
- [ ] Thread structure is navigable via heading hierarchy

---

## VI. Test Strategy & Verification Plan

### VI.1 Automated Test Coverage

**Test Categories:**
1. **Keyboard Navigation Tests** - Verify Tab order, Escape handling, Enter activation
2. **Focus Management Tests** - Verify initial focus, modal trapping, return focus on close
3. **ARIA & Semantics Tests** - Verify aria-labels, roles, hierarchies are correct
4. **Validation & Error Tests** - Verify error messages appear and are associated with inputs
5. **Live Region Tests** - Verify dynamic updates are announced correctly

**Test Framework:** Integration tests using Node.js test harness with simulated keyboard events and DOM inspection.

**Minimum Coverage:**
- Each of V.1–V.5 screens must have at least one keyboard navigation test
- Every form/dialog must have at least one focus trap and one error messaging test
- Every list/table must have at least one arrow-key navigation test

### VI.2 Manual Verification Checklist

**Pre-release Verification (must pass for Part 01 closure):**

- [ ] **Keyboard-Only Navigation:** Open each screen in V.1–V.5, disable mouse, navigate using only keyboard
  - Can reach all interactive elements
  - Tab order is logical and predictable
  - No keyboard traps (except modals where intentional)
  - Focus indicator is always visible
  
- [ ] **Screen Reader Testing:** Open each screen with NVDA (Windows) or VoiceOver (macOS)
  - Page structure makes sense when read linearly
  - Form labels are associated and announced
  - Dynamic content changes are announced
  - Buttons and links are announced with clear purpose
  
- [ ] **Validation & Error Handling:**
  - Submit empty form; errors appear and are keyboard-accessible
  - Fix errors and re-submit; success message appears
  - Confirm error messages are read by screen reader

- [ ] **Responsive Keyboard:** Test on mobile-sized viewports
  - Keyboard navigation works with on-screen keyboard
  - Touch targets remain >= 44x44px
  - Modals close with Escape key on mobile

---

## VII. Success Criteria & Exit Conditions

### VII.1 AC-01: Keyboard Navigation Expectations Defined

**Evidence Required:**
- This plan document defines keyboard patterns for all target workflows (Section I)
- Specific shortcuts listed for admin and review workflows (Section I.3)
- Tab order and escape behavior documented for each control type (Section I.2)

**Pass Criteria:** Reviewer can read Section I of this plan and understand exactly how to navigate each workflow with keyboard only.

### VII.2 AC-02: Accessibility Semantics Requirements Documented

**Evidence Required:**
- Section II defines semantic requirements for landmarks, headings, forms, and controls
- Section V.1–V.5 specifies accessibility requirements for each screen category
- Implementation checklist shows checkbox-ready requirements

**Pass Criteria:** Developer can reference Section V checklist and implement accessibility correctly without guessing.

### VII.3 AC-03: Focus Lifecycle Requirements Documented

**Evidence Required:**
- Section III.1 defines initial focus placement for each interaction type
- Section III.2 defines focus trap vs. focus escape behavior
- Section V.1–V.5 includes focus requirements for each screen

**Pass Criteria:** Developer can implement focus management correctly by following rules in III.1–III.2 and applying to screen-specific context.

### VII.4 AC-04: Verification Plan With Deterministic Tests

**Evidence Required:**
- Section VI defines test categories and minimum coverage (VI.1)
- Section VI.2 lists specific manual verification steps
- Test commands are provided in test file comments and CI integration (see Test Files section below)

**Pass Criteria:** QA can run deterministic keyboard and screen reader tests following VI.2 steps in 30–45 minutes per screen.

### VII.5 AC-05: Exit Conditions Specific and Unambiguous

**Evidence Required:**
- Clear checklist in V.1–V.5 for each screen type
- Test coverage requirements in VI.1 are quantified
- Manual verification checklist VI.2 has binary pass/fail items
- This document is the plan source of truth; no ad hoc changes without Phase 5 lead approval

**Pass Criteria:** Part 01 closure requires all V.1–V.5 checklists checked AND all VI tests passing AND manual verification in VI.2 complete.

---

## VIII. Dependencies & Assumptions

- **Web UI exists** for target screens: admin entity list/CRUD, review inbox, proposal review, comments
- **Focus management library available** or will be implemented as part of Part 01 code work
- **Live region support** available via aria-live in React/application framework
- **Testing harness supports** keyboard event simulation and DOM inspection
- **Screen reader testing** done manually (NVDA or VoiceOver); not automated at this phase

---

## IX. Schedule & Sequencing

**Part 01 Execution:**
1. Plan completion: ✓ (This document)
2. Test file creation: Baseline tests created with Part 01 closure
3. Code implementation: Part 01 code PR follows test framework
4. Verification: VI.1 automated tests + VI.2 manual checks before Part 01 close
5. Part 02 unblocks: After Part 01 verification gate passes

**Estimated effort:** 
- Planning/Documentation: Included (Week 1)
- Test framework setup: 2–3 days
- Code implementation: 1–2 weeks (parallelizable by screen type)
- Verification & refinement: 3–5 days

---

## X. Future Phases (Out of Scope)

- **Part 02:** Usability polish, readability improvements, workflow friction reduction
- **Part 03:** Feedback integration, Phase 5 verification gate, release preparation
- Post-Phase 5: Advanced accessibility features (voice control, sound-based navigation, etc.)

---

## References

- [WCAG 2.1 AA Standards](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Keyboard Accessibility](https://webaim.org/articles/keyboard/)
