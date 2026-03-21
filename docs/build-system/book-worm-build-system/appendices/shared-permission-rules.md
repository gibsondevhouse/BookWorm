# Appendix C: Shared Permission Rules

## Roles

- **Public:** Anonymous or authenticated users who have not been granted editorial permissions. They can view published content marked as public in the active release. They cannot view restricted or private material, access the admin UI, or see search results for hidden entities.
- **Editor:** Users who can create and edit entities, chapters, relationships and content drafts. They can propose changes and comment on existing records. Editors can view restricted content but not private secrets. They cannot publish releases or change role assignments.
- **Author/Admin:** Users with full control over the system. They can create, edit, delete and publish content; manage releases and revisions; assign roles; configure settings; and view all content, including private lore. They can bypass spoiler controls and continuity warnings.

## Visibility Levels

- **Public:** Content visible to anyone on the public site. Only published release snapshots marked as public appear here.
- **Restricted:** Content visible to editors and authors but hidden from the public. Examples include draft canon, provisional chapters and continuity notes.
- **Private:** Content visible only to authors/admins. Includes real answers to mysteries, spoilers for upcoming releases, retcons not yet implemented and sensitive editorial discussions.

## Permission Matrix

| Operation                              | Public | Editor | Author/Admin |
| -------------------------------------- | :----: | :----: | :----------: |
| View public codex pages                |   ✓    |   ✓    |      ✓       |
| View restricted content                |   ✗    |   ✓    |      ✓       |
| View private content                   |   ✗    |   ✗    |      ✓       |
| Search public content                  |   ✓    |   ✓    |      ✓       |
| Search restricted content              |   ✗    |   ✓    |      ✓       |
| Create/edit entities & chapters        |   ✗    |   ✓    |      ✓       |
| Delete entities & chapters             |   ✗    |   ✗    |      ✓       |
| Propose changes via comments           |   ✗    |   ✓    |      ✓       |
| Accept/reject proposed changes         |   ✗    |   ✗    |      ✓       |
| Create releases and set active release |   ✗    |   ✗    |      ✓       |
| View continuity issues                 |   ✗    |   ✓    |      ✓       |
| Override/resolve continuity issues     |   ✗    |   ✗    |      ✓       |
| Manage roles and settings              |   ✗    |   ✗    |      ✓       |

All API endpoints, UI pages and search queries must enforce these rules. Never rely on client‑side hiding alone; the backend must filter data based on user role.
