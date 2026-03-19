import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

import { Role } from "@prisma/client";

import { createApp } from "../apps/api/src/app/createApp.js";
import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { releaseRepository } from "../apps/api/src/repositories/releaseRepository.js";
import { phase0FixtureConfig } from "../scripts/phase0FixtureConfig.js";

type MetadataResponse = {
  spoilerTier: string;
  tags: string[];
  timelineAnchor: {
    timelineEraSlug: string | null;
    anchorLabel: string;
    sortKey: string | null;
  } | null;
};

type GenericDraftResponse = {
  entityType: string;
  entitySlug: string;
  revisionId: string;
  version: number;
  visibility: string;
  metadata: MetadataResponse;
};

type EventDraftResponse = {
  revisionId: string;
  version: number;
  slug: string;
  visibility: string;
  metadata: MetadataResponse;
};

type AdminEventDetailResponse = {
  eventSlug: string;
  entityType: string;
  revisionId: string;
  version: number;
  visibility: string;
  metadata: MetadataResponse;
};

type PublicEventResponse = {
  releaseSlug: string;
  eventSlug: string;
  visibility: string;
  metadata: MetadataResponse;
  version: number;
};

type PublicDiscoveryResponse = {
  releaseSlug: string | null;
  items: Array<{
    entityType: string;
    slug: string;
    visibility: string;
    metadata: MetadataResponse;
  }>;
};

const app = createApp();
const server = createServer(app);
const timestamp = Date.now();
const eventSlug = `phase2-metadata-event-${timestamp}`;
const secretSlug = `phase2-metadata-secret-${timestamp}`;
const locationSlug = `phase2-metadata-location-${timestamp}`;
const releaseSlug = `phase2-metadata-release-${timestamp}`;

let apiBaseUrl = "";
let sessionCookie = "";
let authorId = "";

const ensureOk = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
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

  const passwordHash = await passwordHasher.hashPassword(phase0FixtureConfig.authorAdmin.password);
  const author = await prismaClient.user.upsert({
    where: { email: phase0FixtureConfig.authorAdmin.email },
    update: {
      displayName: phase0FixtureConfig.authorAdmin.displayName,
      passwordHash,
      role: Role.AUTHOR_ADMIN
    },
    create: {
      email: phase0FixtureConfig.authorAdmin.email,
      displayName: phase0FixtureConfig.authorAdmin.displayName,
      passwordHash,
      role: Role.AUTHOR_ADMIN
    }
  });

  authorId = author.id;

  const sessionResponse = await fetch(`${apiBaseUrl}/auth/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: phase0FixtureConfig.authorAdmin.email,
      password: phase0FixtureConfig.authorAdmin.password
    })
  });

  if (!sessionResponse.ok) {
    throw new Error(`Session creation failed: ${sessionResponse.status}`);
  }

  const cookieHeader = sessionResponse.headers.get("set-cookie");

  if (!cookieHeader) {
    throw new Error("No session cookie returned");
  }

  sessionCookie = cookieHeader.split(";")[0] ?? "";
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
    where: { user: { email: phase0FixtureConfig.authorAdmin.email } }
  });

  await prismaClient.release.deleteMany({
    where: { slug: releaseSlug }
  });

  await prismaClient.entityRevision.deleteMany({
    where: {
      entity: {
        slug: {
          in: [eventSlug, secretSlug, locationSlug]
        }
      }
    }
  });

  await prismaClient.entity.deleteMany({
    where: {
      slug: {
        in: [eventSlug, secretSlug, locationSlug]
      }
    }
  });

  await prismaClient.$disconnect();
});

test("generic admin routes reject timeline anchors for non-chronology entity types", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/entities/LOCATION/drafts`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: sessionCookie },
    body: JSON.stringify({
      slug: locationSlug,
      name: "Metadata Location",
      summary: "This should fail validation.",
      metadata: {
        timelineAnchor: {
          anchorLabel: "Invalid anchor",
          sortKey: "001"
        }
      }
    })
  });

  assert.equal(response.status, 400);
});

test("metadata stays normalized and consistent across specialized admin, generic admin, and public event surfaces", async () => {
  const created = await ensureOk<EventDraftResponse>(
    await fetch(`${apiBaseUrl}/admin/events/drafts`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: sessionCookie },
      body: JSON.stringify({
        slug: eventSlug,
        name: "Chronology Event",
        summary: "Initial event draft",
        visibility: "PUBLIC",
        metadata: {
          spoilerTier: "MAJOR",
          tags: ["  Chronology ", "chronology", "Festival"],
          timelineAnchor: {
            timelineEraSlug: null,
            anchorLabel: "After the Siege",
            sortKey: "0200.001"
          }
        }
      })
    })
  );

  assert.equal(created.version, 1);
  assert.equal(created.visibility, "PUBLIC");
  assert.deepEqual(created.metadata, {
    spoilerTier: "MAJOR",
    tags: ["chronology", "festival"],
    timelineAnchor: {
      timelineEraSlug: null,
      anchorLabel: "After the Siege",
      sortKey: "0200.001"
    }
  });

  const updated = await ensureOk<GenericDraftResponse>(
    await fetch(`${apiBaseUrl}/admin/entities/EVENT/${eventSlug}/drafts`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: sessionCookie },
      body: JSON.stringify({
        name: "Chronology Event Revised",
        summary: "Metadata should persist when omitted",
        visibility: "PUBLIC"
      })
    })
  );

  assert.equal(updated.version, 2);
  assert.deepEqual(updated.metadata, created.metadata);

  const adminEvent = await ensureOk<AdminEventDetailResponse>(
    await fetch(`${apiBaseUrl}/admin/events/${eventSlug}`, {
      headers: { cookie: sessionCookie }
    })
  );

  assert.equal(adminEvent.eventSlug, eventSlug);
  assert.equal(adminEvent.version, 2);
  assert.deepEqual(adminEvent.metadata, created.metadata);

  const restrictedSecret = await ensureOk<GenericDraftResponse>(
    await fetch(`${apiBaseUrl}/admin/entities/SECRET/drafts`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: sessionCookie },
      body: JSON.stringify({
        slug: secretSlug,
        name: "Restricted Secret",
        summary: "Should stay out of public discovery",
        visibility: "RESTRICTED",
        metadata: {
          spoilerTier: "NONE",
          tags: ["hidden"]
        }
      })
    })
  );

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: releaseSlug,
    name: "Metadata Baseline Release"
  });

  await releaseRepository.includeRevision({
    releaseSlug,
    entitySlug: eventSlug,
    revisionId: updated.revisionId
  });

  await releaseRepository.includeRevision({
    releaseSlug,
    entitySlug: secretSlug,
    revisionId: restrictedSecret.revisionId
  });

  await releaseRepository.activateRelease(releaseSlug);

  const publicEvent = await ensureOk<PublicEventResponse>(await fetch(`${apiBaseUrl}/events/${eventSlug}`));

  assert.equal(publicEvent.releaseSlug, releaseSlug);
  assert.equal(publicEvent.eventSlug, eventSlug);
  assert.equal(publicEvent.version, 2);
  assert.equal(publicEvent.visibility, "PUBLIC");
  assert.deepEqual(publicEvent.metadata, created.metadata);

  const discovery = await ensureOk<PublicDiscoveryResponse>(await fetch(`${apiBaseUrl}/discover`));
  const eventItem = discovery.items.find((item) => item.slug === eventSlug);
  const secretItem = discovery.items.find((item) => item.slug === secretSlug);

  assert.equal(discovery.releaseSlug, releaseSlug);
  assert.ok(eventItem, "Expected public event in discovery");
  assert.deepEqual(eventItem?.metadata, created.metadata);
  assert.equal(secretItem, undefined, "Restricted visibility must override spoiler metadata in public discovery");
});