# MVP: Phased Plan

## Phase 01: Hardening Foundations
- Review the dev‑use repository structure, refine the monorepo layout and ensure that dependency management is stable.
- Strengthen authentication and authorisation (password resets, account management, improved session handling). Add tests.
- Expand the design system by adding missing controls (dropdowns, modals, tables) and ensure accessibility.
- Finalise the database schema for all entity types based on the Domain Model. Run migrations and seeds.

## Phase 02: Core Entity System Complete
- Implement models, controllers and admin CRUD interfaces for all entity types (Characters, Factions, Locations, Events, Artifacts, Creatures, Belief Systems, Political Bodies, Languages, Secrets, Reveals, Tags, Timeline Eras).
- Add relationship management UI (select related entities, reorder relationships, remove links).
- Support metadata editing for visibility, spoiler tier, tags and timeline anchors. Validate required fields.
- Write unit and integration tests for each API endpoint.

## Phase 03: Public Codex and Reader
- Build polished codex pages with lists, detail views, related entries and spoiler awareness. Use SEO‑friendly routing and metadata.
- Implement the timeline page with era navigation, event grouping and links to detail pages.
- Implement the atlas page using static map images and markers for locations. Provide region navigation.
- Build the chapter reader with table of contents and navigation. Allow readers to select releases/editions.
- Add search entry point and integrate it into navigation.

## Phase 04: Release Snapshots and Revisions
- Implement revision tracking for entities and chapters (e.g. store changed fields with timestamps and authors).
- Create release creation and editing interfaces. Allow selection of revisions to include.
- Enforce that public pages always read from the current release. Provide admin ability to switch active release.
- Implement release deletion and basic conflict detection (e.g. cannot delete the active release).

## Phase 05: Search and Timeline
- Integrate the search service fully: index all public entity fields, tags and chapters. Implement synonyms and alias indexing.
- Expose search filters by type, era, faction, tag and spoiler tier. Support pagination and ordering by relevance and date.
- Add search result cards with snippets and metadata. Ensure hidden items do not appear.
- Enhance the timeline view: add filters for event type and factions, ability to jump to a particular era and search within the timeline.

## Phase 06: Continuity Issues and Review
- Implement basic continuity rules (required fields, date ordering, reveal-before-secret logic, duplicate slug detection). Trigger validations when entities are saved and when releases are created.
- Create a continuity issue dashboard in the admin area to review, assign and resolve issues. Include severity and status.
- Implement simple override/exception mechanisms for issues that are accepted by the author.
- Provide documentation on how to read and fix continuity issues.

## Phase 07: Import/Export and Self‑Hosting
- Finish the import/export tooling: support all entity types, chapters and relations in Markdown/JSON. Provide clear error messages on invalid input.
- Implement image handling: store images in object storage, reference them in front‑matter and include them during export.
- Write scripts to backup and restore the database, search index and object storage.
- Finalise environment configuration, .env files, secrets management and runtime coordination for a production‑like self‑hosted deployment.

## Phase 08: MVP Polish and QA
- Conduct UI/UX reviews and accessibility audits. Refine typography, spacing, navigation and interactions based on feedback.
- Write comprehensive documentation: author guide, admin guide, release workflow documentation and developer setup.
- Expand automated tests including end‑to‑end tests covering CRUD flows, reading flows and release changes.
- Fix bugs, reduce technical debt and ensure the system passes functional QA.
- Prepare for Beta by collecting known issues and feature requests not implemented in the MVP.
