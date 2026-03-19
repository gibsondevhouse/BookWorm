# Domain Model & Schema Specification: Book Worm

This specification defines the core entity types, relationships, fields and behaviours in Book Worm. Each entity is stored as a record with metadata, relations, visibility and revision history. Key types include:

## Core Entities

| Type            | Purpose                                                      |
|-----------------|--------------------------------------------------------------|
| Character       | A person in the story. Fields: name, slug, summary, aliases, traits, affiliations, wants/needs, voice, relations to factions, events, locations and secrets. Metadata: status (canon/provisional/deprecated), visibility (public/restricted/private), spoiler tier, tags, first/last appearance, timeline anchors, secrets, related events. |
| Faction         | An organization, family or house. Fields: name, slug, summary, type (empire, guild, insurgency), ideology, structure, notable members, relations to characters, events and locations. |
| Location        | A place in the world. Fields: name, slug, description, geography, region, coordinates, map image reference, relations to events, factions and characters. |
| Event           | Something that happens. Fields: name, slug, summary, date (or date range), era, significance, participants, outcomes, relations to characters, factions, locations, artifacts, secrets. |
| Artifact        | A significant object. Fields: name, slug, description, origin, properties, current owner, relations to characters, events and factions. |
| Creature        | A non‑humanoid species or monster. Fields: name, slug, habitat, behaviour, powers, relations. |
| Belief System   | A religion, philosophy or magic system. Fields: name, slug, doctrine, rituals, taboos, powers, relations. |
| Political Body  | A state or government. Fields: name, slug, structure, laws, leaders, relations to events and factions. |
| Language        | A language or dialect. Fields: name, slug, script, speaker regions, examples, relations. |
| Secret          | A hidden truth. Fields: name, slug, description, holders (characters/factions), reveal event, relations. |
| Reveal          | An event or scene where a secret is exposed. Fields: name, slug, event reference, affected entities. |
| Tag             | A keyword used to group entities. Fields: name, slug, description. Tags are free‑form and apply to any entity. |
| Timeline Era    | A named period in history. Fields: name, slug, start date, end date, summary. Eras group events and serve as top‑level timeline categories. |

## Manuscript Entities

| Type            | Purpose                                                      |
|-----------------|--------------------------------------------------------------|
| Chapter         | A section of the manuscript. Fields: number, slug, title, summary, body (Markdown), POV character, relations to scenes, timeline anchors, release associations. |
| Scene           | A subsection of a chapter. Fields: slug, chapter reference, summary, body (Markdown), timestamp, location, participants. Scenes may reference events or secrets. |

## System Entities

| Type            | Purpose                                                      |
|-----------------|--------------------------------------------------------------|
| Relationship    | Connects two entities with a type (e.g. Character → Faction membership, Character → Event participation). Fields: subject_id, subject_type, relation_type, object_id, object_type, metadata (e.g. role, strength), visibility. |
| Revision        | Captures changes to an entity. Fields: entity_id, entity_type, changed_fields, timestamp, author_id, notes. |
| Release         | Groups revisions into a snapshot. Fields: name, slug, type (draft/internal/published/archived), created_at, active status, included_revisions, release_notes. |
| ContinuityIssue | Records a continuity violation. Fields: entity_ids, scene_ids, rule_id, severity, description, status (open, resolved, accepted), notes. |

## Fields and Behaviours

- **Slug:** A stable, URL‑safe identifier derived from the name. Must be unique per entity type. Slugs are immutable once published.
- **Status:** Indicates whether an entity is canon, provisional, deprecated or hidden. Non‑canon entities can exist but may be excluded from releases.
- **Visibility:** Determines who can see the entity (public, restricted, private). Entities may have restricted or private fields even if the entity is public.
- **Spoiler Tier:** Levels (0–2) controlling spoiler exposure. Tier 0 is spoiler‑free; Tier 1 reveals mild spoilers; Tier 2 is full spoilers.
- **Tags:** Many‑to‑many relation between entities and tags. Tags allow grouping and filtering.
- **Related Entities:** Relationships store typed connections and metadata. They are versioned and included in releases.
- **Timeline Anchors:** Entities and scenes can specify dates or date ranges. Events and eras require dates; chapters optionally anchor to timeline points. Anchors support continuity checks.
- **Revisions & Releases:** Whenever an entity changes, a revision is created. Releases aggregate revisions. Public pages read from releases; admin views show live revisions.
- **Continuity Rules:** Rules operate on entities and scenes to detect missing required fields, date inconsistencies, reveal timing, age anomalies and travel implausibility. Each rule has a severity (error, warning) and may be configured or overridden.
