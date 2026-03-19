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

type ContinuityListResponse = {
  releaseSlug: string;
  total: number;
  limit: number;
  offset: number;
  issues: ContinuityRunResponse["issues"];
};

const timestamp = Date.now();
const app = createApp();
const server = createServer(app);
const slugs = {
  activeRelease: `continuity-active-${timestamp}`,
  targetRelease: `continuity-target-${timestamp}`,
  otherRelease: `continuity-other-${timestamp}`,
  helperCharacter: `continuity-helper-${timestamp}`,
  brokenEvent: `continuity-event-${timestamp}`,
  spoilerSecret: `continuity-secret-${timestamp}`,
  revealEntity: `continuity-reveal-${timestamp}`,
  otherSecret: `continuity-other-secret-${timestamp}`,
  missingDependency: `continuity-missing-${timestamp}`
};

let apiBaseUrl = "";
let sessionCookie = "";
let authorId = "";
let helperCharacterRevisionId = "";
let brokenEventRevisionId = "";
let spoilerSecretRevisionId = "";
let revealRevisionId = "";
let revealEntityId = "";

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

  const helperCharacter = await createEntityRevision({
    slug: slugs.helperCharacter,
    type: "CHARACTER",
    visibility: Visibility.PUBLIC,
    payload: {
      metadata: { spoilerTier: "NONE" }
    }
  });
  helperCharacterRevisionId = helperCharacter.revision.id;

  const activeReveal = await createEntityRevision({
    slug: slugs.revealEntity,
    type: "REVEAL",
    visibility: Visibility.PUBLIC,
    payload: {
      metadata: {
        spoilerTier: "NONE",
        timelineAnchor: {
          anchorLabel: "Initial reveal",
          sortKey: "2024-02-01"
        }
      },
      requiredDependencies: [{ kind: "ENTITY", entitySlug: slugs.helperCharacter }]
    }
  });
  revealEntityId = activeReveal.entity.id;

  const brokenEvent = await createEntityRevision({
    slug: slugs.brokenEvent,
    type: "EVENT",
    visibility: Visibility.PUBLIC,
    payload: {
      metadata: {
        spoilerTier: "NONE",
        timelineAnchor: {
          anchorLabel: "Broken chronology"
        }
      }
    }
  });
  brokenEventRevisionId = brokenEvent.revision.id;

  const spoilerSecret = await createEntityRevision({
    slug: slugs.spoilerSecret,
    type: "SECRET",
    visibility: Visibility.PUBLIC
  });
  spoilerSecretRevisionId = spoilerSecret.revision.id;

  const revealRegression = await createEntityRevision({
    slug: slugs.revealEntity,
    type: "REVEAL",
    entityId: revealEntityId,
    version: 2,
    visibility: Visibility.PUBLIC,
    payload: {
      metadata: {
        spoilerTier: "MAJOR",
        timelineAnchor: {
          anchorLabel: "Regressed reveal",
          sortKey: "2024-01-15"
        }
      },
      requiredDependencies: [{ kind: "ENTITY", entitySlug: slugs.missingDependency }]
    }
  });
  revealRevisionId = revealRegression.revision.id;

  const otherSecret = await createEntityRevision({
    slug: slugs.otherSecret,
    type: "SECRET",
    visibility: Visibility.PUBLIC
  });

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: slugs.activeRelease,
    name: "Continuity Active"
  });
  await releaseRepository.includeRevision({
    releaseSlug: slugs.activeRelease,
    entitySlug: slugs.helperCharacter,
    revisionId: helperCharacterRevisionId
  });
  await releaseRepository.includeRevision({
    releaseSlug: slugs.activeRelease,
    entitySlug: slugs.revealEntity,
    revisionId: activeReveal.revision.id
  });
  await releaseRepository.activateRelease(slugs.activeRelease);

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: slugs.targetRelease,
    name: "Continuity Target"
  });
  await releaseRepository.includeRevision({
    releaseSlug: slugs.targetRelease,
    entitySlug: slugs.helperCharacter,
    revisionId: helperCharacterRevisionId
  });
  await releaseRepository.includeRevision({
    releaseSlug: slugs.targetRelease,
    entitySlug: slugs.brokenEvent,
    revisionId: brokenEventRevisionId
  });
  await releaseRepository.includeRevision({
    releaseSlug: slugs.targetRelease,
    entitySlug: slugs.spoilerSecret,
    revisionId: spoilerSecretRevisionId
  });
  await releaseRepository.includeRevision({
    releaseSlug: slugs.targetRelease,
    entitySlug: slugs.revealEntity,
    revisionId: revealRevisionId
  });

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: slugs.otherRelease,
    name: "Continuity Other"
  });
  await releaseRepository.includeRevision({
    releaseSlug: slugs.otherRelease,
    entitySlug: slugs.otherSecret,
    revisionId: otherSecret.revision.id
  });
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
      slug: { in: [slugs.activeRelease, slugs.targetRelease, slugs.otherRelease] }
    }
  });

  await prismaClient.entityRevision.deleteMany({
    where: {
      entity: {
        slug: {
          in: [slugs.helperCharacter, slugs.brokenEvent, slugs.spoilerSecret, slugs.revealEntity, slugs.otherSecret]
        }
      }
    }
  });

  await prismaClient.entity.deleteMany({
    where: {
      slug: {
        in: [slugs.helperCharacter, slugs.brokenEvent, slugs.spoilerSecret, slugs.revealEntity, slugs.otherSecret]
      }
    }
  });

  await prismaClient.$disconnect();
});

test("manual run creates expected baseline issues", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/releases/${slugs.targetRelease}/continuity/runs`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: sessionCookie
    },
    body: JSON.stringify({})
  });

  const result = await ensureOk<ContinuityRunResponse>(response);

  assert.equal(result.releaseSlug, slugs.targetRelease);
  assert.equal(result.source, "MANUAL");
  assert.equal(result.summary.ruleCount, 6);
  assert.equal(result.summary.issueCount, 4);
  assert.equal(result.summary.blockingOpenCount, 4);
  assert.equal(result.summary.warningOpenCount, 0);
  assert.deepEqual(
    result.issues.map((issue) => issue.ruleCode).sort(),
    [
      "DATE_ORDER_SORT_KEY_REGRESSION",
      "REQ_META_CHRONOLOGY_ANCHOR",
      "REQ_META_SPOILER_TIER_PUBLIC",
      "REVEAL_TIMING_DEPENDENCY_PRESENT"
    ]
  );

  const persistedIssues = await prismaClient.continuityIssue.findMany({
    where: { release: { slug: slugs.targetRelease } },
    orderBy: { ruleCode: "asc" }
  });

  assert.equal(persistedIssues.length, 4);
  assert.equal(persistedIssues.every((issue) => issue.severity === "BLOCKING" && issue.status === "OPEN"), true);
});

test("issue list filters by status and severity and stays scoped to the requested release", async () => {
  await ensureOk<ContinuityRunResponse>(
    await fetch(`${apiBaseUrl}/admin/releases/${slugs.otherRelease}/continuity/runs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({})
    })
  );

  const response = await fetch(
    `${apiBaseUrl}/admin/releases/${slugs.targetRelease}/continuity/issues?status=OPEN&severity=BLOCKING`,
    {
      headers: { cookie: sessionCookie }
    }
  );
  const result = await ensureOk<ContinuityListResponse>(response);
  const otherReleaseIssue = await prismaClient.continuityIssue.findFirstOrThrow({
    where: { release: { slug: slugs.otherRelease } }
  });

  assert.equal(result.releaseSlug, slugs.targetRelease);
  assert.equal(result.total, 4);
  assert.equal(result.issues.length, 4);
  assert.equal(result.issues.every((issue) => issue.status === "OPEN" && issue.severity === "BLOCKING"), true);
  assert.equal(result.issues.some((issue) => issue.id === otherReleaseIssue.id), false);
});

test("status transitions persist resolvedAt and allow reopening", async () => {
  const issue = await prismaClient.continuityIssue.findFirstOrThrow({
    where: {
      release: { slug: slugs.targetRelease },
      ruleCode: "REQ_META_CHRONOLOGY_ANCHOR"
    }
  });

  const acknowledged = await ensureOk<ContinuityRunResponse["issues"][number]>(
    await fetch(`${apiBaseUrl}/admin/releases/${slugs.targetRelease}/continuity/issues/${issue.id}/status`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({ status: "ACKNOWLEDGED" })
    })
  );
  assert.equal(acknowledged.status, "ACKNOWLEDGED");

  const resolved = await ensureOk<ContinuityRunResponse["issues"][number]>(
    await fetch(`${apiBaseUrl}/admin/releases/${slugs.targetRelease}/continuity/issues/${issue.id}/status`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({ status: "RESOLVED" })
    })
  );
  assert.equal(resolved.status, "RESOLVED");
  assert.notEqual(resolved.resolvedAt, null);

  const resolvedRow = await prismaClient.continuityIssue.findUniqueOrThrow({
    where: { id: issue.id }
  });
  assert.equal(resolvedRow.status, "RESOLVED");
  assert.notEqual(resolvedRow.resolvedAt, null);

  const reopened = await ensureOk<ContinuityRunResponse["issues"][number]>(
    await fetch(`${apiBaseUrl}/admin/releases/${slugs.targetRelease}/continuity/issues/${issue.id}/status`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({ status: "OPEN" })
    })
  );
  assert.equal(reopened.status, "OPEN");
  assert.equal(reopened.resolvedAt, null);
});

test("status update resolves release-scoped issues beyond the first 500 rows", async () => {
  const bulkReleaseSlug = `continuity-bulk-${timestamp}`;

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: bulkReleaseSlug,
    name: "Continuity Bulk"
  });

  try {
    const bulkRelease = await prismaClient.release.findUniqueOrThrow({
      where: { slug: bulkReleaseSlug },
      select: { id: true }
    });

    const targetIssue = await prismaClient.continuityIssue.create({
      data: {
        releaseId: bulkRelease.id,
        ruleCode: "BULK_TARGET_RULE",
        severity: "BLOCKING",
        status: "OPEN",
        subjectType: "RELEASE",
        subjectId: bulkRelease.id,
        title: "Target issue",
        details: "Issue used to validate release-scoped status updates",
        fingerprint: `bulk-target-${timestamp}`,
        detectedAt: new Date("2020-01-01T00:00:00.000Z")
      }
    });

    const fillerDetectedAt = new Date("2030-01-01T00:00:00.000Z");

    await prismaClient.continuityIssue.createMany({
      data: Array.from({ length: 600 }, (_, index) => ({
        releaseId: bulkRelease.id,
        ruleCode: `BULK_FILLER_${index}`,
        severity: "BLOCKING" as const,
        status: "OPEN" as const,
        subjectType: "RELEASE" as const,
        subjectId: bulkRelease.id,
        title: `Filler issue ${index}`,
        details: "Filler issue to force pagination boundaries",
        fingerprint: `bulk-filler-${timestamp}-${index}`,
        detectedAt: fillerDetectedAt
      }))
    });

    const updated = await ensureOk<ContinuityRunResponse["issues"][number]>(
      await fetch(`${apiBaseUrl}/admin/releases/${bulkReleaseSlug}/continuity/issues/${targetIssue.id}/status`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: sessionCookie
        },
        body: JSON.stringify({ status: "ACKNOWLEDGED" })
      })
    );

    assert.equal(updated.id, targetIssue.id);
    assert.equal(updated.status, "ACKNOWLEDGED");

    const persisted = await prismaClient.continuityIssue.findUniqueOrThrow({
      where: { id: targetIssue.id },
      select: { status: true }
    });

    assert.equal(persisted.status, "ACKNOWLEDGED");
  } finally {
    await prismaClient.release.deleteMany({
      where: { slug: bulkReleaseSlug }
    });
  }
});

test("activation is blocked by blocking continuity issues", async () => {
  const issue = await prismaClient.continuityIssue.findFirstOrThrow({
    where: {
      release: { slug: slugs.targetRelease },
      ruleCode: "REQ_META_CHRONOLOGY_ANCHOR"
    }
  });

  await prismaClient.entityRevision.update({
    where: { id: revealRevisionId },
    data: {
      payload: {
        name: `${slugs.revealEntity}-name-v2`,
        summary: `${slugs.revealEntity}-summary-v2`,
        visibility: Visibility.PUBLIC,
        metadata: {
          spoilerTier: "MAJOR",
          timelineAnchor: {
            anchorLabel: "Regressed reveal",
            sortKey: "2024-01-15"
          }
        },
        requiredDependencies: [{ kind: "ENTITY", entitySlug: slugs.helperCharacter }]
      }
    }
  });

  await ensureOk<ContinuityRunResponse["issues"][number]>(
    await fetch(`${apiBaseUrl}/admin/releases/${slugs.targetRelease}/continuity/issues/${issue.id}/status`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({ status: "ACKNOWLEDGED" })
    })
  );

  const response = await fetch(`${apiBaseUrl}/admin/releases/${slugs.targetRelease}/activate`, {
    method: "POST",
    headers: { cookie: sessionCookie }
  });
  const body = (await response.json()) as {
    error: string;
    continuityStatus: {
      releaseSlug: string;
      blockingIssueCount: number;
      issues: Array<{ id: string; ruleCode: string; status: string; severity: string; title: string }>;
    };
  };

  assert.equal(response.status, 409);
  assert.equal(body.error, "Release cannot be activated while blocking continuity issues are open");
  assert.equal(body.continuityStatus.releaseSlug, slugs.targetRelease);
  assert.equal(body.continuityStatus.blockingIssueCount, 3);
  assert.equal(body.continuityStatus.issues.length, 3);

  const release = await prismaClient.release.findUniqueOrThrow({ where: { slug: slugs.targetRelease } });
  assert.equal(release.status, "DRAFT");
});

test("resolved issues unblock activation after data is fixed", async () => {
  await prismaClient.entityRevision.update({
    where: { id: brokenEventRevisionId },
    data: {
      payload: {
        name: `${slugs.brokenEvent}-name-v1`,
        summary: `${slugs.brokenEvent}-summary-v1`,
        visibility: Visibility.PUBLIC,
        metadata: {
          spoilerTier: "NONE",
          timelineAnchor: {
            anchorLabel: "Broken chronology",
            sortKey: "2024-03-01"
          }
        }
      }
    }
  });

  await prismaClient.entityRevision.update({
    where: { id: spoilerSecretRevisionId },
    data: {
      payload: {
        name: `${slugs.spoilerSecret}-name-v1`,
        summary: `${slugs.spoilerSecret}-summary-v1`,
        visibility: Visibility.PUBLIC,
        metadata: {
          spoilerTier: "MINOR"
        }
      }
    }
  });

  await prismaClient.entityRevision.update({
    where: { id: revealRevisionId },
    data: {
      payload: {
        name: `${slugs.revealEntity}-name-v2`,
        summary: `${slugs.revealEntity}-summary-v2`,
        visibility: Visibility.PUBLIC,
        metadata: {
          spoilerTier: "MAJOR",
          timelineAnchor: {
            anchorLabel: "Regressed reveal",
            sortKey: "2024-03-01"
          }
        },
        requiredDependencies: [{ kind: "ENTITY", entitySlug: slugs.helperCharacter }]
      }
    }
  });

  const rerun = await ensureOk<ContinuityRunResponse>(
    await fetch(`${apiBaseUrl}/admin/releases/${slugs.targetRelease}/continuity/runs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({})
    })
  );

  assert.equal(rerun.summary.issueCount, 0);
  assert.equal(rerun.summary.blockingOpenCount, 0);
  assert.deepEqual(rerun.issues, []);

  const persistedIssues = await prismaClient.continuityIssue.findMany({
    where: { release: { slug: slugs.targetRelease } },
    orderBy: { ruleCode: "asc" }
  });
  assert.equal(persistedIssues.length, 4);
  assert.equal(persistedIssues.every((issue) => issue.status === "RESOLVED" && issue.resolvedAt !== null), true);

  const activation = await fetch(`${apiBaseUrl}/admin/releases/${slugs.targetRelease}/activate`, {
    method: "POST",
    headers: { cookie: sessionCookie }
  });
  const activatedRelease = await ensureOk<{ slug: string; status: string }>(activation);

  assert.equal(activatedRelease.slug, slugs.targetRelease);
  assert.equal(activatedRelease.status, "ACTIVE");

  const release = await prismaClient.release.findUniqueOrThrow({ where: { slug: slugs.targetRelease } });
  assert.equal(release.status, "ACTIVE");
});