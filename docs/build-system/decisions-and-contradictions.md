# Decisions and Contradictions

This document records findings from the documentation review. It lists contradictions, unresolved decisions, scope tensions, and underspecified implementation areas found across the Book Worm planning set. It does not propose solutions.

## Confirmed Contradictions

### 1. Canonical source of truth is described in two different ways

- [build-system/book-worm-build-system/build-bible.md](build-system/book-worm-build-system/build-bible.md) says canonical content should persist as Markdown with front-matter and structured JSON in addition to the database to avoid lock-in.
- [build-system/book-worm-build-system/documentation/book-worm-system-architecture-principles.md](build-system/book-worm-build-system/documentation/book-worm-system-architecture-principles.md) says the database is authoritative, releases are snapshots, search is derived, and Markdown files are inputs rather than runtime truth.
- The documentation set does not explicitly reconcile whether Markdown and JSON are archival/export formats or co-equal canonical stores.

### 2. Deployment shape is described both as a single application and as separate web/API services

- [build-system/book-worm-build-system/documentation/book-worm-system-architecture-principles.md](build-system/book-worm-build-system/documentation/book-worm-system-architecture-principles.md) says to use a monorepo or single application where possible and avoid over-complex microservices.
- [build-system/book-worm-build-system/appendices/shared-technical-foundations.md](build-system/book-worm-build-system/appendices/shared-technical-foundations.md) describes a backend HTTP server plus a Next.js frontend.
- [build-system/book-worm-build-system/appendices/deployment-matrix.md](build-system/book-worm-build-system/appendices/deployment-matrix.md) refers to web and API services as distinct deployable services.
- The documentation set does not establish whether Book Worm is one deployable app with internal route handlers or a split frontend/backend deployment.

### 3. Authentication model is described with incompatible alternatives

- [build-system/book-worm-build-system/documentation/book-worm-api-contract-specification.md](build-system/book-worm-build-system/documentation/book-worm-api-contract-specification.md) states that endpoints assume authentication via JWT or sessions.
- Other documents discuss role enforcement and operational deployment but do not pick one mechanism.
- The docs treat two materially different auth/session models as interchangeable without locking one down.

## Unresolved Technical Decisions

### 4. Backend framework is not decided

- [build-system/book-worm-build-system/appendices/shared-technical-foundations.md](build-system/book-worm-build-system/appendices/shared-technical-foundations.md) lists Express.js or NestJS.
- The rest of the documentation assumes stable implementation sequencing without naming a final backend framework.

### 5. ORM and data access approach are not decided

- [build-system/book-worm-build-system/appendices/shared-technical-foundations.md](build-system/book-worm-build-system/appendices/shared-technical-foundations.md) lists Prisma or TypeORM.
- The docs define a complex revision, release, relationship, and visibility model but do not establish the final persistence abstraction.

### 6. Search engine choice is not decided

- [build-system/book-worm-build-system/appendices/shared-technical-foundations.md](build-system/book-worm-build-system/appendices/shared-technical-foundations.md) now keeps search engine selection intentionally open.
- [build-system/book-worm-build-system/documentation/book-worm-search-specification.md](build-system/book-worm-build-system/documentation/book-worm-search-specification.md) assumes advanced role-aware and spoiler-aware indexing behavior without binding it to a chosen engine.

### 7. Object storage approach is not decided

- [build-system/book-worm-build-system/appendices/shared-technical-foundations.md](build-system/book-worm-build-system/appendices/shared-technical-foundations.md) keeps object storage intentionally pluggable without naming a required backend.
- The docs mention media assets, images, and import/export packaging but do not identify a final storage backend or local file strategy.

### 8. State management expectations on the frontend are not decided

- [build-system/book-worm-build-system/appendices/shared-technical-foundations.md](build-system/book-worm-build-system/appendices/shared-technical-foundations.md) lists Redux or context API as needed.
- The feature set includes complex admin workflows, release browsing, search filters, continuity dashboards, and proposal review, but no frontend state model is chosen.

## Underspecified Architecture Areas

### 9. Release snapshot storage model is not defined in enough detail

- [build-system/book-worm-build-system/documentation/book-worm-release-version-semantics-specification.md](build-system/book-worm-build-system/documentation/book-worm-release-version-semantics-specification.md) says releases are snapshots of selected revisions and are immutable once published.
- [build-system/book-worm-build-system/documentation/book-worm-domain-model-schema-spec.md](build-system/book-worm-build-system/documentation/book-worm-domain-model-schema-spec.md) says releases include revisions and versioned relationships.
- The docs do not specify whether releases store materialized snapshot rows, revision pointers, copied entities, denormalized read models, or some combination of those.

### 10. Referential integrity rules across releases are incomplete

- [build-system/book-worm-build-system/documentation/book-worm-release-version-semantics-specification.md](build-system/book-worm-build-system/documentation/book-worm-release-version-semantics-specification.md) says migrations between releases must preserve referential integrity.
- [build-system/book-worm-build-system/appendices/shared-release-rules.md](build-system/book-worm-build-system/appendices/shared-release-rules.md) says all references must exist at release creation time.
- The docs do not define inclusion behavior for referenced entities, scenes, tags, relationships, or secrets when a selected revision depends on other revisions not explicitly selected.

### 11. Relationship versioning behavior is not fully defined

- The domain model defines `Relationship` as a versioned system entity in [build-system/book-worm-build-system/documentation/book-worm-domain-model-schema-spec.md](build-system/book-worm-build-system/documentation/book-worm-domain-model-schema-spec.md).
- The release/version semantics document says relationships also record revisions when created or modified in [build-system/book-worm-build-system/documentation/book-worm-release-version-semantics-specification.md](build-system/book-worm-build-system/documentation/book-worm-release-version-semantics-specification.md).
- The documentation does not define whether relationships have independent revision histories, whether they are embedded into entity revisions, or how deleted relations are represented inside a release snapshot.

### 12. Public entity versus restricted/private field modeling is not fully specified

- The domain model says entities may have restricted or private fields even when the entity itself is public in [build-system/book-worm-build-system/documentation/book-worm-domain-model-schema-spec.md](build-system/book-worm-build-system/documentation/book-worm-domain-model-schema-spec.md).
- The permission rules define visibility at the content level in [build-system/book-worm-build-system/appendices/shared-permission-rules.md](build-system/book-worm-build-system/appendices/shared-permission-rules.md).
- The docs do not specify field-level storage, serialization, indexing, or API response behavior for mixed-visibility entities.

### 13. Spoiler tier interaction with visibility and releases is not fully defined

- The search spec defines spoiler tiers and role-aware filtering in [build-system/book-worm-build-system/documentation/book-worm-search-specification.md](build-system/book-worm-build-system/documentation/book-worm-search-specification.md).
- The domain model defines spoiler tiers separately from visibility in [build-system/book-worm-build-system/documentation/book-worm-domain-model-schema-spec.md](build-system/book-worm-build-system/documentation/book-worm-domain-model-schema-spec.md).
- The docs do not state the precedence rules when role, visibility tier, spoiler tier, and release status all apply to the same record or field.

### 14. Slug immutability timing is underspecified

- The domain model says slugs are immutable once published in [build-system/book-worm-build-system/documentation/book-worm-domain-model-schema-spec.md](build-system/book-worm-build-system/documentation/book-worm-domain-model-schema-spec.md).
- The docs do not define how slug changes work before publication, how slug history is tracked, or what happens when an unpublished slug changes after links or relations already exist.

### 15. Continuity rule configuration location is split between code and external configuration

- [build-system/book-worm-build-system/documentation/book-worm-continuity-engine-specification.md](build-system/book-worm-build-system/documentation/book-worm-continuity-engine-specification.md) says rule definitions should live in code but be configurable via YAML or JSON.
- The documentation does not define where configuration files live, how they are versioned, or whether release builds bind to rule config versions.

### 16. Import/export round-trip semantics are incomplete

- Import/export is a core requirement in the PRD and feature sets.
- The Build Bible requires portability via Markdown and JSON in [build-system/book-worm-build-system/build-bible.md](build-system/book-worm-build-system/build-bible.md).
- The docs do not define the canonical external file layout, conflict precedence, identifier stability, or how lossy exports are avoided across revisions, releases, relationships, and media.

### 17. API contract is still missing engineering-level detail

- [build-system/book-worm-build-system/documentation/book-worm-api-contract-specification.md](build-system/book-worm-build-system/documentation/book-worm-api-contract-specification.md) names endpoints and basic payload intent.
- The documentation does not standardize pagination envelopes, sorting rules, filtering semantics, optimistic locking or edit-conflict handling, idempotency expectations, or a stable error-code taxonomy.

## Scope and Phase Tensions

### 18. MVP scope is broad relative to the number of new subsystems introduced at once

- [build-system/book-worm-build-system/mvp/feature-set.md](build-system/book-worm-build-system/mvp/feature-set.md) includes comprehensive entity management, public codex pages for all entity types, timeline, chapter reader, revision/release system, search, continuity, import/export, self-hosting, documentation, and a test suite.
- The MVP risk register in [build-system/book-worm-build-system/mvp/risks.md](build-system/book-worm-build-system/mvp/risks.md) already identifies release logic, search correctness, continuity noise, import/export reliability, security, and performance as risks.
- The documentation set defines an MVP that contains several independently difficult subsystems rather than one primary delivery surface.

### 19. Beta collaboration features are already present in the API contract

- [build-system/book-worm-build-system/beta/feature-set.md](build-system/book-worm-build-system/beta/feature-set.md) introduces comments, proposals, and review workflows as Beta features.
- [build-system/book-worm-build-system/documentation/book-worm-api-contract-specification.md](build-system/book-worm-build-system/documentation/book-worm-api-contract-specification.md) already includes comment and proposal endpoints, marked as Beta.
- This is not a direct contradiction, but it means the global API contract includes future-phase surfaces before the implementation phase reaches them.

### 20. Dev-use infrastructure assumes services earlier than some features require

- [build-system/book-worm-build-system/dev-use/feature-set.md](build-system/book-worm-build-system/dev-use/feature-set.md) includes a local runtime stack with application server, database, and search service.
- [build-system/book-worm-build-system/documentation/book-worm-implementation-plan-build-sequencing.md](build-system/book-worm-build-system/documentation/book-worm-implementation-plan-build-sequencing.md) positions search basics later in dev-use and fuller search in MVP.
- The infrastructure plan introduces search infrastructure before the product plan fully needs search functionality.

## Governance and Process Gaps

### 21. Documentation ownership is defined, but update triggers are still broad

- [build-system/book-worm-build-system/appendices/documentation-matrix.md](build-system/book-worm-build-system/appendices/documentation-matrix.md) assigns maintainers and update timing.
- Several of the most consequential documents still contain open alternatives rather than final decisions, especially the technical foundations and API contract.
- The existence of maintainers and update cadence does not guarantee that core architecture decisions have been frozen.

### 22. Testing expectations are strong, but the highest-risk matrix is not explicitly enumerated

- [build-system/book-worm-build-system/appendices/testing-matrix.md](build-system/book-worm-build-system/appendices/testing-matrix.md) covers unit, integration, E2E, continuity, permissions, accessibility, performance, and security testing.
- The documentation does not explicitly enumerate the combined test matrix for role x visibility x spoiler tier x release state, despite that being one of the central behavioral constraints of the system.

## Summary of Findings

- The documentation is coherent at the product and principle level.
- The major findings are concentrated in unresolved implementation decisions and underspecified behavior at the boundaries between releases, revisions, visibility, spoiler control, and search.
- The most significant contradictions are around source-of-truth semantics, deployment shape, and authentication model selection.
