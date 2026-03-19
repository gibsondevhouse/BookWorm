# Release & Version Semantics Specification

This document defines the semantics of revisions, releases and version numbers within Book Worm.

## Revisions
- Every change to an entity or chapter creates a new revision. Revisions record the changed fields, timestamp, author and optional notes.
- Revisions are immutable; you cannot modify a revision after it is created. To change an entity, a new revision is created.
- Revisions belong to entities; they do not automatically affect other entities. Relationships also record revisions when created or modified.

## Releases
- A release is a snapshot of selected revisions across the database. It groups revisions into a coherent edition of the world.
- Releases have types (draft, internal, published, archived) and a name/slug. Only one release can be active at a time for the public site.
- Releases include metadata: creation date, author, notes and the list of included revision IDs. Additional metadata such as tags or semantic version can be added.
- Releases are immutable once published. To change the public canon, create a new release selecting different revisions.

## Version Numbers
- Book Worm itself follows semantic versioning (MAJOR.MINOR.PATCH). v1.0.0 is the first public release. Patches increment PATCH (v1.0.1) and may include bug fixes and minor improvements that do not alter the domain model or APIs. Minor releases increment MINOR (v1.1.0) and may include new features that are backwards compatible. Major releases increment MAJOR and may include breaking changes to the schema or API.
- Releases created by authors can use any naming scheme, but it is recommended to use semantic versioning or descriptive names (e.g. `canon-1.0`, `beta-reader-3`). The system should support sorting by creation date or semantic version if provided.

## Diffing & Migration
- The system should support generating diffs between two releases or two revisions. Diffs list added, removed and changed fields and relations.
- When migrating from one release to another (e.g. updating published pages), ensure that referential integrity holds: all referenced entities and scenes exist in the target release.
- If a new version of Book Worm introduces schema changes, provide migration scripts to update databases and data files from the old version to the new one.

## Compatibility & Backups
- Releases created under an older version of Book Worm should remain viewable after an upgrade. The application must include migration logic to adapt old release metadata or structures.
- Backups should include release metadata, revision IDs and content so that a release can be restored even after version upgrades.
