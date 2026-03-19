# MVP: Feature Set

1. **Comprehensive entity management** — Admin interface for creating, editing, relating and deleting all defined entity types. Includes metadata fields, visibility settings, spoiler tiers, tag assignment and timeline anchors.
2. **Public codex** — User‑facing pages for Characters, Factions, Locations, Events, Artifacts, Creatures, Belief Systems, Political Bodies, Languages, Secrets, Reveals, Tags and Timeline Eras. Each page displays core metadata, related items and spoiler warnings.
3. **Timeline view** — Chronological listing of events grouped by eras with filtering by event type and tag. Links to associated characters and factions.
4. **Chapter reader** — Interface for reading chapters and scenes. Supports edition selection (release) and table of contents. Tracks reading progress per user (locally for now).
5. **Revision and release system** — Mechanisms to snapshot the current state of the database, label releases (e.g. draft, internal, published), and set the active release for the public site. Ability to browse previous releases.
6. **Search** — Full‑text search across titles, aliases, summaries and tags with filters. Spoiler-aware and role-aware indexing and query processing.
7. **Continuity engine** — Baseline validations for required metadata, date ordering, reveal timing and duplicate slug detection. Continuity issues recorded with severity and status.
8. **Import/export** — Tools to read Markdown/JSON (with front‑matter) into entities and to export the database back to files. Handles image references through the active storage adapter.
9. **Self‑hosting infrastructure** — Environment examples, backup script, restore instructions, and runtime setup guidance for database and storage.
10. **Documentation and basic test suite** — Author usage documentation, admin guide, developer doc and automated tests for critical paths.
