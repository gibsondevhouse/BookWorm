# System Architecture Principles: Book Worm

Book Worm’s architecture must balance strictness with simplicity. The platform is more than a website; it is a knowledge system with multiple domains—public codex, admin UI, content repository, continuity engine, release management, search and import/export. Sloppy architecture leads to data drift, leaks and technical debt. The principles include:

- **Strict Domain Boundaries:** Separate concerns like authentication, content storage, search indexing, release management and continuity checks. Avoid monolithic catch‑all services.
- **Stable Schemas:** Define and version schemas for entities, relationships, releases and revisions. Avoid ad hoc fields and migrations.
- **Clear Source of Truth:** The database is authoritative for entity records; releases snapshot them for publication; search is derived; Markdown files are inputs, not runtime truth.
- **Explicit Visibility & Permissions:** Visibility tiers (public, restricted, private) must be enforced in the schema and API. Role checks happen server‑side.
- **Versioning & Releases:** Entities and chapters have revision histories; releases select revisions for publication. Releases are immutable once published.
- **Derivation & Caching:** Derived data (search indexes, timeline ordering) should never be treated as canonical. Compute or invalidate caches when underlying data changes.
- **Continuity Engine:** Build continuity validation as a first‑class subsystem with rules, severity levels and override mechanisms.
- **Simple Deployment:** Use a monorepo or single application where possible. Avoid over‑complex microservices. Support direct-hosted services, backups, and monitoring.
- **Incremental Hardening:** Start with a working skeleton; add complexity only when necessary (search, continuity, import/export). Use a phased approach to reduce risk.
