# Part 02: Change Proposal System

Status: Completed [x]

## Objective

Introduce a proposal workflow that lets editors submit structured change proposals against entities and manuscripts, then allows author-admin actors to review and decide proposals.

## Schema

- Add `ProposalChangeType` enum (`CREATE`, `UPDATE`, `DELETE`)
- Add `ProposalStatus` enum (`PENDING`, `ACCEPTED`, `REJECTED`)
- Add `Proposal` model mapped to `proposals`
- Add `User`, `Entity`, and `Manuscript` relations to proposals
- Enforce exactly one proposal target via DB constraint (`entityId` xor `manuscriptId`)

## Files

- `prisma/schema.prisma`
- `prisma/migrations/20260319150000_add_change_proposal_system/migration.sql`
- `apps/api/src/repositories/proposalRepository.ts`
- `apps/api/src/services/proposalService.ts`
- `apps/api/src/routes/proposalRouter.ts`
- `apps/api/src/app/createApp.ts`
- `tests/phase3ChangeProposalBaseline.test.ts`

## Acceptance

- Editors can submit and list entity/manuscript proposals.
- Proposal detail retrieval is available by proposal id.
- Author-admin can list proposals globally and decide proposals via accept/reject.
- Decided proposals cannot be decided again.

## Exit Criteria

- Prisma schema and migration are in place and valid for the proposal data model.
- API routes are wired with auth + validation + decision constraints.
- Baseline test coverage verifies submission, listing, accept, and reject behavior end-to-end.
