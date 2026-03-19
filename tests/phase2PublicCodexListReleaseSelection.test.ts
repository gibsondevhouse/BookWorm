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

type PublicCodexListResponse = {
  releaseSlug: string | null;
  items: Array<{
    releaseSlug: string;
    entityType: string;
    slug: string;
    name: string;
    summary: string;
    visibility: string;
    version: number;
    detailPath: string;
    detailHref: string;
  }>;
};

const app = createApp();
const server = createServer(app);
const timestamp = Date.now();
const initialReleaseSlug = `public-codex-list-initial-${timestamp}`;
const activeReleaseSlug = `public-codex-list-active-${timestamp}`;
const draftReleaseSlug = `public-codex-list-draft-${timestamp}`;

const characterSlug = `public-codex-list-character-${timestamp}`;
const factionSlug = `public-codex-list-faction-${timestamp}`;
const locationSlug = `public-codex-list-location-${timestamp}`;
const eventSlug = `public-codex-list-event-${timestamp}`;
const artifactSlug = `public-codex-list-artifact-${timestamp}`;
const hiddenCharacterSlug = `public-codex-list-hidden-character-${timestamp}`;
const retiredLocationSlug = `public-codex-list-retired-location-${timestamp}`;

let apiBaseUrl = "";
let authorId = "";

const ensureOk = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Request failed with ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
};

const buildCodexUrl = (input?: {
  releaseSlug?: string;
  type?: "CHARACTER" | "FACTION" | "LOCATION" | "EVENT";
  query?: string;
  limit?: number;
}): string => {
  const url = new URL("/codex", apiBaseUrl);

  if (input?.releaseSlug !== undefined) {
    url.searchParams.set("releaseSlug", input.releaseSlug);
  }

  if (input?.type !== undefined) {
    url.searchParams.set("type", input.type);
  }

  if (input?.query !== undefined) {
    url.searchParams.set("q", input.query);
  }

  if (input?.limit !== undefined) {
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

  const [character, faction, location, event, artifact, hiddenCharacter, retiredLocation] = await Promise.all([
    prismaClient.entity.create({ data: { slug: characterSlug, type: "CHARACTER" } }),
    prismaClient.entity.create({ data: { slug: factionSlug, type: "FACTION" } }),
    prismaClient.entity.create({ data: { slug: locationSlug, type: "LOCATION" } }),
    prismaClient.entity.create({ data: { slug: eventSlug, type: "EVENT" } }),
    prismaClient.entity.create({ data: { slug: artifactSlug, type: "ARTIFACT" } }),
    prismaClient.entity.create({ data: { slug: hiddenCharacterSlug, type: "CHARACTER" } }),
    prismaClient.entity.create({ data: { slug: retiredLocationSlug, type: "LOCATION" } })
  ]);

  await prismaClient.entity.update({
    where: {
      id: retiredLocation.id
    },
    data: {
      retiredAt: new Date()
    }
  });

  const archivedCharacterRevision = await createRevision({
    entityId: character.id,
    name: "Astra Archivist",
    summary: "Archived character summary"
  });
  const archivedFactionRevision = await createRevision({
    entityId: faction.id,
    name: "Bronze Banner",
    summary: "Archived faction summary"
  });
  const archivedLocationRevision = await createRevision({
    entityId: location.id,
    name: "Cinder Citadel",
    summary: "Archived location summary"
  });
  const archivedEventRevision = await createRevision({
    entityId: event.id,
    name: "Dawn Convergence",
    summary: "Archived event summary"
  });
  const archivedArtifactRevision = await createRevision({
    entityId: artifact.id,
    name: "Codex Artifact",
    summary: "Artifact should be excluded"
  });
  const archivedHiddenCharacterRevision = await createRevision({
    entityId: hiddenCharacter.id,
    name: "Hidden Character",
    summary: "Restricted character should be excluded",
    visibility: Visibility.RESTRICTED
  });
  const archivedRetiredLocationRevision = await createRevision({
    entityId: retiredLocation.id,
    name: "Retired Bastion",
    summary: "Retired location should be excluded"
  });

  await releaseRepository.createRelease({ actorId: authorId, slug: initialReleaseSlug, name: "Public Codex List Initial" });
  await releaseRepository.includeRevision({
    releaseSlug: initialReleaseSlug,
    entitySlug: characterSlug,
    revisionId: archivedCharacterRevision.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: initialReleaseSlug,
    entitySlug: factionSlug,
    revisionId: archivedFactionRevision.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: initialReleaseSlug,
    entitySlug: locationSlug,
    revisionId: archivedLocationRevision.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: initialReleaseSlug,
    entitySlug: eventSlug,
    revisionId: archivedEventRevision.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: initialReleaseSlug,
    entitySlug: artifactSlug,
    revisionId: archivedArtifactRevision.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: initialReleaseSlug,
    entitySlug: hiddenCharacterSlug,
    revisionId: archivedHiddenCharacterRevision.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: initialReleaseSlug,
    entitySlug: retiredLocationSlug,
    revisionId: archivedRetiredLocationRevision.id
  });
  await releaseRepository.activateRelease(initialReleaseSlug);

  const activeCharacterRevision = await createRevision({
    entityId: character.id,
    name: "Astra Vanguard",
    summary: "Active character summary"
  });
  const activeFactionRevision = await createRevision({
    entityId: faction.id,
    name: "Bronze Coalition",
    summary: "Active faction summary"
  });
  const activeLocationRevision = await createRevision({
    entityId: location.id,
    name: "Cinder Keep",
    summary: "Active location summary"
  });
  const activeEventRevision = await createRevision({
    entityId: event.id,
    name: "Dawn Parade",
    summary: "Active event summary"
  });
  const activeArtifactRevision = await createRevision({
    entityId: artifact.id,
    name: "Codex Artifact Active",
    summary: "Artifact should stay excluded"
  });
  const activeHiddenCharacterRevision = await createRevision({
    entityId: hiddenCharacter.id,
    name: "Hidden Character Active",
    summary: "Restricted character should still be excluded",
    visibility: Visibility.RESTRICTED
  });
  const activeRetiredLocationRevision = await createRevision({
    entityId: retiredLocation.id,
    name: "Retired Bastion Active",
    summary: "Retired location should still be excluded"
  });

  await releaseRepository.createRelease({ actorId: authorId, slug: activeReleaseSlug, name: "Public Codex List Active" });
  await releaseRepository.includeRevision({
    releaseSlug: activeReleaseSlug,
    entitySlug: characterSlug,
    revisionId: activeCharacterRevision.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: activeReleaseSlug,
    entitySlug: factionSlug,
    revisionId: activeFactionRevision.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: activeReleaseSlug,
    entitySlug: locationSlug,
    revisionId: activeLocationRevision.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: activeReleaseSlug,
    entitySlug: eventSlug,
    revisionId: activeEventRevision.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: activeReleaseSlug,
    entitySlug: artifactSlug,
    revisionId: activeArtifactRevision.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: activeReleaseSlug,
    entitySlug: hiddenCharacterSlug,
    revisionId: activeHiddenCharacterRevision.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: activeReleaseSlug,
    entitySlug: retiredLocationSlug,
    revisionId: activeRetiredLocationRevision.id
  });
  await releaseRepository.activateRelease(activeReleaseSlug);

  const draftLocationRevision = await createRevision({
    entityId: location.id,
    name: "Draft Location",
    summary: "Draft release should not be publicly selectable"
  });

  await releaseRepository.createRelease({ actorId: authorId, slug: draftReleaseSlug, name: "Public Codex List Draft" });
  await releaseRepository.includeRevision({
    releaseSlug: draftReleaseSlug,
    entitySlug: locationSlug,
    revisionId: draftLocationRevision.id
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

  await prismaClient.releaseEntry.deleteMany({
    where: {
      release: {
        slug: {
          in: [initialReleaseSlug, activeReleaseSlug, draftReleaseSlug]
        }
      }
    }
  });

  await prismaClient.release.deleteMany({
    where: {
      slug: {
        in: [initialReleaseSlug, activeReleaseSlug, draftReleaseSlug]
      }
    }
  });

  await prismaClient.entityRevision.deleteMany({
    where: {
      entity: {
        slug: {
          in: [
            characterSlug,
            factionSlug,
            locationSlug,
            eventSlug,
            artifactSlug,
            hiddenCharacterSlug,
            retiredLocationSlug
          ]
        }
      }
    }
  });

  await prismaClient.entity.deleteMany({
    where: {
      slug: {
        in: [
          characterSlug,
          factionSlug,
          locationSlug,
          eventSlug,
          artifactSlug,
          hiddenCharacterSlug,
          retiredLocationSlug
        ]
      }
    }
  });

  await prismaClient.$disconnect();
});

test("public codex list falls back to active release with deterministic ordering and bounded results", async () => {
  const codex = await ensureOk<PublicCodexListResponse>(await fetch(buildCodexUrl({ limit: 2 })));

  assert.equal(codex.releaseSlug, activeReleaseSlug);
  assert.equal(codex.items.length, 2);
  assert.deepEqual(
    codex.items.map((item) => ({
      entityType: item.entityType,
      slug: item.slug,
      name: item.name,
      detailPath: item.detailPath,
      detailHref: item.detailHref
    })),
    [
      {
        entityType: "CHARACTER",
        slug: characterSlug,
        name: "Astra Vanguard",
        detailPath: `/characters/${characterSlug}`,
        detailHref: `/characters/${characterSlug}`
      },
      {
        entityType: "FACTION",
        slug: factionSlug,
        name: "Bronze Coalition",
        detailPath: `/factions/${factionSlug}`,
        detailHref: `/factions/${factionSlug}`
      }
    ]
  );
});

test("public codex list supports explicit archived release selection and release-safe navigation fields", async () => {
  const archivedCodex = await ensureOk<PublicCodexListResponse>(
    await fetch(buildCodexUrl({ releaseSlug: initialReleaseSlug }))
  );

  assert.equal(archivedCodex.releaseSlug, initialReleaseSlug);
  assert.deepEqual(
    archivedCodex.items.map((item) => ({
      entityType: item.entityType,
      slug: item.slug,
      name: item.name,
      detailHref: item.detailHref
    })),
    [
      {
        entityType: "CHARACTER",
        slug: characterSlug,
        name: "Astra Archivist",
        detailHref: `/characters/${characterSlug}?releaseSlug=${encodeURIComponent(initialReleaseSlug)}`
      },
      {
        entityType: "FACTION",
        slug: factionSlug,
        name: "Bronze Banner",
        detailHref: `/factions/${factionSlug}?releaseSlug=${encodeURIComponent(initialReleaseSlug)}`
      },
      {
        entityType: "LOCATION",
        slug: locationSlug,
        name: "Cinder Citadel",
        detailHref: `/locations/${locationSlug}?releaseSlug=${encodeURIComponent(initialReleaseSlug)}`
      },
      {
        entityType: "EVENT",
        slug: eventSlug,
        name: "Dawn Convergence",
        detailHref: `/events/${eventSlug}?releaseSlug=${encodeURIComponent(initialReleaseSlug)}`
      }
    ]
  );

  assert.equal(archivedCodex.items.every((item) => item.visibility === "PUBLIC"), true);
  assert.equal(archivedCodex.items.every((item) => item.slug !== artifactSlug), true);
  assert.equal(archivedCodex.items.every((item) => item.slug !== hiddenCharacterSlug), true);
  assert.equal(archivedCodex.items.every((item) => item.slug !== retiredLocationSlug), true);
});

test("public codex list returns leak-safe 404s for draft and unknown release selectors", async () => {
  const [draftReleaseResponse, unknownReleaseResponse] = await Promise.all([
    fetch(buildCodexUrl({ releaseSlug: draftReleaseSlug })),
    fetch(buildCodexUrl({ releaseSlug: `missing-codex-release-${timestamp}` }))
  ]);

  assert.equal(draftReleaseResponse.status, 404);
  assert.equal(unknownReleaseResponse.status, 404);
});

test("public codex list type and query filters apply within the selected release for CHARACTER, FACTION, LOCATION, and EVENT", async () => {
  const [characters, factions, locations, events, locationQuery] = await Promise.all([
    ensureOk<PublicCodexListResponse>(
      await fetch(buildCodexUrl({ releaseSlug: initialReleaseSlug, type: "CHARACTER" }))
    ),
    ensureOk<PublicCodexListResponse>(
      await fetch(buildCodexUrl({ releaseSlug: initialReleaseSlug, type: "FACTION" }))
    ),
    ensureOk<PublicCodexListResponse>(
      await fetch(buildCodexUrl({ releaseSlug: initialReleaseSlug, type: "LOCATION" }))
    ),
    ensureOk<PublicCodexListResponse>(
      await fetch(buildCodexUrl({ releaseSlug: initialReleaseSlug, type: "EVENT" }))
    ),
    ensureOk<PublicCodexListResponse>(
      await fetch(buildCodexUrl({ releaseSlug: initialReleaseSlug, query: "citadel" }))
    )
  ]);

  assert.equal(characters.items.length, 1);
  assert.equal(characters.items[0]?.slug, characterSlug);
  assert.equal(characters.items[0]?.name, "Astra Archivist");

  assert.equal(factions.items.length, 1);
  assert.equal(factions.items[0]?.slug, factionSlug);
  assert.equal(factions.items[0]?.name, "Bronze Banner");

  assert.equal(locations.items.length, 1);
  assert.equal(locations.items[0]?.slug, locationSlug);
  assert.equal(locations.items[0]?.name, "Cinder Citadel");

  assert.equal(events.items.length, 1);
  assert.equal(events.items[0]?.slug, eventSlug);
  assert.equal(events.items[0]?.name, "Dawn Convergence");

  assert.equal(locationQuery.items.length, 1);
  assert.equal(locationQuery.items[0]?.slug, locationSlug);
  assert.equal(locationQuery.items[0]?.entityType, "LOCATION");
});
