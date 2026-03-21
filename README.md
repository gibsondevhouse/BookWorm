# Book Worm

Book Worm is a solo-author fiction writing studio. Bring your OpenRouter API key and write your novel with an AI that knows your characters, keeps your world consistent, and helps you track every canon decision.

Current implementation status: Phases 0 through 4 are complete. Phase 5 is complete through Stage 04 closeout. Phase 6 Stage 01 is closed as the shipped frontend baseline: a stable two-column chat-style root shell in `apps/web/src/app`. Active Phase 6 work now centers on Stage 02 closeout against the UI vision and the Stage 03 rollout across the next audited high-impact surfaces.

## Stack

- Monorepo workspace managed with pnpm
- API: Express + TypeScript in `apps/api`
- Web: Next.js + Tailwind CSS v4 in `apps/web`
- Database: PostgreSQL via Prisma (`prisma/schema.prisma`)
- Integration tests: Node test runner + tsx in `tests/`

## Repository Layout

```text
apps/
  api/
  web/
config/
docs/
prisma/
scripts/
storage/
tests/
```

## Prerequisites

- Node.js 22+
- pnpm 10+
- PostgreSQL

## Local Setup

1. Copy `.env.example` to `.env`.
2. Install dependencies:

- `pnpm install`

1. Provision PostgreSQL and set `DATABASE_URL` in `.env`.
2. Generate Prisma client:

- `pnpm db:generate`

1. Run migrations:

- `pnpm db:migrate`

1. Create an initial admin account:

- `pnpm auth:bootstrap-admin --email <email> --display-name <name> --password <password>`

1. Start the app stack:

- `pnpm dev`

The dev launcher includes port fallback behavior for API and web processes and prints a startup summary with selected ports.

## Common Commands

- `pnpm dev`: run API + web in parallel
- `pnpm build`: build all workspace packages
- `pnpm test`: run integration suites (serial concurrency for deterministic DB-backed tests)
- `pnpm lint`: run ESLint across the workspace
- `pnpm type-check`: run TypeScript no-emit validation across the workspace
- `pnpm format`: run Prettier across the repository

### Database and Bootstrap

- `pnpm db:generate`: Prisma client generation
- `pnpm db:migrate`: create/apply Prisma development migration
- `pnpm db:reset`: reset database via Prisma migrations
- `pnpm db:seed`: deterministic fixture seeding baseline
- `pnpm auth:bootstrap-admin`: create clean-install `AUTHOR_ADMIN` account

### Portability and Operations

- `pnpm portability:export`: export portability package (directory or zip; JSON or Markdown payloads)
- `pnpm portability:import`: validate/apply portability package (directory or zip; JSON or Markdown payloads)
- `pnpm db:backup`: backup database via `pg_dump`
- `pnpm db:restore`: restore database via `pg_restore` (or `psql` for `.sql`)

### Slice Verification Scripts

- `pnpm phase0:verify`: reseed and verify Phase 0 baseline against a running API
- `pnpm phase1:verify`: verify Phase 1 baseline against a running API

## Functional Scope Snapshot

- Phase 0: auth/session shell, release spine, first draft-to-release slice
- Phase 1: expanded entity and relationship authoring, dependency validation and release review
- Phase 2: comprehensive entity/manuscript/public codex/search/continuity and portability delivery
- Phase 3: collaboration comments, proposal workflow enhancements, diff/preview/history tooling
- Phase 4: review requests, multi-stage approvals, delegation/escalation, notification outbox/inbox, analytics, query hardening, governance portability extensions, and verification gate
- Phase 5: search tuning, continuity intelligence, portability maturity, and UX/accessibility closeout complete
- Phase 6: Stage 01 closed as the shipped root-shell baseline; Stage 02 finalizes the vision-first closeout and handoff, and Stage 03 rolls that visual system across the next audited high-impact surfaces

For plan-level detail, see `docs/build-plans/master-plan-tracker.md`.

## API Surface (High-Level)

The API includes route groups for:

- auth session lifecycle
- admin draft and CRUD flows across supported content types
- release composition and activation workflows
- public read and discovery endpoints
- proposal, review request, and approval workflows
- notification events/preferences and review inbox
- revision diff, revision timeline, and analytics surfaces
- health/status endpoints

See `apps/api/src/routes/` for concrete endpoint definitions.

## Operator Notes

- Treat portability import and database restore as offline maintenance operations.
- Restart API processes after import/restore so startup jobs can rebuild derived runtime state.
- Use database backup/restore for disaster recovery.
- Use portability export/import for content mobility between environments.
- Deterministic seed data is for baseline/verification workflows, not default production bootstrap.

## Testing and Quality Gates

Standard quality gate commands:

- `pnpm lint`
- `pnpm type-check`
- `pnpm test`

The integration suite includes phase coverage from Phase 0 through Phase 5 Stage 03 Part 02 under `tests/`; Stage 03 Part 03 is a documented verification gate that validates Stage 03 and portability regression suites.
