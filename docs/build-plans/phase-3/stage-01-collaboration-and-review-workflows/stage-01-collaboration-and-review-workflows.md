# Stage 01: Collaboration and Review Workflows

## Purpose

Introduce comment threading and change proposal foundations so stakeholders can review, discuss, and collaboratively refine content before release activation. Comments provide lightweight discussion on any content surface, while proposals enable formal change requests with admin review and application workflows that generate auditable revisions.

## Parts

1. Comment Thread Foundation
2. Change Proposal System
3. Editorial Review and Application Workflow

## Outputs

- comment model, repository, and routes supporting nested replies and pagination
- proposal model, repository, and routes for create/update/delete change requests
- proposal review endpoints for admin acceptance and rejection
- proposal application flow that converts accepted changes into new revisions with audit trail
- role-based access control for proposal submission and editorial review
- comprehensive test suite for all collaboration workflows

## Exit Criteria

- comment threading enabled for all entity and manuscript content types ✓
- nested replies work with pagination; edits preserve history ✓
- change proposals support CREATE, UPDATE, and DELETE change types ✓
- admin users can review proposals with decision notes and rejection reasons ✓
- accepted proposals can be applied to generate new revisions ✓
- proposal applications are tracked with submitter, reviewer, and applicator audit trail ✓
- role-based access control gates proposal submission to appropriate users ✓
- 100% test coverage of core collaboration workflows verified ✓
- stage tracker and part documents updated to reflect completion state ✓

## Progress

- [x] Part 01: Comment Thread Foundation — completed; comment model, nested replies, pagination, edit history supported; schema and routes verified through phase3CommentThreadBaseline.test.ts
- [x] Part 02: Change Proposal System — completed; proposal model supports CREATE/UPDATE/DELETE change types; submission, review, and status tracking implemented; verified through phase3ChangeProposalBaseline.test.ts
- [x] Part 03: Editorial Review and Application Workflow — completed; admin review with decision notes, proposal application to generate revisions, full audit trail (proposedBy, decidedBy, appliedBy); verified through phase3EditorialApplicationBaseline.test.ts

## Status

**Completed** — 2026-03-19

All Stage 01 parts are complete. The stage closes with all exit criteria satisfied:

- [x] comment threading enabled for all entity and manuscript content types
- [x] nested replies work with pagination; edits preserve history
- [x] change proposals support CREATE, UPDATE, and DELETE change types
- [x] admin users can review proposals with decision notes and rejection reasons
- [x] accepted proposals can be applied to generate new revisions
- [x] proposal applications tracked with full audit trail
- [x] role-based access control gates proposal submission to appropriate users
- [x] 100% test coverage of core collaboration workflows verified

Part 03 provided the remaining closure work by completing the proposal application workflow that converts accepted changes into new revisions with complete audit trails, enabling the full editorial review cycle.
