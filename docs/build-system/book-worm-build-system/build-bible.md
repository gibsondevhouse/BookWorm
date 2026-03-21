# Book Worm Build Bible

## 0. Document Purpose

This Build Bible centralizes the planning, sequencing, and guidelines for the Book Worm project. It ties together the high‑level product requirements with the engineering execution across four release tracks—**dev‑use**, **MVP**, **beta** and **v1**—to ensure that every phase builds on a solid foundation and that design, data, and permission models remain coherent. Each sub‑folder in this repository contains the detailed plan for a version track, while this document lays out shared rules and global sequencing.

## 1. Global Rules for All Phases

- **Entity‑first model:** Every story asset must be modeled as a structured entity (character, faction, location, event, artifact, creature, belief system, political body, language, secret, reveal, tag, timeline era, chapter, scene, etc.). Pages should pull their content from entities rather than storing free‑form data.
- **Release safety:** All public facing content must come from a release snapshot. Edits to canonical entities or manuscripts must be reviewed and published through a release. Drafts and provisional changes may exist in the database, but they are never exposed until included in a release.
- **Separation of concerns:** Keep public and private content strictly separate in storage, search, API and UI. Never rely on client‑side hiding for spoiler control. Always mark each entity with a visibility tier (public, restricted, private) and respect it when indexing and rendering.
- **Version control:** Treat the content like code. Track changes to entities, relationships, chapters and scenes. Use explicit revision fields and update history records. The code repository holds migrations, seeds and schema definitions; the application database records revision metadata.
- **Consistency checks:** Validate changes against the schema and the continuity rules at save time. Block publishing when critical issues exist. Warnings may be logged for non‑blocking issues to be addressed later.
- **Design coherence:** Follow the defined design system (see `appendices/shared-design-system-rules.md`) across all phases. Do not introduce random colours, fonts or spacing. The public site and the admin should feel like one brand.
- **Self‑hosting:** Ensure that everything can run in a directly managed self-hosted environment and does not depend on third‑party SaaS. Provide environment examples and runtime setup guidance. External services used (e.g., image storage) must be pluggable.
- **Portability:** Persist canonical content as plain text (Markdown + front‑matter) and structured JSON files in addition to the database to avoid lock‑in. Provide export tools to extract content and releases in human‑readable form.
- **Security:** Enforce role‑based access control at API, search and UI layers. Never expose hidden fields or private content in API responses not authorised. Respect the permissions matrix (see `appendices/shared-permission-rules.md`).

## 2. Program‑Level Build Order

1. **Foundations:** Set up repository, runtime configuration, code structure, database schema, authentication scaffolding and design system tokens.
2. **Entity CRUD:** Implement CRUD operations and admin UI for core entities. Validate data against the schema.
3. **Public shell:** Build the public codex, reader, timeline and atlas shells with placeholder data and design.
4. **Versioning and releases:** Add revision tracking, releases, and ensure public pages read from release snapshots.
5. **Search:** Index canonical entities and manuscripts with spoiler awareness and role filtering. Provide a search API and interface with filters.
6. **Timeline and relations:** Enable relational browsing and timeline rendering with structured events. Surface related entities elegantly.
7. **Continuity engine:** Implement initial continuity rules and issue workflow. Flag contradictions and unresolved dependencies.
8. **Import/export:** Provide import of Markdown/JSON and export of structured data and editions. Support partial and full export by release.
9. **Polish and QA:** Harden UX, fix accessibility issues, improve search relevance and finalise release rules. Add automated tests.
10. **Ops/Observability:** Set up backups, health checks, metrics and logs for self‑hosting. Provide deployment scripts and monitoring.

## 3. Dependency Map Across Versions

The **dev‑use** track creates the skeleton (foundations, basic auth, initial CRUD). **MVP** builds on dev‑use with complete entity types, public pages, release snapshots, search, timeline and continuity basics. **Beta** hardens the experience with editor workflows, deeper continuity rules, search tuning, import/export maturity and operational infrastructure. **v1** freezes the feature set, focuses on performance, audits permissions and releases, finalises design polish and prepares Book Worm for public launch. Each phase depends on the complete success of the preceding phase’s deliverables.

## 4. Shared Foundations Required Before Any Version Work

- **Repository and runtime setup:** Provide `.env.example`, setup scripts and local service guidance. Include README instructions for local development.
- **Database schema:** Define tables for users, roles, permissions, entities, entity types, relationships, revisions, releases, visibility, spoiler tiers, timeline anchors, continuity issues and media assets.
- **Authentication and authorisation:** Implement login and session management. Define roles (Public, Editor, Author/Admin) and enforce them at the API level.
- **Design system tokens:** Define type scale, spacing scale, colour palette, radii, shadows and motion. Provide components in the UI kit following these tokens.
- **Core entity definitions:** Base classes and interfaces for all entity types with required and optional fields (see `documentation/book-worm-domain-model-schema-spec.md`).
- **Global API structure:** Standardise request/response formats, error handling, pagination and filtering. Provide middleware for authentication, authorisation and validation.
- **Content parsing utilities:** Write libraries to parse Markdown with front‑matter into structured data and to export structured data back into Markdown/JSON.
- **Coding guidelines:** Define lint rules, code formatting, commit message conventions and repository organisation. Use TypeScript for both backend and frontend where possible.

## 5. Folderized Planning Model

This repository is organised into subfolders for each version track. Each folder contains structured planning documents: `purpose.md`, `goals.md`, `non-goals.md`, `success-criteria.md`, `scope.md`, `feature-set.md`, `phased-plan.md`, `deliverables.md`, `exit-gates.md`, `risks.md` and a handoff document. An `appendices` folder contains shared references such as technical foundations, design system rules, permission rules, release rules, testing and deployment matrices, documentation matrix and agent operating rules. The `documentation` folder holds previously generated design and specification documents.

### 5.1 /dev-use

The **dev‑use** folder defines the earliest scaffold for internal development and experimentation. It focuses on setting up the environment, coding conventions, core models and basic admin CRUD. Its phases are short and proof‑of‑concept oriented to validate the feasibility of the domain model, design system and local development experience.

### 5.2 /mvp

The **MVP** folder translates the PRD into a minimal but complete product ready for self‑hosting. It builds out all core features (entity system, public codex, reader, releases, search, timeline, continuity basics, import/export) and ensures that the architecture is stable. The MVP is the first version that others can install and use.

### 5.3 /beta

The **beta** folder hardens the platform: improves UX, adds editor workflows, deepens the continuity engine, tunes search and observability, matures import/export, and incorporates early user feedback. It is the last stage before v1 and aims to make Book Worm robust for external testing.

### 5.4 /v1

The **v1** folder locks the feature set, improves performance, audits permissions and release logic, finishes the design and content, and readies Book Worm for public launch. It defines post‑launch guardrails and the bridge into maintenance and future iterations.
