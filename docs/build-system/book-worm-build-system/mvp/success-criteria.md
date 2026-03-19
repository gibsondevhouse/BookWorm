# MVP: Success Criteria

The MVP phase is successful when:

- All core entity types (Character, Faction, Location, Event, Artifact, Creature, Belief System, Political Body, Language, Secret, Reveal, Tag, Timeline Era) can be created, edited, related and deleted through the admin UI with validation.
- The public site displays a polished codex with lists and detail pages for each entity type, a timeline view grouped by eras and a chapter reader with navigation. Spoiler controls are implemented.
- Release snapshots can be created, listed, compared and published. Public pages always render from the selected release. Authors can browse historical releases.
- The search interface returns relevant results across all indexed fields and filters by type, era, faction and spoiler tier. Hidden/private items never appear in search.
- The continuity engine runs on drafts and releases, flagging missing required metadata, date inconsistencies and basic reveal‑before‑secret violations.
- Import and export can ingest and output the entire site (entities, chapters, relationships, releases) without data loss. Conflicts are surfaced with clear messages.
- The application starts through the documented local runtime flow and includes a README describing how to configure environment variables, run migrations and seed data.
- Basic automated tests (unit, integration and end‑to‑end) run and pass in the CI workflow.
