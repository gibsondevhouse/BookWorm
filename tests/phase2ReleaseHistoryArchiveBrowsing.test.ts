import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

import { type EntityType, Role, Visibility } from "@prisma/client";

import { createApp } from "../apps/api/src/app/createApp.js";
import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { relationshipRepository } from "../apps/api/src/repositories/relationshipRepository.js";
import { releaseRepository } from "../apps/api/src/repositories/releaseRepository.js";
import { phase0FixtureConfig } from "../scripts/phase0FixtureConfig.js";

type AdminHistoryListResponse = {
  items: Array<{
    slug: string;
    name: string;
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
    createdAt: string;
    activatedAt: string | null;
    entryCounts: {
      entities: number;
      manuscripts: number;
      relationships: number;
    };
    isMutable: boolean;
  }>;
  page: {
    limit: number;
    offset: number;
    total: number;
  };
};

type AdminHistoryDetailResponse = {
  release: {
    slug: string;
    name: string;
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
    createdAt: string;
    activatedAt: string | null;
    isMutable: boolean;
  };
  composition: {
    entityEntries: Array<{
      entitySlug: string;
      entityType: string;
      revisionId: string;
      version: number;
      visibility: string;
    }>;
    manuscriptEntries: Array<{
      manuscriptSlug: string;
      manuscriptType: string;
      manuscriptRevisionId: string;
      version: number;
      visibility: string;
    }>;
    relationshipEntries: Array<{
      relationshipId: string;
      relationshipRevisionId: string;
      relationType: string;
      version: number;
      visibility: string;
    }>;
  };
};

type PublicArchiveResponse = {
  items: Array<{
    slug: string;
    name: string;
    status: "ACTIVE" | "ARCHIVED";
    activatedAt: string | null;
    createdAt: string;
    browseHref: string;
  }>;
  page: {
    limit: number;
    offset: number;
    total: number;
  };
};

type PublicCodexListResponse = {
  releaseSlug: string | null;
  items: Array<{
    slug: string;
    name: string;
  }>;
};

const timestamp = Date.now();
const app = createApp();
const server = createServer(app);
const slugs = {
  archivedRelease: `phase2-history-archived-${timestamp}`,
  activeRelease: `phase2-history-active-${timestamp}`,
  draftRelease: `phase2-history-draft-${timestamp}`,
  fallbackOlderRelease: `phase2-history-fallback-older-${timestamp}`,
  fallbackNewerRelease: `phase2-history-fallback-newer-${timestamp}`,
  entity: `phase2-history-entity-${timestamp}`,
  relationshipSource: `phase2-history-source-${timestamp}`,
  relationshipTarget: `phase2-history-target-${timestamp}`,
  manuscript: `phase2-history-manuscript-${timestamp}`
};

const fallbackActivatedAtIso = "2026-01-01T00:00:00.000Z";

let apiBaseUrl = "";
let adminSessionCookie = "";
let authorId = "";
let archivedEntityRevisionId = "";
let activeEntityRevisionId = "";
let archivedManuscriptRevisionId = "";
let archivedRelationshipRevisionId = "";

const ensureOk = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
};

const createEntityRevision = async (input: {
  entityId: string;
  name: string;
  summary: string;
  visibility?: Visibility;
}) => {
  const latestRevision = await prismaClient.entityRevision.findFirst({
    where: {
      entityId: input.entityId
    },
    orderBy: {
      version: "desc"
    },
    select: {
      version: true
    }
  });

  return prismaClient.entityRevision.create({
    data: {
      entityId: input.entityId,
      createdById: authorId,
      version: (latestRevision?.version ?? 0) + 1,
      name: input.name,
      summary: input.summary,
      visibility: input.visibility ?? Visibility.PUBLIC,
      payload: {
        name: input.name,
        summary: input.summary,
        visibility: input.visibility ?? Visibility.PUBLIC
      }
    }
  });
};

const createManuscriptRevision = async (input: {
  manuscriptId: string;
  title: string;
  summary: string;
  visibility?: Visibility;
}) => {
  const latestRevision = await prismaClient.manuscriptRevision.findFirst({
    where: {
      manuscriptId: input.manuscriptId
    },
    orderBy: {
      version: "desc"
    },
    select: {
      version: true
    }
  });

  return prismaClient.manuscriptRevision.create({
    data: {
      manuscriptId: input.manuscriptId,
      createdById: authorId,
      version: (latestRevision?.version ?? 0) + 1,
      title: input.title,
      summary: input.summary,
      visibility: input.visibility ?? Visibility.PUBLIC,
      payload: {
        title: input.title,
        summary: input.summary,
        visibility: input.visibility ?? Visibility.PUBLIC
      }
    }
  });
};

const createAdminUrl = (path: string, query?: Record<string, string | number>): string => {
  const url = new URL(path, apiBaseUrl);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
};

const captureReleaseState = async (): Promise<Record<string, unknown>> => {
  const releases = await prismaClient.release.findMany({
    where: {
      slug: {
        in: [slugs.archivedRelease, slugs.activeRelease, slugs.draftRelease]
      }
    },
    select: {
      slug: true,
      status: true,
      activatedAt: true,
      _count: {
        select: {
          entries: true,
          manuscriptEntries: true,
          relationshipEntries: true
        }
      }
    }
  });

  return releases
    .sort((left, right) => left.slug.localeCompare(right.slug))
    .reduce<Record<string, unknown>>((accumulator, release) => {
      accumulator[release.slug] = {
        status: release.status,
        activatedAt: release.activatedAt?.toISOString() ?? null,
        entryCounts: {
          entities: release._count.entries,
          manuscripts: release._count.manuscriptEntries,
          relationships: release._count.relationshipEntries
        }
      };
      return accumulator;
    }, {});
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
    where: {
      email: phase0FixtureConfig.authorAdmin.email
    },
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

  const authResponse = await fetch(`${apiBaseUrl}/auth/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: phase0FixtureConfig.authorAdmin.email,
      password: phase0FixtureConfig.authorAdmin.password
    })
  });

  if (!authResponse.ok) {
    throw new Error(`Unable to authenticate author-admin user: ${authResponse.status}`);
  }

  const setCookieHeader = authResponse.headers.get("set-cookie");
  if (!setCookieHeader) {
    throw new Error("No session cookie returned for author-admin user");
  }
  adminSessionCookie = setCookieHeader.split(";")[0] ?? "";

  const [entity, relationshipSource, relationshipTarget, manuscript] = await Promise.all([
    prismaClient.entity.create({
      data: {
        slug: slugs.entity,
        type: "CHARACTER"
      }
    }),
    prismaClient.entity.create({
      data: {
        slug: slugs.relationshipSource,
        type: "CHARACTER"
      }
    }),
    prismaClient.entity.create({
      data: {
        slug: slugs.relationshipTarget,
        type: "FACTION"
      }
    }),
    prismaClient.manuscript.create({
      data: {
        slug: slugs.manuscript,
        type: "CHAPTER"
      }
    })
  ]);

  const archivedEntityRevision = await createEntityRevision({
    entityId: entity.id,
    name: "Archive Character",
    summary: "Archived release character"
  });
  archivedEntityRevisionId = archivedEntityRevision.id;

  const activeEntityRevision = await createEntityRevision({
    entityId: entity.id,
    name: "Active Character",
    summary: "Active release character"
  });
  activeEntityRevisionId = activeEntityRevision.id;

  const draftEntityRevision = await createEntityRevision({
    entityId: entity.id,
    name: "Draft Character",
    summary: "Draft release character"
  });

  const archivedManuscriptRevision = await createManuscriptRevision({
    manuscriptId: manuscript.id,
    title: "Archive Chapter",
    summary: "Archived manuscript"
  });
  archivedManuscriptRevisionId = archivedManuscriptRevision.id;

  const activeManuscriptRevision = await createManuscriptRevision({
    manuscriptId: manuscript.id,
    title: "Active Chapter",
    summary: "Active manuscript"
  });

  const archivedRelationshipRevision = await relationshipRepository.saveRevision({
    actorId: authorId,
    sourceEntitySlug: slugs.relationshipSource,
    targetEntitySlug: slugs.relationshipTarget,
    relationType: "ALLY_OF",
    visibility: Visibility.PUBLIC,
    state: "CREATE"
  });
  archivedRelationshipRevisionId = archivedRelationshipRevision.relationshipRevisionId;

  const activeRelationshipRevision = await relationshipRepository.saveRevision({
    actorId: authorId,
    sourceEntitySlug: slugs.relationshipSource,
    targetEntitySlug: slugs.relationshipTarget,
    relationType: "ALLY_OF",
    visibility: Visibility.PUBLIC,
    state: "UPDATE"
  });

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: slugs.archivedRelease,
    name: "History Archived"
  });
  await releaseRepository.includeRevision({
    releaseSlug: slugs.archivedRelease,
    entitySlug: slugs.entity,
    revisionId: archivedEntityRevision.id
  });
  await releaseRepository.includeManuscriptRevision({
    releaseSlug: slugs.archivedRelease,
    manuscriptSlug: slugs.manuscript,
    manuscriptRevisionId: archivedManuscriptRevision.id
  });
  await relationshipRepository.includeRevisionInRelease({
    releaseSlug: slugs.archivedRelease,
    relationshipRevisionId: archivedRelationshipRevision.relationshipRevisionId
  });
  await releaseRepository.activateRelease(slugs.archivedRelease);

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: slugs.activeRelease,
    name: "History Active"
  });
  await releaseRepository.includeRevision({
    releaseSlug: slugs.activeRelease,
    entitySlug: slugs.entity,
    revisionId: activeEntityRevision.id
  });
  await releaseRepository.includeManuscriptRevision({
    releaseSlug: slugs.activeRelease,
    manuscriptSlug: slugs.manuscript,
    manuscriptRevisionId: activeManuscriptRevision.id
  });
  await relationshipRepository.includeRevisionInRelease({
    releaseSlug: slugs.activeRelease,
    relationshipRevisionId: activeRelationshipRevision.relationshipRevisionId
  });
  await releaseRepository.activateRelease(slugs.activeRelease);

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: slugs.draftRelease,
    name: "History Draft"
  });
  await releaseRepository.includeRevision({
    releaseSlug: slugs.draftRelease,
    entitySlug: slugs.entity,
    revisionId: draftEntityRevision.id
  });

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: slugs.fallbackOlderRelease,
    name: "History Fallback Older"
  });

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: slugs.fallbackNewerRelease,
    name: "History Fallback Newer"
  });

  const sharedActivatedAt = new Date(fallbackActivatedAtIso);
  await prismaClient.release.update({
    where: { slug: slugs.fallbackOlderRelease },
    data: {
      status: "ARCHIVED",
      activatedAt: sharedActivatedAt,
      createdAt: new Date("2025-12-30T00:00:00.000Z")
    }
  });
  await prismaClient.release.update({
    where: { slug: slugs.fallbackNewerRelease },
    data: {
      status: "ARCHIVED",
      activatedAt: sharedActivatedAt,
      createdAt: new Date("2025-12-31T00:00:00.000Z")
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

  await prismaClient.release.deleteMany({
    where: {
      slug: {
        in: [
          slugs.archivedRelease,
          slugs.activeRelease,
          slugs.draftRelease,
          slugs.fallbackOlderRelease,
          slugs.fallbackNewerRelease
        ]
      }
    }
  });

  await prismaClient.relationship.deleteMany({
    where: {
      sourceEntity: {
        slug: slugs.relationshipSource
      },
      targetEntity: {
        slug: slugs.relationshipTarget
      },
      relationType: "ALLY_OF"
    }
  });

  await prismaClient.manuscript.deleteMany({
    where: {
      slug: slugs.manuscript
    }
  });

  await prismaClient.entity.deleteMany({
    where: {
      slug: {
        in: [slugs.entity, slugs.relationshipSource, slugs.relationshipTarget]
      }
    }
  });

  await prismaClient.$disconnect();
});

test("phase2ReleaseHistoryArchiveBrowsing: admin history list returns all statuses with counts and pagination", async () => {
  const response = await ensureOk<AdminHistoryListResponse>(
    await fetch(createAdminUrl("/admin/releases/history", { limit: 100, offset: 0 }), {
      headers: {
        cookie: adminSessionCookie
      }
    })
  );

  assert.equal(response.page.limit, 100);
  assert.equal(response.page.offset, 0);

  const archived = response.items.find((item) => item.slug === slugs.archivedRelease);
  const active = response.items.find((item) => item.slug === slugs.activeRelease);
  const draft = response.items.find((item) => item.slug === slugs.draftRelease);

  assert.ok(archived);
  assert.ok(active);
  assert.ok(draft);

  assert.equal(archived.status, "ARCHIVED");
  assert.equal(active.status, "ACTIVE");
  assert.equal(draft.status, "DRAFT");

  assert.deepEqual(archived.entryCounts, { entities: 1, manuscripts: 1, relationships: 1 });
  assert.deepEqual(active.entryCounts, { entities: 1, manuscripts: 1, relationships: 1 });
  assert.deepEqual(draft.entryCounts, { entities: 1, manuscripts: 0, relationships: 0 });

  assert.equal(archived.isMutable, false);
  assert.equal(active.isMutable, false);
  assert.equal(draft.isMutable, false);
});

test("phase2ReleaseHistoryArchiveBrowsing: admin history status filter works", async () => {
  const statuses: Array<"DRAFT" | "ACTIVE" | "ARCHIVED"> = ["DRAFT", "ACTIVE", "ARCHIVED"];

  for (const status of statuses) {
    const response = await ensureOk<AdminHistoryListResponse>(
      await fetch(createAdminUrl("/admin/releases/history", { status, limit: 100, offset: 0 }), {
        headers: {
          cookie: adminSessionCookie
        }
      })
    );

    assert.ok(response.items.length >= 1);
    for (const item of response.items) {
      assert.equal(item.status, status);
    }
  }
});

test("phase2ReleaseHistoryArchiveBrowsing: admin history detail returns composition snapshots and unknown slug returns 404", async () => {
  const detail = await ensureOk<AdminHistoryDetailResponse>(
    await fetch(createAdminUrl(`/admin/releases/${slugs.archivedRelease}/history`), {
      headers: {
        cookie: adminSessionCookie
      }
    })
  );

  assert.equal(detail.release.slug, slugs.archivedRelease);
  assert.equal(detail.release.status, "ARCHIVED");
  assert.equal(detail.release.isMutable, false);
  assert.equal(detail.composition.entityEntries.length, 1);
  assert.equal(detail.composition.manuscriptEntries.length, 1);
  assert.equal(detail.composition.relationshipEntries.length, 1);

  assert.equal(detail.composition.entityEntries[0]?.entitySlug, slugs.entity);
  assert.equal(detail.composition.entityEntries[0]?.revisionId, archivedEntityRevisionId);
  assert.equal(detail.composition.manuscriptEntries[0]?.manuscriptSlug, slugs.manuscript);
  assert.equal(detail.composition.manuscriptEntries[0]?.manuscriptRevisionId, archivedManuscriptRevisionId);
  assert.equal(detail.composition.relationshipEntries[0]?.relationshipRevisionId, archivedRelationshipRevisionId);

  const notFoundResponse = await fetch(createAdminUrl("/admin/releases/unknown-release-slug/history"), {
    headers: {
      cookie: adminSessionCookie
    }
  });

  assert.equal(notFoundResponse.status, 404);
});

test("phase2ReleaseHistoryArchiveBrowsing: admin history endpoints are read-only", async () => {
  const beforeState = await captureReleaseState();

  await ensureOk<AdminHistoryListResponse>(
    await fetch(createAdminUrl("/admin/releases/history", { limit: 20, offset: 0 }), {
      headers: {
        cookie: adminSessionCookie
      }
    })
  );

  await ensureOk<AdminHistoryDetailResponse>(
    await fetch(createAdminUrl(`/admin/releases/${slugs.archivedRelease}/history`), {
      headers: {
        cookie: adminSessionCookie
      }
    })
  );

  const afterState = await captureReleaseState();
  assert.deepEqual(afterState, beforeState);
});

test("phase2ReleaseHistoryArchiveBrowsing: public archive list excludes draft releases, orders by recency, and provides browseHref", async () => {
  const archive = await ensureOk<PublicArchiveResponse>(
    await fetch(createAdminUrl("/codex/releases", { limit: 100, offset: 0 }))
  );

  assert.equal(archive.page.limit, 100);
  assert.equal(archive.page.offset, 0);

  const draftItem = archive.items.find((item) => item.slug === slugs.draftRelease);
  const archivedItem = archive.items.find((item) => item.slug === slugs.archivedRelease);
  const activeItem = archive.items.find((item) => item.slug === slugs.activeRelease);

  assert.equal(draftItem, undefined);
  assert.ok(archivedItem);
  assert.ok(activeItem);

  const activeIndex = archive.items.findIndex((item) => item.slug === slugs.activeRelease);
  const archivedIndex = archive.items.findIndex((item) => item.slug === slugs.archivedRelease);
  assert.ok(activeIndex >= 0 && archivedIndex >= 0);
  assert.ok(activeIndex < archivedIndex);

  assert.equal(activeItem.browseHref, `/codex?releaseSlug=${slugs.activeRelease}`);
  assert.equal(archivedItem.browseHref, `/codex?releaseSlug=${slugs.archivedRelease}`);
});

test("phase2ReleaseHistoryArchiveBrowsing: public archive list falls back to createdAt ordering when activatedAt values tie", async () => {
  const archive = await ensureOk<PublicArchiveResponse>(
    await fetch(createAdminUrl("/codex/releases", { limit: 100, offset: 0 }))
  );

  const olderFallbackItem = archive.items.find((item) => item.slug === slugs.fallbackOlderRelease);
  const newerFallbackItem = archive.items.find((item) => item.slug === slugs.fallbackNewerRelease);
  assert.ok(olderFallbackItem);
  assert.ok(newerFallbackItem);

  assert.equal(olderFallbackItem.activatedAt, fallbackActivatedAtIso);
  assert.equal(newerFallbackItem.activatedAt, fallbackActivatedAtIso);

  const olderIndex = archive.items.findIndex((item) => item.slug === slugs.fallbackOlderRelease);
  const newerIndex = archive.items.findIndex((item) => item.slug === slugs.fallbackNewerRelease);
  assert.ok(olderIndex >= 0 && newerIndex >= 0);
  assert.ok(newerIndex < olderIndex);

  assert.ok(new Date(newerFallbackItem.createdAt).getTime() > new Date(olderFallbackItem.createdAt).getTime());
});

test("phase2ReleaseHistoryArchiveBrowsing: archived release selector remains browsable on public codex routes", async () => {
  const archivedCodex = await ensureOk<PublicCodexListResponse>(
    await fetch(createAdminUrl("/codex", { releaseSlug: slugs.archivedRelease }))
  );

  assert.equal(archivedCodex.releaseSlug, slugs.archivedRelease);
  assert.ok(archivedCodex.items.some((item) => item.slug === slugs.entity));
});

test("phase2ReleaseHistoryArchiveBrowsing: draft and unknown release selectors remain leak-safe on public codex routes", async () => {
  const [draftResponse, unknownResponse] = await Promise.all([
    fetch(createAdminUrl("/codex", { releaseSlug: slugs.draftRelease })),
    fetch(createAdminUrl("/codex", { releaseSlug: `unknown-${timestamp}` }))
  ]);

  assert.equal(draftResponse.status, 404);
  assert.equal(unknownResponse.status, 404);
});

test("phase2ReleaseHistoryArchiveBrowsing: omitted release selector still falls back to active release", async () => {
  const codex = await ensureOk<PublicCodexListResponse>(await fetch(createAdminUrl("/codex")));

  assert.equal(codex.releaseSlug, slugs.activeRelease);

  const activeEntityItem = codex.items.find((item) => item.slug === slugs.entity);
  assert.ok(activeEntityItem);
  assert.equal(activeEntityItem.name, "Active Character");
});
