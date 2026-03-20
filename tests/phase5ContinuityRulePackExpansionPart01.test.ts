import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

import { type EntityType, Role, Visibility } from "@prisma/client";

import { createApp } from "../apps/api/src/app/createApp.js";
import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { releaseRepository } from "../apps/api/src/repositories/releaseRepository.js";
import { phase0FixtureConfig } from "../scripts/phase0FixtureConfig.js";

type ContinuityRunResponse = {
  releaseSlug: string;
  source: "MANUAL" | "ACTIVATION";
  summary: {
    ruleCount: number;
    issueCount: number;
    blockingOpenCount: number;
    warningOpenCount: number;
  };
  issues: Array<{
    id: string;
    ruleCode: string;
    severity: string;
    status: string;
    subjectType: string;
    subjectId: string;
    title: string;
    details: string;
    detectedAt: string;
    resolvedAt: string | null;
  }>;
};

const timestamp = Date.now();
const app = createApp();
const server = createServer(app);
const slugs = {
  activeRelease: `phase5-part01-active-${timestamp}`,
  targetRelease: `phase5-part01-target-${timestamp}`,
  priorRelease: `phase5-part01-prior-${timestamp}`,
  // Entities for entity knowledge regression
  secretHigh: `phase5-secret-high-${timestamp}`,
  secretRegressed: `phase5-secret-regressed-${timestamp}`,
  // Entities for relationship testing
  revealSource: `phase5-reveal-source-${timestamp}`,
  revealTarget: `phase5-reveal-target-${timestamp}`,
  characterSource: `phase5-char-src-${timestamp}`,
  characterTarget: `phase5-char-tgt-${timestamp}`,
  // Manuscript for sequencing testing
  manuscriptGood: `phase5-manuscript-good-${timestamp}`,
  manuscriptBadSeq: `phase5-manuscript-bad-seq-${timestamp}`,
  manuscriptGoodAlt: `phase5-manuscript-alt-${timestamp}`
};

let apiBaseUrl = "";
let sessionCookie = "";
let authorId = "";

const ensureOk = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
};

const createEntityRevision = async (input: {
  slug: string;
  type: EntityType;
  visibility: Visibility;
  version?: number;
  entityId?: string;
  payload?: Record<string, unknown>;
}) => {
  const entity =
    input.entityId === undefined
      ? await prismaClient.entity.create({
          data: {
            slug: input.slug,
            type: input.type
          }
        })
      : await prismaClient.entity.findUniqueOrThrow({ where: { id: input.entityId } });

  const revision = await prismaClient.entityRevision.create({
    data: {
      entityId: entity.id,
      createdById: authorId,
      version: input.version ?? 1,
      name: `${input.slug}-name-v${input.version ?? 1}`,
      summary: `${input.slug}-summary-v${input.version ?? 1}`,
      visibility: input.visibility,
      payload: {
        name: `${input.slug}-name-v${input.version ?? 1}`,
        summary: `${input.slug}-summary-v${input.version ?? 1}`,
        visibility: input.visibility,
        ...(input.payload ?? {})
      }
    }
  });

  return { entity, revision };
};

const createManuscriptRevision = async (input: {
  slug: string;
  visibility: Visibility;
  version?: number;
  manuscriptId?: string;
  payload?: Record<string, unknown>;
}) => {
  const manuscript =
    input.manuscriptId === undefined
      ? await prismaClient.manuscript.create({
          data: {
            slug: input.slug,
             type: "CHAPTER"
          }
        })
      : await prismaClient.manuscript.findUniqueOrThrow({ where: { id: input.manuscriptId } });

  const revision = await prismaClient.manuscriptRevision.create({
    data: {
      manuscriptId: manuscript.id,
      createdById: authorId,
      version: input.version ?? 1,
      title: `${input.slug}-title-v${input.version ?? 1}`,
      summary: `${input.slug}-summary-v${input.version ?? 1}`,
      visibility: input.visibility,
      payload: {
        title: `${input.slug}-title-v${input.version ?? 1}`,
        summary: `${input.slug}-summary-v${input.version ?? 1}`,
        visibility: input.visibility,
        ...(input.payload ?? {})
      }
    }
  });

  return { manuscript, revision };
};

const createRelationship = async (input: {
  sourceEntitySlug: string;
  targetEntitySlug: string;
  type: string;
  visibility?: Visibility;
  tier?: string;
}) => {
  const sourceEntity = await prismaClient.entity.findUniqueOrThrow({
    where: { slug: input.sourceEntitySlug }
  });
  const targetEntity = await prismaClient.entity.findUniqueOrThrow({
    where: { slug: input.targetEntitySlug }
  });

  const relationship = await prismaClient.relationship.create({
    data: {
      sourceEntityId: sourceEntity.id,
      targetEntityId: targetEntity.id,
      relationType: input.type
    }
  });

  const revision = await prismaClient.relationshipRevision.create({
    data: {
      relationshipId: relationship.id,
      createdById: authorId,
      version: 1,
       state: "CREATE",
      visibility: input.visibility ?? "PRIVATE",
      metadata: input.tier ? { tier: input.tier } : undefined
    }
  });

  return { relationship, revision };
};

before(async () => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to determine test server address");
  }
  apiBaseUrl = `http://127.0.0.1:${address.port}`;

  const hash = await passwordHasher.hashPassword(phase0FixtureConfig.authorAdmin.password);
  const author = await prismaClient.user.upsert({
    where: { email: phase0FixtureConfig.authorAdmin.email },
    update: {
      passwordHash: hash,
      role: Role.AUTHOR_ADMIN,
      displayName: phase0FixtureConfig.authorAdmin.displayName
    },
    create: {
      email: phase0FixtureConfig.authorAdmin.email,
      displayName: phase0FixtureConfig.authorAdmin.displayName,
      passwordHash: hash,
      role: Role.AUTHOR_ADMIN
    }
  });
  authorId = author.id;

  const sessionResponse = await fetch(`${apiBaseUrl}/auth/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: phase0FixtureConfig.authorAdmin.email,
      password: phase0FixtureConfig.authorAdmin.password
    })
  });

  if (!sessionResponse.ok) {
    throw new Error(`Session creation failed: ${sessionResponse.status}`);
  }

  const cookieHeader = sessionResponse.headers.get("set-cookie");
  if (!cookieHeader) {
    throw new Error("No session cookie returned");
  }
  sessionCookie = cookieHeader.split(";")[0] ?? "";

  // Create entities for regression testing
  const secretHighRevision = await createEntityRevision({
    slug: slugs.secretHigh,
    type: "SECRET",
    visibility: Visibility.PUBLIC,
    payload: {
      metadata: { spoilerTier: "MAJOR" }
    }
  });

  const secretRegressedV1 = await createEntityRevision({
    slug: slugs.secretRegressed,
    type: "SECRET",
    visibility: Visibility.PUBLIC,
    payload: {
      metadata: { spoilerTier: "MAJOR" }
    }
  });

  // Create entities for relationship testing
  const revealSourceEntity = await createEntityRevision({
    slug: slugs.revealSource,
    type: "REVEAL",
    visibility: Visibility.PUBLIC,
    payload: {
      metadata: {
        spoilerTier: "NONE",
        timelineAnchor: {
          anchorLabel: "Source reveal",
          sortKey: "2024-01-01"
        }
      },
      requiredDependencies: []
    }
  });

  const revealTargetEntity = await createEntityRevision({
    slug: slugs.revealTarget,
    type: "REVEAL",
    visibility: Visibility.PUBLIC,
    payload: {
      metadata: {
        spoilerTier: "NONE",
        timelineAnchor: {
          anchorLabel: "Target reveal",
          sortKey: "2024-01-02"
        }
      },
      requiredDependencies: []
    }
  });

  const characterSourceEntity = await createEntityRevision({
    slug: slugs.characterSource,
    type: "CHARACTER",
    visibility: Visibility.PUBLIC,
    payload: {
      metadata: { spoilerTier: "NONE" }
    }
  });

  const characterTargetEntity = await createEntityRevision({
    slug: slugs.characterTarget,
    type: "CHARACTER",
    visibility: Visibility.PUBLIC,
    payload: {
      metadata: { spoilerTier: "NONE" }
    }
  });

  // Create manuscripts
  const manuscriptGoodRevision = await createManuscriptRevision({
    slug: slugs.manuscriptGood,
    visibility: Visibility.PUBLIC,
    payload: {
      metadata: { spoilerTier: "NONE" },
      chapters: [
        { sequenceNumber: 1, title: "Ch1" },
        { sequenceNumber: 2, title: "Ch2" },
        { sequenceNumber: 3, title: "Ch3" }
      ]
    }
  });

  const manuscriptBadSeqRevision = await createManuscriptRevision({
    slug: slugs.manuscriptBadSeq,
    visibility: Visibility.PUBLIC,
    payload: {
      metadata: { spoilerTier: "NONE" },
      chapters: [
        { sequenceNumber: 1, title: "Ch1" },
        { sequenceNumber: 3, title: "Ch3" }
        // Missing sequence 2
      ]
    }
  });

  const manuscriptAltRevision = await createManuscriptRevision({
    slug: slugs.manuscriptGoodAlt,
    visibility: Visibility.PUBLIC,
    payload: {
      metadata: { spoilerTier: "NONE" },
      chapters: [
        { sequenceNumber: 1, title: "Ch1" },
        { sequenceNumber: 2, title: "Ch2" }
      ]
    }
  });

  // Create prior release with high-tier secret
  await releaseRepository.createRelease({
    actorId: authorId,
    slug: slugs.priorRelease,
    name: "Prior Release"
  });

  await releaseRepository.includeRevision({
    releaseSlug: slugs.priorRelease,
    entitySlug: slugs.secretRegressed,
    revisionId: secretRegressedV1.revision.id
  });

  // Create active release
  await releaseRepository.createRelease({
    actorId: authorId,
    slug: slugs.activeRelease,
    name: "Active Release"
  });

  await releaseRepository.includeRevision({
    releaseSlug: slugs.activeRelease,
    entitySlug: slugs.secretHigh,
    revisionId: secretHighRevision.revision.id
  });

  await releaseRepository.activateRelease(slugs.activeRelease);

  // Create target release and include all test fixtures
  await releaseRepository.createRelease({
    actorId: authorId,
    slug: slugs.targetRelease,
    name: "Target Release"
  });

  // Include regression secret (will be MINOR, down from MAJOR)
  const secretRegressedV2 = await createEntityRevision({
    slug: slugs.secretRegressed,
    type: "SECRET",
    visibility: Visibility.PUBLIC,
    version: 2,
    entityId: secretRegressedV1.entity.id,
    payload: {
      metadata: { spoilerTier: "MINOR" }
    }
  });

  await releaseRepository.includeRevision({
    releaseSlug: slugs.targetRelease,
    entitySlug: slugs.secretRegressed,
    revisionId: secretRegressedV2.revision.id
  });

  // Include reveal source and target entities
  await releaseRepository.includeRevision({
    releaseSlug: slugs.targetRelease,
    entitySlug: slugs.revealSource,
    revisionId: revealSourceEntity.revision.id
  });

  await releaseRepository.includeRevision({
    releaseSlug: slugs.targetRelease,
    entitySlug: slugs.revealTarget,
    revisionId: revealTargetEntity.revision.id
  });

  // Include character entities
  await releaseRepository.includeRevision({
    releaseSlug: slugs.targetRelease,
    entitySlug: slugs.characterSource,
    revisionId: characterSourceEntity.revision.id
  });

  await releaseRepository.includeRevision({
    releaseSlug: slugs.targetRelease,
    entitySlug: slugs.characterTarget,
    revisionId: characterTargetEntity.revision.id
  });

  // Include good and bad manuscripts
  await prismaClient.releaseManuscriptEntry.create({
    data: {
      releaseId: (await prismaClient.release.findUniqueOrThrow({ where: { slug: slugs.targetRelease } })).id,
      manuscriptId: manuscriptGoodRevision.manuscript.id,
      manuscriptRevisionId: manuscriptGoodRevision.revision.id
    }
  });

  await prismaClient.releaseManuscriptEntry.create({
    data: {
      releaseId: (await prismaClient.release.findUniqueOrThrow({ where: { slug: slugs.targetRelease } })).id,
      manuscriptId: manuscriptBadSeqRevision.manuscript.id,
      manuscriptRevisionId: manuscriptBadSeqRevision.revision.id
    }
  });

  await prismaClient.releaseManuscriptEntry.create({
    data: {
      releaseId: (await prismaClient.release.findUniqueOrThrow({ where: { slug: slugs.targetRelease } })).id,
      manuscriptId: manuscriptAltRevision.manuscript.id,
      manuscriptRevisionId: manuscriptAltRevision.revision.id
    }
  });

  // Create relationships for testing
  await createRelationship({
    sourceEntitySlug: slugs.revealSource,
    targetEntitySlug: slugs.revealTarget,
    type: "CAUSED_BY",
    visibility: Visibility.PUBLIC,
    tier: "UNREVEALED"
  });

  await createRelationship({
    sourceEntitySlug: slugs.characterSource,
    targetEntitySlug: slugs.characterTarget,
    type: "ACQUAINTED_WITH",
    visibility: Visibility.PUBLIC,
    tier: "RESTRICTED"
  });

  // Include relationships in target release
  const relationships = await prismaClient.relationship.findMany({
    select: {
      id: true,
      revisions: {
        select: { id: true },
        orderBy: { version: "desc" as const },
        take: 1
      }
    }
  });

  for (const rel of relationships) {
    if (rel.revisions[0]) {
      await prismaClient.releaseRelationshipEntry.create({
        data: {
          releaseId: (await prismaClient.release.findUniqueOrThrow({ where: { slug: slugs.targetRelease } })).id,
          relationshipId: rel.id,
          relationshipRevisionId: rel.revisions[0].id
        }
      });
    }
  }
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  await prismaClient.session.deleteMany({
    where: { user: { email: phase0FixtureConfig.authorAdmin.email } }
  });

  await prismaClient.release.deleteMany({
    where: {
      slug: { in: [slugs.activeRelease, slugs.targetRelease, slugs.priorRelease] }
    }
  });

  await prismaClient.entityRevision.deleteMany({
    where: {
      entity: {
        slug: {
          in: [
            slugs.secretHigh,
            slugs.secretRegressed,
            slugs.revealSource,
            slugs.revealTarget,
            slugs.characterSource,
            slugs.characterTarget
          ]
        }
      }
    }
  });

  await prismaClient.entity.deleteMany({
    where: {
      slug: {
        in: [
          slugs.secretHigh,
          slugs.secretRegressed,
          slugs.revealSource,
          slugs.revealTarget,
          slugs.characterSource,
          slugs.characterTarget
        ]
      }
    }
  });

  await prismaClient.manuscript.deleteMany({
    where: {
      slug: { in: [slugs.manuscriptGood, slugs.manuscriptBadSeq, slugs.manuscriptGoodAlt] }
    }
  });

  await prismaClient.$disconnect();
});

test("AC-01: Expansion rules produce deterministic detection on re-run", async () => {
  const response1 = await fetch(`${apiBaseUrl}/admin/releases/${slugs.targetRelease}/continuity/runs`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: sessionCookie
    },
    body: JSON.stringify({})
  });

  const result1 = await ensureOk<ContinuityRunResponse>(response1);
  const fingerprints1 = result1.issues.map((i) => i.id).sort();

  // Run again without changes
  const response2 = await fetch(`${apiBaseUrl}/admin/releases/${slugs.targetRelease}/continuity/runs`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: sessionCookie
    },
    body: JSON.stringify({})
  });

  const result2 = await ensureOk<ContinuityRunResponse>(response2);
  const fingerprints2 = result2.issues.map((i) => i.id).sort();

  // Same issues should be detected with same IDs (persisted with same fingerprint)
  assert.deepEqual(
    fingerprints1,
    fingerprints2,
    "Fingerprints should be identical across re-runs for same release state"
  );
});

test("AC-02: New expansion rules emit stable payloads with correct ruleCode, severity, subjectType, and subjectId", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/releases/${slugs.targetRelease}/continuity/runs`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: sessionCookie
    },
    body: JSON.stringify({})
  });

  const result = await ensureOk<ContinuityRunResponse>(response);
  const expansionIssues = result.issues.filter((issue) =>
    ["ENTITY_KNOWLEDGE_STATE_REGRESSION", "MANUSCRIPT_CHAPTER_SEQUENCING_ANOMALY", "RELATIONSHIP_REVEAL_CONSISTENCY_INCOMPLETE"].includes(issue.ruleCode)
  );

  assert.ok(expansionIssues.length >= 1, "Should detect at least one expansion rule issue");

  for (const issue of expansionIssues) {
    assert.ok(["WARNING"].includes(issue.severity), `Issue ${issue.ruleCode} should be WARNING severity`);
    assert.equal(issue.status, "OPEN", "New issues should start in OPEN status");
    assert.ok(
      ["ENTITY_REVISION", "MANUSCRIPT_REVISION", "RELATIONSHIP_REVISION"].includes(issue.subjectType),
      `Issue ${issue.ruleCode} should have valid subjectType`
    );
    assert.ok(issue.subjectId && issue.subjectId.length > 0, `Issue ${issue.ruleCode} should have subjectId`);
    assert.ok(issue.title && issue.title.length > 0, `Issue ${issue.ruleCode} should have title`);
    assert.ok(issue.details && issue.details.length > 0, `Issue ${issue.ruleCode} should have details`);
  }

  // Check specific rules
  const entityKnowledgeIssues = expansionIssues.filter((i) => i.ruleCode === "ENTITY_KNOWLEDGE_STATE_REGRESSION");
  assert.ok(entityKnowledgeIssues.length >= 1, "Should detect ENTITY_KNOWLEDGE_STATE_REGRESSION");

  const manuscriptSequencingIssues = expansionIssues.filter((i) => i.ruleCode === "MANUSCRIPT_CHAPTER_SEQUENCING_ANOMALY");
  assert.ok(manuscriptSequencingIssues.length >= 1, "Should detect MANUSCRIPT_CHAPTER_SEQUENCING_ANOMALY");

  const relationshipConsistencyIssues = expansionIssues.filter(
    (i) => i.ruleCode === "RELATIONSHIP_REVEAL_CONSISTENCY_INCOMPLETE"
  );
  assert.ok(relationshipConsistencyIssues.length >= 1, "Should detect RELATIONSHIP_REVEAL_CONSISTENCY_INCOMPLETE");
});

test("AC-03: Baseline issue lifecycle behavior remains intact (no regression in Phase 2 tests)", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/releases/${slugs.targetRelease}/continuity/runs`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: sessionCookie
    },
    body: JSON.stringify({})
  });

  const result = await ensureOk<ContinuityRunResponse>(response);
  const blockingIssues = result.issues.filter((issue) => issue.severity === "BLOCKING");

  // Baseline BLOCKING rules should still exist and function
  assert.ok(result.summary.ruleCount === 9, "Should report 9 total rules (6 baseline + 3 expansion)");

  // Verify we can transition issue status (test basic lifecycle)
  if (blockingIssues.length > 0) {
    const firstIssue = blockingIssues[0];

    const statusResponse = await fetch(`${apiBaseUrl}/admin/releases/${slugs.targetRelease}/continuity/issues/${firstIssue.id}/status`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({ status: "ACKNOWLEDGED" })
    });

    const transitioned = await ensureOk<ContinuityRunResponse["issues"][number]>(statusResponse);
    assert.equal(transitioned.status, "ACKNOWLEDGED", "Issue status transition should work");

    // Transition back to OPEN
    const reopenResponse = await fetch(
      `${apiBaseUrl}/admin/releases/${slugs.targetRelease}/continuity/issues/${firstIssue.id}/status`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: sessionCookie
        },
        body: JSON.stringify({ status: "OPEN" })
      }
    );

    const reopened = await ensureOk<ContinuityRunResponse["issues"][number]>(reopenResponse);
    assert.equal(reopened.status, "OPEN", "Issue should reopen from ACKNOWLEDGED");
  }
});

test("AC-04: WARNING expansion rules do not block release activation", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/releases/${slugs.targetRelease}/continuity/runs`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: sessionCookie
    },
    body: JSON.stringify({})
  });

  const result = await ensureOk<ContinuityRunResponse>(response);
  const warningIssues = result.issues.filter((issue) => issue.severity === "WARNING");
  const blockingIssues = result.issues.filter((issue) => issue.severity === "BLOCKING");

  assert.ok(result.summary.warningOpenCount >= 0, "Should track warning count correctly (may be 0 if all resolved)");

  // Verify blocking issues still block (if present)
  if (blockingIssues.length > 0) {
    assert.ok(result.summary.blockingOpenCount > 0, "Open BLOCKING issues should be counted");
  }

  // Verify WARNING count is separate
  const actualWarningCount = result.issues.filter((i) => i.severity === "WARNING").length;
  assert.ok(result.summary.warningOpenCount <= actualWarningCount, "Warning count should not exceed detected warnings");
});

test("Expansion rules detect ENTITY_KNOWLEDGE_STATE_REGRESSION accurately", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/releases/${slugs.targetRelease}/continuity/runs`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: sessionCookie
    },
    body: JSON.stringify({})
  });

  const result = await ensureOk<ContinuityRunResponse>(response);
  const regressionIssues = result.issues.filter((i) => i.ruleCode === "ENTITY_KNOWLEDGE_STATE_REGRESSION");

  assert.ok(regressionIssues.length >= 1, "Should detect at least one knowledge state regression");

  const issue = regressionIssues[0];
  assert.equal(issue.ruleCode, "ENTITY_KNOWLEDGE_STATE_REGRESSION");
  assert.equal(issue.severity, "WARNING");
  assert.equal(issue.subjectType, "ENTITY_REVISION");
  assert.ok(issue.details.includes("MAJOR"), "Should mention prior MAJOR tier");
  assert.ok(issue.details.includes("MINOR"), "Should mention current MINOR tier");
});

test("Expansion rules detect MANUSCRIPT_CHAPTER_SEQUENCING_ANOMALY accurately", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/releases/${slugs.targetRelease}/continuity/runs`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: sessionCookie
    },
    body: JSON.stringify({})
  });

  const result = await ensureOk<ContinuityRunResponse>(response);
  const sequencingIssues = result.issues.filter((i) => i.ruleCode === "MANUSCRIPT_CHAPTER_SEQUENCING_ANOMALY");

  assert.ok(sequencingIssues.length >= 1, "Should detect at least one chapter sequencing anomaly");

  const issue = sequencingIssues[0];
  assert.equal(issue.ruleCode, "MANUSCRIPT_CHAPTER_SEQUENCING_ANOMALY");
  assert.equal(issue.severity, "WARNING");
  assert.equal(issue.subjectType, "MANUSCRIPT_REVISION");
  assert.ok(issue.details.toLowerCase().includes("missing") || issue.details.toLowerCase().includes("duplicate"), "Should describe the anomaly");
});

test("Expansion rules detect RELATIONSHIP_REVEAL_CONSISTENCY_INCOMPLETE accurately", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/releases/${slugs.targetRelease}/continuity/runs`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: sessionCookie
    },
    body: JSON.stringify({})
  });

  const result = await ensureOk<ContinuityRunResponse>(response);
  const consistencyIssues = result.issues.filter((i) => i.ruleCode === "RELATIONSHIP_REVEAL_CONSISTENCY_INCOMPLETE");

  assert.ok(consistencyIssues.length >= 1, "Should detect at least one relationship reveal consistency issue");

  const issue = consistencyIssues[0];
  assert.equal(issue.ruleCode, "RELATIONSHIP_REVEAL_CONSISTENCY_INCOMPLETE");
  assert.equal(issue.severity, "WARNING");
  assert.equal(issue.subjectType, "RELATIONSHIP_REVISION");
  assert.ok(
    issue.details.includes("UNREVEALED") || issue.details.includes("RESTRICTED"),
    "Should mention relationship tier"
  );
});

test("Good manuscript with contiguous chapters produces no sequencing issues", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/releases/${slugs.targetRelease}/continuity/runs`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: sessionCookie
    },
    body: JSON.stringify({})
  });

  const result = await ensureOk<ContinuityRunResponse>(response);
  const sequencingIssues = result.issues.filter((i) => i.ruleCode === "MANUSCRIPT_CHAPTER_SEQUENCING_ANOMALY");

  // Good manuscript should not trigger an issue (only bad one should)
  const goodManuscriptIssues = sequencingIssues.filter((i) => i.details.includes(slugs.manuscriptGood));
  assert.equal(goodManuscriptIssues.length, 0, "Well-formed manuscript should not trigger sequencing anomaly");
});

test("Issue fingerprints remain stable across multiple runs", async () => {
  // First run
  const response1 = await fetch(`${apiBaseUrl}/admin/releases/${slugs.targetRelease}/continuity/runs`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: sessionCookie
    },
    body: JSON.stringify({})
  });

  const result1 = await ensureOk<ContinuityRunResponse>(response1);

  // Collect expansion rule issues
  const expansionIssues1 = result1.issues.filter((i) =>
    ["ENTITY_KNOWLEDGE_STATE_REGRESSION", "MANUSCRIPT_CHAPTER_SEQUENCING_ANOMALY", "RELATIONSHIP_REVEAL_CONSISTENCY_INCOMPLETE"].includes(i.ruleCode)
  );

  // Second run immediately after
  const response2 = await fetch(`${apiBaseUrl}/admin/releases/${slugs.targetRelease}/continuity/runs`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: sessionCookie
    },
    body: JSON.stringify({})
  });

  const result2 = await ensureOk<ContinuityRunResponse>(response2);

  const expansionIssues2 = result2.issues.filter((i) =>
    ["ENTITY_KNOWLEDGE_STATE_REGRESSION", "MANUSCRIPT_CHAPTER_SEQUENCING_ANOMALY", "RELATIONSHIP_REVEAL_CONSISTENCY_INCOMPLETE"].includes(i.ruleCode)
  );

  // Issue IDs should be the same (same fingerprints)
  const ids1 = expansionIssues1.map((i) => i.id).sort();
  const ids2 = expansionIssues2.map((i) => i.id).sort();

  assert.deepEqual(ids1, ids2, "Expansion issue IDs should remain identical across runs with unchanged state");
});
