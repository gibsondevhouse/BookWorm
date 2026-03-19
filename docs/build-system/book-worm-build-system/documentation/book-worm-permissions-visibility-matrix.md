# Permissions & Visibility Matrix: Book Worm

This document defines which actions are permitted for each role (Public, Editor, Author/Admin) and how visibility levels are applied. See Appendix C for the detailed matrix. In summary:

- **Public users** can view only published releases and only fields marked as public. They cannot see restricted or private fields, nor can they search hidden content.
- **Editors** can view and edit restricted content but cannot see private items (deep lore, spoilers, twist architecture). They can propose changes and comment, but they cannot publish releases or change visibility.
- **Author/Admin users** have unrestricted access to all content, including secrets and hidden fields. They can create, edit, delete, publish, assign roles, manage releases and override continuity issues.

Visibility levels determine which users see which fields. Entities may have nested fields with different visibility (e.g. a public summary and a restricted detailed history). At the API level, queries must filter out non‑visible fields based on the requesting user’s role.
