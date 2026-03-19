# Appendix D: Shared Release Rules

## Release Types

- **Draft:** A work‑in‑progress snapshot used for internal review and editing. Draft releases are not visible publicly.
- **Internal:** A release shared with editors and authors for collaboration and testing. Not visible to public users.
- **Published:** A release made available to public users. It defines the canonical state of the world at a given time.
- **Archived:** A historical release retained for reference. It cannot be edited but may be browsed by authorised users.

## Release Lifecycle

1. **Creation:** An Author/Admin can create a release by selecting revisions of entities, relationships and chapters to include. At creation time, the system validates that all references exist and there are no unresolved continuity issues.
2. **Review:** Editors and authors review the release contents, run continuity checks and verify that the content is coherent and ready. Release notes are drafted describing major changes.
3. **Publication:** An Author/Admin publishes the release. Once published, a release’s contents cannot be modified, though it can be deprecated or archived. The public site points to the most recently published release designated as active.
4. **Activation:** The published release is set as active. Public users see only the active release’s content. Editors and authors may still browse other releases.
5. **Deprecation or Archival:** Older releases can be deprecated or archived. Archived releases remain accessible for reference but cannot be edited or reactivated without cloning.

## Release Integrity Rules

- All entities included in a release must have complete required fields and valid relations. Missing mandatory metadata prevents release creation.
- Once a release is published, its contents must remain immutable. To fix an issue, create a new release from updated revisions.
- Entities may only belong to one release per version stream. For major rewrites, create a new version stream (e.g. v2) and manage compatibility.
- Do not delete releases that are referenced in citations or published materials. Instead mark them as archived.
- Search and public pages must only query content from the active release and not leak entities from draft or internal releases.
