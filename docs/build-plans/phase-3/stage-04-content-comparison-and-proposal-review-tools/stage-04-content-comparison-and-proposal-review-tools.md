# Stage 04: Content Comparison and Proposal Review Tools

## Purpose

Add content comparison and proposal preview capabilities so reviewers can understand exactly what changes a proposal will introduce before acceptance, and authors can compare different revisions to understand content evolution.

## Outcome

At the end of Stage 04, the project should have:

- unified diff engine comparing two content revisions (show what changed: added, removed, modified)
- proposal preview API showing current content vs. proposed content side-by-side (for CREATE, UPDATE, DELETE scenarios)
- revision comparison capability to browse and compare any two historical revisions in release or draft
- change impact summary (affected relationships, dependent content, timeline anchors) for proposals
- visual diff representation (character-level, field-level, relationship-level) with clear change markers
- version timeline showing all revisions for a piece of content with creation/modification timestamps
- rejection reason attachment to failed proposals so submitters understand why changes were not accepted
- no approval chain gates (diff and comparison are read-only tools for decision-makers)

## Included Parts

### Part 01: Unified Diff Engine [x]

Build a content diffing engine that compares two revisions of content and generates structured change records (added fields, removed fields, modified fields with before/after values, relationship changes). Support diffing at field level and relationship level. Store diff results as immutable records in the database keyed by `(contentId, revisionId1, revisionId2)`. Ensure diffs can be generated on demand through admin diff endpoints and stored for historical reuse. Handle entity types (CHARACTER, FACTION, EVENT, etc.) and manuscript content uniformly with field-aware comparison.

Implementation note: Diff results are now persisted and reused through deterministic content-identity caching, with structured support for entity and manuscript revision pairs. Output ordering is deterministic and the diff flow is read-only. Relationship-level diff coverage is currently limited to relationship dependency entries embedded in entity payloads; standalone relationship revision diffing remains outside Part 01.

### Part 02: Proposal Preview and Impact Analysis [x]

Add preview endpoints that show what content would look like if a proposal were applied, without requiring application. Generate structured change summary for each proposal including field changes, relationship additions/deletions, and metadata impacts. For DELETE proposals, show what content would be removed and which relationships depend on it. Return rejection reason on REJECTED proposals so submitters and admins can see why the change was declined. Ensure preview is read-only and does not constitute an approval or commit action.

Implementation note: The read-only preview route returns current and proposed snapshots for entity and manuscript proposals, plus structured `changeSummary` and `impactSummary` payloads. For DELETE previews, impact reporting is limited to direct relationship keys, dependency references inferred from other entity revision payloads, and aggregate counts (revisions, release entries, proposals, comments, continuity issues); recursive or transitive impact analysis is not included in Part 02. Rejection reason visibility is available on REJECTED proposals via `decisionNote` fallback to `reviewNotes` for authorized viewers.

### Part 03: Revision Timeline and History Browsing [x]

Implement revision history timeline showing all versions of a piece of content with creation timestamp, modifier identity, and associated proposal linkage (if created from accepted proposal). Add query endpoints to retrieve any two revisions from the same content target and generate comparison (via Part 01 diff engine). Support filtering revision history by date range, by proposal, and by modifier. Include manuscript revisions and entity revisions in unified timeline. Timeline responses preserve proposal/application linkage; compare responses remain focused on deterministic diff payloads.

## Exit Criteria

- diff engine correctly identifies added, removed, and modified fields between two revisions ✓
- diffs handle entity relationships (connections) and show when relationships are added/removed ✓
- diffs are generated on demand and stored immutably for revision pairs ✓
- proposal preview endpoint shows final content state after proposed changes without requiring application ✓
- proposal preview includes change summary (what fields changed, relationships affected, impact scope) ✓
- DELETE proposals show rejection or deletion impact (what depends on deleted content) ✓
- rejection reason is attached to REJECTED proposals and visible to submitter ✓
- revision history timeline shows all versions with creation-derived timestamps and modifier metadata (immutable revision rows) ✓
- all revision comparisons can be generated for any two historical revisions on the same target ✓
- revision filtering by date range, proposal, and modifier works correctly ✓
- diff and comparison tools are read-only; no changes are made through comparison routes ✓
- diff, preview, and history paths have dedicated acceptance coverage ✓
- phase tracker updated

## Status

**Complete [x]** — Parts 01, 02, and 03 complete
