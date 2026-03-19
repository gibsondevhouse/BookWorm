import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";

import { createApp } from "../apps/api/src/app/createApp.js";
import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { manuscriptRevisionRepository } from "../apps/api/src/repositories/manuscriptRevisionRepository.js";
import { releaseRepository } from "../apps/api/src/repositories/releaseRepository.js";
import { phase0FixtureConfig } from "../scripts/phase0FixtureConfig.js";

type PublicChapterResponse = {
  releaseSlug: string;
  manuscriptType: string;
  manuscriptSlug: string;
  title: string;
  summary: string;
  visibility: string;
  version: number;
  payload: {
    chapterNumber?: number;
    body?: string;
  } | null;
};

type PublicSceneResponse = {
  releaseSlug: string;
  manuscriptType: string;
  manuscriptSlug: string;
  title: string;
  summary: string;
  visibility: string;
  version: number;
  payload: {
    chapterSlug?: string;
    body?: string;
  } | null;
};

type PublicManuscriptListResponse = {
  releaseSlug: string | null;
  items: Array<{
    releaseSlug: string;
    manuscriptType: string;
    manuscriptSlug: string;
    title: string;
    summary: string;
    visibility: string;
    version: number;
  }>;
};

const app = createApp();
const server = createServer(app);
const timestamp = Date.now();
const chapterSlug = `public-chapter-${timestamp}`;
const sceneSlug = `public-scene-${timestamp}`;
const initialReleaseSlug = `public-manuscript-release-initial-${timestamp}`;
const nextReleaseSlug = `public-manuscript-release-next-${timestamp}`;

let apiBaseUrl = "";
let authorId = "";

const ensureOk = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Request failed with ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
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

  const author = await prismaClient.user.upsert({
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

  authorId = author.id;

  const chapterRevision = await manuscriptRevisionRepository.saveRevision({
    manuscriptType: "CHAPTER",
    actorId: authorId,
    slug: chapterSlug,
    title: "Public Chapter One",
    summary: "Initial public chapter summary",
    visibility: Visibility.PUBLIC,
    payload: {
      chapterNumber: 1,
      body: "# Public Chapter One\n\nInitial chapter body"
    }
  });

  const sceneRevision = await manuscriptRevisionRepository.saveRevision({
    manuscriptType: "SCENE",
    actorId: authorId,
    slug: sceneSlug,
    title: "Public Scene One",
    summary: "Initial public scene summary",
    visibility: Visibility.PUBLIC,
    payload: {
      chapterSlug,
      body: "Initial scene body"
    }
  });

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: initialReleaseSlug,
    name: "Phase 2 Public Manuscript Initial Release"
  });

  await manuscriptRevisionRepository.includeRevisionInRelease({
    releaseSlug: initialReleaseSlug,
    manuscriptSlug: chapterSlug,
    manuscriptRevisionId: chapterRevision.manuscriptRevisionId
  });

  await manuscriptRevisionRepository.includeRevisionInRelease({
    releaseSlug: initialReleaseSlug,
    manuscriptSlug: sceneSlug,
    manuscriptRevisionId: sceneRevision.manuscriptRevisionId
  });

  await releaseRepository.activateRelease(initialReleaseSlug);
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

  await prismaClient.releaseManuscriptEntry.deleteMany({
    where: {
      release: {
        slug: {
          in: [initialReleaseSlug, nextReleaseSlug]
        }
      }
    }
  });

  await prismaClient.release.deleteMany({
    where: {
      slug: {
        in: [initialReleaseSlug, nextReleaseSlug]
      }
    }
  });

  await prismaClient.manuscriptRevision.deleteMany({
    where: {
      manuscript: {
        slug: {
          in: [chapterSlug, sceneSlug]
        }
      }
    }
  });

  await prismaClient.manuscript.deleteMany({
    where: {
      slug: {
        in: [chapterSlug, sceneSlug]
      }
    }
  });

  await prismaClient.$disconnect();
});

test("public chapter and scene reads remain bound to the active release", async () => {
  const initialChapterList = await ensureOk<PublicManuscriptListResponse>(await fetch(`${apiBaseUrl}/chapters`));
  const initialSceneList = await ensureOk<PublicManuscriptListResponse>(await fetch(`${apiBaseUrl}/scenes`));
  const initialChapter = await ensureOk<PublicChapterResponse>(await fetch(`${apiBaseUrl}/chapters/${chapterSlug}`));
  const initialScene = await ensureOk<PublicSceneResponse>(await fetch(`${apiBaseUrl}/scenes/${sceneSlug}`));

  assert.equal(initialChapterList.releaseSlug, initialReleaseSlug);
  assert.deepEqual(
    initialChapterList.items.map((item) => ({
      manuscriptSlug: item.manuscriptSlug,
      title: item.title,
      version: item.version
    })),
    [
      {
        manuscriptSlug: chapterSlug,
        title: "Public Chapter One",
        version: 1
      }
    ]
  );
  assert.equal(initialSceneList.releaseSlug, initialReleaseSlug);
  assert.deepEqual(
    initialSceneList.items.map((item) => ({
      manuscriptSlug: item.manuscriptSlug,
      title: item.title,
      version: item.version
    })),
    [
      {
        manuscriptSlug: sceneSlug,
        title: "Public Scene One",
        version: 1
      }
    ]
  );

  assert.equal(initialChapter.releaseSlug, initialReleaseSlug);
  assert.equal(initialChapter.manuscriptType, "CHAPTER");
  assert.equal(initialChapter.manuscriptSlug, chapterSlug);
  assert.equal(initialChapter.title, "Public Chapter One");
  assert.equal(initialChapter.version, 1);
  assert.equal(initialChapter.payload?.chapterNumber, 1);

  assert.equal(initialScene.releaseSlug, initialReleaseSlug);
  assert.equal(initialScene.manuscriptType, "SCENE");
  assert.equal(initialScene.manuscriptSlug, sceneSlug);
  assert.equal(initialScene.title, "Public Scene One");
  assert.equal(initialScene.version, 1);
  assert.equal(initialScene.payload?.chapterSlug, chapterSlug);

  const nextChapterRevision = await manuscriptRevisionRepository.saveRevision({
    manuscriptType: "CHAPTER",
    actorId: authorId,
    slug: chapterSlug,
    title: "Public Chapter One Revised",
    summary: "Updated public chapter summary hidden until activation",
    visibility: Visibility.PUBLIC,
    payload: {
      chapterNumber: 1,
      body: "# Public Chapter One\n\nUpdated chapter body"
    }
  });

  const nextSceneRevision = await manuscriptRevisionRepository.saveRevision({
    manuscriptType: "SCENE",
    actorId: authorId,
    slug: sceneSlug,
    title: "Public Scene One Revised",
    summary: "Updated public scene summary hidden until activation",
    visibility: Visibility.PUBLIC,
    payload: {
      chapterSlug,
      body: "Updated scene body"
    }
  });

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: nextReleaseSlug,
    name: "Phase 2 Public Manuscript Next Release"
  });

  await manuscriptRevisionRepository.includeRevisionInRelease({
    releaseSlug: nextReleaseSlug,
    manuscriptSlug: chapterSlug,
    manuscriptRevisionId: nextChapterRevision.manuscriptRevisionId
  });

  await manuscriptRevisionRepository.includeRevisionInRelease({
    releaseSlug: nextReleaseSlug,
    manuscriptSlug: sceneSlug,
    manuscriptRevisionId: nextSceneRevision.manuscriptRevisionId
  });

  const beforeActivationChapterList = await ensureOk<PublicManuscriptListResponse>(await fetch(`${apiBaseUrl}/chapters`));
  const beforeActivationSceneList = await ensureOk<PublicManuscriptListResponse>(await fetch(`${apiBaseUrl}/scenes`));
  const beforeActivationChapter = await ensureOk<PublicChapterResponse>(await fetch(`${apiBaseUrl}/chapters/${chapterSlug}`));
  const beforeActivationScene = await ensureOk<PublicSceneResponse>(await fetch(`${apiBaseUrl}/scenes/${sceneSlug}`));

  assert.equal(beforeActivationChapterList.releaseSlug, initialReleaseSlug);
  assert.equal(beforeActivationChapterList.items[0]?.title, "Public Chapter One");
  assert.equal(beforeActivationSceneList.releaseSlug, initialReleaseSlug);
  assert.equal(beforeActivationSceneList.items[0]?.title, "Public Scene One");
  assert.equal(beforeActivationChapter.releaseSlug, initialReleaseSlug);
  assert.equal(beforeActivationChapter.title, "Public Chapter One");
  assert.equal(beforeActivationScene.releaseSlug, initialReleaseSlug);
  assert.equal(beforeActivationScene.title, "Public Scene One");

  await releaseRepository.activateRelease(nextReleaseSlug);

  const afterActivationChapterList = await ensureOk<PublicManuscriptListResponse>(await fetch(`${apiBaseUrl}/chapters`));
  const afterActivationSceneList = await ensureOk<PublicManuscriptListResponse>(await fetch(`${apiBaseUrl}/scenes`));
  const afterActivationChapter = await ensureOk<PublicChapterResponse>(await fetch(`${apiBaseUrl}/chapters/${chapterSlug}`));
  const afterActivationScene = await ensureOk<PublicSceneResponse>(await fetch(`${apiBaseUrl}/scenes/${sceneSlug}`));

  assert.equal(afterActivationChapterList.releaseSlug, nextReleaseSlug);
  assert.equal(afterActivationChapterList.items[0]?.title, "Public Chapter One Revised");
  assert.equal(afterActivationChapterList.items[0]?.version, 2);
  assert.equal(afterActivationSceneList.releaseSlug, nextReleaseSlug);
  assert.equal(afterActivationSceneList.items[0]?.title, "Public Scene One Revised");
  assert.equal(afterActivationSceneList.items[0]?.version, 2);
  assert.equal(afterActivationChapter.releaseSlug, nextReleaseSlug);
  assert.equal(afterActivationChapter.title, "Public Chapter One Revised");
  assert.equal(afterActivationChapter.version, 2);
  assert.match(afterActivationChapter.payload?.body ?? "", /Updated chapter body/);

  assert.equal(afterActivationScene.releaseSlug, nextReleaseSlug);
  assert.equal(afterActivationScene.title, "Public Scene One Revised");
  assert.equal(afterActivationScene.version, 2);
  assert.equal(afterActivationScene.payload?.chapterSlug, chapterSlug);
});