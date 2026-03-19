import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";

import { createApp } from "../apps/api/src/app/createApp.js";
import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { phase0FixtureConfig } from "../scripts/phase0FixtureConfig.js";

type DraftResponse = {
  revisionId?: string;
  manuscriptRevisionId?: string;
  version: number;
};

type ReleaseResponse = {
  slug: string;
  status: string;
};

type ReleaseValidationResponse = {
  releaseSlug: string;
  isReady: boolean;
  summary: {
    dependencyCheckCount: number;
    blockingFailureCount: number;
    entityEntryCount: number;
    manuscriptEntryCount: number;
    relationshipEntryCount: number;
  };
  failures: Array<{
    code: string;
    sourceType: string;
    sourceKey: string;
    dependencyType: string;
    dependencyKey: string;
  }>;
  includedEntries: {
    entityEntries: Array<{
      entitySlug: string;
      entityType: string;
      revisionId: string;
      version: number;
    }>;
    manuscriptEntries: Array<{
      manuscriptSlug: string;
      manuscriptType: string;
      manuscriptRevisionId: string;
      version: number;
    }>;
    relationshipEntries: Array<{
      relationshipId: string;
    }>;
  };
};

type ReleaseReviewResponse = {
  release: {
    slug: string;
    status: string;
  };
  manuscriptEntries: Array<{
    manuscriptSlug: string;
    manuscriptType: string;
    manuscriptRevisionId: string;
    title: string;
    inclusionStatus: string;
    dependencyState: string;
    blockingDependencies: Array<{
      code: string;
      dependencyKey: string;
    }>;
  }>;
  entityEntries: Array<{
    entitySlug: string;
    entityType: string;
    name: string;
    inclusionStatus: string;
    dependencyState: string;
  }>;
  relationshipEntries: Array<unknown>;
};

type AdminEntityDraftResponse = {
  revisionId: string;
  version: number;
  name: string;
  summary: string;
  visibility: string;
  payload: unknown;
  createdBy: {
    email: string;
    role: string;
  };
};

type AdminEntityDraftHistoryResponse = {
  revisions: Array<{
    revisionId: string;
    version: number;
    name: string;
    summary: string;
    visibility: string;
  }>;
};

type AdminManuscriptDraftResponse = {
  manuscriptRevisionId: string;
  version: number;
  title: string;
  summary: string;
  visibility: string;
  payload: unknown;
  createdBy: {
    email: string;
    role: string;
  };
};

type AdminManuscriptDraftHistoryResponse = {
  revisions: Array<{
    manuscriptRevisionId: string;
    version: number;
    title: string;
    summary: string;
    visibility: string;
  }>;
};

const app = createApp();
const server = createServer(app);
const timestamp = Date.now();
const chapterSlug = `phase2-chapter-${timestamp}`;
const missingChapterSlug = `phase2-missing-chapter-${timestamp}`;
const orphanSceneSlug = `phase2-orphan-scene-${timestamp}`;
const sceneSlug = `phase2-scene-${timestamp}`;
const eventSlug = `phase2-event-${timestamp}`;
const locationSlug = `phase2-location-${timestamp}`;
const releaseSlug = `phase2-admin-release-${timestamp}`;
const invalidManuscriptReleaseSlug = `phase2-invalid-manuscript-release-${timestamp}`;

let apiBaseUrl = "";

const ensureOk = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Request failed with ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
};

const createSessionCookie = async (): Promise<string> => {
  const response = await fetch(`${apiBaseUrl}/auth/session`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      email: phase0FixtureConfig.authorAdmin.email,
      password: phase0FixtureConfig.authorAdmin.password
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to create session: ${response.status} ${errorText}`);
  }

  const sessionCookie = response.headers.get("set-cookie");

  if (!sessionCookie) {
    throw new Error("Session creation did not return a cookie");
  }

  const cookieValue = sessionCookie.split(";")[0];

  if (!cookieValue) {
    throw new Error("Session cookie header was empty");
  }

  return cookieValue;
};

before(async () => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Unable to determine test server address");
  }

  apiBaseUrl = `http://127.0.0.1:${address.port}`;

  const authorPasswordHash = await passwordHasher.hashPassword(phase0FixtureConfig.authorAdmin.password);

  await prismaClient.user.upsert({
    where: {
      email: phase0FixtureConfig.authorAdmin.email
    },
    update: {
      displayName: phase0FixtureConfig.authorAdmin.displayName,
      passwordHash: authorPasswordHash,
      role: Role.AUTHOR_ADMIN
    },
    create: {
      email: phase0FixtureConfig.authorAdmin.email,
      displayName: phase0FixtureConfig.authorAdmin.displayName,
      passwordHash: authorPasswordHash,
      role: Role.AUTHOR_ADMIN
    }
  });
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  await prismaClient.session.deleteMany({
    where: {
      user: {
        email: phase0FixtureConfig.authorAdmin.email
      }
    }
  });

  await prismaClient.releaseManuscriptEntry.deleteMany({
    where: {
      release: {
        slug: {
          in: [releaseSlug, invalidManuscriptReleaseSlug]
        }
      }
    }
  });

  await prismaClient.releaseEntry.deleteMany({
    where: {
      release: {
        slug: {
          in: [releaseSlug, invalidManuscriptReleaseSlug]
        }
      }
    }
  });

  await prismaClient.release.deleteMany({
    where: {
      slug: {
        in: [releaseSlug, invalidManuscriptReleaseSlug]
      }
    }
  });

  await prismaClient.manuscriptRevision.deleteMany({
    where: {
      manuscript: {
        slug: {
          in: [chapterSlug, orphanSceneSlug, sceneSlug]
        }
      }
    }
  });

  await prismaClient.manuscript.deleteMany({
    where: {
      slug: {
        in: [chapterSlug, orphanSceneSlug, sceneSlug]
      }
    }
  });

  await prismaClient.entityRevision.deleteMany({
    where: {
      entity: {
        slug: {
          in: [eventSlug, locationSlug]
        }
      }
    }
  });

  await prismaClient.entity.deleteMany({
    where: {
      slug: {
        in: [eventSlug, locationSlug]
      }
    }
  });

  await prismaClient.$disconnect();
});

test("chapter scene location and event admin draft routes feed manuscript-aware release review and validation", async () => {
  const sessionCookie = await createSessionCookie();

  const chapterDraft = await ensureOk<DraftResponse>(
    await fetch(`${apiBaseUrl}/admin/chapters/drafts`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({
        slug: chapterSlug,
        title: "Phase 2 Chapter One",
        summary: "Introduces the manuscript route slice.",
        visibility: Visibility.PUBLIC,
        payload: {
          chapterNumber: 1,
          body: "# Chapter One\n\nBody copy"
        }
      })
    })
  );

  const sceneDraft = await ensureOk<DraftResponse>(
    await fetch(`${apiBaseUrl}/admin/scenes/drafts`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({
        slug: sceneSlug,
        title: "Phase 2 Scene One",
        summary: "Links a scene to the new chapter route.",
        visibility: Visibility.PUBLIC,
        payload: {
          chapterSlug,
          body: "Scene body"
        }
      })
    })
  );

  const locationDraft = await ensureOk<DraftResponse>(
    await fetch(`${apiBaseUrl}/admin/locations/drafts`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({
        slug: locationSlug,
        name: "Phase 2 Citadel",
        summary: "First non-Phase-1 admin entity route.",
        visibility: Visibility.PUBLIC
      })
    })
  );

  const eventDraft = await ensureOk<DraftResponse>(
    await fetch(`${apiBaseUrl}/admin/events/drafts`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({
        slug: eventSlug,
        name: "Phase 2 Coronation",
        summary: "Second non-Phase-1 admin entity route.",
        visibility: Visibility.PUBLIC,
        requiredDependencies: [
          {
            kind: "ENTITY",
            entitySlug: locationSlug
          }
        ]
      })
    })
  );

  const locationDetail = await ensureOk<AdminEntityDraftResponse>(
    await fetch(`${apiBaseUrl}/admin/locations/${locationSlug}`, {
      headers: {
        cookie: sessionCookie
      }
    })
  );

  const locationHistory = await ensureOk<AdminEntityDraftHistoryResponse>(
    await fetch(`${apiBaseUrl}/admin/locations/${locationSlug}/history`, {
      headers: {
        cookie: sessionCookie
      }
    })
  );

  const eventDetail = await ensureOk<AdminEntityDraftResponse>(
    await fetch(`${apiBaseUrl}/admin/events/${eventSlug}`, {
      headers: {
        cookie: sessionCookie
      }
    })
  );

  const eventHistory = await ensureOk<AdminEntityDraftHistoryResponse>(
    await fetch(`${apiBaseUrl}/admin/events/${eventSlug}/history`, {
      headers: {
        cookie: sessionCookie
      }
    })
  );

  const chapterDetail = await ensureOk<AdminManuscriptDraftResponse>(
    await fetch(`${apiBaseUrl}/admin/chapters/${chapterSlug}`, {
      headers: {
        cookie: sessionCookie
      }
    })
  );

  const chapterHistory = await ensureOk<AdminManuscriptDraftHistoryResponse>(
    await fetch(`${apiBaseUrl}/admin/chapters/${chapterSlug}/history`, {
      headers: {
        cookie: sessionCookie
      }
    })
  );

  const sceneDetail = await ensureOk<AdminManuscriptDraftResponse>(
    await fetch(`${apiBaseUrl}/admin/scenes/${sceneSlug}`, {
      headers: {
        cookie: sessionCookie
      }
    })
  );

  const sceneHistory = await ensureOk<AdminManuscriptDraftHistoryResponse>(
    await fetch(`${apiBaseUrl}/admin/scenes/${sceneSlug}/history`, {
      headers: {
        cookie: sessionCookie
      }
    })
  );

  assert.equal(chapterDraft.version, 1);
  assert.equal(sceneDraft.version, 1);
  assert.equal(locationDraft.version, 1);
  assert.equal(eventDraft.version, 1);
  assert.ok(chapterDraft.manuscriptRevisionId);
  assert.ok(sceneDraft.manuscriptRevisionId);
  assert.ok(locationDraft.revisionId);
  assert.ok(eventDraft.revisionId);
  assert.equal(locationDetail.revisionId, locationDraft.revisionId);
  assert.equal(locationDetail.version, 1);
  assert.equal(locationDetail.name, "Phase 2 Citadel");
  assert.equal(locationDetail.summary, "First non-Phase-1 admin entity route.");
  assert.equal(locationDetail.visibility, "PUBLIC");
  assert.equal(locationDetail.createdBy.email, phase0FixtureConfig.authorAdmin.email);
  assert.equal(locationDetail.createdBy.role, "AUTHOR_ADMIN");
  assert.equal(locationHistory.revisions.length, 1);
  assert.equal(locationHistory.revisions[0]?.revisionId, locationDraft.revisionId);
  assert.equal(eventDetail.revisionId, eventDraft.revisionId);
  assert.equal(eventDetail.version, 1);
  assert.equal(eventDetail.name, "Phase 2 Coronation");
  assert.equal(eventDetail.visibility, "PUBLIC");
  assert.equal(eventDetail.createdBy.email, phase0FixtureConfig.authorAdmin.email);
  assert.equal(eventHistory.revisions.length, 1);
  assert.equal(eventHistory.revisions[0]?.revisionId, eventDraft.revisionId);
  assert.equal(chapterDetail.manuscriptRevisionId, chapterDraft.manuscriptRevisionId);
  assert.equal(chapterDetail.version, 1);
  assert.equal(chapterDetail.title, "Phase 2 Chapter One");
  assert.equal(chapterDetail.summary, "Introduces the manuscript route slice.");
  assert.equal(chapterDetail.visibility, "PUBLIC");
  assert.equal(chapterDetail.createdBy.email, phase0FixtureConfig.authorAdmin.email);
  assert.equal(chapterDetail.createdBy.role, "AUTHOR_ADMIN");
  assert.equal(chapterHistory.revisions.length, 1);
  assert.equal(chapterHistory.revisions[0]?.manuscriptRevisionId, chapterDraft.manuscriptRevisionId);
  assert.equal(sceneDetail.manuscriptRevisionId, sceneDraft.manuscriptRevisionId);
  assert.equal(sceneDetail.version, 1);
  assert.equal(sceneDetail.title, "Phase 2 Scene One");
  assert.equal(sceneDetail.summary, "Links a scene to the new chapter route.");
  assert.equal(sceneDetail.visibility, "PUBLIC");
  assert.equal(sceneDetail.createdBy.email, phase0FixtureConfig.authorAdmin.email);
  assert.equal(sceneHistory.revisions.length, 1);
  assert.equal(sceneHistory.revisions[0]?.manuscriptRevisionId, sceneDraft.manuscriptRevisionId);

  await ensureOk<ReleaseResponse>(
    await fetch(`${apiBaseUrl}/admin/releases`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({
        slug: releaseSlug,
        name: "Phase 2 Admin Manuscript Release"
      })
    })
  );

  await ensureOk(
    await fetch(`${apiBaseUrl}/admin/releases/${releaseSlug}/entries`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({
        locationSlug,
        revisionId: locationDraft.revisionId
      })
    })
  );

  await ensureOk(
    await fetch(`${apiBaseUrl}/admin/releases/${releaseSlug}/entries`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({
        eventSlug,
        revisionId: eventDraft.revisionId
      })
    })
  );

  await ensureOk(
    await fetch(`${apiBaseUrl}/admin/releases/${releaseSlug}/entries`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({
        chapterSlug,
        manuscriptRevisionId: chapterDraft.manuscriptRevisionId
      })
    })
  );

  await ensureOk(
    await fetch(`${apiBaseUrl}/admin/releases/${releaseSlug}/entries`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({
        sceneSlug,
        manuscriptRevisionId: sceneDraft.manuscriptRevisionId
      })
    })
  );

  const validation = await ensureOk<ReleaseValidationResponse>(
    await fetch(`${apiBaseUrl}/admin/releases/${releaseSlug}/validation`, {
      headers: {
        cookie: sessionCookie
      }
    })
  );

  const review = await ensureOk<ReleaseReviewResponse>(
    await fetch(`${apiBaseUrl}/admin/releases/${releaseSlug}/review`, {
      headers: {
        cookie: sessionCookie
      }
    })
  );

  assert.equal(validation.releaseSlug, releaseSlug);
  assert.equal(validation.isReady, true);
  assert.equal(validation.summary.dependencyCheckCount, 2);
  assert.equal(validation.summary.blockingFailureCount, 0);
  assert.equal(validation.summary.entityEntryCount, 2);
  assert.equal(validation.summary.manuscriptEntryCount, 2);
  assert.equal(validation.summary.relationshipEntryCount, 0);
  assert.equal(validation.failures.length, 0);
  assert.deepEqual(
    validation.includedEntries.entityEntries.map((entry) => ({
      entitySlug: entry.entitySlug,
      entityType: entry.entityType,
      version: entry.version
    })),
    [
      {
        entitySlug: eventSlug,
        entityType: "EVENT",
        version: 1
      },
      {
        entitySlug: locationSlug,
        entityType: "LOCATION",
        version: 1
      }
    ]
  );
  assert.deepEqual(
    validation.includedEntries.manuscriptEntries.map((entry) => ({
      manuscriptSlug: entry.manuscriptSlug,
      manuscriptType: entry.manuscriptType,
      version: entry.version
    })),
    [
      {
        manuscriptSlug: chapterSlug,
        manuscriptType: "CHAPTER",
        version: 1
      },
      {
        manuscriptSlug: sceneSlug,
        manuscriptType: "SCENE",
        version: 1
      }
    ]
  );
  assert.equal(validation.includedEntries.relationshipEntries.length, 0);

  assert.equal(review.release.slug, releaseSlug);
  assert.equal(review.release.status, "DRAFT");
  assert.equal(review.entityEntries.length, 2);
  assert.equal(review.manuscriptEntries.length, 2);
  assert.equal(review.relationshipEntries.length, 0);
  assert.deepEqual(
    review.entityEntries.map((entry) => ({
      entitySlug: entry.entitySlug,
      entityType: entry.entityType,
      name: entry.name,
      inclusionStatus: entry.inclusionStatus,
      dependencyState: entry.dependencyState
    })),
    [
      {
        entitySlug: eventSlug,
        entityType: "EVENT",
        name: "Phase 2 Coronation",
        inclusionStatus: "INCLUDED",
        dependencyState: "READY"
      },
      {
        entitySlug: locationSlug,
        entityType: "LOCATION",
        name: "Phase 2 Citadel",
        inclusionStatus: "INCLUDED",
        dependencyState: "READY"
      }
    ]
  );
  assert.deepEqual(
    review.manuscriptEntries.map((entry) => ({
      manuscriptSlug: entry.manuscriptSlug,
      manuscriptType: entry.manuscriptType,
      title: entry.title,
      inclusionStatus: entry.inclusionStatus,
      dependencyState: entry.dependencyState,
      blockingDependencies: entry.blockingDependencies.length
    })),
    [
      {
        manuscriptSlug: chapterSlug,
        manuscriptType: "CHAPTER",
        title: "Phase 2 Chapter One",
        inclusionStatus: "INCLUDED",
        dependencyState: "READY",
        blockingDependencies: 0
      },
      {
        manuscriptSlug: sceneSlug,
        manuscriptType: "SCENE",
        title: "Phase 2 Scene One",
        inclusionStatus: "INCLUDED",
        dependencyState: "READY",
        blockingDependencies: 0
      }
    ]
  );
});

test("scene manuscript entries are blocked when their chapter is missing from the release", async () => {
  const sessionCookie = await createSessionCookie();

  const orphanSceneDraft = await ensureOk<DraftResponse>(
    await fetch(`${apiBaseUrl}/admin/scenes/drafts`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({
        slug: orphanSceneSlug,
        title: "Orphan Scene",
        summary: "References a chapter that is not included in the release.",
        visibility: Visibility.PUBLIC,
        payload: {
          chapterSlug: missingChapterSlug,
          body: "Orphan scene body"
        }
      })
    })
  );

  await ensureOk<ReleaseResponse>(
    await fetch(`${apiBaseUrl}/admin/releases`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({
        slug: invalidManuscriptReleaseSlug,
        name: "Phase 2 Invalid Manuscript Release"
      })
    })
  );

  await ensureOk(
    await fetch(`${apiBaseUrl}/admin/releases/${invalidManuscriptReleaseSlug}/entries`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({
        sceneSlug: orphanSceneSlug,
        manuscriptRevisionId: orphanSceneDraft.manuscriptRevisionId
      })
    })
  );

  const validation = await ensureOk<ReleaseValidationResponse>(
    await fetch(`${apiBaseUrl}/admin/releases/${invalidManuscriptReleaseSlug}/validation`, {
      headers: {
        cookie: sessionCookie
      }
    })
  );

  const review = await ensureOk<ReleaseReviewResponse>(
    await fetch(`${apiBaseUrl}/admin/releases/${invalidManuscriptReleaseSlug}/review`, {
      headers: {
        cookie: sessionCookie
      }
    })
  );

  const activationResponse = await fetch(`${apiBaseUrl}/admin/releases/${invalidManuscriptReleaseSlug}/activate`, {
    method: "POST",
    headers: {
      cookie: sessionCookie
    }
  });

  assert.equal(validation.isReady, false);
  assert.equal(validation.summary.dependencyCheckCount, 1);
  assert.equal(validation.summary.blockingFailureCount, 1);
  assert.deepEqual(
    validation.failures.map((failure) => ({
      code: failure.code,
      sourceType: failure.sourceType,
      sourceKey: failure.sourceKey,
      dependencyType: failure.dependencyType,
      dependencyKey: failure.dependencyKey
    })),
    [
      {
        code: "MISSING_DEPENDENCY",
        sourceType: "MANUSCRIPT_REVISION",
        sourceKey: orphanSceneSlug,
        dependencyType: "MANUSCRIPT",
        dependencyKey: missingChapterSlug
      }
    ]
  );
  assert.deepEqual(
    review.manuscriptEntries.map((entry) => ({
      manuscriptSlug: entry.manuscriptSlug,
      manuscriptType: entry.manuscriptType,
      title: entry.title,
      dependencyState: entry.dependencyState,
      blockingDependencies: entry.blockingDependencies.map((dependency) => ({
        code: dependency.code,
        dependencyKey: dependency.dependencyKey
      }))
    })),
    [
      {
        manuscriptSlug: orphanSceneSlug,
        manuscriptType: "SCENE",
        title: "Orphan Scene",
        dependencyState: "MISSING_DEPENDENCIES",
        blockingDependencies: [
          {
            code: "MISSING_DEPENDENCY",
            dependencyKey: missingChapterSlug
          }
        ]
      }
    ]
  );
  assert.equal(activationResponse.status, 409);
  assert.equal((await activationResponse.json() as { error: string }).error, "Release cannot be activated while required dependencies are missing");
});