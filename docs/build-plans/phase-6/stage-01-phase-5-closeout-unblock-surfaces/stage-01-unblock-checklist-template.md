# Stage 01 Unblock Checklist Template

Legacy note: retained for prior-scope audit traceability after Stage 01 was re-scoped to landing-page refactor delivery.

Use this template to record Stage 01 manual verification outcomes for the four P1 surfaces.

## Checklist Record Metadata

| Field             | Value             |
| ----------------- | ----------------- |
| Checklist Version | v1                |
| Phase             | Phase 6           |
| Stage             | Stage 01          |
| Source Slice      | Stage-01-Slice-01 |
| Recorder Role     | R-QA-01           |

## Surface Verification Rows

Create one row per surface per run type (8 rows total).

| Sequence | Surface ID | Surface Name           | Run Type             | Reviewer Role ID | Reviewer Name | Review Date | Method | Pass/Block | Findings Summary | Artifact Links | Disposition | Owner (if not pass) | Target Slice (if not pass) | Due Date (if not pass) |
| -------- | ---------- | ---------------------- | -------------------- | ---------------- | ------------- | ----------- | ------ | ---------- | ---------------- | -------------- | ----------- | ------------------- | -------------------------- | ---------------------- |
| 1        | S-P1-01    | Review Inbox           | visual-usability     | R-UX-01          |               |             |        |            |                  |                |             |                     |                            |                        |
| 1        | S-P1-01    | Review Inbox           | assistive-technology | R-A11Y-01        |               |             |        |            |                  |                |             |                     |                            |                        |
| 2        | S-P1-02    | Proposal Review Dialog | visual-usability     | R-UX-01          |               |             |        |            |                  |                |             |                     |                            |                        |
| 2        | S-P1-02    | Proposal Review Dialog | assistive-technology | R-A11Y-01        |               |             |        |            |                  |                |             |                     |                            |                        |
| 3        | S-P1-03    | Admin Entity List      | visual-usability     | R-UX-01          |               |             |        |            |                  |                |             |                     |                            |                        |
| 3        | S-P1-03    | Admin Entity List      | assistive-technology | R-A11Y-01        |               |             |        |            |                  |                |             |                     |                            |                        |
| 4        | S-P1-04    | Edit Entity Dialog     | visual-usability     | R-UX-01          |               |             |        |            |                  |                |             |                     |                            |                        |
| 4        | S-P1-04    | Edit Entity Dialog     | assistive-technology | R-A11Y-01        |               |             |        |            |                  |                |             |                     |                            |                        |

## Completion Rules

- every row must include reviewer name, review date, method, and findings summary
- rows marked `block` must not be recorded as disposition `pass`
- every non-pass disposition must include owner, target slice, and due date
- unresolved blockers must be linked to a named Phase 6 remediation slice
- deferred items must retain explicit deferred-risk rationale, consistent with the Phase 5 closeout exception model
