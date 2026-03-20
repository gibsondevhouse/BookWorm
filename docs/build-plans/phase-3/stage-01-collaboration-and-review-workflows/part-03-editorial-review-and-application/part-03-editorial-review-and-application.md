# Part 03: Editorial Review and Application Workflow

Status: Completed [x]

## Objective

Enable author-admins to review accepted proposals and apply them to source entities/manuscripts, creating new revisions that track the applied proposal via audit trail.

## Summary

Part 03 implements a complete editorial workflow for managing proposal applications. Authors and editors can submit change proposals, admins can review and accept them, and then apply accepted proposals to create new revisions with full audit trail linkage.

### Key Features Implemented

1. **Proposal Application Endpoints** — 9 API endpoints for managing application workflow:
   - `GET /admin/proposals/pending-accepted` — List ACCEPTED proposals awaiting application
   - `GET /admin/proposals/applied-history` — List already-applied proposals
   - `GET /admin/proposals/:id/application-status` — Get detailed application status
   - `POST /admin/proposals/:id/apply` — Apply an accepted proposal
   - `POST /admin/proposals/:id/preview-application` — Validate application without committing
   - `GET /admin/entities/:type/:slug/revisions/applied-proposals` — Entity revision audit trail
   - `GET /admin/manuscripts/:id/revisions/applied-proposals` — Manuscript revision audit trail
   - `GET /admin/proposals/workflow-stats` — Aggregate proposal workflow statistics
   - `GET /admin/proposals/recent-applications` — 20 most recent applied proposals

2. **Schema Enhancements**
   - Added `appliedAt`, `appliedById`, `appliedNote` to Proposal model
   - Added `appliedFromProposalId` to EntityRevision, ManuscriptRevision, RelationshipRevision models
   - Created new indexes for rapid lookups and audit trail traversal

3. **Repository Layer**
   - `proposalApplicationRepository` — Queries for application workflow state
   - `revisionAuditRepository` — Queries for revision audit trails

4. **Service Layer**
   - `proposalApplicationService` — Business logic for application workflow
   - `revisionAuditService` — Audit trail querying

5. **API Routing**
   - `proposalApplicationRouter` — All 9 endpoints with auth middleware and validation
   - Integrated into `createApp.ts`

## Implementation Files

1. ✅ `prisma/schema.prisma` — Updated with new fields and indexes
2. ✅ `prisma/migrations/20260319160000_add_editorial_application_workflow/migration.sql` — Database DDL
3. ✅ `apps/api/src/repositories/proposalApplicationRepository.ts` — Application query repository
4. ✅ `apps/api/src/repositories/revisionAuditRepository.ts` — Audit trail query repository
5. ✅ `apps/api/src/services/proposalApplicationService.ts` — Application business logic
6. ✅ `apps/api/src/services/revisionAuditService.ts` — Audit querying service
7. ✅ `apps/api/src/routes/proposalApplicationRouter.ts` — All 9 endpoints
8. ✅ `apps/api/src/app/createApp.ts` — Router integration
9. ✅ `tests/phase3EditorialApplicationBaseline.test.ts` — Comprehensive test baseline

## Acceptance Criteria Met

✅ **AC-01:** Admin can list ACCEPTED proposals awaiting application via GET `/admin/proposals/pending-accepted` (paginated)

✅ **AC-02:** Admin can list already-applied proposals via GET `/admin/proposals/applied-history` (paginated)

✅ **AC-03:** Admin can apply an ACCEPTED proposal via POST `/admin/proposals/:id/apply`, which creates a new revision

✅ **AC-04:** Applied revision inherits payload, name, summary from proposal; visibility defaults to PRIVATE

✅ **AC-05:** Applying a proposal marks it applied (sets `appliedAt`, `appliedById`, optional `appliedNote`); cannot be applied twice

✅ **AC-06:** Admin can preview proposal application (POST `/admin/proposals/:id/preview-application`) without committing

✅ **AC-07:** Admin can query audit trail of entity revisions from proposals (GET `/admin/entities/:type/:slug/revisions/applied-proposals`)

✅ **AC-08:** Admin can query audit trail of manuscript revisions from proposals (GET `/admin/manuscripts/:id/revisions/applied-proposals`)

✅ **AC-09:** Workflow stats endpoint (GET `/admin/proposals/workflow-stats`) returns accurate counts

✅ **AC-10:** Recent applications endpoint (GET `/admin/proposals/recent-applications`) returns last 20 in descending `appliedAt` order

✅ **AC-11:** Proposal application fails with 409 if proposal not in ACCEPTED status

✅ **AC-12:** All application endpoints enforce `AUTHOR_ADMIN` role via middleware

## Test Coverage

All 12 acceptance criteria have corresponding tests. Test file execution summary:

- **Total Tests:** 173 (all passing)
- **Phase 03 Part 03 Tests:** 12
- **Pass Rate:** 100%

## Exit Criteria Verification

✅ **Schema & Migration:** Prisma schema updated with new fields and indexes on Proposal, EntityRevision, ManuscriptRevision, RelationshipRevision. Migration file valid and applied successfully (`pnpm db:migrate` success).

✅ **API Endpoints:** All 9 endpoints wired in `proposalApplicationRouter`, mounted in `createApp.ts`. Full auth middleware and Zod validation on all inputs.

✅ **Service Layer:** `proposalApplicationService` and `revisionAuditService` encapsulate all business logic (no direct Prisma calls in routers).

✅ **Repositories:** `proposalApplicationRepository` and `revisionAuditRepository` handle all database access.

✅ **Test Coverage:** Baseline test file passes 100% of 12 acceptance criteria.

✅ **Code Quality:**

- Repository → Service → Router layering pattern followed
- No business logic in route handlers
- Named exports match filenames
- Max 250 lines per file respected
- No `any` types (strict TypeScript)
- No console.log in committed code

✅ **Validation:**

- `pnpm type-check` — Passed
- `pnpm lint` — Passed
- `pnpm test` — All 173 tests passed

## Architecture Notes

### Proposal Application Lifecycle

1. **Editorial Review Phase** (Part 02)
   - Editors submit proposals (CREATE, UPDATE, DELETE change types)
   - Admin-admins review and ACCEPT or REJECT

2. **Application Phase** (Part 03)
   - Admin-admins list ACCEPTED proposals via `/admin/proposals/pending-accepted`
   - Admin-admins preview application via `/admin/proposals/:id/preview-application`
   - Admin-admins apply proposal via `/admin/proposals/:id/apply`
   - System creates new revision (EntityRevision, ManuscriptRevision, or RelationshipRevision)
   - System links revision to original proposal via `appliedFromProposalId`
   - System records application metadata: `appliedAt`, `appliedById`, optional `appliedNote`

3. **Audit Trail**
   - Entity/manuscript/relationship revision audit trails queryable via `/admin/entities/:type/:slug/revisions/applied-proposals` etc.
   - Each linked revision shows originating proposal + application metadata

### Foreign Key Constraints

- `Proposal.appliedById` → `User.id` with RESTRICT on delete (preserves audit trail)
- `EntityRevision.appliedFromProposalId` → `Proposal.id` with SET NULL on delete
- `ManuscriptRevision.appliedFromProposalId` → `Proposal.id` with SET NULL on delete
- `RelationshipRevision.appliedFromProposalId` → `Proposal.id` with SET NULL on delete

### Immutability

Once a proposal is applied:

- `appliedAt` and `appliedById` cannot be changed
- Prevents double-application via status check and null check on `appliedAt`
- `appliedNote` is optional and set at application time

## Next Steps

Part 03 closes the Phase 3 Stage 01 collaboration and review workflow. Future work may include:

- Admin dashboard UI for proposal review and application
- Batch application endpoints for bulk proposal processing
- Advanced audit reports and change history visualization
- Integration with notification system to alert editors of application status
