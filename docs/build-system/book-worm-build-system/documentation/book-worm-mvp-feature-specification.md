# MVP Feature Specification: Book Worm

The MVP defines the minimum set of features required to deliver a functional Book Worm installation. Features fall into categories:

## Entity Management

- CRUD for all entity types (Characters, Factions, Locations, Events, Artifacts, Creatures, Belief Systems, Political Bodies, Languages, Secrets, Reveals, Tags, Timeline Eras).
- Relationship management: create and remove links between entities with roles and metadata.
- Metadata editing: status, visibility, spoiler tier, tags, timeline anchors.
- Validation: required fields, unique slugs.

## Public Interface

- Codex: list and detail pages for each entity type; glossary; tag pages; search entry.
- Timeline: chronological display of events grouped by eras; filter by type and tag.
- Atlas: basic map view linking to location pages.
- Chapter reader: list of chapters and scenes by release; reading navigation; progress memory.
- Spoiler control: ability to browse spoiler‑free, mild spoilers or full spoilers.

## Releases & Revisions

- Revision history tracking on entities and chapters.
- Release creation: select revisions to include; assign type (draft/internal/published); add release notes.
- Activation: set a release as active for public viewing.
- Browsing: list releases; inspect contents; delete or archive releases.

## Search

- Full‑text search across titles, aliases, summaries and tags.
- Filtering by entity type, era, faction, tag and spoiler tier.
- Exclusion of restricted/private items based on role.

## Continuity Checks

- Required fields present; no missing dates on events.
- Date ordering: events cannot occur out of sequence relative to timeline anchors.
- Reveal timing: a reveal cannot precede its secret.
- Duplicate slug detection.
- Warnings and errors recorded as continuity issues.

## Import/Export

- Markdown/JSON import with front‑matter mapping to entities and chapters.
- Export of entities, chapters and releases to Markdown/JSON with image references.
- Basic conflict resolution (overwrite or skip existing entries).

## Self‑Hosting & Infrastructure

- Runtime setup guidance; environment examples.
- README with installation and configuration instructions.
- Basic authentication and role management.
- Automated testing of critical paths.
