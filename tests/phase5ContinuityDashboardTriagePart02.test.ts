import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";

import { createApp } from "../apps/api/src/app/createApp.js";
import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { releaseRepository } from "../apps/api/src/repositories/releaseRepository.js";
import { phase0FixtureConfig } from "../scripts/phase0FixtureConfig.js";

type ContinuityListResponse = {
  releaseSlug: string;
  total: number;
  limit: number;
  offset: number;
  summary: {
    blockingOpenCount: number;
    warningOpenCount: number;
    acknowledgedCount: number;
    resolvedCount: number;
    dismissedCount: number;
    severityDistribution: {
      BLOCKING: number;
      WARNING: number;
    };
  };
  issues: Array<{
    id: string;
    ruleCode: string;
    severity: "BLOCKING" | "WARNING";
    status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";
    subjectType: string;
    subjectId: string;
    title: string;
    details: string;
    detectedAt: string;
    resolvedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

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
    severity: "BLOCKING" | "WARNING";
    status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";
  }>;
};

const timestamp = Date.now();
const app = createApp();
const server = createServer(app);

const slugs = {
  dashboardRelease: `phase5-part02-dashboard-${timestamp}`,
  ownershipRelease: `phase5-part02-ownership-${timestamp}`,
  runRelease: `phase5-part02-run-${timestamp}`,
  helperCharacter: `phase5-part02-helper-${timestamp}`,
  brokenEvent: `phase5-part02-event-${timestamp}`,
  spoilerSecret: `phase5-part02-secret-${timestamp}`
};

let apiBaseUrl = "";
let sessionCookie = "";
let authorId = "";
let dashboardReleaseId = "";
let ownershipReleaseId = "";
let openIssueId = "";
let resolvedIssueId = "";
let otherReleaseIssueId = "";

const ensureOk = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
};

const listIssues = async (
  releaseSlug: string,
  query = ""
): Promise<ContinuityListResponse> =>
  ensureOk<ContinuityListResponse>(
    await fetch(`${apiBaseUrl}/admin/releases/${releaseSlug}/continuity/issues${query}`, {
      headers: { cookie: sessionCookie }
    })
  );

const runContinuity = async (releaseSlug: string): Promise<ContinuityRunResponse> =>
  ensureOk<ContinuityRunResponse>(
    await fetch(`${apiBaseUrl}/admin/releases/${releaseSlug}/continuity/runs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({})
    })
  );

const createEntityRevision = async (input: {
  slug: string;
  type: "CHARACTER" | "EVENT" | "SECRET";
  visibility: Visibility;
  payload?: Record<string, unknown>;
}) => {
  const entity = await prismaClient.entity.create({
    data: {
      slug: input.slug,
      type: input.type
    }
  });

  const revision = await prismaClient.entityRevision.create({
    data: {
      entityId: entity.id,
      createdById: authorId,
      version: 1,
      name: `${input.slug}-name-v1`,
      summary: `${input.slug}-summary-v1`,
      visibility: input.visibility,
      payload: {
        name: `${input.slug}-name-v1`,
        summary: `${input.slug}-summary-v1`,
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

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: slugs.dashboardRelease,
    name: "Part02 Dashboard"
  });
  await releaseRepository.createRelease({
    actorId: authorId,
    slug: slugs.ownershipRelease,
    name: "Part02 Ownership"
  });
  await releaseRepository.createRelease({
    actorId: authorId,
    slug: slugs.runRelease,
    name: "Part02 Run Determinism"
  });

  const dashboardRelease = await prismaClient.release.findUniqueOrThrow({
    where: { slug: slugs.dashboardRelease },
    select: { id: true }
  });
  dashboardReleaseId = dashboardRelease.id;

  const ownershipRelease = await prismaClient.release.findUniqueOrThrow({
    where: { slug: slugs.ownershipRelease },
    select: { id: true }
  });
  ownershipReleaseId = ownershipRelease.id;

  const tieDetectedAt = new Date("2026-03-20T10:00:00.000Z");
  const tieCreatedAt = new Date("2026-03-20T10:00:00.000Z");

  await prismaClient.continuityIssue.createMany({
    data: [
      {
        id: `z-tie-${timestamp}`,
        releaseId: dashboardReleaseId,
        ruleCode: "RULE_TIE",
        severity: "BLOCKING",
        status: "OPEN",
        subjectType: "RELEASE",
        subjectId: dashboardReleaseId,
        title: "Tie issue Z",
        details: "Used for deterministic tie ordering",
        fingerprint: `fp-z-tie-${timestamp}`,
        detectedAt: tieDetectedAt,
        createdAt: tieCreatedAt
      },
      {
        id: `a-tie-${timestamp}`,
        releaseId: dashboardReleaseId,
        ruleCode: "RULE_TIE",
        severity: "BLOCKING",
        status: "OPEN",
        subjectType: "RELEASE",
        subjectId: dashboardReleaseId,
        title: "Tie issue A",
        details: "Used for deterministic tie ordering",
        fingerprint: `fp-a-tie-${timestamp}`,
        detectedAt: tieDetectedAt,
        createdAt: tieCreatedAt
      },
      {
        id: `open-blocking-${timestamp}`,
        releaseId: dashboardReleaseId,
        ruleCode: "RULE_A",
        severity: "BLOCKING",
        status: "OPEN",
        subjectType: "RELEASE",
        subjectId: dashboardReleaseId,
        title: "Open blocking issue",
        details: "Summary and filter verification",
        fingerprint: `fp-open-blocking-${timestamp}`,
        detectedAt: new Date("2026-03-20T09:00:00.000Z"),
        createdAt: new Date("2026-03-20T09:00:00.000Z")
      },
      {
        id: `ack-blocking-${timestamp}`,
        releaseId: dashboardReleaseId,
        ruleCode: "RULE_B",
        severity: "BLOCKING",
        status: "ACKNOWLEDGED",
        subjectType: "RELEASE",
        subjectId: dashboardReleaseId,
        title: "Acknowledged blocking issue",
        details: "Summary verification",
        fingerprint: `fp-ack-blocking-${timestamp}`,
        detectedAt: new Date("2026-03-20T08:00:00.000Z"),
        createdAt: new Date("2026-03-20T08:00:00.000Z")
      },
      {
        id: `open-warning-${timestamp}`,
        releaseId: dashboardReleaseId,
        ruleCode: "RULE_C",
        severity: "WARNING",
        status: "OPEN",
        subjectType: "RELEASE",
        subjectId: dashboardReleaseId,
        title: "Open warning issue",
        details: "Summary verification",
        fingerprint: `fp-open-warning-${timestamp}`,
        detectedAt: new Date("2026-03-20T07:00:00.000Z"),
        createdAt: new Date("2026-03-20T07:00:00.000Z")
      },
      {
        id: `resolved-warning-${timestamp}`,
        releaseId: dashboardReleaseId,
        ruleCode: "RULE_D",
        severity: "WARNING",
        status: "RESOLVED",
        subjectType: "RELEASE",
        subjectId: dashboardReleaseId,
        title: "Resolved warning issue",
        details: "Transition validation",
        fingerprint: `fp-resolved-warning-${timestamp}`,
        detectedAt: new Date("2026-03-20T06:00:00.000Z"),
        createdAt: new Date("2026-03-20T06:00:00.000Z"),
        resolvedAt: new Date("2026-03-20T06:30:00.000Z")
      },
      {
        id: `dismissed-warning-${timestamp}`,
        releaseId: dashboardReleaseId,
        ruleCode: "RULE_E",
        severity: "WARNING",
        status: "DISMISSED",
        subjectType: "RELEASE",
        subjectId: dashboardReleaseId,
        title: "Dismissed warning issue",
        details: "Summary verification",
        fingerprint: `fp-dismissed-warning-${timestamp}`,
        detectedAt: new Date("2026-03-20T05:00:00.000Z"),
        createdAt: new Date("2026-03-20T05:00:00.000Z")
      }
    ]
  });

  openIssueId = `open-blocking-${timestamp}`;
  resolvedIssueId = `resolved-warning-${timestamp}`;

  const otherReleaseIssue = await prismaClient.continuityIssue.create({
    data: {
      releaseId: ownershipReleaseId,
      ruleCode: "RULE_OWNERSHIP",
      severity: "BLOCKING",
      status: "OPEN",
      subjectType: "RELEASE",
      subjectId: ownershipReleaseId,
      title: "Different release issue",
      details: "Used for release ownership scoping",
      fingerprint: `fp-ownership-${timestamp}`,
      detectedAt: new Date("2026-03-20T04:00:00.000Z"),
      createdAt: new Date("2026-03-20T04:00:00.000Z")
    }
  });
  otherReleaseIssueId = otherReleaseIssue.id;

  const helperCharacter = await createEntityRevision({
    slug: slugs.helperCharacter,
    type: "CHARACTER",
    visibility: Visibility.PUBLIC,
    payload: {
      metadata: { spoilerTier: "NONE" }
    }
  });

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

  const spoilerSecret = await createEntityRevision({
    slug: slugs.spoilerSecret,
    type: "SECRET",
    visibility: Visibility.PUBLIC
  });

  await releaseRepository.includeRevision({
    releaseSlug: slugs.runRelease,
    entitySlug: slugs.helperCharacter,
    revisionId: helperCharacter.revision.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: slugs.runRelease,
    entitySlug: slugs.brokenEvent,
    revisionId: brokenEvent.revision.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: slugs.runRelease,
    entitySlug: slugs.spoilerSecret,
    revisionId: spoilerSecret.revision.id
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
      slug: { in: [slugs.dashboardRelease, slugs.ownershipRelease, slugs.runRelease] }
    }
  });

  await prismaClient.entityRevision.deleteMany({
    where: {
      entity: {
        slug: {
          in: [slugs.helperCharacter, slugs.brokenEvent, slugs.spoilerSecret]
        }
      }
    }
  });

  await prismaClient.entity.deleteMany({
    where: {
      slug: {
        in: [slugs.helperCharacter, slugs.brokenEvent, slugs.spoilerSecret]
      }
    }
  });

  await prismaClient.$disconnect();
});

test("AC-01/AC-02: list API exposes deterministic filtering, sorting, pagination, and release summary aggregation", async () => {
  const sortedFiltered = await listIssues(
    slugs.dashboardRelease,
    "?status=OPEN&severity=BLOCKING&sort=ruleCode.asc&limit=10&offset=0"
  );

  assert.equal(sortedFiltered.releaseSlug, slugs.dashboardRelease);
  assert.equal(sortedFiltered.total, 3);
  assert.equal(sortedFiltered.issues.length, 3);
  assert.deepEqual(
    sortedFiltered.issues.map((issue) => issue.ruleCode),
    ["RULE_A", "RULE_TIE", "RULE_TIE"]
  );

  assert.deepEqual(sortedFiltered.summary, {
    blockingOpenCount: 4,
    warningOpenCount: 1,
    acknowledgedCount: 1,
    resolvedCount: 1,
    dismissedCount: 1,
    severityDistribution: {
      BLOCKING: 4,
      WARNING: 3
    }
  });

  const firstPage = await listIssues(slugs.dashboardRelease, "?sort=detectedAt.desc&limit=3&offset=0");
  const secondPage = await listIssues(slugs.dashboardRelease, "?sort=detectedAt.desc&limit=3&offset=3");
  const repeatedFirstPage = await listIssues(slugs.dashboardRelease, "?sort=detectedAt.desc&limit=3&offset=0");

  assert.deepEqual(
    firstPage.issues.map((issue) => issue.id),
    repeatedFirstPage.issues.map((issue) => issue.id),
    "Repeated identical query must return stable page ordering"
  );
  assert.equal(firstPage.total, 7);
  assert.equal(secondPage.offset, 3);

  const tieSlice = firstPage.issues.filter((issue) => issue.ruleCode === "RULE_TIE");
  assert.deepEqual(
    tieSlice.map((issue) => issue.id),
    [...tieSlice.map((issue) => issue.id)].sort(),
    "Tie-breaking must be deterministic for equal sort-key values"
  );

  const overflowOffset = await listIssues(slugs.dashboardRelease, "?sort=detectedAt.desc&limit=5&offset=500");
  assert.equal(overflowOffset.total, 7);
  assert.deepEqual(overflowOffset.issues, []);

  const cappedLimit = await listIssues(slugs.dashboardRelease, "?limit=999&offset=0");
  assert.equal(cappedLimit.limit, 200);

  const invalidLimitResponse = await fetch(
    `${apiBaseUrl}/admin/releases/${slugs.dashboardRelease}/continuity/issues?limit=0`,
    {
      headers: { cookie: sessionCookie }
    }
  );
  assert.equal(invalidLimitResponse.status, 400);
});

test("AC-03: status transitions enforce lifecycle rules and release ownership constraints", async () => {
  const acknowledged = await ensureOk<ContinuityListResponse["issues"][number]>(
    await fetch(`${apiBaseUrl}/admin/releases/${slugs.dashboardRelease}/continuity/issues/${openIssueId}/status`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({ status: "ACKNOWLEDGED" })
    })
  );

  assert.equal(acknowledged.id, openIssueId);
  assert.equal(acknowledged.status, "ACKNOWLEDGED");
  assert.equal(typeof acknowledged.updatedAt, "string");

  const invalidTransitionResponse = await fetch(
    `${apiBaseUrl}/admin/releases/${slugs.dashboardRelease}/continuity/issues/${resolvedIssueId}/status`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({ status: "ACKNOWLEDGED" })
    }
  );
  assert.equal(invalidTransitionResponse.status, 400);

  const crossReleaseResponse = await fetch(
    `${apiBaseUrl}/admin/releases/${slugs.dashboardRelease}/continuity/issues/${otherReleaseIssueId}/status`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({ status: "ACKNOWLEDGED" })
    }
  );
  assert.equal(crossReleaseResponse.status, 404);
});

test("AC-05: repeated continuity runs preserve deterministic list ordering, pagination, and summary counts", async () => {
  const runOne = await runContinuity(slugs.runRelease);
  const listOnePageOne = await listIssues(slugs.runRelease, "?sort=ruleCode.asc&limit=1&offset=0");
  const listOnePageTwo = await listIssues(slugs.runRelease, "?sort=ruleCode.asc&limit=1&offset=1");

  const runTwo = await runContinuity(slugs.runRelease);
  const listTwoPageOne = await listIssues(slugs.runRelease, "?sort=ruleCode.asc&limit=1&offset=0");
  const listTwoPageTwo = await listIssues(slugs.runRelease, "?sort=ruleCode.asc&limit=1&offset=1");

  assert.equal(runOne.summary.issueCount, 2);
  assert.equal(runTwo.summary.issueCount, 2);

  assert.deepEqual(listOnePageOne.summary, listTwoPageOne.summary, "Summary aggregation must remain stable across reruns");
  assert.deepEqual(
    listOnePageOne.issues.map((issue) => issue.id),
    listTwoPageOne.issues.map((issue) => issue.id),
    "First page ordering must be stable across identical reruns"
  );
  assert.deepEqual(
    listOnePageTwo.issues.map((issue) => issue.id),
    listTwoPageTwo.issues.map((issue) => issue.id),
    "Second page ordering must be stable across identical reruns"
  );
  assert.equal(listOnePageOne.total, 2);
  assert.equal(listOnePageTwo.total, 2);
});
