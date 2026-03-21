# Usability Improvement Matrix: Part 02 Screen Prioritization

## Purpose

Identify P1, P2, and P3 admin/review surfaces and define specific readability and usability improvements for each priority tier.

---

## Priority Matrix

| Screen                  | Frequency | Readability Debt | Workflow Impact | Complexity | Priority |
| ----------------------- | --------- | ---------------- | --------------- | ---------- | -------- |
| Review Inbox            | Daily     | High             | Critical        | Medium     | **P1**   |
| Proposal Review Dialog  | Daily     | High             | Critical        | High       | **P1**   |
| Admin Entity List       | Daily     | Medium           | High            | Medium     | **P1**   |
| Edit Entity Dialog      | Daily     | High             | High            | High       | **P1**   |
| Comment Thread          | Weekly    | Medium           | Medium          | Low        | P2       |
| Release/Manuscript List | Weekly    | Medium           | Medium          | Medium     | P2       |
| Approval Chain View     | Weekly    | Medium           | Medium          | Medium     | P2       |
| Revision Timeline       | Monthly   | Low              | Low             | High       | P3       |

---

## P1 Screen Improvement Specifications

### 1. Review Inbox

**Current Readability Gaps:**

- Dense table layout with poor visual grouping between inbox items
- Status badge styles not distinct enough for quick scanning
- No clear affordance for item actions (review, approve, reject)
- Excessive text wrapping due to narrow measure in list column

**Targets:**

- Increase line height on list items from 1.4 to 1.6–1.8 for breathing room
- Implement consistent visual hierarchy: priority level (color + icon) → date → status → action
- Add primary/secondary action buttons with high contrast affordances
- Expand measure of item descriptions to 60–70 characters per line
- Implement status badge styles with distinct color and icon treatment

**Hard Metrics:**

- Line height: baseline 1.4 → target 1.6–1.8
- Measure: basline 40–45 chars → target 60–70 chars on item list
- Spacing: add consistent vertical padding (12px–16px) around list items

**Verification:**

- [ ] Manual visual review: line height and spacing appear balanced
- [ ] Manual test: Status badges are immediately recognizable
- [ ] Manual test: Action affordances (buttons) trigger expected workflows
- [ ] Deterministic test: CSS classes and computed styles match target metrics

### 2. Proposal Review Dialog

**Current Readability Gaps:**

- Complex multi-section layout (proposal overview, change details, comments) causes cognitive overload
- Too many interactive elements compete for attention
- Comment threads buried in tabs or subsidiary panels
- Unclear hierarchy between "read-only proposal details" and "actionable review decisions"

**Targets:**

- Increase font size for proposal title and key metadata (16px → 18px or 20px)
- Use visual grouping (cards, borders, background colors) to separate proposal details from review actions
- Promote primary actions (Approve/Reject/Needs Revisions) with clear affordances
- Implement tabbed or accordion structure with clearer section labels
- Add whitespace (padding, margins) to reduce visual density
- Ensure change details table has sufficient line height and column measure

**Hard Metrics:**

- Proposal title: 16px → 20px font size
- Section spacing: add 24px–32px margin between grouped sections
- Action buttons: increase clickable area to 44px minimum height
- Change details table: line height 1.5 → 1.7–1.8

**Verification:**

- [ ] Manual visual review: hierarchy between details and actions is clear
- [ ] Manual test: Tab/accordion navigation is intuitive and reduces cognitive load
- [ ] Manual test: Action buttons are discoverable and high-contrast
- [ ] Deterministic test: Font sizes, margins, button dimensions match targets

### 3. Admin Entity List

**Current Readability Gaps:**

- Table columns are narrow and text truncates without affordance
- No visual distinction between entity types or statuses
- Bulk action checkboxes not clearly grouped
- Empty state messaging is minimal or absent

**Targets:**

- Increase table row height and line height for better scanning
- Implement ellipsis tooltips or column expansion for truncated text
- Add visual indicators (icons, color coding) for entity types and statuses
- Improve checkbox layout with clear grouping and labeling
- Add empty state with clear call-to-action for first-time users
- Ensure sort/filter controls are discoverable with clear affordances

**Hard Metrics:**

- Row height: baseline 40px → target 48px–56px
- Line height in cells: 1.4 → 1.6
- Cell padding: 8px → 12px–16px
- Empty state: add full-page template with icons, heading, and action button

**Verification:**

- [ ] Manual visual review: table rows have sufficient breathing room
- [ ] Manual test: Entity type/status indicators are visually distinct
- [ ] Manual test: Empty state is discoverable and actionable
- [ ] Deterministic test: Row height and padding metrics validated

### 4. Edit Entity Dialog

**Current Readability Gaps:**

- Form fields densely packed with poor visual separation
- Labels and inputs could have better alignment and sizing
- Validation errors are small and easy to miss
- No clear section hierarchy in multi-section forms
- Actions (Save/Cancel) could be more prominent

**Targets:**

- Increase spacing between form field groups (20px → 32px)
- Improve label typography (font weight, size) to stand out from input
- Increase input field height (32px → 40px–44px) for clarity and touch target
- Implement section dividers or styling to separate form groups
- Implement validation error styling with icons and higher contrast
- Expand action button sizing and positioning for prominence

**Hard Metrics:**

- Inter-field spacing: 20px → 32px
- Label font size: 14px → 14–15px with font-weight 600
- Input height: 32px → 40px
- Error message styling: add icon, color, and animated appearance
- Action button area: 40px minimum height, 16px–24px horizontal padding

**Verification:**

- [ ] Manual visual review: form sections are clearly separated and readable
- [ ] Manual test: Input fields have adequate touch targets and are accessible
- [ ] Manual test: Validation errors are immediately visible and understandable
- [ ] Deterministic test: CSS metrics and ARIA attributes validated

---

## Expected Improvements Impact

| Improvement Category  | Expected Outcome                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Readability**       | Users can scan and parse admin screens in 30% less time; text wrapping reduced by 40%                      |
| **Cognitive Load**    | High-priority actions become discoverable without tooltips or help text                                    |
| **Accessibility**     | Improved contrast and affordance visibility support users with low vision; touch targets meet 44px minimum |
| **Workflow Friction** | Fewer clicks to complete review/approval workflows due to clearer affordances                              |
| **Error Recovery**    | Validation errors are impossible to miss; supported by visual emphasis and live feedback                   |

---

## Verification Checklist

### Typography & Spacing

- [ ] Line heights validated across P1 screens (1.6–1.8 baseline)
- [ ] Text measure complies with 60–70 character guidelines
- [ ] Font sizes follow hierarchy (title > section > detail)
- [ ] Spacing metrics are consistent across screens

### Visual Hierarchy & Affordances

- [ ] Status indicators are immediately recognizable
- [ ] Action buttons have high-contrast affordances (≥4.5:1 contrast ratio)
- [ ] Empty states provide clear call-to-action
- [ ] Form validation errors are prominent and understandable

### Cognitive Load Reduction

- [ ] Multi-section layouts use visual grouping to reduce overload
- [ ] Unnecessary UI elements are removed or deprioritized
- [ ] Information density is reduced without sacrificing functionality

### Workflow Friction Reduction

- [ ] High-frequency actions require fewer clicks
- [ ] Accessibility shortcuts (keyboard, voice) work as designed
- [ ] Error states guide users toward recovery without ambiguity

---

## Out of Scope

- Broad design system overhaul
- New accessibility features (completed in Part 01)
- Feature requests or product enhancements beyond usability improvements
- Responsive design breakpoints not affecting P1 admin surfaces

---

## Success Criteria

**Part 02 exit gates require evidence that:**

1. All P1 screens meet typography and spacing targets (documented in acceptance-checklist.md AC-01 & AC-02)
2. Visual hierarchy and affordances are validated through manual review and deterministic tests (AC-03)
3. Usability assessment confirms reduction in time-to-action and cognitive load (AC-04)
4. All changes are validated by `pnpm lint`, `pnpm type-check`, and deterministic test suite
5. No regressions in accessibility, keyboard navigation, or role-based access controls
