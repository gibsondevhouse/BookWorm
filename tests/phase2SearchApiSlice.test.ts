import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";

import { createApp } from "../apps/api/src/app/createApp.js";
import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { InMemorySearchAdapter } from "../apps/api/src/lib/searchAdapters/inMemorySearchAdapter.js";
import { releaseRepository } from "../apps/api/src/repositories/releaseRepository.js";
import { searchIndexService } from "../apps/api/src/services/searchIndexService.js";
import { phase0FixtureConfig } from "../scripts/phase0FixtureConfig.js";

const ts = Date.now();
const app = createApp();
const server = createServer(app);
let apiBaseUrl = "";
let authorId = "";

// Slugs with timestamp suffix to avoid fixture conflicts
const slugs = {
  archiveRelease: `search-archive-${ts}`,
  activeRelease: `search-active-${ts}`,
  draftRelease: `search-draft-${ts}`,
  char01: `search-char01-${ts}`,
  artifact01: `search-artifact-${ts}`,
  privateChar: `search-private-${ts}`,
  restrictedFaction: `search-restricted-${ts}`,
  retiredChar: `search-retired-${ts}`,
  draftChar: `search-draftchar-${ts}`,
  tagWarOnly: `search-tag-war-${ts}`,
  tagWarMagic: `search-tag-warmagic-${ts}`,
  tierNone: `search-tier-none-${ts}`,
  tierMinor: `search-tier-minor-${ts}`,
  tierMajor: `search-tier-major-${ts}`,
  manuscript01: `search-ms-${ts}`
};

before(async () => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("No test server address");
  apiBaseUrl = `http://127.0.0.1:${(addr as { port: number }).port}`;

  const hash = await passwordHasher.hashPassword(phase0FixtureConfig.authorAdmin.password);
  const author = await prismaClient.user.upsert({
    where: { email: phase0FixtureConfig.authorAdmin.email },
    update: { displayName: phase0FixtureConfig.authorAdmin.displayName, passwordHash: hash, role: Role.AUTHOR_ADMIN },
    create: { email: phase0FixtureConfig.authorAdmin.email, displayName: phase0FixtureConfig.authorAdmin.displayName, passwordHash: hash, role: Role.AUTHOR_ADMIN }
  });
  authorId = author.id;

  // Helper to create entity + revision
  const mkEntity = async (slug: string, type: string, vis: Visibility, metaPayload?: Record<string, unknown>) => {
    const entity = await prismaClient.entity.create({ data: { slug, type: type as never } });
    const rev = await prismaClient.entityRevision.create({
      data: {
        entityId: entity.id, createdById: authorId, version: 1,
        name: `${slug}-name`, summary: `${slug}-summary`, visibility: vis,
        payload: { name: `${slug}-name`, summary: `${slug}-summary`, visibility: vis, ...metaPayload }
      }
    });
    return { entity, rev };
  };

  const { entity: char01Entity, rev: char01Rev1 } = await mkEntity(slugs.char01, "CHARACTER", Visibility.PUBLIC);
  const { entity: artifact01Entity, rev: artifact01Rev } = await mkEntity(slugs.artifact01, "ARTIFACT", Visibility.PUBLIC);
  const { entity: privateCharEntity, rev: privateRev } = await mkEntity(slugs.privateChar, "CHARACTER", Visibility.PRIVATE);
  const { entity: restrictedEntity, rev: restrictedRev } = await mkEntity(slugs.restrictedFaction, "FACTION", Visibility.RESTRICTED);
  const { entity: retiredEntity, rev: retiredRev } = await mkEntity(slugs.retiredChar, "CHARACTER", Visibility.PUBLIC);
  const { entity: draftEntity, rev: draftRev } = await mkEntity(slugs.draftChar, "CHARACTER", Visibility.PUBLIC);
  const { entity: warOnlyEntity, rev: warOnlyRev } = await mkEntity(slugs.tagWarOnly, "CHARACTER", Visibility.PUBLIC, { metadata: { spoilerTier: "NONE", tags: ["war"] } });
  const { entity: warMagicEntity, rev: warMagicRev } = await mkEntity(slugs.tagWarMagic, "CHARACTER", Visibility.PUBLIC, { metadata: { spoilerTier: "NONE", tags: ["war", "magic"] } });
  const { entity: tierNoneEntity, rev: tierNoneRev } = await mkEntity(slugs.tierNone, "CHARACTER", Visibility.PUBLIC, { metadata: { spoilerTier: "NONE" } });
  const { entity: tierMinorEntity, rev: tierMinorRev } = await mkEntity(slugs.tierMinor, "CHARACTER", Visibility.PUBLIC, { metadata: { spoilerTier: "MINOR" } });
  const { entity: tierMajorEntity, rev: tierMajorRev } = await mkEntity(slugs.tierMajor, "CHARACTER", Visibility.PUBLIC, { metadata: { spoilerTier: "MAJOR" } });

  // Mark retiredChar as retired
  await prismaClient.entity.update({ where: { id: retiredEntity.id }, data: { retiredAt: new Date() } });

  // Create manuscript01
  const ms = await prismaClient.manuscript.create({ data: { slug: slugs.manuscript01, type: "CHAPTER" } });
  const msRev = await prismaClient.manuscriptRevision.create({
    data: { manuscriptId: ms.id, createdById: authorId, version: 1, title: `${slugs.manuscript01}-title`, summary: `${slugs.manuscript01}-summary`, visibility: Visibility.PUBLIC }
  });

  // Create archiveRelease and activate it (with char01 v1)
  await releaseRepository.createRelease({ actorId: authorId, slug: slugs.archiveRelease, name: "Archive Release" });
  await releaseRepository.includeRevision({ releaseSlug: slugs.archiveRelease, entitySlug: slugs.char01, revisionId: char01Rev1.id });
  await releaseRepository.activateRelease(slugs.archiveRelease);

  // Create char01 v2 revision
  const char01Rev2 = await prismaClient.entityRevision.create({
    data: { entityId: char01Entity.id, createdById: authorId, version: 2, name: `${slugs.char01}-name-v2`, summary: `${slugs.char01}-summary-v2`, visibility: Visibility.PUBLIC, payload: { name: `${slugs.char01}-name-v2`, summary: `${slugs.char01}-summary-v2`, visibility: Visibility.PUBLIC, metadata: { spoilerTier: "MINOR" } } }
  });

  // Create activeRelease; add all entities + manuscripts except draftChar
  await releaseRepository.createRelease({ actorId: authorId, slug: slugs.activeRelease, name: "Active Release" });
  for (const [entitySlug, revId] of [
    [slugs.char01, char01Rev2.id], [slugs.artifact01, artifact01Rev.id],
    [slugs.privateChar, privateRev.id], [slugs.restrictedFaction, restrictedRev.id],
    [slugs.retiredChar, retiredRev.id], [slugs.tagWarOnly, warOnlyRev.id],
    [slugs.tagWarMagic, warMagicRev.id], [slugs.tierNone, tierNoneRev.id],
    [slugs.tierMinor, tierMinorRev.id], [slugs.tierMajor, tierMajorRev.id]
  ] as [string, string][]) {
    await releaseRepository.includeRevision({ releaseSlug: slugs.activeRelease, entitySlug, revisionId: revId });
  }
  await releaseRepository.includeManuscriptRevision({ releaseSlug: slugs.activeRelease, manuscriptSlug: slugs.manuscript01, manuscriptRevisionId: msRev.id });
  await releaseRepository.activateRelease(slugs.activeRelease); // archives archiveRelease

  // draftRelease — never activated
  await releaseRepository.createRelease({ actorId: authorId, slug: slugs.draftRelease, name: "Draft Release" });
  await releaseRepository.includeRevision({ releaseSlug: slugs.draftRelease, entitySlug: slugs.draftChar, revisionId: draftRev.id });

  await searchIndexService.rebuildIndex();
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  // Cleanup in dependency order
  await prismaClient.releaseManuscriptEntry.deleteMany({ where: { release: { slug: { in: Object.values(slugs) } } } });
  await prismaClient.releaseEntry.deleteMany({ where: { release: { slug: { in: Object.values(slugs) } } } });
  await prismaClient.release.deleteMany({ where: { slug: { in: Object.values(slugs) } } });
  await prismaClient.entityRevision.deleteMany({ where: { entity: { slug: { in: Object.values(slugs) } } } });
  await prismaClient.entity.deleteMany({ where: { slug: { in: Object.values(slugs) } } });
  await prismaClient.manuscriptRevision.deleteMany({ where: { manuscript: { slug: slugs.manuscript01 } } });
  await prismaClient.manuscript.deleteMany({ where: { slug: slugs.manuscript01 } });
  await searchIndexService.rebuildIndex();
  await prismaClient.$disconnect();
});

// AC-07: no active release → resolvedReleaseSlug=null, 0 hits (tested via service directly before setup)
// Temporarily archive ALL active releases so findActiveReleaseSlug() returns null,
// then call search() without a releaseSlug to trigger the null-resolution path.
test("AC-07: search with no active release returns empty result", async () => {
  const activeReleases = await prismaClient.release.findMany({ where: { status: "ACTIVE" } });
  await prismaClient.release.updateMany({ where: { status: "ACTIVE" }, data: { status: "ARCHIVED" } });
  try {
    const result = await searchIndexService.search({ limit: 20, offset: 0 });
    assert.equal(result.resolvedReleaseSlug, null);
    assert.equal(result.total, 0);
    assert.deepEqual(result.hits, []);
  } finally {
    for (const r of activeReleases) {
      await prismaClient.release.update({ where: { id: r.id }, data: { status: "ACTIVE" } });
    }
    await searchIndexService.rebuildIndex();
  }
});

test("AC-01: PRIVATE entity revision excluded from search results", async () => {
  const res = await fetch(`${apiBaseUrl}/search?releaseSlug=${slugs.activeRelease}&limit=50`);
  assert.equal(res.status, 200);
  const data = (await res.json()) as { hits: Array<{ document: { entitySlug?: string } }> };
  const found = data.hits.some((h) => h.document.entitySlug === slugs.privateChar);
  assert.equal(found, false);
});

test("AC-02: RESTRICTED entity revision excluded from search results", async () => {
  const res = await fetch(`${apiBaseUrl}/search?releaseSlug=${slugs.activeRelease}&limit=50`);
  assert.equal(res.status, 200);
  const data = (await res.json()) as { hits: Array<{ document: { entitySlug?: string } }> };
  const found = data.hits.some((h) => h.document.entitySlug === slugs.restrictedFaction);
  assert.equal(found, false);
});

test("AC-03: PUBLIC entity with retiredAt set excluded from search results", async () => {
  const res = await fetch(`${apiBaseUrl}/search?releaseSlug=${slugs.activeRelease}&limit=50`);
  assert.equal(res.status, 200);
  const data = (await res.json()) as { hits: Array<{ document: { entitySlug?: string } }> };
  const found = data.hits.some((h) => h.document.entitySlug === slugs.retiredChar);
  assert.equal(found, false);
});

test("AC-04: PUBLIC entity in DRAFT-only release excluded from search results", async () => {
  const res = await fetch(`${apiBaseUrl}/search?releaseSlug=${slugs.draftRelease}&limit=50`);
  assert.equal(res.status, 200);
  const data = (await res.json()) as { hits: Array<{ document: { entitySlug?: string } }> };
  const found = data.hits.some((h) => h.document.entitySlug === slugs.draftChar);
  assert.equal(found, false);
});

test("AC-05: PUBLIC entity with spoilerTier=MINOR appears with correct documentType and spoilerTier", async () => {
  const res = await fetch(`${apiBaseUrl}/search?releaseSlug=${slugs.activeRelease}&limit=50`);
  assert.equal(res.status, 200);
  const data = (await res.json()) as { hits: Array<{ documentType: string; document: { entitySlug?: string; spoilerTier?: string } }> };
  const hit = data.hits.find((h) => h.document.entitySlug === slugs.tierMinor);
  assert.ok(hit, "tierMinor entity not found in search results");
  assert.equal(hit.documentType, "ENTITY");
  assert.equal(hit.document.spoilerTier, "MINOR");
});

test("AC-06: PUBLIC manuscript in ACTIVE release appears with correct documentType and detailPath", async () => {
  const res = await fetch(`${apiBaseUrl}/search?releaseSlug=${slugs.activeRelease}&documentType=MANUSCRIPT&limit=50`);
  assert.equal(res.status, 200);
  const data = (await res.json()) as { hits: Array<{ documentType: string; document: { manuscriptSlug?: string; detailPath?: string } }> };
  const hit = data.hits.find((h) => h.document.manuscriptSlug === slugs.manuscript01);
  assert.ok(hit, "manuscript01 not found in search results");
  assert.equal(hit.documentType, "MANUSCRIPT");
  assert.equal(hit.document.detailPath, `/codex/manuscripts/${slugs.manuscript01}`);
});

test("AC-08: ARCHIVED entity visible via releaseSlug param but not via default active-release search", async () => {
  // Without releaseSlug param: resolves to activeRelease — char01 v2 present, but archived release's char01 v1 not
  const resActive = await fetch(`${apiBaseUrl}/search?q=${slugs.char01}&limit=50`);
  const activeData = (await resActive.json()) as { resolvedReleaseSlug: string; hits: Array<{ document: { releaseSlug?: string } }> };
  assert.equal(activeData.resolvedReleaseSlug, slugs.activeRelease);

  // Explicit archived release search
  const resArchive = await fetch(`${apiBaseUrl}/search?releaseSlug=${slugs.archiveRelease}&limit=50`);
  const archiveData = (await resArchive.json()) as { hits: Array<{ document: { entitySlug?: string } }> };
  const archivedHit = archiveData.hits.find((h) => h.document.entitySlug === slugs.char01);
  assert.ok(archivedHit, "char01 not found in archived release search");
});

test("AC-09: adapter.rebuild([]) clears the index", async () => {
  const adapterInstance = new InMemorySearchAdapter();
  await adapterInstance.rebuild([]);
  const result = await adapterInstance.search({ releaseSlug: slugs.activeRelease, limit: 1000, offset: 0 });
  assert.equal(result.total, 0);
  assert.deepEqual(result.hits, []);
});

test("AC-10: adapter.delete with nonexistent id resolves without throwing", async () => {
  const adapterInstance = new InMemorySearchAdapter();
  await assert.doesNotReject(() => adapterInstance.delete("nonexistent-id-abc123"));
});

test("AC-11: ARTIFACT entity has detailPath=null; CHARACTER entity has correct detailPath", async () => {
  const res = await fetch(`${apiBaseUrl}/search?releaseSlug=${slugs.activeRelease}&limit=50`);
  const data = (await res.json()) as { hits: Array<{ document: { entitySlug?: string; detailPath?: string | null; documentType?: string } }> };
  const artifactHit = data.hits.find((h) => h.document.entitySlug === slugs.artifact01);
  assert.ok(artifactHit, "artifact01 not found");
  assert.equal(artifactHit.document.detailPath, null);

  const charHit = data.hits.find((h) => h.document.entitySlug === slugs.char01);
  assert.ok(charHit, "char01 not found");
  assert.equal(charHit.document.detailPath, `/characters/${slugs.char01}`);
});

test("AC-12: tags=war,magic filter returns only entity with both tags", async () => {
  const res = await fetch(`${apiBaseUrl}/search?releaseSlug=${slugs.activeRelease}&tags=war,magic&limit=50`);
  const data = (await res.json()) as { total: number; hits: Array<{ document: { entitySlug?: string } }> };
  const warOnly = data.hits.find((h) => h.document.entitySlug === slugs.tagWarOnly);
  const warMagic = data.hits.find((h) => h.document.entitySlug === slugs.tagWarMagic);
  assert.equal(warOnly, undefined, "tagWarOnly should NOT appear with tags=war,magic");
  assert.ok(warMagic, "tagWarMagic should appear with tags=war,magic");
});

test("AC-13: spoilerTier=NONE&spoilerTier=MINOR excludes MAJOR hits", async () => {
  const res = await fetch(`${apiBaseUrl}/search?releaseSlug=${slugs.activeRelease}&spoilerTier=NONE&spoilerTier=MINOR&limit=50`);
  const data = (await res.json()) as { hits: Array<{ document: { entitySlug?: string; spoilerTier?: string } }> };
  const majorHit = data.hits.find((h) => h.document.spoilerTier === "MAJOR");
  assert.equal(majorHit, undefined, "MAJOR tier entity should not appear in results");
});
