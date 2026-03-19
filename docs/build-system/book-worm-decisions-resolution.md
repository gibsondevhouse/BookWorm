# Book Worm Decisions Resolution

This document resolves the contradictions, open decisions, and underspecified behaviors identified in the review document.

---

# 1. Canonical Source of Truth

## Decision
The **database is the sole canonical runtime source of truth**.

## Resolution
- Structured content, relationships, revisions, releases, permissions, and continuity issues live authoritatively in the relational database.
- Markdown with front-matter and structured JSON are **import/export and archival portability formats**, not co-equal runtime truth stores.
- Search is derived infrastructure.
- Public rendering is derived from release-bound database state.

## Result
This resolves the contradiction between “database is authoritative” and “canonical content should persist as Markdown/JSON.” Markdown/JSON exist to prevent lock-in and support import/export, but they do not compete with the database as runtime truth.

---

# 2. Deployment Shape

## Decision
Book Worm will be a **single deployable application in a monorepo**, with a frontend and backend as internal app layers, not separately managed product services.

## Resolution
- Use one codebase and one primary deployment unit.
- The app may still have:
  - a Next.js frontend surface
  - an Express-based backend/API layer
- These are application layers, not independently owned microservices.
- Supporting infrastructure may still run as separately managed services:
  - database
  - search
  - object storage
  - reverse proxy if needed

## Result
This resolves the contradiction between “single application” and references to separate web/API services. The correct interpretation is **one product deployment with internal web/API separation**, not a distributed service architecture.

---

# 3. Authentication Model

## Decision
Book Worm will use **server-managed session authentication with secure HttpOnly cookies** as the primary auth model.

## Resolution
- Browser login issues a server session.
- Session is stored using secure cookie semantics.
- Role checks happen server-side on every protected request.
- JWT is **not** the default interactive auth model.
- JWT or API tokens may be added later only for tightly scoped automation or CLI workflows.

## Result
This resolves the JWT-vs-session ambiguity by selecting sessions as the primary model.

---

# 4. Backend Framework

## Decision
Use **Express.js with TypeScript**.

## Resolution
- Express is sufficient for MVP/Beta/v1 scope.
- Keep structure disciplined with clear domain modules, service layers, validators, and route boundaries.
- Do not introduce NestJS complexity unless later scale or team structure makes it necessary.

## Result
This resolves the Express-or-NestJS ambiguity in favor of the simpler option aligned with the product’s “strict model, simple deployment” principle.

---

# 5. ORM and Persistence Abstraction

## Decision
Use **Prisma** as the ORM and migration layer.

## Resolution
- Prisma will manage schema evolution, relations, and typed data access.
- Complex release/revision logic that does not fit cleanly into Prisma convenience APIs may still use carefully scoped raw SQL where necessary.
- Prisma remains the primary persistence abstraction.

## Result
This resolves the Prisma-or-TypeORM ambiguity.

---

# 6. Search Engine

## Decision
Defer the concrete search engine choice until public discovery features are in active implementation.

## Resolution
- Keep the search contract engine-agnostic during early planning.
- Require any eventual search backend to support typo-tolerant lookup, scoped indexing, and role-aware filtering.
- Maintain separate indexing logic by scope rather than one permissive index.

## Result
This removes premature commitment while preserving the functional search requirements.

---

# 7. Object Storage

## Decision
Defer the concrete object storage backend until file handling is in active implementation.

## Resolution
- Keep the storage contract backend-agnostic during early planning.
- The storage layer should remain abstracted so local disk storage or S3-compatible services can be adopted later.
- Local disk storage may be allowed in development only.

## Result
This removes premature commitment while preserving pluggability.

---

# 8. Frontend State Management

## Decision
Use **Redux Toolkit** for cross-surface application state, with local component state and React context only where appropriate.

## Resolution
- Use Redux Toolkit for:
  - admin browsing/filtering
  - release browsing state
  - continuity dashboard state
  - proposal/review flows
  - complex search filter state
- Use local state for isolated form controls and ephemeral UI behavior.
- Use React context only for narrow concerns like theme/session convenience.

## Result
This resolves the Redux-vs-context ambiguity.

---

# 9. Release Snapshot Storage Model

## Decision
A release stores **explicit revision pointers**, not copied entity rows as the primary truth.

## Resolution
A release is composed of:
- entity revision IDs
- chapter revision IDs
- scene revision IDs where applicable
- relationship revision IDs or release-bound relationship composition rows
- release metadata

Additionally:
- denormalized read models may be generated for performance
- these read models are caches, not canonical release truth

## Result
This resolves the uncertainty around whether releases store copied content or pointers. The answer is: **pointer-based canonical release composition, optional denormalized caches for performance**.

---

# 10. Referential Integrity Across Releases

## Decision
Release composition must be **dependency-complete**.

## Resolution
When a revision is included in a release:
- all required referenced records must also be included in compatible revision form
- this includes:
  - referenced entities
  - required scenes/chapters
  - tags where needed for rendering
  - relationships used for release-facing presentation
  - referenced secrets/reveals where necessary for internal release coherence

Rules:
- required dependencies must be auto-detected during release validation
- missing required dependencies block release publication
- optional display-only relationships may be omitted if public rendering remains coherent

## Result
This resolves the incomplete reference inclusion behavior.

---

# 11. Relationship Versioning

## Decision
Relationships will have **independent revision histories**.

## Resolution
- Relationship is a first-class versioned record.
- Creating, updating, or deleting a relationship creates a relationship revision.
- Deletion is represented as a tombstone-style revision state, not by erasing history.
- Releases include the relationship revision state they depend on.

## Result
This resolves whether relationships are embedded or independently versioned. They are independently versioned.

---

# 12. Mixed-Visibility Entity Modeling

## Decision
Book Worm supports **field-level visibility**, not only entity-level visibility.

## Resolution
- Every entity has a top-level visibility classification.
- Individual fields may also carry visibility classification where needed.
- Storage model:
  - core entity row stores stable shared metadata
  - sensitive fields are represented in structured payloads with field-level visibility metadata
- Serialization rules:
  - API responses are role-shaped
  - unauthorized fields are omitted server-side
- Search rules:
  - only fields safe for the target search scope are indexed

## Result
This resolves the ambiguity around public entities with restricted/private fields.

---

# 13. Precedence Rules for Role, Visibility, Spoiler Tier, and Release State

## Decision
The precedence order is:

1. **role/auth check**
2. **entity visibility check**
3. **field visibility check**
4. **release eligibility check**
5. **spoiler tier filtering**
6. **surface-specific shaping** (search snippet, related panel, preview, export, etc.)

## Resolution
A field or record is shown only if it passes all applicable gates in that order.

### Practical consequences
- A public user never sees restricted/private content, regardless of spoiler mode.
- A public record not in active public release is not shown publicly.
- An editor may see restricted content but still not private fields.
- Spoiler mode reduces exposure only after visibility and release eligibility are satisfied.

## Result
This resolves the missing precedence definition.

---

# 14. Slug Immutability and History

## Decision
Slugs are mutable until first publication, then become immutable as canonical public identifiers.

## Resolution
Before first publication:
- slug changes are allowed
- internal references should resolve by stable internal ID, not slug alone

After first publication:
- slug is frozen
- if a public rename is truly necessary later, create:
  - a new slug alias record
  - a redirect mapping
- original public slug remains historically resolvable

## Result
This resolves the underspecified slug timing issue.

---

# 15. Continuity Rule Configuration Location

## Decision
Continuity rules live in **application code**, while rule thresholds and environment-tunable values live in **version-controlled YAML config**.

## Resolution
- Rule logic is coded and tested in the application.
- Configuration file location:
  - `config/continuity-rules.yml`
- This config is version-controlled in the repo.
- Release records should store the continuity config version/hash used during release validation.

## Result
This resolves the code-vs-YAML ambiguity while preserving reproducibility.

---

# 16. Import/Export Round-Trip Semantics

## Decision
Import/export must preserve **stable identity, structural fidelity, and release clarity**, but exports are not required to be full-fidelity runtime database backups unless explicitly using archive scope.

## Resolution

## External canonical file layout
Recommended export layout:
- `entities/<type>/<slug>.md`
- `chapters/<slug>.md`
- `scenes/<slug>.md`
- `relationships/<source-slug>--<relation>--<target-slug>.json`
- `media/...`
- `manifests/export-manifest.json`
- `releases/<release-slug>.json`

## Identity rules
- internal UUID remains primary identity
- slug remains public/editorial identifier
- exports must include both when allowed
- imports match in this order:
  1. trusted internal ID
  2. stable slug
  3. explicit external import mapping
  4. manual conflict resolution

## Conflict precedence
Default import policy:
- no silent overwrite
- explicit create/update decisioning
- quarantine ambiguous matches

## Fidelity rules
- standard content export preserves current scoped state
- release export preserves release-bound state
- full archive export may include revisions and release metadata
- media manifest must preserve asset linkage

## Result
This resolves the incomplete round-trip semantics.

---

# 17. API Engineering-Level Conventions

## Decision
The API contract is expanded with the following standard conventions.

## Response envelope
```json
{
  "data": {},
  "meta": {},
  "errors": []
}
```

## Pagination
- `page`
- `page_size`
- `total`

## Sorting
- explicit allowlisted sort fields only
- `sort`
- `direction`

## Filtering
- allowlisted filters only
- no arbitrary raw field filtering

## Edit conflict handling
- optimistic locking using revision number or `updated_at`
- mutation fails with conflict error on stale write attempt

## Idempotency
- create/update/delete semantics must be explicit
- import/export jobs use job IDs
- release transitions must reject duplicate invalid transitions

## Error taxonomy
Use stable application codes such as:
- `unauthorized`
- `forbidden`
- `not_found`
- `validation_failed`
- `conflict`
- `release_blocked`
- `dependency_missing`
- `unsafe_scope`
- `internal_error`

## Result
This resolves the engineering-level API underspecification.

---

# 18. MVP Scope Decision

## Decision
The MVP remains broad in concept, but execution must be **narrowly sequenced and gated**.

## Resolution
MVP is allowed to include:
- entity system
- public codex
- reader
- release snapshots
- search
- basic continuity
- import/export
- self-hosting

But delivery must happen in strict gates:
1. foundations
2. representative entity CRUD
3. release-safe rendering
4. public codex/reader
5. search
6. continuity
7. import/export
8. self-host hardening

## Result
This resolves the scope tension by preserving MVP scope while forcing disciplined sequencing.

---

# 19. Beta Features in the API Contract

## Decision
The API contract may document Beta endpoints early, but they must be clearly marked as **future-phase, disabled-by-default surfaces**.

## Resolution
- Comment/proposal endpoints remain in the API contract as reserved future interfaces.
- They are not implemented or exposed in MVP production builds unless explicitly enabled in Beta.
- API docs must clearly mark them as Beta-only.

## Result
This resolves the phase tension without removing forward-looking contract planning.

---

# 20. Dev-Use Search Infrastructure Timing

## Decision
Keeping search infrastructure in dev-use is allowed.

## Resolution
- Search service may exist in the dev stack early for environment stability and faster iteration.
- Product-facing search functionality still lands later per the implementation sequence.
- Infrastructure presence does not imply feature completeness.

## Result
This resolves the tension between infrastructure timing and product sequencing.

---

# 21. Documentation Governance Decision

## Decision
These decisions must be treated as **frozen architecture choices** unless superseded by explicit change control.

## Resolution
Required follow-up:
- update technical foundations
- update API contract
- update build bible
- update release/version semantics
- update import/export specification
- update permissions matrix where needed
- record this resolution document in the documentation matrix

## Result
This resolves the governance gap where documents had maintainers but not frozen decisions.

---

# 22. Expanded Highest-Risk Test Matrix

## Decision
Testing must explicitly enumerate combinations of:
- role
- visibility
- field visibility
- spoiler tier
- release state
- surface type

## Required matrix dimensions
- role: public / editor / author-admin
- entity visibility: public / restricted / private
- field visibility: public / restricted / private
- spoiler tier: spoiler_free / mild_spoiler / full_spoiler
- release state: not included / draft / internal / published-active / archived
- surface:
  - page detail
  - list view
  - search result
  - snippet
  - related panel
  - export
  - API read

## Result
This resolves the testing gap and should be added to the testing matrix documentation.

---

# Final Decision Summary

Book Worm is now resolved as:

- **database-authoritative**
- **single deployable monorepo app**
- **session-authenticated**
- **Express + Prisma**
- **search backend deferred until implementation**
- **object storage backend deferred until implementation**
- **Redux Toolkit for app-level frontend state**
- **release snapshots built from explicit revision pointers**
- **independently versioned relationships**
- **field-level visibility with strict server-side shaping**
- **visibility before spoiler filtering**
- **slugs mutable until first publication, then frozen**
- **continuity logic in code, thresholds in versioned YAML**
- **portable import/export with strict identity handling**
- **API conventions standardized**
- **MVP breadth retained but delivery narrowed by gates**

These decisions should now drive implementation and documentation updates.
