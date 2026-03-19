# Part 01: Remaining Entity Type Schema

## Objective

Model the remaining MVP entity and manuscript types so Book Worm can move past the early representative content set without breaking revision and release composition rules.

## Work To Be Done

- identify the next set of entity and manuscript types required by the MVP scope
- extend the schema, repositories, and revision payload rules for those types
- define how each type participates in release composition and public resolution
- preserve compatibility with existing dependency and validation behavior
- document any deliberately deferred type-specific complexity

## Current Part 01 Scope

This part should land the schema foundation for the documented MVP set before broader CRUD or public rendering begins.

### Entity Types To Add

- Location
- Event
- Artifact
- Creature
- Belief System
- Political Body
- Language
- Secret
- Reveal
- Tag
- Timeline Era

### Manuscript Types To Add

- Chapter
- Scene

### Modeling Constraints

- keep the current pointer-based release model intact by introducing release-bound manuscript revision entries instead of denormalized publication tables
- keep manuscript versioning parallel to entity versioning so later search, continuity, import/export, and release validation can reason over both with the same revision semantics
- defer type-specific authoring fields to typed revision payloads and later CRUD work; this part should only establish unambiguous schema primitives and release participation hooks

## Deliverables

- expanded MVP schema coverage
- revision-safe persistence rules for the added types
- documented participation rules for release composition

## Dependencies

- Phase 1 complete enough that the existing revision and release spine is stable

## Completion Check

- the selected MVP types can be represented without schema-side ambiguity
- newly modeled types can be referenced consistently by later public, search, and continuity work

## Status

**Complete** — 2026-03-18

### Evidence

- Migration `20260318184500_expand_mvp_entity_types_and_add_manuscripts` delivers all required schema additions in a single atomic migration.
- `prisma/schema.prisma` `EntityType` enum contains all eleven required entity values: `LOCATION`, `EVENT`, `ARTIFACT`, `CREATURE`, `BELIEF_SYSTEM`, `POLITICAL_BODY`, `LANGUAGE`, `SECRET`, `REVEAL`, `TAG`, `TIMELINE_ERA`.
- `ManuscriptType` enum contains both required values: `CHAPTER`, `SCENE`.
- `Manuscript`, `ManuscriptRevision`, and `ReleaseManuscriptEntry` tables created with revision-safe fields and release participation hooks, satisfying the Modeling Constraints above.
- Existing revision and release spine left intact; no breaking changes to Phase 0 or Phase 1 migrations.

### Completion Check Results

- [x] All eleven required entity types representable without schema ambiguity.
- [x] Both manuscript types (`CHAPTER`, `SCENE`) established as an enum with parallel versioning structure.
- [x] Manuscripts participate in release composition via `ReleaseManuscriptEntry`.
- [x] Existing Character, Faction, and relationship revision behavior unchanged.

### Unblocks

- Part 02: Full Admin CRUD Coverage (depends on all entity and manuscript types existing in schema — now satisfied)
