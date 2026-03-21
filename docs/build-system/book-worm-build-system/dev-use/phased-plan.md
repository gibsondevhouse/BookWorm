# Dev‑Use: Phased Plan

## Phase 01: Foundation

- Create the repository structure with `apps`, `packages`, `database` and `docs` folders.
- Document how to run the web server and database locally. Include `.env.example` for environment variables.
- Configure TypeScript, ESLint, Prettier and unit testing framework (Jest or Vitest).
- Establish a monorepo or package structure for shared code (e.g. UI kit, content schema) and application code.
- Write a developer onboarding guide.

## Phase 02: Authentication, Schema and Permissions

- Define user, role and permission tables in the database. Write migrations.
- Implement registration, login and session management using JWT or cookie sessions.
- Seed initial users and roles.
- Create middleware to check authentication and authorisation.
- Define base entity tables (entity, entity_type, relationship) and run migrations.

## Phase 03: Admin CRUD for Core Entities

- Define entity models for Characters, Factions, Locations and Events in the backend.
- Create REST or GraphQL endpoints to create, read, update and delete these entities.
- Build admin pages with forms and tables to manage these entities; use the design system for UI.
- Implement server‑side validation for required fields (e.g. name, slug, summary).

## Phase 04: Public Codex Shell

- Build minimal public pages that list Characters, Factions, Locations and Events with dummy content.
- Use layout components, typography and cards from the design system to verify the aesthetic.
- Ensure public pages respect visibility (only show entities marked public).

## Phase 05: Release‑Safe Rendering Basics

- Introduce a simple revision table that stores snapshots of entity fields.
- Create a release table and a mechanism to mark a revision as belonging to a release.
- Modify public pages to read from the latest release rather than live data.
- Provide an admin interface to create a release and assign revisions to it.

## Phase 06: Import/Export Basics

- Implement a Markdown parser to convert front‑matter into entity objects and write them to the database.
- Implement a serializer to export entities into Markdown files organised by type and slug.
- Provide CLI or admin scripts to run import/export on the dev environment.
