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

type MetadataResponse = Record<string, unknown>;

type PublicCharacterResponse = {
  releaseSlug: string;
  characterSlug: string;
  name: string;
  summary: string;
  visibility: string;
  metadata: MetadataResponse;
  version: number;
};

type PublicFactionResponse = {
  releaseSlug: string;
  factionSlug: string;
  name: string;
  summary: string;
  visibility: string;
  metadata: MetadataResponse;
  version: number;
};

type PublicLocationResponse = {
  releaseSlug: string;
  locationSlug: string;
  name: string;
  summary: string;
  visibility: string;
  metadata: MetadataResponse;
  version: number;
};

type PublicEventResponse = {
  releaseSlug: string;
  eventSlug: string;
  name: string;
  summary: string;
  visibility: string;
  metadata: MetadataResponse;
  version: number;
};

const app = createApp();
const server = createServer(app);
const timestamp = Date.now();
const characterSlug = `public-character-${timestamp}`;
const factionSlug = `public-faction-${timestamp}`;
const locationSlug = `public-location-release-${timestamp}`;
const eventSlug = `public-event-release-${timestamp}`;
const initialReleaseSlug = `public-codex-initial-${timestamp}`;
const sparseReleaseSlug = `public-codex-sparse-${timestamp}`;
const activeReleaseSlug = `public-codex-active-${timestamp}`;
const draftReleaseSlug = `public-codex-draft-${timestamp}`;

let apiBaseUrl = "";
let authorId = "";
let characterEntityId = "";
let factionEntityId = "";
let locationEntityId = "";
let eventEntityId = "";

const ensureOk = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Request failed with ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
};

const buildUrl = (path: string, releaseSlug?: string): string => {
  const url = new URL(path, apiBaseUrl);

  if (releaseSlug !== undefined) {
    url.searchParams.set("releaseSlug", releaseSlug);
  }

  return url.toString();
};

const createPublicRevision = async (input: {
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

  const [character, faction, location, event] = await Promise.all([
    prismaClient.entity.create({ data: { slug: characterSlug, type: "CHARACTER" } }),
    prismaClient.entity.create({ data: { slug: factionSlug, type: "FACTION" } }),
    prismaClient.entity.create({ data: { slug: locationSlug, type: "LOCATION" } }),
    prismaClient.entity.create({ data: { slug: eventSlug, type: "EVENT" } })
  ]);

  characterEntityId = character.id;
  factionEntityId = faction.id;
  locationEntityId = location.id;
  eventEntityId = event.id;

  const initialCharacterRevision = await createPublicRevision({
    entityId: characterEntityId,
    name: "Captain Mira",
    summary: "Initial public character summary"
  });
  const initialFactionRevision = await createPublicRevision({
    entityId: factionEntityId,
    name: "Harbor Watch",
    summary: "Initial public faction summary"
  });
  const initialLocationRevision = await createPublicRevision({
    entityId: locationEntityId,
    name: "Moonlit Harbor",
    summary: "Initial public location summary"
  });
  const initialEventRevision = await createPublicRevision({
    entityId: eventEntityId,
    name: "Harbor Festival",
    summary: "Initial public event summary"
  });

  await releaseRepository.createRelease({ actorId: authorId, slug: initialReleaseSlug, name: "Public Codex Initial" });
  await releaseRepository.includeRevision({ releaseSlug: initialReleaseSlug, entitySlug: characterSlug, revisionId: initialCharacterRevision.id });
  await releaseRepository.includeRevision({ releaseSlug: initialReleaseSlug, entitySlug: factionSlug, revisionId: initialFactionRevision.id });
  await releaseRepository.includeRevision({ releaseSlug: initialReleaseSlug, entitySlug: locationSlug, revisionId: initialLocationRevision.id });
  await releaseRepository.includeRevision({ releaseSlug: initialReleaseSlug, entitySlug: eventSlug, revisionId: initialEventRevision.id });
  await releaseRepository.activateRelease(initialReleaseSlug);

  const restrictedCharacterRevision = await createPublicRevision({
    entityId: characterEntityId,
    name: "Captain Mira Restricted",
    summary: "Restricted character revision",
    visibility: Visibility.RESTRICTED
  });

  await releaseRepository.createRelease({ actorId: authorId, slug: sparseReleaseSlug, name: "Public Codex Sparse" });
  await releaseRepository.includeRevision({ releaseSlug: sparseReleaseSlug, entitySlug: characterSlug, revisionId: restrictedCharacterRevision.id });
  await releaseRepository.activateRelease(sparseReleaseSlug);

  const activeCharacterRevision = await createPublicRevision({
    entityId: characterEntityId,
    name: "Captain Mira Returned",
    summary: "Current active character summary"
  });
  const activeFactionRevision = await createPublicRevision({
    entityId: factionEntityId,
    name: "Harbor Accord",
    summary: "Current active faction summary"
  });
  const activeLocationRevision = await createPublicRevision({
    entityId: locationEntityId,
    name: "Moonlit Harbor Revised",
    summary: "Current active location summary"
  });
  const activeEventRevision = await createPublicRevision({
    entityId: eventEntityId,
    name: "Harbor Festival Revised",
    summary: "Current active event summary"
  });

  await releaseRepository.createRelease({ actorId: authorId, slug: activeReleaseSlug, name: "Public Codex Active" });
  await releaseRepository.includeRevision({ releaseSlug: activeReleaseSlug, entitySlug: characterSlug, revisionId: activeCharacterRevision.id });
  await releaseRepository.includeRevision({ releaseSlug: activeReleaseSlug, entitySlug: factionSlug, revisionId: activeFactionRevision.id });
  await releaseRepository.includeRevision({ releaseSlug: activeReleaseSlug, entitySlug: locationSlug, revisionId: activeLocationRevision.id });
  await releaseRepository.includeRevision({ releaseSlug: activeReleaseSlug, entitySlug: eventSlug, revisionId: activeEventRevision.id });
  await releaseRepository.activateRelease(activeReleaseSlug);

  const draftLocationRevision = await createPublicRevision({
    entityId: locationEntityId,
    name: "Moonlit Harbor Draft",
    summary: "Draft-only location summary"
  });

  await releaseRepository.createRelease({ actorId: authorId, slug: draftReleaseSlug, name: "Public Codex Draft" });
  await releaseRepository.includeRevision({ releaseSlug: draftReleaseSlug, entitySlug: locationSlug, revisionId: draftLocationRevision.id });
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
          in: [initialReleaseSlug, sparseReleaseSlug, activeReleaseSlug, draftReleaseSlug]
        }
      }
    }
  });

  await prismaClient.release.deleteMany({
    where: {
      slug: {
        in: [initialReleaseSlug, sparseReleaseSlug, activeReleaseSlug, draftReleaseSlug]
      }
    }
  });

  await prismaClient.entityRevision.deleteMany({
    where: {
      entity: {
        slug: {
          in: [characterSlug, factionSlug, locationSlug, eventSlug]
        }
      }
    }
  });

  await prismaClient.entity.deleteMany({
    where: {
      slug: {
        in: [characterSlug, factionSlug, locationSlug, eventSlug]
      }
    }
  });

  await prismaClient.$disconnect();
});

test("public entity detail falls back to the active release when releaseSlug is omitted", async () => {
  const [character, faction, location, event] = await Promise.all([
    ensureOk<PublicCharacterResponse>(await fetch(buildUrl(`/characters/${characterSlug}`))),
    ensureOk<PublicFactionResponse>(await fetch(buildUrl(`/factions/${factionSlug}`))),
    ensureOk<PublicLocationResponse>(await fetch(buildUrl(`/locations/${locationSlug}`))),
    ensureOk<PublicEventResponse>(await fetch(buildUrl(`/events/${eventSlug}`)))
  ]);

  assert.equal(character.releaseSlug, activeReleaseSlug);
  assert.equal(character.characterSlug, characterSlug);
  assert.equal(character.name, "Captain Mira Returned");
  assert.equal(character.version, 3);
  assert.equal(typeof character.metadata, "object");

  assert.equal(faction.releaseSlug, activeReleaseSlug);
  assert.equal(faction.factionSlug, factionSlug);
  assert.equal(faction.name, "Harbor Accord");
  assert.equal(faction.version, 2);
  assert.equal(typeof faction.metadata, "object");

  assert.equal(location.releaseSlug, activeReleaseSlug);
  assert.equal(location.locationSlug, locationSlug);
  assert.equal(location.name, "Moonlit Harbor Revised");
  assert.equal(location.version, 2);
  assert.equal(typeof location.metadata, "object");

  assert.equal(event.releaseSlug, activeReleaseSlug);
  assert.equal(event.eventSlug, eventSlug);
  assert.equal(event.name, "Harbor Festival Revised");
  assert.equal(event.version, 2);
  assert.equal(typeof event.metadata, "object");
});

test("public entity detail returns the revision included in an archived release when releaseSlug is selected", async () => {
  const [character, faction, location, event] = await Promise.all([
    ensureOk<PublicCharacterResponse>(await fetch(buildUrl(`/characters/${characterSlug}`, initialReleaseSlug))),
    ensureOk<PublicFactionResponse>(await fetch(buildUrl(`/factions/${factionSlug}`, initialReleaseSlug))),
    ensureOk<PublicLocationResponse>(await fetch(buildUrl(`/locations/${locationSlug}`, initialReleaseSlug))),
    ensureOk<PublicEventResponse>(await fetch(buildUrl(`/events/${eventSlug}`, initialReleaseSlug)))
  ]);

  assert.equal(character.releaseSlug, initialReleaseSlug);
  assert.equal(character.name, "Captain Mira");
  assert.equal(character.version, 1);

  assert.equal(faction.releaseSlug, initialReleaseSlug);
  assert.equal(faction.name, "Harbor Watch");
  assert.equal(faction.version, 1);

  assert.equal(location.releaseSlug, initialReleaseSlug);
  assert.equal(location.name, "Moonlit Harbor");
  assert.equal(location.version, 1);

  assert.equal(event.releaseSlug, initialReleaseSlug);
  assert.equal(event.name, "Harbor Festival");
  assert.equal(event.version, 1);
});

test("public entity detail returns leak-safe 404s for draft releases, unknown releases, missing entries, and non-public revisions", async () => {
  const [draftReleaseResponse, unknownReleaseResponse, missingEntryResponse, nonPublicResponse] = await Promise.all([
    fetch(buildUrl(`/locations/${locationSlug}`, draftReleaseSlug)),
    fetch(buildUrl(`/factions/${factionSlug}`, `missing-release-${timestamp}`)),
    fetch(buildUrl(`/events/${eventSlug}`, sparseReleaseSlug)),
    fetch(buildUrl(`/characters/${characterSlug}`, sparseReleaseSlug))
  ]);

  assert.equal(draftReleaseResponse.status, 404);
  assert.equal(unknownReleaseResponse.status, 404);
  assert.equal(missingEntryResponse.status, 404);
  assert.equal(nonPublicResponse.status, 404);
});