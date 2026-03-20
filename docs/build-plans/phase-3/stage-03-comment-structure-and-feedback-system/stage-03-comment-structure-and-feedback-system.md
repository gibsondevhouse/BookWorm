# Stage 03: Comment Structure and Feedback System

## Purpose

Enhance the Stage 01 comment thread model with structured feedback types, severity levels, and internal editing guidance to enable richer, more organized discussion and review feedback without adding notifications or templating systems.

## Outcome

At the end of Stage 03, the project should have:

- comment types (GENERAL, QUESTION, SUGGESTION, CONCERN, RESOLVED) with semantic meaning for discussion tracking
- feedback severity levels (INFO, MINOR, MAJOR) to help reviewers flag importance without approval chain semantics
- structured feedback tags (SPELLING, FACTUAL, CONSISTENCY, CLARITY, TONE) for internal editing guidance
- comment metadata tracking (type, severity, tags, status) across comment creation, update, and read surfaces
- comment edit history preserved with versioning (original, edit timestamp, editor, edit reason)
- comment state progression (ACTIVE, RESOLVED, ARCHIVED) for lifecycle management
- read-only access to edit history allowing reviewers to see how feedback evolved

## Included Parts

### Part 01: Comment Types and Feedback Structure [x]

Extend comment schema with `type` enum (GENERAL, QUESTION, SUGGESTION, CONCERN, RESOLVED), `severity` enum (INFO, MINOR, MAJOR), and `tags` array supporting feedback categories (SPELLING, FACTUAL, CONSISTENCY, CLARITY, TONE). Add comment creation/update routes that accept type, severity, and tags. Parse tags and type from comment metadata without requiring templating or pre-defined request categories. Ensure type and severity are stored in audit trail.

Implementation note (Part 01):

- Enums and structure: comment metadata now supports `type`, `severity`, and normalized `tags` values using the Stage 03 Part 01 enum set.
- Defaults and backward compatibility: legacy comments without metadata continue to read/write with defaulted values so existing threads remain valid.
- Validation and normalization: incoming metadata is validated against allowed enum/tag values; invalid entries are rejected and accepted tags are normalized before persistence.

### Part 02: Comment Status and Lifecycle [x]

Implement comment state progression: `ACTIVE` → `RESOLVED` → `ARCHIVED`. Add state transition endpoints with role-gated transitions and transition error handling. Allow authenticated collaborators to resolve/reopen comments and admin-only archival without introducing approval workflows. Ensure status changes are visible on comment read surfaces; status history/versioning remains pending Part 03.

### Part 03: Comment Edit History and Metadata Versioning [x]

Preserve all comment edits with version history: original text, edit timestamp, editor identity, and explicit edit reason. Add a read-only history endpoint under the comment router namespace, ordered deterministically by ascending version number. Ensure all body, metadata, and lifecycle status edits are recorded in immutable version records.

Implementation note (Part 03):

- Immutable version records: comment body edits, metadata edits, and lifecycle status transitions each increment the comment version and write a separate `commentVersion` row capturing previous and resulting values.
- History endpoint behavior: `GET /comments/:commentId/history` is read-only and returns deterministic ascending history ordered by version, then timestamp, then id.
- Fallback edit reasons: omitted reasons are filled deterministically as `Comment body updated`, `Comment metadata updated`, `Comment body and metadata updated`, or lifecycle defaults such as `Comment resolved`.

## Exit Criteria

- comment types (GENERAL, QUESTION, SUGGESTION, CONCERN, RESOLVED) are implemented and recorded in audit trail ✓
- feedback severity levels (INFO, MINOR, MAJOR) can be set on comment creation and update ✓
- feedback tags (SPELLING, FACTUAL, CONSISTENCY, CLARITY, TONE) can be added/removed from comments ✓
- comment state progression (ACTIVE, RESOLVED, ARCHIVED) works with state transition endpoints ✓
- comment edit history is preserved with version records including timestamp, editor, reason ✓
- comment history endpoint returns read-only ascending version records for visible comments ✓
- comment type and severity values organize discussion without introducing approval gates ✓
- comment history visibility remains collaborator-only and returns 404 for missing comments ✓
- dedicated tests cover Parts 01-03 feedback structure, lifecycle transitions, and history/versioning paths ✓
- phase tracker updated

## Status

**Complete [x]** — Parts 01-03 implemented and verified; Stage 04 is the next pending comment/proposal review stage
