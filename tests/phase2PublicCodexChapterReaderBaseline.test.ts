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

type PublicCodexManuscriptListResponse = {
  releaseSlug: string;
  items: Array<{
    manuscriptType: "CHAPTER" | "SCENE";
    manuscriptSlug: string;
    title: string;
    summary: string;
    version: number;
    detailPath: string;
    detailHref: string;
  }>;
};

type PublicCodexManuscriptDetailResponse = {
  manuscriptType: "CHAPTER" | "SCENE";
  manuscriptSlug: string;
  title: string;
  summary: string;
  version: number;
  payload: {
    body?: string;
    chapterNumber?: number;
    chapterSlug?: string;
  } | null;
  releaseSlug: string;
  detailPath: string;
  detailHref: string;
};

type PublicCodexListResponse = {
  releaseSlug: string | null;
  items: Array<{
    entityType: string;
  }>;
};

const app = createApp();
const server = createServer(app);
const timestamp = Date.now();

const archivedReleaseSlug = `public-codex-manuscripts-archived-${timestamp}`;
const activeReleaseSlug = `public-codex-manuscripts-active-${timestamp}`;
const draftReleaseSlug = `public-codex-manuscripts-draft-${timestamp}`;

const chapterSlug = `public-codex-manuscripts-chapter-${timestamp}`;
const sceneSlug = `public-codex-manuscripts-scene-${timestamp}`;
const privateChapterSlug = `public-codex-manuscripts-private-chapter-${timestamp}`;

let apiBaseUrl = "";
let authorId = "";

const ensureOk = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Request failed with ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
};

const buildManuscriptListUrl = (input?: {
  releaseSlug?: string;
  type?: "CHAPTER" | "SCENE";
  limit?: number;
}): string => {
  const url = new URL("/codex/manuscripts", apiBaseUrl);

  if (input?.releaseSlug !== undefined) {
    url.searchParams.set("releaseSlug", input.releaseSlug);
  }

  if (input?.type !== undefined) {
    url.searchParams.set("type", input.type);
  }

  if (input?.limit !== undefined) {
    url.searchParams.set("limit", String(input.limit));
  }

  return url.toString();
};

const buildManuscriptDetailUrl = (input: { slug: string; releaseSlug?: string }): string => {
  const url = new URL(`/codex/manuscripts/${input.slug}`, apiBaseUrl);

  if (input.releaseSlug !== undefined) {
    url.searchParams.set("releaseSlug", input.releaseSlug);
  }

  return url.toString();
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

  const archivedChapterRevision = await manuscriptRevisionRepository.saveRevision({
    manuscriptType: "CHAPTER",
    actorId: authorId,
    slug: chapterSlug,
    title: "Archived Chapter",
    summary: "Archived chapter summary",
    visibility: Visibility.PUBLIC,
    payload: {
      chapterNumber: 1,
      body: "Archived chapter body"
    }
  });

  const archivedSceneRevision = await manuscriptRevisionRepository.saveRevision({
    manuscriptType: "SCENE",
    actorId: authorId,
    slug: sceneSlug,
    title: "Archived Scene",
    summary: "Archived scene summary",
    visibility: Visibility.PUBLIC,
    payload: {
      chapterSlug,
      body: "Archived scene body"
    }
  });

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: archivedReleaseSlug,
    name: "Public Codex Manuscripts Archived"
  });

  await manuscriptRevisionRepository.includeRevisionInRelease({
    releaseSlug: archivedReleaseSlug,
    manuscriptSlug: chapterSlug,
    manuscriptRevisionId: archivedChapterRevision.manuscriptRevisionId
  });

  await manuscriptRevisionRepository.includeRevisionInRelease({
    releaseSlug: archivedReleaseSlug,
    manuscriptSlug: sceneSlug,
    manuscriptRevisionId: archivedSceneRevision.manuscriptRevisionId
  });

  await releaseRepository.activateRelease(archivedReleaseSlug);

  const activeChapterRevision = await manuscriptRevisionRepository.saveRevision({
    manuscriptType: "CHAPTER",
    actorId: authorId,
    slug: chapterSlug,
    title: "Active Chapter",
    summary: "Active chapter summary",
    visibility: Visibility.PUBLIC,
    payload: {
      chapterNumber: 2,
      body: "Active chapter body"
    }
  });

  const activeSceneRevision = await manuscriptRevisionRepository.saveRevision({
    manuscriptType: "SCENE",
    actorId: authorId,
    slug: sceneSlug,
    title: "Active Scene",
    summary: "Active scene summary",
    visibility: Visibility.PUBLIC,
    payload: {
      chapterSlug,
      body: "Active scene body"
    }
  });

  const privateChapterRevision = await manuscriptRevisionRepository.saveRevision({
    manuscriptType: "CHAPTER",
    actorId: authorId,
    slug: privateChapterSlug,
    title: "Private Chapter",
    summary: "Private chapter summary",
    visibility: Visibility.PRIVATE,
    payload: {
      chapterNumber: 99,
      body: "Private chapter body"
    }
  });

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: activeReleaseSlug,
    name: "Public Codex Manuscripts Active"
  });

  await manuscriptRevisionRepository.includeRevisionInRelease({
    releaseSlug: activeReleaseSlug,
    manuscriptSlug: chapterSlug,
    manuscriptRevisionId: activeChapterRevision.manuscriptRevisionId
  });

  await manuscriptRevisionRepository.includeRevisionInRelease({
    releaseSlug: activeReleaseSlug,
    manuscriptSlug: sceneSlug,
    manuscriptRevisionId: activeSceneRevision.manuscriptRevisionId
  });

  await manuscriptRevisionRepository.includeRevisionInRelease({
    releaseSlug: activeReleaseSlug,
    manuscriptSlug: privateChapterSlug,
    manuscriptRevisionId: privateChapterRevision.manuscriptRevisionId
  });

  await releaseRepository.activateRelease(activeReleaseSlug);

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: draftReleaseSlug,
    name: "Public Codex Manuscripts Draft"
  });

  await manuscriptRevisionRepository.includeRevisionInRelease({
    releaseSlug: draftReleaseSlug,
    manuscriptSlug: chapterSlug,
    manuscriptRevisionId: activeChapterRevision.manuscriptRevisionId
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

  await prismaClient.releaseManuscriptEntry.deleteMany({
    where: {
      release: {
        slug: {
          in: [archivedReleaseSlug, activeReleaseSlug, draftReleaseSlug]
        }
      }
    }
  });

  await prismaClient.release.deleteMany({
    where: {
      slug: {
        in: [archivedReleaseSlug, activeReleaseSlug, draftReleaseSlug]
      }
    }
  });

  await prismaClient.manuscriptRevision.deleteMany({
    where: {
      manuscript: {
        slug: {
          in: [chapterSlug, sceneSlug, privateChapterSlug]
        }
      }
    }
  });

  await prismaClient.manuscript.deleteMany({
    where: {
      slug: {
        in: [chapterSlug, sceneSlug, privateChapterSlug]
      }
    }
  });

  await prismaClient.$disconnect();
});

test("public codex manuscripts list falls back to active release", async () => {
  const list = await ensureOk<PublicCodexManuscriptListResponse>(await fetch(buildManuscriptListUrl()));

  assert.equal(list.releaseSlug, activeReleaseSlug);
  assert.deepEqual(
    list.items.map((item) => ({
      manuscriptType: item.manuscriptType,
      manuscriptSlug: item.manuscriptSlug,
      title: item.title,
      detailHref: item.detailHref
    })),
    [
      {
        manuscriptType: "CHAPTER",
        manuscriptSlug: chapterSlug,
        title: "Active Chapter",
        detailHref: `/codex/manuscripts/${chapterSlug}`
      },
      {
        manuscriptType: "SCENE",
        manuscriptSlug: sceneSlug,
        title: "Active Scene",
        detailHref: `/codex/manuscripts/${sceneSlug}`
      }
    ]
  );
});

test("public codex manuscripts list supports archived release selection", async () => {
  const list = await ensureOk<PublicCodexManuscriptListResponse>(
    await fetch(buildManuscriptListUrl({ releaseSlug: archivedReleaseSlug }))
  );

  assert.equal(list.releaseSlug, archivedReleaseSlug);
  assert.deepEqual(
    list.items.map((item) => ({
      manuscriptType: item.manuscriptType,
      manuscriptSlug: item.manuscriptSlug,
      title: item.title,
      detailHref: item.detailHref
    })),
    [
      {
        manuscriptType: "CHAPTER",
        manuscriptSlug: chapterSlug,
        title: "Archived Chapter",
        detailHref: `/codex/manuscripts/${chapterSlug}?releaseSlug=${encodeURIComponent(archivedReleaseSlug)}`
      },
      {
        manuscriptType: "SCENE",
        manuscriptSlug: sceneSlug,
        title: "Archived Scene",
        detailHref: `/codex/manuscripts/${sceneSlug}?releaseSlug=${encodeURIComponent(archivedReleaseSlug)}`
      }
    ]
  );
});

test("public codex manuscripts list returns 404 for draft and unknown releases", async () => {
  const [draftResponse, unknownResponse] = await Promise.all([
    fetch(buildManuscriptListUrl({ releaseSlug: draftReleaseSlug })),
    fetch(buildManuscriptListUrl({ releaseSlug: `unknown-manuscript-release-${timestamp}` }))
  ]);

  assert.equal(draftResponse.status, 404);
  assert.equal(unknownResponse.status, 404);
});

test("public codex manuscripts type filters return CHAPTER and SCENE subsets", async () => {
  const [chapterList, sceneList] = await Promise.all([
    ensureOk<PublicCodexManuscriptListResponse>(await fetch(buildManuscriptListUrl({ type: "CHAPTER" }))),
    ensureOk<PublicCodexManuscriptListResponse>(await fetch(buildManuscriptListUrl({ type: "SCENE" })))
  ]);

  assert.equal(chapterList.items.length, 1);
  assert.equal(chapterList.items[0]?.manuscriptType, "CHAPTER");
  assert.equal(chapterList.items[0]?.manuscriptSlug, chapterSlug);

  assert.equal(sceneList.items.length, 1);
  assert.equal(sceneList.items[0]?.manuscriptType, "SCENE");
  assert.equal(sceneList.items[0]?.manuscriptSlug, sceneSlug);
});

test("public codex manuscripts list excludes private visibility entries", async () => {
  const list = await ensureOk<PublicCodexManuscriptListResponse>(await fetch(buildManuscriptListUrl()));

  assert.equal(list.items.some((item) => item.manuscriptSlug === privateChapterSlug), false);
});

test("public codex manuscript detail falls back to active release", async () => {
  const detail = await ensureOk<PublicCodexManuscriptDetailResponse>(
    await fetch(buildManuscriptDetailUrl({ slug: chapterSlug }))
  );

  assert.equal(detail.releaseSlug, activeReleaseSlug);
  assert.equal(detail.manuscriptType, "CHAPTER");
  assert.equal(detail.manuscriptSlug, chapterSlug);
  assert.equal(detail.title, "Active Chapter");
  assert.equal(detail.version, 2);
  assert.equal(detail.payload?.body, "Active chapter body");
  assert.equal(detail.detailHref, `/codex/manuscripts/${chapterSlug}`);
});

test("public codex manuscript detail supports archived release selection", async () => {
  const detail = await ensureOk<PublicCodexManuscriptDetailResponse>(
    await fetch(buildManuscriptDetailUrl({ slug: chapterSlug, releaseSlug: archivedReleaseSlug }))
  );

  assert.equal(detail.releaseSlug, archivedReleaseSlug);
  assert.equal(detail.title, "Archived Chapter");
  assert.equal(detail.version, 1);
  assert.equal(detail.payload?.body, "Archived chapter body");
  assert.equal(
    detail.detailHref,
    `/codex/manuscripts/${chapterSlug}?releaseSlug=${encodeURIComponent(archivedReleaseSlug)}`
  );
});

test("public codex manuscript detail returns 404 for draft and missing slugs", async () => {
  const [draftResponse, missingResponse] = await Promise.all([
    fetch(buildManuscriptDetailUrl({ slug: chapterSlug, releaseSlug: draftReleaseSlug })),
    fetch(buildManuscriptDetailUrl({ slug: `missing-manuscript-${timestamp}` }))
  ]);

  assert.equal(draftResponse.status, 404);
  assert.equal(missingResponse.status, 404);
});

test("public codex manuscript detailHref format is release-aware", async () => {
  const [activeList, archivedList, activeDetail, archivedDetail] = await Promise.all([
    ensureOk<PublicCodexManuscriptListResponse>(await fetch(buildManuscriptListUrl())),
    ensureOk<PublicCodexManuscriptListResponse>(
      await fetch(buildManuscriptListUrl({ releaseSlug: archivedReleaseSlug }))
    ),
    ensureOk<PublicCodexManuscriptDetailResponse>(await fetch(buildManuscriptDetailUrl({ slug: sceneSlug }))),
    ensureOk<PublicCodexManuscriptDetailResponse>(
      await fetch(buildManuscriptDetailUrl({ slug: sceneSlug, releaseSlug: archivedReleaseSlug }))
    )
  ]);

  assert.equal(activeList.items[1]?.detailHref, `/codex/manuscripts/${sceneSlug}`);
  assert.equal(
    archivedList.items[1]?.detailHref,
    `/codex/manuscripts/${sceneSlug}?releaseSlug=${encodeURIComponent(archivedReleaseSlug)}`
  );
  assert.equal(activeDetail.detailHref, `/codex/manuscripts/${sceneSlug}`);
  assert.equal(
    archivedDetail.detailHref,
    `/codex/manuscripts/${sceneSlug}?releaseSlug=${encodeURIComponent(archivedReleaseSlug)}`
  );
});

test("public codex seam baseline remains accessible", async () => {
  const codex = await ensureOk<PublicCodexListResponse>(await fetch(`${apiBaseUrl}/codex`));

  assert.equal(codex.releaseSlug, activeReleaseSlug);
  assert.equal(Array.isArray(codex.items), true);
});
