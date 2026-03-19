# API Contract Specification

This specification defines the public and internal API endpoints, request/response formats and behaviours. All endpoints assume JSON payloads and authentication via JWT or sessions.

## Authentication
- `POST /api/auth/register` — Create a new user (restricted to Author/Admin). Payload: `{ email, password, role }`. Response: `{ id, email, role }`.
- `POST /api/auth/login` — Log in. Payload: `{ email, password }`. Response: `{ token, user }`.
- `POST /api/auth/logout` — Log out and invalidate session. Response: `204 No Content`.

## Entities
- `GET /api/:type` — List entities of a given type (`characters`, `factions`, etc.). Query parameters: `page`, `limit`, `visibility`, `release`. Returns paginated list of entities visible to the caller.
- `POST /api/:type` — Create a new entity. Payload: entity fields. Requires Editor or Author/Admin. Returns created entity.
- `GET /api/:type/:slug` — Get an entity by slug. Query: `release` (optional). Returns entity data for the specified release or current revision.
- `PUT /api/:type/:slug` — Update an entity. Payload: updated fields. Requires Editor or Author/Admin. Returns updated entity and revision metadata.
- `DELETE /api/:type/:slug` — Delete an entity. Requires Author/Admin. Returns 204.

## Relationships
- `POST /api/relationships` — Create a relation. Payload: `{ subjectId, subjectType, relationType, objectId, objectType, metadata }`. Requires Editor or Author/Admin. Returns relation.
- `DELETE /api/relationships/:id` — Remove a relation. Requires Author/Admin. Returns 204.

## Releases
- `GET /api/releases` — List releases. Query: `type` (`draft`, `internal`, `published`, `archived`), `page`, `limit`. Returns releases visible to the caller.
- `POST /api/releases` — Create a release. Payload: `{ name, type, notes, includedRevisionIds }`. Requires Author/Admin.
- `POST /api/releases/:id/publish` — Publish a release. Requires Author/Admin. Returns published release.
- `POST /api/releases/:id/activate` — Set a release as the active release for public viewing. Requires Author/Admin.
- `DELETE /api/releases/:id` — Delete a non‑active release. Requires Author/Admin.

## Search
- `GET /api/search` — Search across entities and chapters. Query: `q`, `types`, `spoiler`, `release`, `page`, `limit`. Returns search results with metadata. Respects role and visibility.

## Continuity
- `GET /api/continuity/issues` — List continuity issues. Query: `severity`, `status`, `entityId`, `page`, `limit`. Requires Editor or Author/Admin.
- `POST /api/continuity/issues/:id/resolve` — Mark an issue as resolved. Requires Author/Admin.
- `POST /api/continuity/issues/:id/ignore` — Mark an issue as ignored with justification. Payload: `{ justification }`. Requires Author/Admin.

## Comments & Proposals (Beta)
- `POST /api/comments` — Create a comment on an entity or chapter. Payload: `{ entityId, entityType, body }`. Requires Editor or Author/Admin.
- `POST /api/proposals` — Submit a proposed change. Payload: `{ entityId, entityType, changes }`. Requires Editor or Author/Admin.
- `POST /api/proposals/:id/accept` — Accept a proposal, creating a revision. Requires Author/Admin.
- `POST /api/proposals/:id/reject` — Reject a proposal. Requires Author/Admin.

## Import/Export
- `POST /api/import` — Import a zip archive. Accepts `multipart/form-data`. Requires Author/Admin.
- `GET /api/export` — Export content. Query: `scope` (entity types, release). Returns a zip archive. Requires Author/Admin.

Errors return appropriate HTTP status codes with JSON error objects: `{ error: { message, code, details } }`. Input validation errors return 400; authentication failures return 401/403.
