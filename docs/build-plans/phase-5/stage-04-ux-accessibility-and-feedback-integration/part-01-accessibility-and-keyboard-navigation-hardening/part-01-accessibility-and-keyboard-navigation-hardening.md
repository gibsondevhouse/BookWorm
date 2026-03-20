# Part 01: Accessibility and Keyboard Navigation Hardening

## Objective

Define the first Stage 04 execution slice to harden accessibility semantics and keyboard navigation reliability across the highest-frequency admin and review workflows.

## Scope

In scope for this part:

- keyboard-only navigation coverage across core admin and review journeys
- semantic structure and labeling hardening for interactive controls and form surfaces
- focus management standards for dialogs, route transitions, and validation states
- accessibility baseline verification plan tied to existing workflow-critical screens

Out of scope for this part:

- broad visual redesign unrelated to accessibility or keyboard operation
- new product features outside UX hardening requirements
- post-Part 01 usability polish targeted for Part 02

## Work To Be Done

- implement keyboard interaction expectations across P1 workflow screens
- apply accessibility hardening for landmarks, heading hierarchy, labels, and assistive text
- implement focus order and focus-trap behavior for modal and inline editing patterns
- implement deterministic validation/error behavior for discoverable failure states
- replace placeholder test framework with deterministic acceptance coverage and capture closeout evidence

## Deliverables

- ✓ [Accessibility Hardening Plan](accessibility-hardening-plan.md) — Comprehensive specification of keyboard navigation, semantic markup, focus management, and error handling patterns for all Part 01 target workflows
- ✓ [Screen Priority Matrix](screen-priority-matrix.md) — P1/P2/P3 prioritization of admin and review screens with specific hardening targets and gap analysis
- ✓ [Acceptance Checklist](acceptance-checklist.md) — Detailed AC-01 through AC-05 verification evidence mapping, exit criteria, and closure sign-off template
- ✓ Deterministic Acceptance Suite: `tests/phase5AccessibilityKeyboardNavigationPart01.test.ts` — deterministic assertions for keyboard shortcuts, list/focus mechanics, semantics, validation behavior, and P1 surface existence
- ✓ Admin/Review UI hardening across P1 surfaces under `apps/web/src/app/admin/**`
- ✓ Shared keyboard utility at `apps/web/src/app/admin/_lib/accessibilityKeyboard.ts`
- ✓ Shared accessibility style module at `apps/web/src/app/admin/adminAccessibility.module.css`

## Dependencies

- Phase 5 Stage 03 complete
- existing admin and review surfaces from Phases 2 through 4 available as hardening targets
- existing test harness and lint/type-check gates available for regression validation

## Acceptance Criteria

- AC-01: keyboard navigation expectations are explicitly defined for all Part 01 target flows
- AC-02: accessibility semantics requirements are documented for controls, forms, and landmarks in target screens
- AC-03: focus lifecycle requirements are documented for modal, transition, and error states
- AC-04: verification plan includes deterministic test commands and manual checks for keyboard-only operation
- AC-05: Part 01 exit conditions are specific enough to gate Stage 04 progress without ad hoc interpretation

## Validation Commands

- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase5AccessibilityKeyboardNavigationPart01.test.ts`
- `pnpm lint`
- `pnpm type-check`

## Planning Artifacts Overview

### 1. Accessibility Hardening Plan (`accessibility-hardening-plan.md`)

**Scope:** Comprehensive specification document covering keyboard navigation, semantic markup, focus management, and error handling.

**Contents:**
- Section I: Keyboard Navigation Expectations (Tab/Arrow/Escape/Alt patterns for forms, lists, dialogs, dropdowns, trees)
- Section II: Accessibility Semantics Requirements (landmarks, heading hierarchy, form labeling, ARIA roles, content relationships)
- Section III: Focus Management Requirements (initial focus, traps vs. escapes, visibility)
- Section IV: Error State & Validation Messaging (discoverability, required fields, live regions)
- Section V: Implementation Checklist by Screen Category (P1 screens: Admin Entity List, Edit Dialog, Review Inbox, Proposal Review)
- Section VI: Test Strategy & Verification Plan (automated test categories, manual verification checklist)
- Section VII: Success Criteria & Exit Conditions (AC-01 through AC-05 mapping)

**Audience:** Developers implementing Part 01 code; QA executing manual verification; Phase Lead validating completeness.

### 2. Screen Priority Matrix (`screen-priority-matrix.md`)

**Scope:** Prioritization framework for selecting and sequencing hardening targets.

**Contents:**
- Priority Matrix table: 10 admin/review screens prioritized by frequency, complexity, impact, dependency, risk
- P1 (Daily Use): Review Inbox, Proposal Review Dialog, Admin Entity List, Edit Entity Dialog
- P2 (Weekly Use): Comment Thread, Approval Chain Editor, Release/Manuscript List
- P3 (Monthly Use): Revision Timeline, Relationship Editor, Metadata Config
- Detailed P1 Screen Specifications: Current gaps, hardening requirements, verification steps
- Success Criteria: Keyboard-only test, screen reader test, automated test suite, focus indicator, linting

**Audience:** Project manager/Phase Lead for prioritization; developers to understand which screens are P1 targets; QA to understand verification scope.

### 3. Acceptance Checklist (`acceptance-checklist.md`)

**Scope:** Detailed evidence mapping for all five acceptance criteria (AC-01 through AC-05).

**Contents:**
- AC-01 Evidence: Keyboard navigation expectations documented (Plan I.1–I.3 with explicit tab/arrow/escape/alt patterns)
- AC-02 Evidence: Accessibility semantics requirements documented (Plan II.1–II.5 + V.1–V.5 with landmark, heading, label, ARIA, content relationship specs)
- AC-03 Evidence: Focus lifecycle documented (Plan III.1–III.3 with initial focus, traps/escapes, visibility requirements)
- AC-04 Evidence: Verification plan with deterministic tests (Plan VI.1 test categories + VI.2 manual checklist with specific steps)
- AC-05 Evidence: Exit conditions specific & unambiguous (5-item closure checklist covering docs, design, tests, code, breaks)
- Review & Sign-Off: Spaces for Phase Lead, Dev Lead, Accessibility Specialist approval
- Execution Status: Tracking table for planning/code/verification/doc update progress

**Audience:** QA/Phase Lead for verification gate; developers for clear exit criteria; anyone auditing Part 01 completeness.

### 4. Test Framework (`tests/phase5AccessibilityKeyboardNavigationPart01.test.ts`)

**Scope:** Baseline test structure and manual verification checklist.

**Contents:**
- Test suite organized by AC criteria (AC-01 Keyboard Navigation, AC-02 Semantics, AC-03 Focus, AC-04 Verification, AC-05 Exit Conditions)
- 40+ test placeholders for keyboard navigation, focus management, ARIA, validation, and manual verification
- Manual Verification Section (VI.2): Step-by-step instructions for keyboard-only testing and screen reader testing on each P1 screen
- Detailed comment documentation: Each test includes SPEC, EXPECTED, and IMPLEMENTATION guidance
- Validation Commands: Executable commands for test execution and regression checks

**Audience:** Developers during code phase (fill in placeholders); QA during manual verification (follow VI.2 steps); CI/CD for test execution.

---

## Part 01 Execution Summary

This part is complete. Accessibility and keyboard hardening was implemented across P1 admin/review workflows, backed by deterministic acceptance tests and standard quality gates.

### Evidence of AC Criteria Met

| AC | Evidence | Status |
|---|---|---|
| AC-01 | Keyboard shortcuts and list/focus mechanics implemented and asserted in `tests/phase5AccessibilityKeyboardNavigationPart01.test.ts` | ✓ |
| AC-02 | Semantic structure and ARIA coverage implemented across Review Inbox, Proposal Review, Entity List, and Edit Entity surfaces | ✓ |
| AC-03 | Focus lifecycle behavior implemented and asserted for modal surfaces plus shared focus-visible styling | ✓ |
| AC-04 | Deterministic suite and required gate commands executed successfully | ✓ |
| AC-05 | Tracker/stage/phase docs updated and Part 01 completion evidence recorded | ✓ |

### Execution Outcomes

- ✓ Accessibility/keyboard hardening implemented across P1 admin/review UI surfaces
- ✓ Shared keyboard and validation utility added for consistent deterministic behavior
- ✓ Shared accessibility CSS module added for focus treatment and semantic UI support
- ✓ Placeholder framework replaced with deterministic acceptance tests
- ✓ Validation commands passed (`tsx --test`, lint, type-check)
- Residual: manual assistive-technology verification/sign-off remains human-run
- Next ordered slice: Stage 04 Part 02 (Admin Usability and Readability Improvements)

---

User Approved: True  
Planning Phase: ✓ Complete (2026-03-20)  
Code Implementation: Complete [x]  
Verification & Testing: Complete [x]
