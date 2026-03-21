# Phase 6 Stage 01 Slice 02 — P1 Surface Verification Prompt

**Use this prompt verbatim in ChatGPT (Atlas browser mode).**
Playing reviewer roles R-UX-01 and R-A11Y-01, you will navigate each of the four P1 admin surfaces,
evaluate them against the standards below, and return completed evidence records in the exact output format.

---

## Your Task

You are performing Phase 6 Stage 01 Slice 02 manual verification for the **BookWorm** admin application.

The app is running locally. Navigate each surface in order, evaluate it against the criteria below,
then produce the full completed output section at the end.

---

## App Entry Points

| Surface | URL |
| --- | --- |
| Review Inbox | http://localhost:3000/admin/review-inbox |
| Proposal Review Dialog | http://localhost:3000/admin/review — open any proposal to trigger the dialog |
| Admin Entity List | http://localhost:3000/admin/entities |
| Edit Entity Dialog | http://localhost:3000/admin/entities — open any entity's edit page |

---

## Reviewer Roles You Are Playing

| Role ID | Responsibility |
| --- | --- |
| R-UX-01 | Visual and usability review per surface |
| R-A11Y-01 | Assistive-technology and keyboard-navigation review per surface |

For each surface, produce **two evidence records**: one for `visual-usability` (R-UX-01) and one for `assistive-technology` (R-A11Y-01).

---

## Evaluation Criteria

### Visual / Usability (R-UX-01) — check all of the following per surface

**Typography and Spacing**
- Body content line height is at or above 1.6
- Dense list and dialog content line height is at or above 1.7
- Main content blocks are capped at 70ch width (readable measure)
- Section spacing between major groups is at least 24px equivalent
- Form group spacing is at least 16px minimum
- Table cell padding is at least 12–16px equivalent

**Status Indicators**
- Status pills/badges have visible text labels (color is never the only differentiator)
- Pending/in-review states use warm neutral treatment
- Escalated/blocked states use high-contrast error treatment
- Approved/published states use positive success treatment
- Badges sit adjacent to title or row metadata for fast scan paths

**Affordance and Controls**
- All primary action buttons and inputs are at least 44px tall
- Primary action is visually distinguished from secondary actions
- Visible focus ring appears on keyboard-focused elements
- Button labels are verb-first and workflow-specific

**Empty States**
- Empty state includes a clear heading that names the current state
- One-line explanation suggests a recovery path
- At least one call-to-action button or link is present
- Empty state container structure matches across P1 screens

**Error States**
- High-contrast error container exists for form-level validation summary
- Individual field errors include a visual error icon alongside the error text
- Error copy is short and actionable
- Error regions use `aria-live` or `role="alert"` semantics

**Overall Usability**
- Scan path is logical (most important info surfaces first)
- Action labels match the workflow context
- No dead-end states without recovery guidance

---

### Assistive Technology / Keyboard (R-A11Y-01) — check all of the following per surface

**Keyboard Navigation**
- Tab order follows visual reading order
- All interactive elements are reachable by keyboard alone
- No focus traps (unless inside a modal — modal focus trap is required and correct)
- Escape key closes dialogs and returns focus to trigger element

**Focus Visibility**
- Visible focus ring is present on every interactive element when focused
- Focus ring meets sufficient contrast (not invisible or extremely thin)

**Semantic Markup**
- Headings are present and in logical hierarchy (h1 → h2 → h3, no skips)
- Lists use `<ul>` / `<ol>` / `<li>` where content is a list
- Dialogs use `role="dialog"` and `aria-modal="true"`
- Buttons use `<button>` elements (not divs or spans)

**Screen Reader Cues**
- Status badges have text labels (not just visual color)
- Icon-only buttons have `aria-label`
- Form inputs have associated `<label>` elements or `aria-label`
- Error messages are associated with their field via `aria-describedby`
- Live regions (`aria-live` or `role="alert"`) are present where content changes dynamically

**Overall Accessibility**
- No content that requires mouse hover to access critical information
- Loading/empty states have appropriate text for screen readers

---

## Severity Guide (for your findings log)

| Severity | Use When |
| --- | --- |
| P0 | Accessibility, policy, or release-safety blocker |
| P1 | High-friction usability blocker |
| P2 | Quality-of-life improvement that does not block Stage 02 |

---

## Disposition Guide

| Disposition | Use When |
| --- | --- |
| `pass` | No material issue; surface meets expectations |
| `fix-now` | Defect should be fixed before Stage 02 styling expansion begins |
| `defer-with-owner` | Intentionally deferred under explicit risk acceptance — name owner and due date |

---

## Required Output Format

Return all three sections below in this exact markdown structure.
Do not omit any row or field. Use `—` for fields that are not applicable.

---

### SECTION A — Completed Unblock Checklist (8 rows)

```
| Sequence | Surface ID | Surface Name | Run Type | Reviewer Role ID | Reviewer Name | Review Date | Method | Pass/Block | Findings Summary | Artifact Links | Disposition | Owner (if not pass) | Target Slice (if not pass) | Due Date (if not pass) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | S-P1-01 | Review Inbox | visual-usability | R-UX-01 | [your name] | [today] | Atlas browser visual inspection | [pass/block] | [summary] | [screenshots or "none attached"] | [disposition] | [owner or —] | [slice or —] | [date or —] |
| 1 | S-P1-01 | Review Inbox | assistive-technology | R-A11Y-01 | [your name] | [today] | Atlas browser DOM + keyboard walkthrough | [pass/block] | [summary] | [screenshots or "none attached"] | [disposition] | [owner or —] | [slice or —] | [date or —] |
| 2 | S-P1-02 | Proposal Review Dialog | visual-usability | R-UX-01 | … | … | … | … | … | … | … | … | … | … |
| 2 | S-P1-02 | Proposal Review Dialog | assistive-technology | R-A11Y-01 | … | … | … | … | … | … | … | … | … | … |
| 3 | S-P1-03 | Admin Entity List | visual-usability | R-UX-01 | … | … | … | … | … | … | … | … | … | … |
| 3 | S-P1-03 | Admin Entity List | assistive-technology | R-A11Y-01 | … | … | … | … | … | … | … | … | … | … |
| 4 | S-P1-04 | Edit Entity Dialog | visual-usability | R-UX-01 | … | … | … | … | … | … | … | … | … | … |
| 4 | S-P1-04 | Edit Entity Dialog | assistive-technology | R-A11Y-01 | … | … | … | … | … | … | … | … | … | … |
```

---

### SECTION B — Findings Log

List every individual finding. If a surface has no findings, write one row with severity blank and disposition `pass`.

```
| Finding ID | Surface ID | Run Type | Severity | Summary | Disposition | Owner | Target Slice | Due Date | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FND-001 | S-P1-01 | visual-usability | [P0/P1/P2 or —] | [one-line summary] | [pass/fix-now/defer-with-owner] | [name or —] | [slice or —] | [date or —] | [notes or —] |
```

---

### SECTION C — Stage 02 Handoff Summary

```
| Field | Value |
| --- | --- |
| handoffDate | [today's date] |
| phase | Phase 6 |
| stage | Stage 01 |
| sourceSlice | Stage-01-Slice-02 |
| surfaceCoverage | 4/4 P1 surfaces recorded |
| recordCount | [total evidence records, should be 8] |
| fixNowItems | [list fix-now items or "none"] |
| deferredItems | [list defer-with-owner items with owner and due date, or "none"] |
| stage02DecisionInputs | [any styling foundation implications derived from findings; or "no blocking findings — Stage 02 may proceed with standard token and typography work"] |
```

---

## Completion Rules

- Every checklist row must include reviewer name, review date, method, and findings summary — no empty cells.
- Rows marked `block` must not have disposition `pass`.
- Every non-pass disposition must include owner, target slice, and due date.
- Section C must reflect all `fix-now` and `defer-with-owner` items from Section B.
- If no issues are found on a surface, write `pass` for both the checklist row and the findings log row for that surface.

---

*Prompt source: `docs/build-plans/frontend-dev/prompts/phase6-stage01-slice02-p1-surface-verification.md`*
*Slice: Phase 6 Stage 01 Slice 02 — Run and Record Manual Verification Outcomes*
