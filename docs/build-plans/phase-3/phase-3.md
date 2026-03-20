# Phase 3

## Purpose

Phase 3 builds collaborative editing and release review foundations on top of the MVP authoring baseline from Phase 2. Its job is to introduce comment threads, change proposals, and editorial review workflows that enable multi-stakeholder content refinement and formalized review gates before release activation.

## Outcome

At the end of Phase 3, the project should have:

- comment and discussion threading enabled for all content types with nested reply support
- change proposal submission, admin review, and acceptance workflows for entity and manuscript changes
- editorial review application that converts accepted proposals into new revisions
- complete audit trails tracking proposal decisions and editorial applications
- role-based access controls for proposal submission, review, and application
- comprehensive test coverage for all collaboration workflow paths

## Scope

Phase 3 includes the minimum work needed to cross from a single-author editing model into a multi-stakeholder collaborative authoring baseline.

### Included

- comment thread foundations with nested replies and pagination
- change proposal system for create, update, and delete operations on content
- editorial review and proposal acceptance workflows
- proposal application to generate new revisions from accepted changes
- audit trail storage for all editorial decisions and applications
- role-based gating for proposal submission and editorial review actions
- verification artifacts that prove collaboration workflows preserve draft and release isolation

### Excluded

- formal review request workflows with explicit approver assignment
- approval chain enforcement and multi-stage sign-off requirements
- collaboration history dashboards and decision analytics surfaces
- comment notifications and alerting systems
- proposal template system or change request categorization
- advanced editorial policies, delegation, or escalation workflows

## Stage Breakdown

1. Stage 01: Collaboration and Review Workflows
2. Stage 02: Proposal Workflow Enhancement
3. Stage 03: Comment Structure and Feedback System
4. Stage 04: Content Comparison and Proposal Review Tools

## Exit Criteria

**Stage 01 (Implemented):**

- comment threading enabled for all entity and manuscript content types ✓
- nested replies work with pagination and edit history preserved ✓
- change proposals can be created, reviewed, and accepted through admin routes ✓
- accepted proposals can be applied to generate new revisions with full audit trail ✓
- role-based access control gates proposal submission and review to appropriate users ✓

**Stage 02 (Implemented):**

- proposal workflow states (DRAFT, SUBMITTED, IN_REVIEW, APPROVED, REJECTED, APPLIED, ARCHIVED) implemented ✓
- filtering and querying on proposals by state, date, content type, submitter ✓
- metrics endpoints for proposal counts by state and type ✓
- role-based visibility enforced (authors see their own, admins see all) ✓

**Stage 03 (Implemented):**

- comment types (GENERAL, QUESTION, SUGGESTION, CONCERN, RESOLVED) implemented ✓
- severity levels (INFO, MINOR, MAJOR) support workflow prioritization ✓
- feedback tags (SPELLING, FACTUAL, CONSISTENCY, CLARITY, TONE) guide editing ✓
- comment edit history preserved with versioning ✓
- comment state progression (ACTIVE, RESOLVED, ARCHIVED) for lifecycle management ✓

**Stage 04 (Implemented):**

- unified diff engine compares revisions and generates change records ✓
- proposal preview endpoints show final state after application ✓
- revision timeline displays all versions with audit trail linkage ✓
- rejection reasons attached to REJECTED proposals ✓
- all diff and comparison tools are read-only ✓

**Phase-Level:**

- all core collaboration workflows have 100% test coverage
- phase tracker and all part/stage documents updated to reflect completion state

## Status

**Complete [x]** — 2026-03-19

**Stage 01:** Complete with all three parts implemented and verified ✓

- Part 01: Comment Thread Foundation ✓
- Part 02: Change Proposal System ✓
- Part 03: Editorial Review and Application Workflow ✓

**Stage 02:** Complete with all three parts implemented and verified ✓

- Part 01: Proposal State Machine and Transitions ✓
- Part 02: Proposal Filtering and Querying ✓
- Part 03: Proposal Metadata and Summary Endpoints ✓

**Stage 03:** Complete with all three parts implemented and verified; comment feedback structure, lifecycle transitions, and read-only history/versioning are now in place ✓

**Stage 04:** Complete with all three parts implemented and verified; unified diff, proposal preview/impact analysis, and revision timeline/history browsing are now in place ✓
