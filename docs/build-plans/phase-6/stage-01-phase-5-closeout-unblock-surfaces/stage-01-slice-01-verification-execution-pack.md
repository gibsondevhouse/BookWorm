# Stage 01 Slice 01: Verification Execution Pack

## Scope and Intent

This execution pack operationalizes the Phase 5 closeout exception for deferred manual verification inputs while preserving the same deferred-risk model documented at closeout.

- in scope: reviewer role model, evidence schema, surface order, disposition rubric, and Stage 02 handoff format
- out of scope: recording manual run outcomes, changing stage/phase status, or closing deferred-risk items

## Reviewer Role Roster

| Role ID   | Role Name              | Responsibility                                                                                           | Required for Run Type |
| --------- | ---------------------- | -------------------------------------------------------------------------------------------------------- | --------------------- |
| R-UX-01   | UX Reviewer            | Executes visual/usability review and records findings per surface                                        | Visual/Usability      |
| R-A11Y-01 | Accessibility Reviewer | Executes assistive-technology regression and records findings per surface                                | Assistive-Technology  |
| R-QA-01   | Verification Recorder  | Confirms evidence fields are complete and normalized before disposition review                           | Both                  |
| R-PL-01   | Phase Lead Approver    | Reviews dispositions, confirms owners/due dates for deferred items, and approves Stage 02 handoff packet | Both                  |

## P1 Surface Registry and Required Review Sequence

Run reviews in the exact order below by workflow criticality.

1. Review Inbox
2. Proposal Review Dialog
3. Admin Entity List
4. Edit Entity Dialog

| Surface ID | Surface Name           | Workflow Criticality                 | Required Run Types                     |
| ---------- | ---------------------- | ------------------------------------ | -------------------------------------- |
| S-P1-01    | Review Inbox           | Queue intake and throughput gate     | Visual/Usability, Assistive-Technology |
| S-P1-02    | Proposal Review Dialog | Approval/rejection decision gate     | Visual/Usability, Assistive-Technology |
| S-P1-03    | Admin Entity List      | Editorial discovery and routing gate | Visual/Usability, Assistive-Technology |
| S-P1-04    | Edit Entity Dialog     | Authoring and save-quality gate      | Visual/Usability, Assistive-Technology |

## Verification Evidence Schema

Each recorded run must include every field below.

| Field              | Type     | Required    | Description                                                  |
| ------------------ | -------- | ----------- | ------------------------------------------------------------ |
| `surfaceId`        | string   | yes         | One of: `S-P1-01`, `S-P1-02`, `S-P1-03`, `S-P1-04`           |
| `surfaceName`      | string   | yes         | Canonical surface name from the registry                     |
| `runType`          | enum     | yes         | `visual-usability` or `assistive-technology`                 |
| `reviewerRoleId`   | string   | yes         | `R-UX-01` or `R-A11Y-01` based on run type                   |
| `reviewerName`     | string   | yes         | Human reviewer performing the run                            |
| `reviewDate`       | ISO date | yes         | Date the run was executed                                    |
| `method`           | string   | yes         | Review method and tools used                                 |
| `passBlockStatus`  | enum     | yes         | `pass` or `block`                                            |
| `findingsSummary`  | string   | yes         | Concise findings narrative scoped to the surface             |
| `artifactLinks`    | string[] | yes         | Screenshots, notes, or recordings used as evidence           |
| `disposition`      | enum     | yes         | `pass`, `fix-now`, or `defer-with-owner`                     |
| `dispositionOwner` | string   | conditional | Required when disposition is `fix-now` or `defer-with-owner` |
| `targetSlice`      | string   | conditional | Required when disposition is `fix-now` or `defer-with-owner` |
| `dueDate`          | ISO date | conditional | Required when disposition is `fix-now` or `defer-with-owner` |

Normalization rules:

- keep one evidence record per surface per run type (expected total: 8 records)
- records marked `block` must not use disposition `pass`
- every `defer-with-owner` record must preserve deferred-risk rationale and include explicit owner and due date

## Disposition Rubric

| Disposition        | Use When                                                                                              | Required Follow-Up                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `pass`             | No material issue found; surface meets intended visual/usability or assistive-technology expectations | Include evidence links; no remediation slice required     |
| `fix-now`          | Defect should be remediated before Stage 02 styling expansion begins                                  | Link a named remediation slice and owner with due date    |
| `defer-with-owner` | Work is intentionally deferred under explicit risk acceptance                                         | Record rationale, named owner, due date, and target slice |

## Stage 02 Handoff Contract

All Slice 01 and Slice 02 outputs must hand off into Stage 02 using the fields below.

| Field                   | Required | Description                                                                 |
| ----------------------- | -------- | --------------------------------------------------------------------------- |
| `handoffDate`           | yes      | Date handoff packet was finalized                                           |
| `phase`                 | yes      | Must equal `Phase 6`                                                        |
| `stage`                 | yes      | Must equal `Stage 01`                                                       |
| `sourceSlice`           | yes      | Must equal `Stage-01-Slice-01`, `Stage-01-Slice-02`, or `Stage-01-Slice-03` |
| `surfaceCoverage`       | yes      | Summary confirming all 4 P1 surfaces were included                          |
| `recordCount`           | yes      | Count of normalized evidence records                                        |
| `fixNowItems`           | yes      | List of `fix-now` records with target slices                                |
| `deferredItems`         | yes      | List of `defer-with-owner` records with owner and due date                  |
| `stage02DecisionInputs` | yes      | Styling foundation implications derived from findings                       |

## Slice 01 Acceptance Mapping

| Slice 01 Acceptance Check                    | Execution Pack Coverage                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Stage 01 checklist format approved           | Checklist row contract and field schema are defined in this pack and the checklist template artifact |
| Reviewer roster and evidence schema approved | Reviewer Role Roster and Verification Evidence Schema sections provide canonical definitions         |
| Sequencing and handoff rules approved        | Required Review Sequence and Stage 02 Handoff Contract sections define order and payload             |
