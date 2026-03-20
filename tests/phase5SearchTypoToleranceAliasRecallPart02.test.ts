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
  activeRelease: `phase5-typo-active-${ts}`,
  draftRelease: `phase5-typo-draft-${ts}`,
  compatibilityManuscript: `phase5-typo-compat-ms-${ts}`,
  exactMage: `phase5-typo-exact-mage-${ts}`,
  aliasWizardAlpha: `phase5-typo-alias-wizard-alpha-${ts}`,
  aliasWizardBeta: `phase5-typo-alias-wizard-beta-${ts}`,
  battleScholar: `phase5-typo-battle-scholar-${ts}`,
  privateWizard: `phase5-typo-private-wizard-${ts}`,
  majorWizard: `phase5-typo-major-wizard-${ts}`,
  draftWizard: `phase5-typo-draft-wizard-${ts}`
};

async function search(query: string): Promise<{
  total: number;
  hits: Array<{ id: string; score: number; document: { entitySlug?: string } }>;
}> {
  const response = await fetch(`${apiBaseUrl}/search?${query}`);
  assert.equal(response.status, 200);
  return (await response.json()) as {
    total: number;
    hits: Array<{ id: string; score: number; document: { entitySlug?: string } }>;
  };
}

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
    summary: "alias and typo recall candidate",
    visibility: Visibility.PUBLIC,
    metadata: { spoilerTier: "NONE" }
  });

  const aliasWizardBeta = await mkEntity({
    slug: slugs.aliasWizardBeta,
    name: "wizard beta",
    summary: "secondary alias and typo recall candidate",
    visibility: Visibility.PUBLIC,
    metadata: { spoilerTier: "NONE" }
  });

  const battleScholar = await mkEntity({
    slug: slugs.battleScholar,
    name: "battle scholar",
    summary: "deterministic expansion precedence control",
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

  const compatibilityManuscript = await prismaClient.manuscript.create({
    data: {
      slug: slugs.compatibilityManuscript,
      type: "CHAPTER"
    }
  });

  const compatibilityManuscriptRevision = await prismaClient.manuscriptRevision.create({
    data: {
      manuscriptId: compatibilityManuscript.id,
      createdById: authorId,
      version: 1,
      title: "phase5 typo compatibility manuscript",
      summary: "used to verify Phase 2 manuscript search contract compatibility",
      visibility: Visibility.PUBLIC
    }
  });

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: slugs.activeRelease,
    name: "Phase 5 Typo Active"
  });

  for (const [entitySlug, revisionId] of [
    [slugs.exactMage, exactMage.revisionId],
    [slugs.aliasWizardAlpha, aliasWizardAlpha.revisionId],
    [slugs.aliasWizardBeta, aliasWizardBeta.revisionId],
    [slugs.battleScholar, battleScholar.revisionId],
    [slugs.privateWizard, privateWizard.revisionId],
    [slugs.majorWizard, majorWizard.revisionId]
  ] as [string, string][]) {
    await releaseRepository.includeRevision({
      releaseSlug: slugs.activeRelease,
      entitySlug,
      revisionId
    });
  }

  await releaseRepository.includeManuscriptRevision({
    releaseSlug: slugs.activeRelease,
    manuscriptSlug: slugs.compatibilityManuscript,
    manuscriptRevisionId: compatibilityManuscriptRevision.id
  });

  await releaseRepository.activateRelease(slugs.activeRelease);

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: slugs.draftRelease,
    name: "Phase 5 Typo Draft"
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
  await prismaClient.manuscriptRevision.deleteMany({
    where: { manuscript: { slug: slugs.compatibilityManuscript } }
  });
  await prismaClient.manuscript.deleteMany({
    where: { slug: slugs.compatibilityManuscript }
  });

  await searchIndexService.rebuildIndex();
  await prismaClient.$disconnect();
});

test("AC-01: typo tolerance is bounded and gated by token length safeguards", async () => {
  const normalizedTypo = await search(
    `releaseSlug=${slugs.activeRelease}&q=  WIZRAD  &limit=20`
  );

  const typoSlugs = new Set(normalizedTypo.hits.map((hit) => hit.document.entitySlug));
  assert.ok(typoSlugs.has(slugs.aliasWizardAlpha));
  assert.ok(typoSlugs.has(slugs.aliasWizardBeta));

  const shortTokenGuard = await search(`releaseSlug=${slugs.activeRelease}&q=wzrd&limit=20`);
  assert.equal(shortTokenGuard.total, 0);
});

test("AC-02: canonical alias typo recall matches exact-alias policy eligibility", async () => {
  const exactAlias = await search(
    `releaseSlug=${slugs.activeRelease}&q=wizard&spoilerTier=NONE&limit=20`
  );
  const typoAlias = await search(
    `releaseSlug=${slugs.activeRelease}&q=wizrad&spoilerTier=NONE&limit=20`
  );

  const exactSlugs = new Set(exactAlias.hits.map((hit) => hit.document.entitySlug));
  const typoSlugs = new Set(typoAlias.hits.map((hit) => hit.document.entitySlug));

  assert.ok(exactSlugs.has(slugs.aliasWizardAlpha));
  assert.ok(exactSlugs.has(slugs.aliasWizardBeta));
  assert.ok(typoSlugs.has(slugs.aliasWizardAlpha));
  assert.ok(typoSlugs.has(slugs.aliasWizardBeta));

  assert.equal(typoSlugs.has(slugs.privateWizard), false);
  assert.equal(typoSlugs.has(slugs.majorWizard), false);
});

test("AC-03: typo-ranked matches stay below exact and deterministic expansion matches", async () => {
  const exactAlias = await search(`releaseSlug=${slugs.activeRelease}&q=wizard&limit=20`);
  const typoAlias = await search(`releaseSlug=${slugs.activeRelease}&q=wizrad&limit=20`);
  const expansionAndTypo = await search(`releaseSlug=${slugs.activeRelease}&q=war wizrad&limit=20`);

  const exactWizard = exactAlias.hits.find(
    (hit) => hit.document.entitySlug === slugs.aliasWizardAlpha
  );
  const typoWizard = typoAlias.hits.find(
    (hit) => hit.document.entitySlug === slugs.aliasWizardAlpha
  );
  const expansionBattle = expansionAndTypo.hits.find(
    (hit) => hit.document.entitySlug === slugs.battleScholar
  );
  const typoWizardCombined = expansionAndTypo.hits.find(
    (hit) => hit.document.entitySlug === slugs.aliasWizardAlpha
  );

  assert.ok(exactWizard, "Expected exact alias result for wizard alpha");
  assert.ok(typoWizard, "Expected typo alias result for wizard alpha");
  assert.ok(expansionBattle, "Expected expansion match for battle scholar");
  assert.ok(typoWizardCombined, "Expected typo match for wizard alpha in combined query");

  assert.ok(exactWizard.score > typoWizard.score);
  assert.ok(expansionBattle.score > typoWizardCombined.score);
});

test("AC-04: typo tolerance does not bypass release, visibility, or spoiler filters", async () => {
  const activeTypo = await search(
    `releaseSlug=${slugs.activeRelease}&q=wizrad&spoilerTier=NONE&limit=20`
  );
  const activeSlugs = new Set(activeTypo.hits.map((hit) => hit.document.entitySlug));

  assert.equal(activeSlugs.has(slugs.privateWizard), false);
  assert.equal(activeSlugs.has(slugs.majorWizard), false);

  const draftTypo = await search(`releaseSlug=${slugs.draftRelease}&q=wizrad&limit=20`);
  const draftSlugs = new Set(draftTypo.hits.map((hit) => hit.document.entitySlug));

  assert.equal(draftSlugs.has(slugs.draftWizard), false);
});

test("AC-05: typo and alias recall ordering is stable across repeated runs", async () => {
  const query = `releaseSlug=${slugs.activeRelease}&q=wizrad&limit=20`;

  const first = await search(query);
  const second = await search(query);
  const third = await search(query);

  assert.deepEqual(
    first.hits.map((hit) => hit.id),
    second.hits.map((hit) => hit.id)
  );
  assert.deepEqual(
    second.hits.map((hit) => hit.id),
    third.hits.map((hit) => hit.id)
  );
});

test("AC-06: Phase 2 search baseline compatibility remains intact", async () => {
  const defaultEntityResponse = await fetch(`${apiBaseUrl}/search?q=wizard&spoilerTier=NONE&limit=20`);
  assert.equal(defaultEntityResponse.status, 200);

  const defaultEntityBody = (await defaultEntityResponse.json()) as {
    resolvedReleaseSlug: string | null;
    hits: Array<{
      documentType: string;
      document: {
        entitySlug?: string;
        detailPath?: string | null;
        spoilerTier?: string;
      };
    }>;
  };

  assert.equal(defaultEntityBody.resolvedReleaseSlug, slugs.activeRelease);

  const entitySlugs = new Set(defaultEntityBody.hits.map((hit) => hit.document.entitySlug));
  assert.ok(entitySlugs.has(slugs.aliasWizardAlpha));
  assert.ok(entitySlugs.has(slugs.aliasWizardBeta));
  assert.equal(entitySlugs.has(slugs.privateWizard), false);
  assert.equal(entitySlugs.has(slugs.majorWizard), false);
  assert.equal(entitySlugs.has(slugs.draftWizard), false);

  const entityHit = defaultEntityBody.hits.find(
    (hit) => hit.document.entitySlug === slugs.aliasWizardAlpha
  );
  assert.ok(entityHit, "Expected entity hit for alias wizard alpha");
  assert.equal(entityHit.documentType, "ENTITY");
  assert.equal(entityHit.document.detailPath, `/characters/${slugs.aliasWizardAlpha}`);
  assert.equal(entityHit.document.spoilerTier, "NONE");

  const manuscriptResponse = await fetch(
    `${apiBaseUrl}/search?releaseSlug=${slugs.activeRelease}&documentType=MANUSCRIPT&limit=20`
  );
  assert.equal(manuscriptResponse.status, 200);

  const manuscriptBody = (await manuscriptResponse.json()) as {
    hits: Array<{
      documentType: string;
      document: { manuscriptSlug?: string; detailPath?: string | null };
    }>;
  };

  const manuscriptHit = manuscriptBody.hits.find(
    (hit) => hit.document.manuscriptSlug === slugs.compatibilityManuscript
  );

  assert.ok(manuscriptHit, "Expected manuscript hit for compatibility manuscript");
  assert.equal(manuscriptHit.documentType, "MANUSCRIPT");
  assert.equal(
    manuscriptHit.document.detailPath,
    `/codex/manuscripts/${slugs.compatibilityManuscript}`
  );
});
