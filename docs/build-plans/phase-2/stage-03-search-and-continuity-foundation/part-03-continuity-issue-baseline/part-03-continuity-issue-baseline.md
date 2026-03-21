# Part 03: Continuity Issue Baseline

**Status:** Complete `[x]`

## Objective

Introduce the MVP continuity baseline so Book Worm can detect, record, and act on the first set of narrative consistency problems.

## Context

This part is grounded in the current schema and release activation behavior:

- `prisma/schema.prisma` defines release composition (`ReleaseEntry`, `ReleaseManuscriptEntry`, `ReleaseRelationshipEntry`) and core source fields used by continuity checks (`Entity.slug`, `Manuscript.slug`, `EntityRevision.payload`, `ManuscriptRevision.payload`, `Entity.type`, `Visibility`, `Release.status`).
- `apps/api/src/lib/entityMetadataContract.ts` defines chronology-sensitive entity types (`EVENT`, `REVEAL`, `TIMELINE_ERA`) and metadata shape (`metadata.spoilerTier`, `metadata.tags`, `metadata.timelineAnchor.timelineEraSlug`, `anchorLabel`, `sortKey`).
- `apps/api/src/services/releaseService.ts` and `apps/api/src/routes/adminReleaseRouter.ts` already enforce activation guardrails and are the correct integration point for continuity blockers.
- `apps/api/src/repositories/releaseRepository.ts` provides release activation transaction behavior (`ACTIVE -> ARCHIVED` rollover) that continuity checks must gate before publication.

---

## 1. Baseline Continuity Rule Set

Rules in this part run against release composition for one target release slug. All rule failures are persisted as continuity issues.

### 1.1 Rule Inventory

| Rule Code                              | Severity   | Applies To                                                                                                                      | Field-Level Checks                                                                                                                                                                                                                                                                   |
| -------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | -------------------------------------------------------------------------------- |
| `REQ_META_CHRONOLOGY_ANCHOR`           | `BLOCKING` | Included `EntityRevision` where `Entity.type IN (EVENT, REVEAL, TIMELINE_ERA)` and revision is release-visible (`ReleaseEntry`) | `EntityRevision.payload.metadata.timelineAnchor` must exist and contain non-empty `anchorLabel` and non-empty `sortKey`; `timelineEraSlug` may be null but, when present, must resolve to an existing `Entity.slug` with `Entity.type = TIMELINE_ERA` and `Entity.retiredAt IS NULL` |
| `REQ_META_SPOILER_TIER_PUBLIC`         | `BLOCKING` | Included PUBLIC `EntityRevision` for `Entity.type IN (SECRET, REVEAL, EVENT)` and included PUBLIC `ManuscriptRevision`          | `payload.metadata.spoilerTier` must be explicitly present and one of `NONE                                                                                                                                                                                                           | MINOR | MAJOR`; absence is a failure even though runtime normalization defaults to`NONE` |
| `DATE_ORDER_SORT_KEY_REGRESSION`       | `BLOCKING` | Included chronology-sensitive entity revisions also present in currently ACTIVE release for the same `Entity.id`                | Compare `payload.metadata.timelineAnchor.sortKey` between target release revision and current ACTIVE release revision: target value must be greater than or equal to active value in lexicographic ISO-8601 order                                                                    |
| `REVEAL_TIMING_DEPENDENCY_PRESENT`     | `BLOCKING` | Included PUBLIC `EntityRevision` where `Entity.type = REVEAL`                                                                   | `EntityRevision.payload.requiredDependencies` must include at least one dependency item with `kind = ENTITY`; each referenced `entitySlug` must resolve to an entity that is also included in the same release (`ReleaseEntry`)                                                      |
| `DUPLICATE_ENTITY_SLUG_IN_RELEASE`     | `BLOCKING` | Release entity composition                                                                                                      | Group included entity rows by `Entity.slug`; any count greater than 1 is a failure (corruption/import-defense rule; should normally be prevented by schema uniqueness)                                                                                                               |
| `DUPLICATE_MANUSCRIPT_SLUG_IN_RELEASE` | `BLOCKING` | Release manuscript composition                                                                                                  | Group included manuscript rows by `Manuscript.slug`; any count greater than 1 is a failure (corruption/import-defense rule; should normally be prevented by schema uniqueness)                                                                                                       |

### 1.2 Rule Execution Contract

- Rule output is normalized to: `ruleCode`, `severity`, `subjectType`, `subjectId`, `title`, `details`, `metadata`, `fingerprint`.
- `fingerprint` is deterministic and stable for the same logical problem (for upsert and reopen behavior).
- New failures create issues.
- Existing matching issue + new failure reopens it (`status = OPEN`, `resolvedAt = null`).
- Existing matching issue + no current failure auto-resolves it (`status = RESOLVED`, `resolvedAt = now()`) only when current status is `OPEN` or `ACKNOWLEDGED`.

---

## 2. ContinuityIssue Data Model (Prisma)

This part adds persisted issue tracking in Prisma and requires a migration.

### 2.1 Schema Additions

```prisma
enum ContinuityIssueSeverity {
 BLOCKING
 WARNING
}

enum ContinuityIssueStatus {
 OPEN
 ACKNOWLEDGED
 RESOLVED
 DISMISSED
}

enum ContinuityIssueSubjectType {
 RELEASE
 ENTITY_REVISION
 MANUSCRIPT_REVISION
 RELATIONSHIP_REVISION
}

model ContinuityIssue {
 id                     String                   @id @default(cuid())
 releaseId              String
 ruleCode               String
 severity               ContinuityIssueSeverity
 status                 ContinuityIssueStatus    @default(OPEN)
 subjectType            ContinuityIssueSubjectType
 subjectId              String
 title                  String
 details                String
 fingerprint            String
 metadata               Json?
 detectedAt             DateTime                 @default(now())
 resolvedAt             DateTime?
 createdAt              DateTime                 @default(now())
 updatedAt              DateTime                 @updatedAt

 entityId               String?
 entityRevisionId       String?
 manuscriptId           String?
 manuscriptRevisionId   String?
 relationshipId         String?
 relationshipRevisionId String?

 release                Release                  @relation(fields: [releaseId], references: [id], onDelete: Cascade)
 entity                 Entity?                  @relation(fields: [entityId], references: [id], onDelete: SetNull)
 entityRevision         EntityRevision?          @relation(fields: [entityRevisionId], references: [id], onDelete: SetNull)
 manuscript             Manuscript?              @relation(fields: [manuscriptId], references: [id], onDelete: SetNull)
 manuscriptRevision     ManuscriptRevision?      @relation(fields: [manuscriptRevisionId], references: [id], onDelete: SetNull)
 relationship           Relationship?            @relation(fields: [relationshipId], references: [id], onDelete: SetNull)
 relationshipRevision   RelationshipRevision?    @relation(fields: [relationshipRevisionId], references: [id], onDelete: SetNull)

 @@unique([releaseId, fingerprint])
 @@index([releaseId, status, severity])
 @@index([ruleCode])
 @@index([subjectType, subjectId])
 @@map("continuity_issues")
}
```

### 2.2 Existing Model Extensions

Add the following relation lists:

```prisma
model Release {
 continuityIssues ContinuityIssue[]
}

model Entity {
 continuityIssues ContinuityIssue[]
}

model EntityRevision {
 continuityIssues ContinuityIssue[]
}

model Manuscript {
 continuityIssues ContinuityIssue[]
}

model ManuscriptRevision {
 continuityIssues ContinuityIssue[]
}

model Relationship {
 continuityIssues ContinuityIssue[]
}

model RelationshipRevision {
 continuityIssues ContinuityIssue[]
}
```

### 2.3 Migration Requirement

- Generate and apply a migration for the new enums, `continuity_issues` table, indexes, and relation wiring.
- Expected command sequence:

```bash
pnpm prisma migrate dev --name add_continuity_issue_baseline
pnpm prisma generate
```

---

## 3. Continuity Rule Run Triggers

Continuity checks run from both manual and activation paths.

| Trigger            | Behavior                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Manual admin run   | `POST /admin/releases/:slug/continuity/runs` executes all baseline rules and persists issue upserts/reopens/resolutions                    |
| Activation attempt | `releaseService.activateRelease()` executes continuity run before `releaseRepository.activateRelease()` and blocks on open blocking issues |

Trigger policy:

- Manual trigger always persists current issue state.
- Activation trigger always runs even if prior run exists, to avoid stale readiness decisions.
- Blocking set for activation is: `severity = BLOCKING` and `status IN (OPEN, ACKNOWLEDGED)`.

---

## 4. API Routes

Routes are extension points on `adminReleaseRouter` to keep release-readiness behavior centralized.

### 4.1 Run Baseline Rules

| Property     | Value                                   |
| ------------ | --------------------------------------- | -------------------------------- |
| Method       | `POST`                                  |
| Path         | `/admin/releases/:slug/continuity/runs` |
| Auth         | `AUTHOR_ADMIN`                          |
| Request body | `{ source?: "MANUAL"                    | "ACTIVATION" }`(default`MANUAL`) |
| Success      | `200 OK`                                |

#### Response shape

```json
{
  "releaseSlug": "spring-arc",
  "source": "MANUAL",
  "summary": {
    "ruleCount": 9,
    "issueCount": 4,
    "blockingOpenCount": 2,
    "warningOpenCount": 2
  },
  "issues": [
    {
      "id": "ci_xxx",
      "ruleCode": "REQ_META_CHRONOLOGY_ANCHOR",
      "severity": "BLOCKING",
      "status": "OPEN",
      "subjectType": "ENTITY_REVISION",
      "subjectId": "rev_xxx",
      "title": "Missing timeline anchor metadata",
      "details": "EVENT revision must define metadata.timelineAnchor.anchorLabel and sortKey"
    }
  ]
}
```

Note: this baseline route contract was introduced in Phase 2 with six rules; current runtime includes three additional Phase 5 Stage 02 Part 01 warning rules, so `summary.ruleCount` is now 9.

### 4.2 List Issues

| Property     | Value                                                                    |
| ------------ | ------------------------------------------------------------------------ |
| Method       | `GET`                                                                    |
| Path         | `/admin/releases/:slug/continuity/issues`                                |
| Auth         | `AUTHOR_ADMIN`                                                           |
| Query params | `status?`, `severity?`, `ruleCode?`, `subjectType?`, `limit?`, `offset?` |
| Success      | `200 OK`                                                                 |

### 4.3 Transition Issue Status

| Property     | Value                                                     |
| ------------ | --------------------------------------------------------- | -------------- | ---------- | -------------- |
| Method       | `PATCH`                                                   |
| Path         | `/admin/releases/:slug/continuity/issues/:issueId/status` |
| Auth         | `AUTHOR_ADMIN`                                            |
| Request body | `{ status: "OPEN"                                         | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED" }` |
| Success      | `200 OK`                                                  |
| Not found    | `404` when release/issue pair is invalid                  |

Transition constraints:

- `OPEN -> ACKNOWLEDGED | RESOLVED | DISMISSED`
- `ACKNOWLEDGED -> OPEN | RESOLVED | DISMISSED`
- `RESOLVED -> OPEN`
- `DISMISSED -> OPEN`

Issue creation is auto-managed during rule runs; there is no standalone manual create route in this part.

---

## 5. Release Readiness Integration

### 5.1 Activation Guardrail Flow

Integrate continuity into `releaseService.activateRelease()` after existing draft/empty checks and dependency checks, and before `releaseRepository.activateRelease()`.

Flow:

1. Existing release state checks remain unchanged (`RELEASE_NOT_DRAFT`, `RELEASE_EMPTY`).
2. Existing dependency guard remains unchanged (`ReleaseActivationDependencyError`).
3. Run continuity rules for the target release using source `ACTIVATION`.
4. If blocking open continuity issues exist, throw `ReleaseActivationContinuityError`.
5. Router returns `409` with continuity summary and blocking issues.
6. Only when continuity has no blocking open issues does activation proceed.

### 5.2 Activation Error Shape

Add a new service error class:

```ts
class ReleaseActivationContinuityError extends Error {
  continuityStatus: {
    releaseSlug: string;
    blockingIssueCount: number;
    issues: Array<{
      id: string;
      ruleCode: string;
      status: string;
      severity: string;
      title: string;
    }>;
  };
}
```

Router mapping in `POST /admin/releases/:slug/activate`:

- Catch `ReleaseActivationContinuityError`
- Return `409`:

```json
{
  "error": "Release cannot be activated while blocking continuity issues are open",
  "continuityStatus": {
    "releaseSlug": "spring-arc",
    "blockingIssueCount": 2,
    "issues": [
      {
        "id": "ci_xxx",
        "ruleCode": "REVEAL_TIMING_DEPENDENCY_PRESENT",
        "severity": "BLOCKING",
        "status": "OPEN",
        "title": "Reveal revision is missing in-release dependency references"
      }
    ]
  }
}
```

---

## 6. File Layout

| File                                                                        | Action             | Purpose                                                                                      |
| --------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                                                      | Extend             | Add continuity enums, `ContinuityIssue` model, and relation arrays                           |
| `prisma/migrations/<timestamp>_add_continuity_issue_baseline/migration.sql` | Create             | Persist schema changes                                                                       |
| `apps/api/src/repositories/continuityIssueRepository.ts`                    | Create             | Rule data reads + issue upsert/list/status-update queries                                    |
| `apps/api/src/services/continuityIssueService.ts`                           | Create             | Execute baseline rules, upsert/reopen/resolve issues, summarize blocking counts              |
| `apps/api/src/services/releaseActivationContinuityError.ts`                 | Create             | Activation-block continuity error payload type                                               |
| `apps/api/src/services/releaseService.ts`                                   | Extend             | Invoke continuity run in activation path and throw continuity error when blocked             |
| `apps/api/src/routes/adminReleaseRouter.ts`                                 | Extend             | Add continuity run/list/status endpoints and activation error mapping                        |
| `apps/api/src/app/createApp.ts`                                             | No change expected | Existing `/admin/releases` mount already covers new endpoints                                |
| `tests/phase2ContinuityIssueBaseline.test.ts`                               | Create             | Integration coverage for rule runs, persistence, status transitions, and activation blocking |

---

## 7. Acceptance Criteria

At least the following ACs must pass in `tests/phase2ContinuityIssueBaseline.test.ts`.

1. Running `POST /admin/releases/:slug/continuity/runs` on a draft release containing an `EVENT` revision without `payload.metadata.timelineAnchor.sortKey` creates an `OPEN` `BLOCKING` issue with `ruleCode = REQ_META_CHRONOLOGY_ANCHOR`.
2. Running continuity rules on a release containing a PUBLIC `SECRET` or PUBLIC `REVEAL` revision without explicit `payload.metadata.spoilerTier` creates a `BLOCKING` issue with `ruleCode = REQ_META_SPOILER_TIER_PUBLIC`.
3. Running continuity rules on a release where a chronology-sensitive revision regresses `timelineAnchor.sortKey` relative to the currently ACTIVE release creates a `BLOCKING` issue with `ruleCode = DATE_ORDER_SORT_KEY_REGRESSION`.
4. Running continuity rules on a release with a PUBLIC `REVEAL` revision whose `payload.requiredDependencies` does not resolve to in-release entity entries creates a `BLOCKING` issue with `ruleCode = REVEAL_TIMING_DEPENDENCY_PRESENT`.
5. `GET /admin/releases/:slug/continuity/issues` supports filtering by `status` and `severity` and returns only issues for that release slug.
6. `PATCH /admin/releases/:slug/continuity/issues/:issueId/status` transitions `OPEN -> ACKNOWLEDGED -> RESOLVED`, persists `resolvedAt` when resolved, and allows reopening with `RESOLVED -> OPEN`.
7. `POST /admin/releases/:slug/activate` returns `409` and does not activate when `BLOCKING` continuity issues are `OPEN` or `ACKNOWLEDGED`.
8. After fixing data and re-running continuity checks, previously blocking issues become `RESOLVED`, activation succeeds, and release status becomes `ACTIVE`.

---

## 8. Test File Name and Scaffold

**File:** `tests/phase2ContinuityIssueBaseline.test.ts`

Scaffold pattern (match existing phase integration tests):

- `node:test` with suite-level `before` and `after`
- `createServer(createApp())` for real route execution
- Prisma fixture setup for:
  - one ACTIVE baseline release
  - one DRAFT target release with intentionally broken metadata/dependency cases
- direct assertions on both HTTP responses and persisted `continuity_issues` rows via `prismaClient.continuityIssue`

Suggested test blocks:

- `test("manual run creates expected baseline issues", ...)`
- `test("issue list filters by status and severity", ...)`
- `test("status transitions persist and reopen behavior works", ...)`
- `test("activation is blocked by open blocking continuity issues", ...)`
- `test("activation succeeds after issues are resolved", ...)`

---

## 9. Validation

Before marking Part 03 complete:

```bash
pnpm type-check
pnpm lint
pnpm test -- --test-concurrency=1 tests/phase2ContinuityIssueBaseline.test.ts
```

All must pass.
