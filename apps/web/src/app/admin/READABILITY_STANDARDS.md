# Admin Readability Standards

This standard defines deterministic usability and readability patterns for Phase 5 Stage 04 Part 02 across P1 admin surfaces.

## Scope

Applies to these P1 screens:
- Review Inbox
- Proposal Review Dialog
- Admin Entity List
- Edit Entity Dialog

## Typography and Spacing Baseline

- Base content line height: 1.6 minimum
- Dense list/dialog content line height: 1.7 target
- Comfortable reading measure: 60-70 characters (max-width: 70ch)
- Section spacing between major groups: 24px equivalent (1.5rem)
- Form group spacing: 16px minimum (1rem)
- Table cell padding: 12px-16px equivalent (0.75rem 1rem)

## Status Indicators

Status indicators use pill badges with text labels and deterministic variants:
- Pending and in-review states: warm neutral treatment
- Escalated or blocked states: high-contrast error treatment
- Approved or published states: positive success treatment

Pattern requirements:
- Include visible text labels (never color-only meaning)
- Use consistent badge shape and font weight
- Keep status badges adjacent to title or row metadata for fast scan paths

## Affordance Patterns

Interactive controls must be easily discoverable and keyboard-visible.

Pattern requirements:
- 44px minimum control height for all key action buttons and inputs
- Distinct primary action treatment for highest-priority action
- Visible focus ring for keyboard navigation
- Predictable action placement in lists and dialogs
- Button labels must be verb-first and workflow-specific where possible

## Empty State Patterns

Empty states must reduce dead-end workflow outcomes.

Pattern requirements:
- Include concise heading that explains current state
- Include one-line explanation that suggests recovery
- Include at least one clear call to action
- Reuse the same visual container structure across P1 screens

## Error State Patterns

Validation and blocking errors must be impossible to miss.

Pattern requirements:
- Use a high-contrast error container for form-level summary
- Pair field-level messages with a visual error icon and text
- Keep error copy short and actionable
- Maintain aria-live and role semantics for assistive technologies

## Deterministic Verification Targets

These implementation targets are covered by tests in [tests/phase5AdminUsabilityReadabilityPart02.test.ts](../../../../../../tests/phase5AdminUsabilityReadabilityPart02.test.ts):
- line-height and measure classes are present in shared admin styles
- status badge and empty-state pattern classes are present
- P1 screen components consume hierarchy and affordance classes
- validation command inventory and manual checklist are captured
