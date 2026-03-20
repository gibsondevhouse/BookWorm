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
  activeRelease: `phase5-part03-active-${timestamp}`,
  priorRelease: `phase5-part03-prior-${timestamp}`,
  targetRelease: `phase5-part03-target-${timestamp}`,
  helperCharacter: `phase5-part03-helper-${timestamp}`,
  revealEntity: `phase5-part03-reveal-${timestamp}`,
  spoilerEntity: `phase5-part03-secret-${timestamp}`,
  blockingSecret: `phase5-part03-blocking-secret-${timestamp}`,
  blockingEvent: `phase5-part03-blocking-event-${timestamp}`
};

let apiBaseUrl = "";
let sessionCookie = "";
let authorId = "";
let helperCharacterRevisionId = "";
let revealRevisionId = "";
let warningSecretEntityId = "";
let warningSecretRevisionId = "";
let blockingSecretRevisionId = "";
let blockingEventRevisionId = "";

const ensureOk = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
};

const runContinuity = async (): Promise<ContinuityRunResponse> =>
  ensureOk<ContinuityRunResponse>(
    await fetch(`${apiBaseUrl}/admin/releases/${slugs.targetRelease}/continuity/runs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({})
    })
  );

const updateIssueStatus = async (issueId: string, status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED") =>
  ensureOk<ContinuityRunResponse["issues"][number]>(
    await fetch(`${apiBaseUrl}/admin/releases/${slugs.targetRelease}/continuity/issues/${issueId}/status`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({ status })
    })
  );

const createEntityRevision = async (input: {
  slug: string;
  type: "CHARACTER" | "EVENT" | "SECRET" | "REVEAL";
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
          anchorLabel: "Reveal",
          sortKey: "2024-01-01"
        }
      },
      requiredDependencies: [{ kind: "ENTITY", entitySlug: slugs.helperCharacter }]
    }
  });
  revealRevisionId = activeReveal.revision.id;

  const warningSecretV1 = await createEntityRevision({
    slug: slugs.spoilerEntity,
    type: "SECRET",
    visibility: Visibility.PUBLIC,
    payload: {
      metadata: { spoilerTier: "MAJOR" }
    }
  });
  warningSecretEntityId = warningSecretV1.entity.id;

  const warningSecretV2 = await createEntityRevision({
    slug: slugs.spoilerEntity,
    type: "SECRET",
    visibility: Visibility.PUBLIC,
    version: 2,
    entityId: warningSecretEntityId,
    payload: {
      metadata: { spoilerTier: "MINOR" }
    }
  });
  warningSecretRevisionId = warningSecretV2.revision.id;

  const blockingSecret = await createEntityRevision({
    slug: slugs.blockingSecret,
    type: "SECRET",
    visibility: Visibility.PUBLIC
  });
  blockingSecretRevisionId = blockingSecret.revision.id;

  const blockingEvent = await createEntityRevision({
    slug: slugs.blockingEvent,
    type: "EVENT",
    visibility: Visibility.PUBLIC,
    payload: {
      metadata: {
        spoilerTier: "NONE",
        timelineAnchor: {
          anchorLabel: "Broken event"
        }
      }
    }
  });
  blockingEventRevisionId = blockingEvent.revision.id;

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: slugs.activeRelease,
    name: "Part03 Active"
  });
  await releaseRepository.includeRevision({
    releaseSlug: slugs.activeRelease,
    entitySlug: slugs.helperCharacter,
    revisionId: helperCharacterRevisionId
  });
  await releaseRepository.includeRevision({
    releaseSlug: slugs.activeRelease,
    entitySlug: slugs.revealEntity,
    revisionId: revealRevisionId
  });
  await releaseRepository.activateRelease(slugs.activeRelease);

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: slugs.priorRelease,
    name: "Part03 Prior"
  });
  await releaseRepository.includeRevision({
    releaseSlug: slugs.priorRelease,
    entitySlug: slugs.spoilerEntity,
    revisionId: warningSecretV1.revision.id
  });

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: slugs.targetRelease,
    name: "Part03 Target"
  });
  await releaseRepository.includeRevision({
    releaseSlug: slugs.targetRelease,
    entitySlug: slugs.helperCharacter,
    revisionId: helperCharacterRevisionId
  });
  await releaseRepository.includeRevision({
    releaseSlug: slugs.targetRelease,
    entitySlug: slugs.revealEntity,
    revisionId: revealRevisionId
  });
  await releaseRepository.includeRevision({
    releaseSlug: slugs.targetRelease,
    entitySlug: slugs.spoilerEntity,
    revisionId: warningSecretRevisionId
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
      slug: { in: [slugs.activeRelease, slugs.priorRelease, slugs.targetRelease] }
    }
  });

  await prismaClient.entityRevision.deleteMany({
    where: {
      entity: {
        slug: {
          in: [
            slugs.helperCharacter,
            slugs.revealEntity,
            slugs.spoilerEntity,
            slugs.blockingSecret,
            slugs.blockingEvent
          ]
        }
      }
    }
  });

  await prismaClient.entity.deleteMany({
    where: {
      slug: {
        in: [slugs.helperCharacter, slugs.revealEntity, slugs.spoilerEntity, slugs.blockingSecret, slugs.blockingEvent]
      }
    }
  });

  await prismaClient.$disconnect();
});

test("AC-01/AC-02/AC-04: dismissed low-value warning remains suppressed and deterministic across reruns", async () => {
  const initialRun = await runContinuity();
  const warningIssue = initialRun.issues.find((issue) => issue.ruleCode === "ENTITY_KNOWLEDGE_STATE_REGRESSION");

  assert.ok(warningIssue, "Expected warning issue for entity knowledge regression");
  assert.equal(warningIssue?.status, "OPEN");

  const dismissed = await updateIssueStatus(warningIssue.id, "DISMISSED");
  assert.equal(dismissed.status, "DISMISSED");

  const rerunOne = await runContinuity();
  const rerunTwo = await runContinuity();

  assert.equal(
    rerunOne.issues.some((issue) => issue.id === warningIssue.id),
    false,
    "Suppressed low-value warning must not be re-emitted after dismissal"
  );
  assert.equal(
    rerunTwo.issues.some((issue) => issue.id === warningIssue.id),
    false,
    "Suppressed low-value warning must remain suppressed across repeated runs"
  );
  assert.equal(rerunOne.summary.warningOpenCount, 0);
  assert.equal(rerunTwo.summary.warningOpenCount, 0);
  assert.deepEqual(rerunOne.summary, rerunTwo.summary, "Repeated reruns should remain deterministic");

  const persistedWarning = await prismaClient.continuityIssue.findUniqueOrThrow({ where: { id: warningIssue.id } });
  assert.equal(persistedWarning.status, "DISMISSED");

  await releaseRepository.includeRevision({
    releaseSlug: slugs.targetRelease,
    entitySlug: slugs.blockingSecret,
    revisionId: blockingSecretRevisionId
  });

  const blockingRun = await runContinuity();
  assert.ok(
    blockingRun.issues.some((issue) => issue.ruleCode === "REQ_META_SPOILER_TIER_PUBLIC" && issue.status === "OPEN"),
    "New BLOCKING issue must still be detected while suppressed warning stays filtered"
  );
  assert.ok(blockingRun.summary.blockingOpenCount > 0);
});

test("AC-03/AC-05: dismissed blocking issues are not auto-reopened and unsuppressed blockers still prevent activation", async () => {
  await releaseRepository.includeRevision({
    releaseSlug: slugs.targetRelease,
    entitySlug: slugs.blockingEvent,
    revisionId: blockingEventRevisionId
  });

  const initialRun = await runContinuity();
  const chronologyIssue = initialRun.issues.find((issue) => issue.ruleCode === "REQ_META_CHRONOLOGY_ANCHOR");
  const spoilerIssue = initialRun.issues.find((issue) => issue.ruleCode === "REQ_META_SPOILER_TIER_PUBLIC");

  assert.ok(chronologyIssue, "Expected chronology blocking issue");
  assert.ok(spoilerIssue, "Expected spoiler blocking issue");

  const dismissed = await updateIssueStatus(chronologyIssue.id, "DISMISSED");
  assert.equal(dismissed.status, "DISMISSED");

  const rerun = await runContinuity();
  const rerunChronology = await prismaClient.continuityIssue.findUniqueOrThrow({ where: { id: chronologyIssue.id } });
  const rerunSpoiler = await prismaClient.continuityIssue.findUniqueOrThrow({ where: { id: spoilerIssue.id } });

  assert.equal(rerunChronology.status, "DISMISSED", "Dismissed blocking issue must remain dismissed on rerun");
  assert.equal(rerunSpoiler.status, "OPEN", "Unsuppressed blocking issue must remain open");
  assert.equal(rerun.summary.blockingOpenCount, 1, "Only unsuppressed blocking issue should count toward blockers");

  const activationResponse = await fetch(`${apiBaseUrl}/admin/releases/${slugs.targetRelease}/activate`, {
    method: "POST",
    headers: { cookie: sessionCookie }
  });
  const activationBody = (await activationResponse.json()) as {
    error: string;
    continuityStatus: {
      releaseSlug: string;
      blockingIssueCount: number;
      issues: Array<{ id: string; ruleCode: string; status: string; severity: string; title: string }>;
    };
  };

  assert.equal(activationResponse.status, 409);
  assert.equal(activationBody.error, "Release cannot be activated while blocking continuity issues are open");
  assert.equal(activationBody.continuityStatus.releaseSlug, slugs.targetRelease);
  assert.equal(activationBody.continuityStatus.blockingIssueCount, 1);
  const openBlockingIssues = activationBody.continuityStatus.issues.filter(
    (issue) => issue.status === "OPEN" && issue.severity === "BLOCKING"
  );
  assert.equal(
    openBlockingIssues.length,
    1,
    "Activation payload must contain one unsuppressed BLOCKING OPEN issue"
  );
});
