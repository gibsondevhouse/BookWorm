# Continuity Engine Specification

The continuity engine validates narrative consistency across entities, chapters and releases. It contains a set of rules, each with inputs, severity and remediation options.

## Rule Categories and Examples

1. **Required Field Rule** — Ensures that mandatory fields (e.g. event date, character birth year) are populated. Severity: error. Fix by adding the missing field.
2. **Chronological Order Rule** — Checks that event dates respect the timeline; an event cannot occur before its precondition event. Severity: error. Fix by adjusting dates or adding justification.
3. **Reveal Timing Rule** — Ensures that a secret is not referenced or known by characters before its reveal event. Severity: warning (may be overridden). Fix by moving reveal or adjusting references.
4. **Duplicate Slug Rule** — Detects identical slugs within the same entity type. Severity: error. Fix by choosing a unique slug.
5. **Travel Time Plausibility (Beta)** — Verifies that travel between locations is possible within the time between scenes. Requires distance matrix and travel speed. Severity: warning. Fix by adjusting timelines or clarifying travel methods.
6. **Age Consistency (Beta)** — Ensures that characters’ ages at events are consistent with birth years and lifespan. Severity: error. Fix by adjusting dates or birth years.
7. **Inheritance/Succession Rule (Beta)** — Checks that title changes occur after appropriate events. Severity: warning. Fix by adjusting event ordering or adding inheritance events.
8. **Magic System Constraint (Beta)** — Validates that magic usage obeys defined rules (costs, limits). Severity: warning. Fix by rewriting scenes or adjusting magic rules.

## Rule Execution
- Rules run when an entity or chapter is saved and when a release is compiled. Failures block publishing for errors; warnings allow publishing but display issues in the continuity dashboard.
- Rules can be configured with thresholds or disabled entirely by authors with justification. Each override must include notes and is tracked.
- Each issue includes: involved entity IDs, a description, rule ID, severity, status (open, resolved, ignored) and a link to the offending record.

## Continuity Dashboard
- Lists all open issues, filtered by severity and status.
- Allows authors to assign issues to editors for resolution.
- Provides actions to mark issues as resolved (after editing), ignored (with justification) or reopened.
- Summarises unresolved issues by release and rule category.

## Future Extensions
- Additional rules can be added post‑v1 for complex logic (e.g. genealogical consistency, conflicting allegiances, cross‑book continuity). The engine must be extensible.
- Rule definitions should live in code but be configurable via YAML/JSON to adjust thresholds (e.g. travel speed) without code changes.
