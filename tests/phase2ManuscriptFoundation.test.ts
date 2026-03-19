import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";

import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { manuscriptRevisionRepository } from "../apps/api/src/repositories/manuscriptRevisionRepository.js";
import { releaseRepository } from "../apps/api/src/repositories/releaseRepository.js";
import { phase0FixtureConfig } from "../scripts/phase0FixtureConfig.js";

const chapterSlug = `chapter-${Date.now()}`;
const sceneSlug = `scene-${Date.now()}`;
const releaseSlug = `manuscript-release-${Date.now()}`;

let authorId = "";

before(async () => {
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

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: releaseSlug,
    name: "Phase 2 Manuscript Foundation Release"
  });
});

after(async () => {
  await prismaClient.releaseManuscriptEntry.deleteMany({
    where: {
      release: {
        slug: releaseSlug
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

  await prismaClient.release.deleteMany({
    where: {
      slug: releaseSlug
    }
  });

  await prismaClient.$disconnect();
});

test("chapter and scene revisions create distinct history and releases can point at manuscript revisions", async () => {
  const chapterRevision = await manuscriptRevisionRepository.saveRevision({
    manuscriptType: "CHAPTER",
    actorId: authorId,
    slug: chapterSlug,
    title: "Chapter One",
    summary: "Opening chapter summary",
    visibility: Visibility.PUBLIC,
    payload: {
      chapterNumber: 1,
      body: "# Chapter One\n\nOpening chapter body"
    }
  });

  assert.equal(chapterRevision.version, 1);
  assert.equal(chapterRevision.manuscriptType, "CHAPTER");

  const chapterRevisionUpdate = await manuscriptRevisionRepository.saveRevision({
    manuscriptType: "CHAPTER",
    actorId: authorId,
    slug: chapterSlug,
    title: "Chapter One",
    summary: "Opening chapter summary revised",
    visibility: Visibility.PUBLIC,
    payload: {
      chapterNumber: 1,
      body: "# Chapter One\n\nOpening chapter body revised"
    }
  });

  assert.equal(chapterRevisionUpdate.version, 2);
  assert.equal(chapterRevisionUpdate.manuscriptId, chapterRevision.manuscriptId);

  const sceneRevision = await manuscriptRevisionRepository.saveRevision({
    manuscriptType: "SCENE",
    actorId: authorId,
    slug: sceneSlug,
    title: "Scene One",
    summary: "Opening scene summary",
    visibility: Visibility.PUBLIC,
    payload: {
      chapterSlug,
      body: "Scene body"
    }
  });

  assert.equal(sceneRevision.version, 1);
  assert.equal(sceneRevision.manuscriptType, "SCENE");

  const chapterReleaseEntry = await manuscriptRevisionRepository.includeRevisionInRelease({
    releaseSlug,
    manuscriptSlug: chapterSlug,
    manuscriptRevisionId: chapterRevisionUpdate.manuscriptRevisionId
  });

  assert.equal(chapterReleaseEntry.releaseSlug, releaseSlug);
  assert.equal(chapterReleaseEntry.manuscriptSlug, chapterSlug);

  const sceneReleaseEntry = await manuscriptRevisionRepository.includeRevisionInRelease({
    releaseSlug,
    manuscriptSlug: sceneSlug,
    manuscriptRevisionId: sceneRevision.manuscriptRevisionId
  });

  assert.equal(sceneReleaseEntry.releaseSlug, releaseSlug);
  assert.equal(sceneReleaseEntry.manuscriptSlug, sceneSlug);

  const releaseState = await releaseRepository.getReleaseCompositionState(releaseSlug);

  assert.equal(releaseState.entityEntryCount, 0);
  assert.equal(releaseState.manuscriptEntryCount, 2);
  assert.equal(releaseState.relationshipEntryCount, 0);

  const storedChapterEntry = await prismaClient.releaseManuscriptEntry.findFirst({
    where: {
      release: {
        slug: releaseSlug
      },
      manuscript: {
        slug: chapterSlug
      }
    },
    select: {
      manuscriptRevisionId: true
    }
  });

  assert.equal(storedChapterEntry?.manuscriptRevisionId, chapterRevisionUpdate.manuscriptRevisionId);
});