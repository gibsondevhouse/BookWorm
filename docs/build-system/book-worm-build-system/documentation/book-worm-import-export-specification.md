# Import/Export Specification

Book Worm must allow authors to import content from Markdown/JSON files and export content into the same formats. Import/export ensures portability and offline editing.

## Import
- **Supported Formats:** Markdown files with front‑matter (YAML) and JSON files. Each file represents an entity or chapter. A zip archive can contain many files and media assets.
- **File Naming:** Use `type/slug.md` or `type/slug.json` (e.g. `characters/elias-vale.md`). Slugs must match those defined in the front‑matter. Media files (e.g. images) go in a `media` folder.
- **Front‑Matter Structure:** Contains metadata keys (name, slug, summary, status, visibility, spoilerTier, tags, relations, timeline anchors, release association). Relations use slugs of related entities.
- **Import Process:**
  1. Validate file naming and front‑matter structure.
  2. Check for existing entities with the same slug. If found, handle according to the conflict strategy (overwrite, skip, merge).
  3. Create or update the entity record. Resolve relations by slug; if related entities are missing, flag an error.
  4. Store media assets using the active storage adapter and update references.
  5. Log progress and errors. Abort if the error rate exceeds a threshold.
- **Conflict Strategies:**
  - **Overwrite:** Replace existing content with imported data.
  - **Skip:** Ignore imported records that already exist.
  - **Merge:** Merge fields and add missing relations; existing data takes precedence unless explicitly replaced.

## Export
- **Scope:** Exports can include a single entity, a set of entities, an entire release or the whole database.
- **Format:** Markdown files with front‑matter (including relations) or JSON files. Media assets included in a `media` folder. Entities grouped into type folders.
- **Release Awareness:** When exporting a release, include only the revisions included in that release. Mark release metadata in the front‑matter.
- **Naming Conventions:** Use canonical slugs for file names. For releases, include the release slug and version number in the archive name.
- **Process:**
  1. Select scope (entity type, tags, release).
  2. Collect entities, chapters and relations within scope.
  3. Serialize each item into Markdown/JSON with correct front‑matter.
  4. Copy associated media files.
  5. Package as a zip archive and generate a manifest file (list of included files, release slug, export date, checksum).

## Logs & Reporting
- Import and export operations generate logs, including start/end time, number of records processed, successes, warnings and errors. Logs are stored in the database for review.
- A UI for monitoring import/export status shows progress and errors in real time.

## Validation & Testing
- Include unit tests for parsing and serialization functions.
- Test round‑trip: import content, export it and compare the result with the original.
- Provide sample data sets for testing import and export functions in CI.
