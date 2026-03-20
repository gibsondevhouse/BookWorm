import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";

import { createApp } from "../apps/api/src/app/createApp.js";
import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { releaseRepository } from "../apps/api/src/repositories/releaseRepository.js";
import { searchIndexService } from "../apps/api/src/services/searchIndexService.js";
import { phase0FixtureConfig } from "../scripts/phase0FixtureConfig.js";

const ts = Date.now();
const app = createApp();
const server = createServer(app);
let apiBaseUrl = "";
let authorId = "";

const slugs = {
  activeRelease: `phase5-search-active-${ts}`,
  draftRelease: `phase5-search-draft-${ts}`,
  exactMage: `phase5-exact-mage-${ts}`,
  aliasWizardAlpha: `phase5-alias-wizard-alpha-${ts}`,
  aliasWizardBeta: `phase5-alias-wizard-beta-${ts}`,
  battleScholar: `phase5-battle-scholar-${ts}`,
  metadataConflict: `phase5-metadata-conflict-${ts}`,
  privateWizard: `phase5-private-wizard-${ts}`,
  majorWizard: `phase5-major-wizard-${ts}`,
  draftWizard: `phase5-draft-wizard-${ts}`
};

before(async () => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const addr = server.address();
  if (!addr || typeof addr === "string") {
    throw new Error("No test server address");
  }
  apiBaseUrl = `http://127.0.0.1:${(addr as { port: number }).port}`;

  const hash = await passwordHasher.hashPassword(phase0FixtureConfig.authorAdmin.password);
  const author = await prismaClient.user.upsert({
    where: { email: phase0FixtureConfig.authorAdmin.email },
    update: {
      displayName: phase0FixtureConfig.authorAdmin.displayName,
      passwordHash: hash,
      role: Role.AUTHOR_ADMIN
    },
    create: {
      email: phase0FixtureConfig.authorAdmin.email,
      displayName: phase0FixtureConfig.authorAdmin.displayName,
      passwordHash: hash,
      role: Role.AUTHOR_ADMIN
    }
  });
  authorId = author.id;

  const mkEntity = async (input: {
    slug: string;
    name: string;
    summary: string;
    visibility: Visibility;
    metadata?: Record<string, unknown>;
  }): Promise<{ revisionId: string }> => {
    const entity = await prismaClient.entity.create({
      data: { slug: input.slug, type: "CHARACTER" }
    });

    const revision = await prismaClient.entityRevision.create({
      data: {
        entityId: entity.id,
        createdById: authorId,
        version: 1,
        name: input.name,
        summary: input.summary,
        visibility: input.visibility,
        payload: {
          name: input.name,
          summary: input.summary,
          visibility: input.visibility,
          ...(input.metadata ? { metadata: input.metadata } : {})
        }
      }
    });

    return { revisionId: revision.id };
  };

  const exactMage = await mkEntity({
    slug: slugs.exactMage,
    name: "mage",
    summary: "exact name match",
    visibility: Visibility.PUBLIC,
    metadata: { spoilerTier: "NONE" }
  });

  const aliasWizardAlpha = await mkEntity({
    slug: slugs.aliasWizardAlpha,
    name: "wizard alpha",
    summary: "alias expansion candidate",
    visibility: Visibility.PUBLIC,
    metadata: { spoilerTier: "NONE" }
  });

  const aliasWizardBeta = await mkEntity({
    slug: slugs.aliasWizardBeta,
    name: "wizard beta",
    summary: "second alias expansion candidate",
    visibility: Visibility.PUBLIC,
    metadata: { spoilerTier: "NONE" }
  });

  const metadataConflict = await mkEntity({
    slug: slugs.metadataConflict,
    name: "historian",
    summary: "metadata-only query expansion candidate",
    visibility: Visibility.PUBLIC,
    metadata: { spoilerTier: "NONE", tags: ["conflict"] }
  });

  const battleScholar = await mkEntity({
    slug: slugs.battleScholar,
    name: "battle scholar",
    summary: "text expansion target",
    visibility: Visibility.PUBLIC,
    metadata: { spoilerTier: "NONE" }
  });

  const privateWizard = await mkEntity({
    slug: slugs.privateWizard,
    name: "wizard private",
    summary: "private content should never leak",
    visibility: Visibility.PRIVATE,
    metadata: { spoilerTier: "NONE" }
  });

  const majorWizard = await mkEntity({
    slug: slugs.majorWizard,
    name: "wizard major",
    summary: "major spoiler content should honor filter",
    visibility: Visibility.PUBLIC,
    metadata: { spoilerTier: "MAJOR" }
  });

  const draftWizard = await mkEntity({
    slug: slugs.draftWizard,
    name: "wizard draft",
    summary: "draft-release-only content should not be indexed",
    visibility: Visibility.PUBLIC,
    metadata: { spoilerTier: "NONE" }
  });

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: slugs.activeRelease,
    name: "Phase 5 Search Active"
  });

  for (const [entitySlug, revisionId] of [
    [slugs.exactMage, exactMage.revisionId],
    [slugs.aliasWizardAlpha, aliasWizardAlpha.revisionId],
    [slugs.aliasWizardBeta, aliasWizardBeta.revisionId],
    [slugs.battleScholar, battleScholar.revisionId],
    [slugs.metadataConflict, metadataConflict.revisionId],
    [slugs.privateWizard, privateWizard.revisionId],
    [slugs.majorWizard, majorWizard.revisionId]
  ] as [string, string][]) {
    await releaseRepository.includeRevision({
      releaseSlug: slugs.activeRelease,
      entitySlug,
      revisionId
    });
  }

  await releaseRepository.activateRelease(slugs.activeRelease);

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: slugs.draftRelease,
    name: "Phase 5 Search Draft"
  });

  await releaseRepository.includeRevision({
    releaseSlug: slugs.draftRelease,
    entitySlug: slugs.draftWizard,
    revisionId: draftWizard.revisionId
  });

  await searchIndexService.rebuildIndex();
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });

  await prismaClient.releaseEntry.deleteMany({
    where: { release: { slug: { in: Object.values(slugs) } } }
  });
  await prismaClient.release.deleteMany({
    where: { slug: { in: Object.values(slugs) } }
  });
  await prismaClient.entityRevision.deleteMany({
    where: { entity: { slug: { in: Object.values(slugs) } } }
  });
  await prismaClient.entity.deleteMany({
    where: { slug: { in: Object.values(slugs) } }
  });

  await searchIndexService.rebuildIndex();
  await prismaClient.$disconnect();
});

test("AC-01: q uses synonym/alias expansion before search lookup", async () => {
  const response = await fetch(
    `${apiBaseUrl}/search?releaseSlug=${slugs.activeRelease}&q=mage&limit=20`
  );
  assert.equal(response.status, 200);

  const payload = (await response.json()) as {
    hits: Array<{ document: { entitySlug?: string } }>;
  };

  const returnedSlugs = new Set(payload.hits.map((hit) => hit.document.entitySlug));
  assert.ok(returnedSlugs.has(slugs.exactMage));
  assert.ok(returnedSlugs.has(slugs.aliasWizardAlpha));
  assert.ok(returnedSlugs.has(slugs.aliasWizardBeta));
});

test("AC-02: exact title match ranks above expanded alias/synonym matches", async () => {
  const response = await fetch(
    `${apiBaseUrl}/search?releaseSlug=${slugs.activeRelease}&q=mage&limit=20`
  );
  assert.equal(response.status, 200);

  const payload = (await response.json()) as {
    hits: Array<{ document: { entitySlug?: string } }>;
  };

  const firstHit = payload.hits[0];
  assert.ok(firstHit, "Expected at least one search hit");
  assert.equal(firstHit.document.entitySlug, slugs.exactMage);
});

test("AC-03: expanded matches cannot bypass release, visibility, or spoiler filters", async () => {
  const activeResponse = await fetch(
    `${apiBaseUrl}/search?releaseSlug=${slugs.activeRelease}&q=mage&spoilerTier=NONE&limit=20`
  );
  assert.equal(activeResponse.status, 200);

  const activePayload = (await activeResponse.json()) as {
    hits: Array<{ document: { entitySlug?: string } }>;
  };

  const activeSlugs = new Set(activePayload.hits.map((hit) => hit.document.entitySlug));
  assert.equal(activeSlugs.has(slugs.privateWizard), false);
  assert.equal(activeSlugs.has(slugs.majorWizard), false);

  const draftResponse = await fetch(
    `${apiBaseUrl}/search?releaseSlug=${slugs.draftRelease}&q=mage&limit=20`
  );
  assert.equal(draftResponse.status, 200);

  const draftPayload = (await draftResponse.json()) as {
    hits: Array<{ document: { entitySlug?: string } }>;
  };

  const draftSlugs = new Set(draftPayload.hits.map((hit) => hit.document.entitySlug));
  assert.equal(draftSlugs.has(slugs.draftWizard), false);
});

test("AC-04: ordering remains deterministic for identical fixtures and query", async () => {
  const query = `${apiBaseUrl}/search?releaseSlug=${slugs.activeRelease}&q=mage&limit=20`;

  const first = (await (await fetch(query)).json()) as {
    hits: Array<{ id: string }>;
  };
  const second = (await (await fetch(query)).json()) as {
    hits: Array<{ id: string }>;
  };
  const third = (await (await fetch(query)).json()) as {
    hits: Array<{ id: string }>;
  };

  const firstIds = first.hits.map((hit) => hit.id);
  const secondIds = second.hits.map((hit) => hit.id);
  const thirdIds = third.hits.map((hit) => hit.id);

  assert.deepEqual(firstIds, secondIds);
  assert.deepEqual(secondIds, thirdIds);
});

test("Ranking baseline: metadata expanded matches rank after text matches", async () => {
  const response = await fetch(
    `${apiBaseUrl}/search?releaseSlug=${slugs.activeRelease}&q=war&limit=20`
  );
  assert.equal(response.status, 200);

  const payload = (await response.json()) as {
    hits: Array<{ document: { entitySlug?: string } }>;
  };

  const ordered = payload.hits.map((hit) => hit.document.entitySlug);
  const metadataIdx = ordered.indexOf(slugs.metadataConflict);
  const textIdx = ordered.indexOf(slugs.battleScholar);

  assert.notEqual(metadataIdx, -1, "Expected metadata-expanded hit to be present");
  assert.notEqual(textIdx, -1, "Expected war text match to be present through synonym expansion");
  assert.ok(textIdx < metadataIdx, "Metadata-only expansion should rank lower than text expansion");
});
