# Feedback Priority and Phase 5 Gate Matrix

## Purpose

This matrix defines which feedback inputs are allowed to shape Stage 04 Part 03, how they should be prioritized, and how each accepted class of change maps to the Phase 5 verification gate.

## Prioritization Rules

| Priority | Definition                                                                                                | Part 03 Disposition Rule                                           |
| -------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| P0       | Accessibility, release-safety, policy-safety, or editorial-throughput blocker on a P1 Stage 04 surface    | Must be fixed or explicitly block closeout                         |
| P1       | High-friction usability issue or confusing guidance on a P1 Stage 04 surface with low implementation risk | Fix in Part 03 if bounded and regression-safe                      |
| P2       | Useful quality-of-life improvement that is non-blocking or drifts into broader redesign/feature work      | Defer to v1 unless implementation is nearly free and fully covered |

## Feedback Source Inventory

| Source                                                                    | Repository Evidence                                                                   | Impacted Area                                                               | Priority Floor | Part 03 Handling                                                           | Gate Blocking                      |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------- | ---------------------------------- |
| Carried-forward assistive-technology regression sign-off                  | Part 01 and Part 02 closeout docs record this as pending human-run work               | Review Inbox, Proposal Review Dialog, Admin Entity List, Edit Entity Dialog | P0             | Required input; no closeout without named reviewer result                  | Yes                                |
| Carried-forward visual/usability review                                   | Part 02 closeout checklist records this as pending human-run work                     | Review Inbox, Proposal Review Dialog, Admin Entity List, Edit Entity Dialog | P0             | Required input; convert findings into fix-now or defer decisions           | Yes                                |
| Issue tracker bug reports                                                 | Beta phased plan calls out issue trackers as a feedback source                        | Stage 04 P1 surfaces and related workflow guidance                          | P0 or P1       | Accept only if they fit existing admin/review architecture                 | Sometimes                          |
| Survey/interview workflow friction notes                                  | Beta phased plan calls out surveys and interviews as feedback sources                 | Stage 04 P1 surfaces and editor/operator guidance                           | P1             | Accept if concrete, reproducible, and bounded                              | No, unless it reveals a P0 blocker |
| Tester questions about labels, help text, empty states, and workflow cues | Beta feature set and exit gate require feedback-driven QoL/documentation improvements | UI copy, inline guidance, related docs for Stage 04 flows                   | P1 or P2       | Fix in Part 03 only when it improves current flows without expanding scope | No                                 |
| Net-new feature requests or redesign asks                                 | Not supported by Stage 04 scope; belongs to later planning                            | Cross-cutting architecture or v1 polish                                     | P2             | Defer to v1 with rationale                                                 | No                                 |

## Surface Priority Matrix

| Surface                | Why It Stays In Scope                            | Typical Feedback Classes Allowed In Part 03                                          | Required Regression Coverage                                                                                                                                                     |
| ---------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Review Inbox           | P1 daily workflow surface in Part 01 and Part 02 | discoverability, information hierarchy, state clarity, keyboard/a11y regressions     | `phase5AccessibilityKeyboardNavigationPart01`, `phase5AdminUsabilityReadabilityPart02`, `phase4DeliveryPreferencesReviewInboxPart02`, `phase4ApproverAssignmentQueueViewsPart02` |
| Proposal Review Dialog | P1 daily workflow surface in Part 01 and Part 02 | action clarity, decision-note affordance, focus/semantics regressions                | `phase5AccessibilityKeyboardNavigationPart01`, `phase5AdminUsabilityReadabilityPart02`, `phase4PolicyDrivenApplicationGatesPart03`                                               |
| Admin Entity List      | P1 daily workflow surface in Part 01 and Part 02 | row hierarchy, search/filter clarity, empty-state clarity, keyboard/a11y regressions | `phase5AccessibilityKeyboardNavigationPart01`, `phase5AdminUsabilityReadabilityPart02`, `phase2AdminEntityCrudSlice`                                                             |
| Edit Entity Dialog     | P1 daily workflow surface in Part 01 and Part 02 | field grouping, validation clarity, error affordance, focus/semantics regressions    | `phase5AccessibilityKeyboardNavigationPart01`, `phase5AdminUsabilityReadabilityPart02`, `phase2AdminEntityCrudSlice`                                                             |

## Verification Coverage Matrix

| Gate Area                   | Risk Being Rechecked In Part 03                                                          | Deterministic Evidence Required                                                                     | Manual Evidence Required                                   |
| --------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Stage 04 UX / accessibility | feedback fixes regress focus, semantics, readability, or workflow clarity on P1 surfaces | Stage 04 commands listed in the main part doc and checklist                                         | visual/usability review plus assistive-technology sign-off |
| Search                      | unrelated Phase 5 search tuning contracts regress while Part 03 changes merge            | Stage 01 Phase 5 suites plus `phase2SearchApiSlice`                                                 | None                                                       |
| Continuity                  | unrelated continuity triage/suppression behavior regresses while Part 03 changes merge   | Stage 02 Phase 5 suites plus `phase2ContinuityIssueBaseline`                                        | None                                                       |
| Portability                 | unrelated portability behavior regresses while Part 03 changes merge                     | Stage 03 Phase 5 suites plus Phase 2 portability baselines and Phase 4 audit portability regression | None                                                       |
| Global quality              | general type/style regressions enter during hardening                                    | `pnpm lint`, `pnpm type-check`                                                                      | None                                                       |

## Deferred-Item Rules

- Any deferred item must include a short rationale, target horizon (`v1` or later), and named owner.
- A deferred item cannot hide a P0 accessibility or workflow blocker.
- Manual review findings that reveal policy or release-safety risk must be escalated from Stage 04 feedback work into a blocker for Phase 5 closeout.

## Ready-State Summary

- Feedback sources are now explicit.
- Priority rules are now explicit.
- Gate coverage mapping is now explicit.
- Execution evidence remains pending until Part 03 delivery begins.
