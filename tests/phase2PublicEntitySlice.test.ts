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

type PublicLocationResponse = {
  releaseSlug: string;
  locationSlug: string;
  name: string;
  summary: string;
  visibility: string;
  version: number;
};

type PublicEventResponse = {
  releaseSlug: string;
  eventSlug: string;
  name: string;
  summary: string;
  visibility: string;
  version: number;
};

const app = createApp();
const server = createServer(app);
const timestamp = Date.now();
const locationSlug = `public-location-${timestamp}`;
const eventSlug = `public-event-${timestamp}`;
const initialReleaseSlug = `public-phase2-release-initial-${timestamp}`;
const nextReleaseSlug = `public-phase2-release-next-${timestamp}`;

let apiBaseUrl = "";
let authorId = "";
let locationEntityId = "";
let eventEntityId = "";

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

  const location = await prismaClient.entity.create({
    data: {
      slug: locationSlug,
      type: "LOCATION"
    }
  });

  locationEntityId = location.id;

  const event = await prismaClient.entity.create({
    data: {
      slug: eventSlug,
      type: "EVENT"
    }
  });

  eventEntityId = event.id;

  const locationRevision = await prismaClient.entityRevision.create({
    data: {
      entityId: location.id,
      createdById: authorId,
      version: 1,
      name: "Moonlit Harbor",
      summary: "Initial public location summary",
      visibility: Visibility.PUBLIC,
      payload: {
        name: "Moonlit Harbor",
        summary: "Initial public location summary",
        visibility: Visibility.PUBLIC
      }
    }
  });

  const eventRevision = await prismaClient.entityRevision.create({
    data: {
      entityId: event.id,
      createdById: authorId,
      version: 1,
      name: "Harbor Festival",
      summary: "Initial public event summary",
      visibility: Visibility.PUBLIC,
      payload: {
        name: "Harbor Festival",
        summary: "Initial public event summary",
        visibility: Visibility.PUBLIC
      }
    }
  });

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: initialReleaseSlug,
    name: "Phase 2 Public Initial Release"
  });

  await releaseRepository.includeRevision({
    releaseSlug: initialReleaseSlug,
    entitySlug: locationSlug,
    revisionId: locationRevision.id
  });

  await releaseRepository.includeRevision({
    releaseSlug: initialReleaseSlug,
    entitySlug: eventSlug,
    revisionId: eventRevision.id
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
          in: [locationSlug, eventSlug]
        }
      }
    }
  });

  await prismaClient.entity.deleteMany({
    where: {
      slug: {
        in: [locationSlug, eventSlug]
      }
    }
  });

  await prismaClient.$disconnect();
});

test("public location and event reads remain bound to the active release", async () => {
  const initialLocation = await ensureOk<PublicLocationResponse>(await fetch(`${apiBaseUrl}/locations/${locationSlug}`));
  const initialEvent = await ensureOk<PublicEventResponse>(await fetch(`${apiBaseUrl}/events/${eventSlug}`));

  assert.equal(initialLocation.releaseSlug, initialReleaseSlug);
  assert.equal(initialLocation.locationSlug, locationSlug);
  assert.equal(initialLocation.name, "Moonlit Harbor");
  assert.equal(initialLocation.summary, "Initial public location summary");
  assert.equal(initialLocation.version, 1);

  assert.equal(initialEvent.releaseSlug, initialReleaseSlug);
  assert.equal(initialEvent.eventSlug, eventSlug);
  assert.equal(initialEvent.name, "Harbor Festival");
  assert.equal(initialEvent.summary, "Initial public event summary");
  assert.equal(initialEvent.version, 1);

  const nextLocationRevision = await prismaClient.entityRevision.create({
    data: {
      entityId: locationEntityId,
      createdById: authorId,
      version: 2,
      name: "Moonlit Harbor Revised",
      summary: "Updated location summary hidden until activation",
      visibility: Visibility.PUBLIC,
      payload: {
        name: "Moonlit Harbor Revised",
        summary: "Updated location summary hidden until activation",
        visibility: Visibility.PUBLIC
      }
    }
  });

  const nextEventRevision = await prismaClient.entityRevision.create({
    data: {
      entityId: eventEntityId,
      createdById: authorId,
      version: 2,
      name: "Harbor Festival Revised",
      summary: "Updated event summary hidden until activation",
      visibility: Visibility.PUBLIC,
      payload: {
        name: "Harbor Festival Revised",
        summary: "Updated event summary hidden until activation",
        visibility: Visibility.PUBLIC
      }
    }
  });

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: nextReleaseSlug,
    name: "Phase 2 Public Next Release"
  });

  await releaseRepository.includeRevision({
    releaseSlug: nextReleaseSlug,
    entitySlug: locationSlug,
    revisionId: nextLocationRevision.id
  });

  await releaseRepository.includeRevision({
    releaseSlug: nextReleaseSlug,
    entitySlug: eventSlug,
    revisionId: nextEventRevision.id
  });

  const beforeActivationLocation = await ensureOk<PublicLocationResponse>(await fetch(`${apiBaseUrl}/locations/${locationSlug}`));
  const beforeActivationEvent = await ensureOk<PublicEventResponse>(await fetch(`${apiBaseUrl}/events/${eventSlug}`));

  assert.equal(beforeActivationLocation.releaseSlug, initialReleaseSlug);
  assert.equal(beforeActivationLocation.name, "Moonlit Harbor");
  assert.equal(beforeActivationEvent.releaseSlug, initialReleaseSlug);
  assert.equal(beforeActivationEvent.name, "Harbor Festival");

  await releaseRepository.activateRelease(nextReleaseSlug);

  const afterActivationLocation = await ensureOk<PublicLocationResponse>(await fetch(`${apiBaseUrl}/locations/${locationSlug}`));
  const afterActivationEvent = await ensureOk<PublicEventResponse>(await fetch(`${apiBaseUrl}/events/${eventSlug}`));

  assert.equal(afterActivationLocation.releaseSlug, nextReleaseSlug);
  assert.equal(afterActivationLocation.name, "Moonlit Harbor Revised");
  assert.equal(afterActivationLocation.version, 2);
  assert.equal(afterActivationEvent.releaseSlug, nextReleaseSlug);
  assert.equal(afterActivationEvent.name, "Harbor Festival Revised");
  assert.equal(afterActivationEvent.version, 2);
});