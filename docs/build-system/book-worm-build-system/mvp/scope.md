# MVP: Scope

Included:

- Implementation of all core entity models and their relations defined in the Domain Model.
- Creation of admin CRUD interfaces for every entity type, including tag management and timeline anchors.
- A public codex with list pages, detail pages, glossary and tag pages. Integration of map images if provided.
- A timeline page with era grouping and event ordering. Basic filters by era and entity type.
- Chapter reader with edition selection, table of contents and reading navigation. Basic progress saving client‑side.
- Revision history and releases, including creation, publication, deletion and browsing of releases. Diffing is out of scope for the MVP.
- Search engine indexing all public entities and chapters with filter controls and spoiler safety.
- Basic continuity engine with checks for mandatory fields, date ordering, reveal timing and duplicate slugs.
- Import/export of content in Markdown/JSON for all entity types and chapters. Support for images stored through an abstracted storage layer.
- Self‑hosting with example `.env` files and documented runtime setup for PostgreSQL plus any later search or storage services the implemented feature set requires.
- Basic unit and integration tests, plus minimal end‑to‑end tests for creating an entity and reading it publicly.

Excluded:

- Editor comments and proposals; only simple administrative editing is available.
- Visual graph representations of relationships.
- Retcon proposals and detailed continuity review workflow.
- Public changelog or diff viewer for releases.
- Offline/desktop build or mobile applications.
