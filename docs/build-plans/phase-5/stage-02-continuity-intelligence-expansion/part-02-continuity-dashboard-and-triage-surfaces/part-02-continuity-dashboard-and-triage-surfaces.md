# Part 02: Continuity Dashboard and Triage Surfaces

## Objective

Provide continuity-focused read and triage surfaces that let editorial operators prioritize, filter, and act on continuity issues quickly without mutating canonical content.

## Scope

This part covers issue-surface API/read model and admin-facing triage workflows for prioritization and operational visibility. It excludes suppression-policy tuning logic, which is handled in Part 03. 

**Phase 2 Baseline Prerequisites:** Part 02 builds on existing Phase 2 continuity endpoints (`/admin/releases/:slug/continuity/runs`, issue listing, issue status transitions). These baseline capabilities are not Stage 02 deliverables; they are preconditions.

## Work To Be Done

- define dashboard query contract for continuity issue triage views (status, severity, rule, subject, release context) with explicit sorting and filtering semantics
- add summary/aggregation endpoints or response fields needed for operational triage (open counts, blocking counts, stale/open aging)
- support deterministic sort and filter behavior for large issue sets
- extend triage workflows for issue status transitions with explicit response semantics and guardrails
- add fixture-backed tests for query filtering, pagination/sorting behavior, and transition flow correctness

## Deliverables

- continuity dashboard/triage API contract with deterministic filtering and ordering semantics (see API specification below)
- repository/service updates supporting issue summarization and triage query patterns
- integration tests for triage listing, summary metrics, and status transition behavior under representative fixture loads

## Dependencies

- Part 01 complete (expanded rule pack must exist before triage ergonomics are validated against broader signal volume)
- **Part 03 complete and merged** (suppression persistence behavior fix must be in place before Part 02 acceptance; see Part 03 Dependency section below)
- Phase 2 continuity issue endpoints remain compatibility baseline for existing clients
- existing admin role/policy semantics remain authoritative for continuity triage access

### Part 03 Dependency: Suppression Persistence Precondition

**Enabling Condition:** Part 02 triage API acceptance criteria AC-01 and AC-05 require deterministic, stable behavior across repeated continuity runs. Part 03 fixes the baseline `persistRun` logic to honor `DISMISSED` status (preventing auto-reopen), which is a prerequisite for achieving stable aggregation counts and deterministic sort order. **Therefore, Part 03 must be implemented and merged before Part 02 can achieve final acceptance.**

**Sequencing:** Part 02 implementation can proceed in parallel with Part 03, but Part 02 acceptance testing and final sign-off must occur *after* Part 03 code changes are merged into the target branch.

## Acceptance Criteria [Implementation Status]

- AC-01: Completed [x] continuity triage surfaces now return deterministic, filterable, and pageable issue sets; repeated queries with identical parameters produce identical sort order and page boundaries
- AC-02: Completed [x] blocking/open issue summaries are exposed in `summary` with triage-ready status and severity aggregates
- AC-03: Completed [x] issue status transitions preserve valid transition rules, enforce release/issue ownership scoping, and return updated issue details with explicit `400`/`404` behavior
- AC-04: Completed [x] triage API additions do not regress existing Phase 2 continuity listing/status contracts; regression suite remains passing
- AC-05: Completed [x] repeated continuity runs followed by list queries preserve stable summary counts, sort order, and pagination under identical fixture state; Part 03 suppression persistence dependency is satisfied

## Phase 2 Baseline vs. Part 02 Implemented Additions

| Capability | Phase 2 Baseline Implementation (Prerequisite) | Part 02 Implemented Addition | Purpose |
|---|---|---|---|
| Issue listing endpoint | `GET /admin/releases/:slug/continuity/issues` with basic pagination | Enhanced with deterministic sorting, aggregation summary object, status/severity/rule filtering | Operational triage and prioritization |
| Aggregation metrics | Count and status enum in response | Summary object with `blockingOpenCount`, `warningOpenCount`, `acknowledgedCount`, `resolvedCount`, `dismissedCount`, `severityDistribution` | Quick readiness assessment without iterating full list |
| Sorting support | Default sort only (creation order or unspecified) | Explicit sort contract: `detectedAt`, `severity`, `status`, `ruleCode` with ascending/descending directions | Deterministic, predictable triage ordering |
| Filtering support | Basic filters only | Comprehensive filters: `status`, `severity`, `ruleCode`, `subjectType` with deterministic semantics | Targeted issue discovery for specific rule or severity patterns |
| Status transition endpoint | `PATCH /admin/releases/:slug/continuity/issues/:issueId/status` exists (Phase 2 baseline) | Enhanced with deterministic response semantics and explicit error handling (not modified in scope) | Part 02 clarifies contract; Part 03 implements suppression persistence |

## Triage API Specification

**Status:** This section documents the implemented API contract for Part 02. The baseline endpoints existed in Phase 2; the enhancements below are now implemented Stage 02 Part 02 behavior.

### Continuity Issue List (Triage View)

**Endpoint:** `GET /admin/releases/:slug/continuity/issues` [IMPLEMENTED]

**Query Parameters (all optional):**
| Parameter | Type | Semantics | Default |
|---|---|---|---|
| `status` | enum: `OPEN`, `ACKNOWLEDGED`, `RESOLVED`, `DISMISSED` | Filter by issue status (single value) | None (all statuses) |
| `severity` | enum: `BLOCKING`, `WARNING` | Filter by severity (single value) | None (all severities) |
| `ruleCode` | string | Filter by exact rule code match | None (all rules) |
| `subjectType` | enum: `RELEASE`, `ENTITY_REVISION`, `MANUSCRIPT_REVISION`, `RELATIONSHIP_REVISION` | Filter by subject type | None (all types) |
| `limit` | integer (1–200) | Page size; server maximum enforced at 200 | 50 |
| `offset` | integer (≥0) | Page offset for pagination | 0 |
| `sort` | enum: `detectedAt.desc`, `detectedAt.asc`, `severity.desc`, `severity.asc`, `status.asc`, `status.desc`, `ruleCode.asc`, `ruleCode.desc` | Sort key and direction (always explicit direction); deterministic tie-breaking is applied for stable pagination | `detectedAt.desc` |

**Success Response (200 OK):**
```json
{
  "releaseSlug": "spring-arc",
  "total": 42,
  "limit": 50,
  "offset": 0,
  "summary": {
    "blockingOpenCount": 3,
    "warningOpenCount": 8,
    "acknowledgedCount": 5,
    "resolvedCount": 26,
    "dismissedCount": 0,
    "severityDistribution": {
      "BLOCKING": 10,
      "WARNING": 32
    }
  },
  "issues": [
    {
      "id": "ci_xxx",
      "ruleCode": "REQ_META_CHRONOLOGY_ANCHOR",
      "severity": "BLOCKING",
      "status": "OPEN",
      "subjectType": "RELEASE",
      "subjectId": "spring-arc",
      "title": "Missing chronology anchor",
      "details": "...",
      "detectedAt": "2026-03-20T10:00:00Z",
      "resolvedAt": null,
      "createdAt": "2026-03-20T10:00:00Z",
      "updatedAt": "2026-03-20T10:00:00Z"
    }
  ]
}
```

**Complete Field Reference (all response fields):**
- `releaseSlug` (string): Release slug matching the query parameter
- `total` (number): Total count of issues matching filters, across all pages
- `limit` (number): Page size used in the request
- `offset` (number): Offset used in the request
- `summary` (object): Aggregation of all issues in this release (not just current page):
  - `blockingOpenCount` (number): Count of BLOCKING issues with OPEN or ACKNOWLEDGED status
  - `warningOpenCount` (number): Count of WARNING issues with OPEN or ACKNOWLEDGED status
  - `acknowledgedCount` (number): Total count of issues with ACKNOWLEDGED status
  - `resolvedCount` (number): Total count of issues with RESOLVED status
  - `dismissedCount` (number): Total count of issues with DISMISSED status
  - `severityDistribution` (object): Count by severity across all issues: `{ "BLOCKING": N, "WARNING": M }`
- `issues` (array): Paginated list of issue objects. Each issue contains:
  - `id` (UUID): Unique continuity issue identifier
  - `releaseSlug` (string): Release slug
  - `ruleCode` (string): Rule code that detected this issue (e.g., `REQ_META_CHRONOLOGY_ANCHOR`)
  - `severity` (enum: `BLOCKING` | `WARNING`): Issue severity level
  - `status` (enum: `OPEN` | `ACKNOWLEDGED` | `RESOLVED` | `DISMISSED`): Current lifecycle status
  - `subjectType` (enum: `RELEASE` | `ENTITY_REVISION` | `MANUSCRIPT_REVISION` | `RELATIONSHIP_REVISION`): Type of entity the issue targets
  - `subjectId` (string): ID of the subject entity
  - `title` (string): Human-readable issue title
  - `details` (string): Detailed description of the detected problem
  - `detectedAt` (ISO 8601 datetime): When the issue was first detected
  - `resolvedAt` (ISO 8601 datetime or null): When the issue was resolved (null if not resolved)
  - `createdAt` (ISO 8601 datetime): Issue creation timestamp (set to `detectedAt`)
  - `updatedAt` (ISO 8601 datetime): Last status update timestamp

**Filtering Semantics [IMPLEMENTED BEHAVIOR]:**
- Single-value filtering is supported for each filter key (`status`, `severity`, `ruleCode`, `subjectType`)
- Different filter types are AND'd together (e.g., `?status=OPEN&severity=BLOCKING` returns `(status = OPEN) AND (severity = BLOCKING)`)
- Filters are case-sensitive for enum values (`Blocking` is invalid; must be `BLOCKING`)
- Unknown query parameters are silently ignored; invalid enum values return `400 Bad Request`

**Sorting Semantics [IMPLEMENTED BEHAVIOR]:**
- Default sort is `detectedAt.desc` (most recently detected issues first)
- Sort is applied after filtering
- Only one sort key is supported (no compound sorts)
- Sort direction is part of the key name (e.g., `detectedAt.desc` not `detectedAt` with separate direction)
- Deterministic ordering is established for ties using secondary sort keys (`detectedAt`, `createdAt`, and `id` as configured per sort mode) to ensure stable pagination

**Pagination [IMPLEMENTED BEHAVIOR]:**
- `limit` max is 200; requests with higher values are capped at 200
- `offset` can be any non-negative integer; offset beyond total results returns empty issues array with correct `total`
- `limit=0` returns `400 Bad Request`

### Issue Status Transition Endpoint

**Endpoint:** `PATCH /admin/releases/:slug/continuity/issues/:issueId/status` [IMPLEMENTED — existing Phase 2 endpoint with Part 02 validation/contract coverage]

**Request Body:**
```json
{
  "status": "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED" | "OPEN"
}
```

**Valid Transitions** (inherited from Phase 2 baseline; Part 02 does not modify transition logic):
- `OPEN` → `ACKNOWLEDGED`, `RESOLVED`, `DISMISSED`
- `ACKNOWLEDGED` → `OPEN`, `RESOLVED`, `DISMISSED`
- `RESOLVED` → `OPEN`
- `DISMISSED` → `OPEN`

**Success Response (200 OK):** Returns updated issue object with same shape as list response.

**Error Responses:**
- `400 Bad Request`: Invalid status value, invalid transition (e.g., `RESOLVED` → `ACKNOWLEDGED`), or malformed body
- `404 Not Found`: Release or issue not found
- `403 Forbidden`: User lacks AUTHOR_ADMIN role

## Validation Commands

Primary Part 02 validation command:

- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 /Users/gibdevlite/Documents/BookWorm/tests/phase5ContinuityDashboardTriagePart02.test.ts`

Additional regression and quality gates:

- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 /Users/gibdevlite/Documents/BookWorm/tests/phase2ContinuityIssueBaseline.test.ts` (ensures baseline regression protection)
- `pnpm lint`
- `pnpm type-check`

## Status Markers

User Approved: True
Status: Complete [x]
Implementation Date: 2026-03-20

## Validation Evidence

- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 /Users/gibdevlite/Documents/BookWorm/tests/phase5ContinuityDashboardTriagePart02.test.ts` (pass)
- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 /Users/gibdevlite/Documents/BookWorm/tests/phase2ContinuityIssueBaseline.test.ts` (pass)
- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 /Users/gibdevlite/Documents/BookWorm/tests/phase5ContinuityRulePackExpansionPart01.test.ts` (pass)
- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 /Users/gibdevlite/Documents/BookWorm/tests/phase5ContinuitySignalQualitySuppressionPart03.test.ts` (pass)
- `pnpm lint` (pass)
- `pnpm type-check` (pass)
