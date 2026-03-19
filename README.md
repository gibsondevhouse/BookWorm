# Book Worm

Book Worm is an active Phase 2 monorepo for the bounded codex, release, and operator baseline slices implemented in this repository.

## Stack Baseline

- Monorepo workspace managed with pnpm
- Next.js frontend under `apps/web`
- Express API under `apps/api`
- Initial Prisma schema and migration under `prisma`
- Direct local runtime for the app layers, with PostgreSQL as the first backing service

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

## Local Setup

1. Copy `.env.example` to `.env`.
2. Run `pnpm install`.
3. Provision PostgreSQL and set `DATABASE_URL`.
4. Run `pnpm db:generate`.
5. Run `pnpm db:migrate`.
6. Run `pnpm auth:bootstrap-admin --email <email> --display-name <name> --password <password>`.
7. Optionally validate initial content with `pnpm portability:import --format=markdown --input <path> --actor-email <email> --dry-run`.
8. Apply initial content with `pnpm portability:import --format=markdown --input <path> --actor-email <email>`.
9. Run `pnpm dev` for local hosting, or use `pnpm build` and package start scripts for a built run.
10. Verify API health at `/health` and representative public reads.

## Operator Notes

- Import and database restore are offline maintenance operations: stop the API before `pnpm portability:import` or `pnpm db:restore`.
- Restart the API process after import or restore so startup rebuilds the in-memory search index from database state.
- Database backup and restore are the authoritative disaster-recovery path.
- Portability export and import are content mobility workflows, not a replacement for operational backup.
- `pnpm db:seed` remains a deterministic fixture setup flow and is not the default self-host bootstrap path.

## Available Commands

- `pnpm dev` runs the Express API and the Next.js app in parallel.
- `pnpm build` builds all workspace packages.
- `pnpm test` runs the repository integration suites, including the current Phase 0, Phase 1, and implemented Phase 2 slice coverage.
- `pnpm type-check` runs TypeScript validation across the workspace.
- `pnpm lint` runs ESLint across the workspace.
- `pnpm db:generate` generates the Prisma client from the schema.
- `pnpm db:migrate` creates and applies a Prisma development migration.
- `pnpm auth:bootstrap-admin` creates a clean-install `AUTHOR_ADMIN` user without seeding demo content.
- `pnpm portability:export` writes a JSON or Markdown portability package for either the current authored state or a selected release snapshot into a missing or empty output directory.
- `pnpm portability:import` validates and applies a JSON or Markdown portability package.
- `pnpm db:backup` shells out to `pg_dump` and writes a caller-selected dump path.
- `pnpm db:restore` shells out to `pg_restore` (or `psql` for `.sql`) and restores a caller-selected dump path.
- `pnpm db:seed` writes the deterministic Character, Faction, and relationship fixtures used by the current baseline.
- `pnpm db:reset` resets the database through Prisma migrations.
- `pnpm phase0:verify` reseeds the deterministic Phase 0 baseline, then runs the end-to-end verification flow against a running API.

## Phase 0 Slice Endpoints

These routes prove the draft-to-release data flow through a real server-managed session boundary.

- `POST /auth/session` creates a session and sets the HTTP-only session cookie.
- `GET /auth/session` returns the current authenticated actor when a valid session exists.
- `DELETE /auth/session` clears the current session.
- `POST /admin/characters/drafts` creates or updates a Character draft revision.
- `POST /admin/factions/drafts` creates or updates a Faction draft revision.
- `POST /admin/releases` creates a draft release.
- `POST /admin/releases/:slug/entries` includes a supported entity revision in a release.
- `POST /admin/releases/:slug/activate` marks a release as active.
- `GET /characters/:slug` resolves a Character only through the active release.
- `GET /factions/:slug` resolves a Faction only through the active release.

The seeded Phase 0 credentials are:

- author-admin: `author@example.com` / `phase0-author-password`
- editor: `editor@example.com` / `phase0-editor-password`

## Current Scope

The repository now includes the Prisma schema, migrations, release-aware API flows, verification scripts, portability export and import for JSON plus Markdown packages, clean-install `AUTHOR_ADMIN` bootstrap, and database backup/restore wrapper scripts with self-hosting operator guidance.
