import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";

import { createApp } from "../apps/api/src/app/createApp.js";
import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { relationshipRepository } from "../apps/api/src/repositories/relationshipRepository.js";
import { releaseRepository } from "../apps/api/src/repositories/releaseRepository.js";
import { phase0FixtureConfig } from "../scripts/phase0FixtureConfig.js";

type PublicCodexRelatedResponse = {
  releaseSlug: string;
  source: {
    entityType: string;
    slug: string;
  };
  items: Array<{
    releaseSlug: string;
    relationshipId: string;
    relationshipRevisionId: string;
    relationType: string;
    relationshipVersion: number;
    sourceEntitySlug: string;
    targetEntitySlug: string;
    neighborEntityType: string;
    neighborSlug: string;
    neighborName: string;
    neighborSummary: string;
    neighborVisibility: string;
    neighborVersion: number;
    detailPath: string;
    detailHref: string;
  }>;
};

const app = createApp();
const server = createServer(app);
const timestamp = Date.now();

const archivedReleaseSlug = `public-codex-related-archived-${timestamp}`;
const activeReleaseSlug = `public-codex-related-active-${timestamp}`;
const draftReleaseSlug = `public-codex-related-draft-${timestamp}`;

const sourceSlug = `public-codex-related-source-${timestamp}`;
const factionSlug = `public-codex-related-faction-${timestamp}`;
const eventSlug = `public-codex-related-event-${timestamp}`;
const restrictedSlug = `public-codex-related-restricted-${timestamp}`;
const retiredSlug = `public-codex-related-retired-${timestamp}`;
const unreleasedSlug = `public-codex-related-unreleased-${timestamp}`;

let apiBaseUrl = "";
let authorId = "";

const ensureOk = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Request failed with ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
};

const buildUrl = (input: {
  entityType: "CHARACTER" | "FACTION" | "LOCATION" | "EVENT";
  slug: string;
  releaseSlug?: string;
  limit?: number;
}): string => {
  const url = new URL(`/codex/${input.entityType}/${input.slug}/related`, apiBaseUrl);

  if (input.releaseSlug !== undefined) {
    url.searchParams.set("releaseSlug", input.releaseSlug);
  }

  if (input.limit !== undefined) {
    url.searchParams.set("limit", String(input.limit));
  }

  return url.toString();
};

const createRevision = async (input: {
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

  const [source, faction, event, restricted, retired, unreleased] = await Promise.all([
    prismaClient.entity.create({ data: { slug: sourceSlug, type: "CHARACTER" } }),
    prismaClient.entity.create({ data: { slug: factionSlug, type: "FACTION" } }),
    prismaClient.entity.create({ data: { slug: eventSlug, type: "EVENT" } }),
    prismaClient.entity.create({ data: { slug: restrictedSlug, type: "LOCATION" } }),
    prismaClient.entity.create({ data: { slug: retiredSlug, type: "CHARACTER" } }),
    prismaClient.entity.create({ data: { slug: unreleasedSlug, type: "FACTION" } })
  ]);

  await prismaClient.entity.update({
    where: {
      id: retired.id
    },
    data: {
      retiredAt: new Date()
    }
  });

  const archivedSourceRevision = await createRevision({
    entityId: source.id,
    name: "Source Archived",
    summary: "Source archived summary"
  });
  const archivedFactionRevision = await createRevision({
    entityId: faction.id,
    name: "Faction Archived",
    summary: "Faction archived summary"
  });
  const archivedEventRevision = await createRevision({
    entityId: event.id,
    name: "Event Archived",
    summary: "Event archived summary"
  });
  const archivedRestrictedRevision = await createRevision({
    entityId: restricted.id,
    name: "Restricted Archived",
    summary: "Restricted archived summary",
    visibility: Visibility.RESTRICTED
  });
  const archivedRetiredRevision = await createRevision({
    entityId: retired.id,
    name: "Retired Archived",
    summary: "Retired archived summary"
  });

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: archivedReleaseSlug,
    name: "Public Codex Related Archived"
  });

  await releaseRepository.includeRevision({
    releaseSlug: archivedReleaseSlug,
    entitySlug: sourceSlug,
    revisionId: archivedSourceRevision.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: archivedReleaseSlug,
    entitySlug: factionSlug,
    revisionId: archivedFactionRevision.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: archivedReleaseSlug,
    entitySlug: eventSlug,
    revisionId: archivedEventRevision.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: archivedReleaseSlug,
    entitySlug: restrictedSlug,
    revisionId: archivedRestrictedRevision.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: archivedReleaseSlug,
    entitySlug: retiredSlug,
    revisionId: archivedRetiredRevision.id
  });

  const alliedArchived = await relationshipRepository.saveRevision({
    actorId: authorId,
    sourceEntitySlug: sourceSlug,
    targetEntitySlug: factionSlug,
    relationType: "ALLIED_WITH",
    visibility: Visibility.PUBLIC,
    state: "CREATE",
    metadata: {
      note: "archived allied"
    }
  });
  const observedArchived = await relationshipRepository.saveRevision({
    actorId: authorId,
    sourceEntitySlug: eventSlug,
    targetEntitySlug: sourceSlug,
    relationType: "OBSERVED_AT",
    visibility: Visibility.PUBLIC,
    state: "CREATE",
    metadata: {
      note: "archived observed"
    }
  });
  const restrictedNeighborRelationship = await relationshipRepository.saveRevision({
    actorId: authorId,
    sourceEntitySlug: sourceSlug,
    targetEntitySlug: restrictedSlug,
    relationType: "HIDES_IN",
    visibility: Visibility.PUBLIC,
    state: "CREATE",
    metadata: {
      note: "restricted neighbor"
    }
  });
  const retiredNeighborRelationship = await relationshipRepository.saveRevision({
    actorId: authorId,
    sourceEntitySlug: sourceSlug,
    targetEntitySlug: retiredSlug,
    relationType: "MENTORS",
    visibility: Visibility.PUBLIC,
    state: "CREATE",
    metadata: {
      note: "retired neighbor"
    }
  });

  await relationshipRepository.includeRevisionInRelease({
    releaseSlug: archivedReleaseSlug,
    relationshipRevisionId: alliedArchived.relationshipRevisionId
  });
  await relationshipRepository.includeRevisionInRelease({
    releaseSlug: archivedReleaseSlug,
    relationshipRevisionId: observedArchived.relationshipRevisionId
  });
  await relationshipRepository.includeRevisionInRelease({
    releaseSlug: archivedReleaseSlug,
    relationshipRevisionId: restrictedNeighborRelationship.relationshipRevisionId
  });
  await relationshipRepository.includeRevisionInRelease({
    releaseSlug: archivedReleaseSlug,
    relationshipRevisionId: retiredNeighborRelationship.relationshipRevisionId
  });

  await releaseRepository.activateRelease(archivedReleaseSlug);

  const activeSourceRevision = await createRevision({
    entityId: source.id,
    name: "Source Active",
    summary: "Source active summary"
  });
  const activeFactionRevision = await createRevision({
    entityId: faction.id,
    name: "Faction Active",
    summary: "Faction active summary"
  });
  const activeEventRevision = await createRevision({
    entityId: event.id,
    name: "Event Active",
    summary: "Event active summary"
  });
  const activeRestrictedRevision = await createRevision({
    entityId: restricted.id,
    name: "Restricted Active",
    summary: "Restricted active summary",
    visibility: Visibility.RESTRICTED
  });
  const activeRetiredRevision = await createRevision({
    entityId: retired.id,
    name: "Retired Active",
    summary: "Retired active summary"
  });
  const activeUnreleasedRevision = await createRevision({
    entityId: unreleased.id,
    name: "Unreleased Active",
    summary: "Unreleased active summary"
  });

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: activeReleaseSlug,
    name: "Public Codex Related Active"
  });

  await releaseRepository.includeRevision({
    releaseSlug: activeReleaseSlug,
    entitySlug: sourceSlug,
    revisionId: activeSourceRevision.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: activeReleaseSlug,
    entitySlug: factionSlug,
    revisionId: activeFactionRevision.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: activeReleaseSlug,
    entitySlug: eventSlug,
    revisionId: activeEventRevision.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: activeReleaseSlug,
    entitySlug: restrictedSlug,
    revisionId: activeRestrictedRevision.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: activeReleaseSlug,
    entitySlug: retiredSlug,
    revisionId: activeRetiredRevision.id
  });

  const alliedActive = await relationshipRepository.saveRevision({
    actorId: authorId,
    sourceEntitySlug: sourceSlug,
    targetEntitySlug: factionSlug,
    relationType: "ALLIED_WITH",
    visibility: Visibility.PUBLIC,
    state: "UPDATE",
    metadata: {
      note: "active allied"
    }
  });
  const observedActive = await relationshipRepository.saveRevision({
    actorId: authorId,
    sourceEntitySlug: eventSlug,
    targetEntitySlug: sourceSlug,
    relationType: "OBSERVED_AT",
    visibility: Visibility.PUBLIC,
    state: "UPDATE",
    metadata: {
      note: "active observed"
    }
  });
  const deleteRelationshipInitial = await relationshipRepository.saveRevision({
    actorId: authorId,
    sourceEntitySlug: sourceSlug,
    targetEntitySlug: factionSlug,
    relationType: "RIVALED_WITH",
    visibility: Visibility.PUBLIC,
    state: "CREATE",
    metadata: {
      note: "delete relationship create"
    }
  });
  const deleteRelationshipRevision = await relationshipRepository.saveRevision({
    actorId: authorId,
    sourceEntitySlug: sourceSlug,
    targetEntitySlug: factionSlug,
    relationType: "RIVALED_WITH",
    visibility: Visibility.PUBLIC,
    state: "DELETE",
    metadata: {
      note: "delete relationship delete"
    }
  });
  const restrictedRelationship = await relationshipRepository.saveRevision({
    actorId: authorId,
    sourceEntitySlug: sourceSlug,
    targetEntitySlug: factionSlug,
    relationType: "SECRETLY_FUNDS",
    visibility: Visibility.RESTRICTED,
    state: "CREATE",
    metadata: {
      note: "restricted relationship"
    }
  });
  const unreleasedNeighborRelationship = await relationshipRepository.saveRevision({
    actorId: authorId,
    sourceEntitySlug: sourceSlug,
    targetEntitySlug: unreleasedSlug,
    relationType: "TRADES_WITH",
    visibility: Visibility.PUBLIC,
    state: "CREATE",
    metadata: {
      note: "unreleased neighbor"
    }
  });

  await relationshipRepository.includeRevisionInRelease({
    releaseSlug: activeReleaseSlug,
    relationshipRevisionId: alliedActive.relationshipRevisionId
  });
  await relationshipRepository.includeRevisionInRelease({
    releaseSlug: activeReleaseSlug,
    relationshipRevisionId: observedActive.relationshipRevisionId
  });
  await relationshipRepository.includeRevisionInRelease({
    releaseSlug: activeReleaseSlug,
    relationshipRevisionId: restrictedNeighborRelationship.relationshipRevisionId
  });
  await relationshipRepository.includeRevisionInRelease({
    releaseSlug: activeReleaseSlug,
    relationshipRevisionId: retiredNeighborRelationship.relationshipRevisionId
  });
  await relationshipRepository.includeRevisionInRelease({
    releaseSlug: activeReleaseSlug,
    relationshipRevisionId: deleteRelationshipInitial.relationshipRevisionId
  });
  await relationshipRepository.includeRevisionInRelease({
    releaseSlug: activeReleaseSlug,
    relationshipRevisionId: deleteRelationshipRevision.relationshipRevisionId
  });
  await relationshipRepository.includeRevisionInRelease({
    releaseSlug: activeReleaseSlug,
    relationshipRevisionId: restrictedRelationship.relationshipRevisionId
  });
  await relationshipRepository.includeRevisionInRelease({
    releaseSlug: activeReleaseSlug,
    relationshipRevisionId: unreleasedNeighborRelationship.relationshipRevisionId
  });

  await releaseRepository.activateRelease(activeReleaseSlug);

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: draftReleaseSlug,
    name: "Public Codex Related Draft"
  });

  await releaseRepository.includeRevision({
    releaseSlug: draftReleaseSlug,
    entitySlug: sourceSlug,
    revisionId: activeSourceRevision.id
  });

  await releaseRepository.includeRevision({
    releaseSlug: draftReleaseSlug,
    entitySlug: factionSlug,
    revisionId: activeFactionRevision.id
  });

  await relationshipRepository.includeRevisionInRelease({
    releaseSlug: draftReleaseSlug,
    relationshipRevisionId: alliedActive.relationshipRevisionId
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

  await prismaClient.releaseRelationshipEntry.deleteMany({
    where: {
      release: {
        slug: {
          in: [archivedReleaseSlug, activeReleaseSlug, draftReleaseSlug]
        }
      }
    }
  });

  await prismaClient.releaseEntry.deleteMany({
    where: {
      release: {
        slug: {
          in: [archivedReleaseSlug, activeReleaseSlug, draftReleaseSlug]
        }
      }
    }
  });

  await prismaClient.relationshipRevision.deleteMany({
    where: {
      relationship: {
        OR: [{ sourceEntity: { slug: sourceSlug } }, { targetEntity: { slug: sourceSlug } }]
      }
    }
  });

  await prismaClient.relationship.deleteMany({
    where: {
      OR: [{ sourceEntity: { slug: sourceSlug } }, { targetEntity: { slug: sourceSlug } }]
    }
  });

  await prismaClient.release.deleteMany({
    where: {
      slug: {
        in: [archivedReleaseSlug, activeReleaseSlug, draftReleaseSlug]
      }
    }
  });

  await prismaClient.entityRevision.deleteMany({
    where: {
      entity: {
        slug: {
          in: [sourceSlug, factionSlug, eventSlug, restrictedSlug, retiredSlug, unreleasedSlug]
        }
      }
    }
  });

  await prismaClient.entity.deleteMany({
    where: {
      slug: {
        in: [sourceSlug, factionSlug, eventSlug, restrictedSlug, retiredSlug, unreleasedSlug]
      }
    }
  });

  await prismaClient.$disconnect();
});

test("public codex related content falls back to active release with deterministic ordering and bounded limit", async () => {
  const activeRelated = await ensureOk<PublicCodexRelatedResponse>(
    await fetch(buildUrl({ entityType: "CHARACTER", slug: sourceSlug, limit: 1 }))
  );

  assert.equal(activeRelated.releaseSlug, activeReleaseSlug);
  assert.equal(activeRelated.source.entityType, "CHARACTER");
  assert.equal(activeRelated.source.slug, sourceSlug);
  assert.equal(activeRelated.items.length, 1);
  assert.deepEqual(
    activeRelated.items.map((item) => ({
      relationType: item.relationType,
      neighborSlug: item.neighborSlug,
      neighborName: item.neighborName,
      detailPath: item.detailPath,
      detailHref: item.detailHref
    })),
    [
      {
        relationType: "ALLIED_WITH",
        neighborSlug: factionSlug,
        neighborName: "Faction Active",
        detailPath: `/factions/${factionSlug}`,
        detailHref: `/factions/${factionSlug}`
      }
    ]
  );
});

test("public codex related content supports explicit archived release selection with release-safe href propagation", async () => {
  const archivedRelated = await ensureOk<PublicCodexRelatedResponse>(
    await fetch(buildUrl({ entityType: "CHARACTER", slug: sourceSlug, releaseSlug: archivedReleaseSlug }))
  );

  assert.equal(archivedRelated.releaseSlug, archivedReleaseSlug);
  assert.deepEqual(
    archivedRelated.items.map((item) => ({
      relationType: item.relationType,
      neighborSlug: item.neighborSlug,
      neighborName: item.neighborName,
      detailHref: item.detailHref
    })),
    [
      {
        relationType: "ALLIED_WITH",
        neighborSlug: factionSlug,
        neighborName: "Faction Archived",
        detailHref: `/factions/${factionSlug}?releaseSlug=${encodeURIComponent(archivedReleaseSlug)}`
      },
      {
        relationType: "OBSERVED_AT",
        neighborSlug: eventSlug,
        neighborName: "Event Archived",
        detailHref: `/events/${eventSlug}?releaseSlug=${encodeURIComponent(archivedReleaseSlug)}`
      }
    ]
  );
});

test("public codex related content enforces public relationship and neighbor filters", async () => {
  const related = await ensureOk<PublicCodexRelatedResponse>(
    await fetch(buildUrl({ entityType: "CHARACTER", slug: sourceSlug }))
  );

  assert.equal(related.items.length, 2);
  assert.equal(
    related.items.every((item) => item.relationType !== "RIVALED_WITH" && item.relationType !== "SECRETLY_FUNDS"),
    true
  );
  assert.equal(
    related.items.every(
      (item) => item.neighborSlug !== restrictedSlug && item.neighborSlug !== retiredSlug && item.neighborSlug !== unreleasedSlug
    ),
    true
  );
  assert.equal(related.items.every((item) => item.neighborVisibility === "PUBLIC"), true);
});

test("public codex related content returns leak-safe 404s for draft and unknown release selectors", async () => {
  const [draftResponse, missingResponse] = await Promise.all([
    fetch(buildUrl({ entityType: "CHARACTER", slug: sourceSlug, releaseSlug: draftReleaseSlug })),
    fetch(buildUrl({ entityType: "CHARACTER", slug: sourceSlug, releaseSlug: `missing-codex-release-${timestamp}` }))
  ]);

  assert.equal(draftResponse.status, 404);
  assert.equal(missingResponse.status, 404);
});
