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

type PublicDiscoveryResponse = {
  releaseSlug: string | null;
  items: Array<{
    releaseSlug: string;
    entityType: string;
    slug: string;
    name: string;
    summary: string;
    visibility: string;
    version: number;
  }>;
};

const app = createApp();
const server = createServer(app);
const timestamp = Date.now();
const characterSlug = `discovery-character-${timestamp}`;
const factionSlug = `discovery-faction-${timestamp}`;
const initialReleaseSlug = `discovery-release-initial-${timestamp}`;
const nextReleaseSlug = `discovery-release-next-${timestamp}`;

let apiBaseUrl = "";
let authorId = "";
let characterEntityId = "";

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

  const character = await prismaClient.entity.create({
    data: {
      slug: characterSlug,
      type: "CHARACTER"
    }
  });

  characterEntityId = character.id;

  const faction = await prismaClient.entity.create({
    data: {
      slug: factionSlug,
      type: "FACTION"
    }
  });

  const characterRevision = await prismaClient.entityRevision.create({
    data: {
      entityId: character.id,
      createdById: authorId,
      version: 1,
      name: "Discovery Character",
      summary: "Active released character for discovery",
      visibility: Visibility.PUBLIC,
      payload: {
        name: "Discovery Character",
        summary: "Active released character for discovery",
        visibility: Visibility.PUBLIC
      }
    }
  });

  const factionRevision = await prismaClient.entityRevision.create({
    data: {
      entityId: faction.id,
      createdById: authorId,
      version: 1,
      name: "Discovery Faction",
      summary: "Active released faction for discovery",
      visibility: Visibility.PUBLIC,
      payload: {
        name: "Discovery Faction",
        summary: "Active released faction for discovery",
        visibility: Visibility.PUBLIC
      }
    }
  });

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: initialReleaseSlug,
    name: "Discovery Initial Release"
  });

  await releaseRepository.includeRevision({
    releaseSlug: initialReleaseSlug,
    entitySlug: characterSlug,
    revisionId: characterRevision.id
  });

  await releaseRepository.includeRevision({
    releaseSlug: initialReleaseSlug,
    entitySlug: factionSlug,
    revisionId: factionRevision.id
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

  await prismaClient.releaseEntry.deleteMany({
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

  await prismaClient.entityRevision.deleteMany({
    where: {
      entity: {
        slug: {
          in: [characterSlug, factionSlug]
        }
      }
    }
  });

  await prismaClient.entity.deleteMany({
    where: {
      slug: {
        in: [characterSlug, factionSlug]
      }
    }
  });

  await prismaClient.$disconnect();
});

test("public discovery only exposes active-release public content", async () => {
  const initialDiscovery = await ensureOk<PublicDiscoveryResponse>(await fetch(`${apiBaseUrl}/discover`));

  assert.equal(initialDiscovery.releaseSlug, initialReleaseSlug);
  assert.deepEqual(
    initialDiscovery.items.map((item) => ({
      entityType: item.entityType,
      slug: item.slug,
      name: item.name,
      version: item.version
    })),
    [
      {
        entityType: "CHARACTER",
        slug: characterSlug,
        name: "Discovery Character",
        version: 1
      },
      {
        entityType: "FACTION",
        slug: factionSlug,
        name: "Discovery Faction",
        version: 1
      }
    ]
  );

  const characterOnly = await ensureOk<PublicDiscoveryResponse>(
    await fetch(`${apiBaseUrl}/discover?type=CHARACTER`)
  );

  assert.equal(characterOnly.items.length, 1);
  assert.equal(characterOnly.items[0]?.slug, characterSlug);

  const locationOnly = await ensureOk<PublicDiscoveryResponse>(
    await fetch(`${apiBaseUrl}/discover?type=LOCATION`)
  );

  assert.equal(locationOnly.releaseSlug, initialReleaseSlug);
  assert.equal(locationOnly.items.length, 0);

  const factionMatch = await ensureOk<PublicDiscoveryResponse>(
    await fetch(`${apiBaseUrl}/discover?q=faction`)
  );

  assert.equal(factionMatch.items.length, 1);
  assert.equal(factionMatch.items[0]?.slug, factionSlug);

  const noMatch = await ensureOk<PublicDiscoveryResponse>(
    await fetch(`${apiBaseUrl}/discover?q=missing`)
  );

  assert.equal(noMatch.releaseSlug, initialReleaseSlug);
  assert.equal(noMatch.items.length, 0);

  const nextCharacterRevision = await prismaClient.entityRevision.create({
    data: {
      entityId: characterEntityId,
      createdById: authorId,
      version: 2,
      name: "Discovery Character Updated",
      summary: "Updated character that should stay hidden until release activation",
      visibility: Visibility.PUBLIC,
      payload: {
        name: "Discovery Character Updated",
        summary: "Updated character that should stay hidden until release activation",
        visibility: Visibility.PUBLIC
      }
    }
  });

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: nextReleaseSlug,
    name: "Discovery Next Release"
  });

  const activeFactionRevision = await prismaClient.entityRevision.findFirstOrThrow({
    where: {
      entity: {
        slug: factionSlug
      }
    },
    orderBy: {
      version: "desc"
    },
    select: {
      id: true
    }
  });

  await releaseRepository.includeRevision({
    releaseSlug: nextReleaseSlug,
    entitySlug: characterSlug,
    revisionId: nextCharacterRevision.id
  });

  await releaseRepository.includeRevision({
    releaseSlug: nextReleaseSlug,
    entitySlug: factionSlug,
    revisionId: activeFactionRevision.id
  });

  const beforeActivation = await ensureOk<PublicDiscoveryResponse>(await fetch(`${apiBaseUrl}/discover`));

  assert.equal(beforeActivation.releaseSlug, initialReleaseSlug);
  assert.equal(beforeActivation.items.find((item) => item.slug === characterSlug)?.name, "Discovery Character");

  await releaseRepository.activateRelease(nextReleaseSlug);

  const afterActivation = await ensureOk<PublicDiscoveryResponse>(await fetch(`${apiBaseUrl}/discover`));

  assert.equal(afterActivation.releaseSlug, nextReleaseSlug);
  assert.equal(afterActivation.items.find((item) => item.slug === characterSlug)?.name, "Discovery Character Updated");
  assert.equal(afterActivation.items.find((item) => item.slug === characterSlug)?.version, 2);
});