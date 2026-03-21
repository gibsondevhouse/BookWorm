# Beta: Phased Plan

## Phase 01: UX Hardening

- Conduct a comprehensive UX and accessibility review using tools and manual testing. Identify issues with layout, colour contrast, navigation, component behaviour and responsiveness.
- Implement improvements: refine navigation bar, adjust type sizes, fix spacing, improve form usability, add keyboard navigation support and ensure WCAG compliance.
- Add polished loading states, error states and empty states across the public and admin interfaces.

## Phase 02: Editor Workflows

- Implement comment threads on entity and chapter pages. Comments should support Markdown and mention specific fields.
- Allow editors to propose changes to an entity. Proposed changes create a draft revision that does not alter the canonical record until approved.
- Build a review queue where authors can view proposed changes, compare them against the current state, and accept or reject them. Acceptance creates a new revision; rejection archives the proposal.
- Add a dashboard summarising pending proposals and comments by status.

## Phase 03: Release Review and Historical Inspection

- Implement a diff viewer to compare two releases or two revisions of an entity or chapter. Highlight changed fields, added or removed relations and textual differences in Markdown.
- Provide navigation to browse older releases and inspect their content without affecting the current release.
- Allow authors to annotate releases with notes explaining major changes.

## Phase 04: Search Relevance and Safety Tuning

- Integrate fuzzy search capabilities (typo tolerance) into the search service. Index synonyms and alias fields.
- Adjust the ranking algorithm to consider recency, release status, relevance and entity popularity.
- Implement query suggestions based on indexed vocabulary and user search history (locally stored for now).
- Validate that spoiler and visibility rules remain correctly enforced with the new search features.

## Phase 05: Continuity Engine Expansion

- Extend continuity rules to cover travel time: compute plausible travel durations between locations and flag scenes that violate travel constraints.
- Implement age consistency checks: ensure characters’ ages align with birth year and event dates.
- Add title inheritance rules: ensure succession events occur before titles change; flag inconsistencies.
- Validate that magic/rule system usage follows defined constraints (e.g. costs, limitations).
- Provide configuration options for rule thresholds and allow authors to justify exceptions.

## Phase 06: Import/Export Maturity

- Support zipped packages containing Markdown, JSON and media. Parse package manifests to map files to entities and relations.
- Implement conflict resolution strategies: overwrite existing data, skip conflicting items or merge differences manually.
- Create an import/export status page showing progress and logs. Allow users to cancel and rollback imports if they fail.
- Improve export to include release-specific data and attachments with consistent naming.

## Phase 07: Ops, Backups and Observability

- Set up centralised logging (e.g. using Loki or ELK stack) and metrics collection (Prometheus). Provide dashboards for resource usage and request latencies.
- Add health endpoints for each service and integrate them into local runtime operations and monitoring systems.
- Implement automated backups of the database, search index and object storage. Store backups securely and document retention policies.
- Write restore scripts to recover from backups and verify them periodically.

## Phase 08: Beta Feedback Integration

- Collect feedback from Beta testers through surveys, interviews and issue trackers. Categorise feedback into usability, feature requests and bugs.
- Prioritise feedback and integrate critical changes into the product. Address blocking issues before v1.
- Refine documentation based on tester questions. Update guides, FAQs and tooltips to address confusing areas.
- Prepare the v1 scope by identifying remaining work, deferring non‑essential items and planning the final polish.
