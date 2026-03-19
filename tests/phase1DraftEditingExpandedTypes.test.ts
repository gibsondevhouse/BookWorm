import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";

import { createApp } from "../apps/api/src/app/createApp.js";
import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { phase0FixtureConfig } from "../scripts/phase0FixtureConfig.js";

type DraftResponse = {
  revisionId: string;
  version: number;
  slug: string;
  name: string;
  summary: string;
  visibility: string;
};

const app = createApp();
const server = createServer(app);
const timestamp = Date.now();
const locationSlug = `test-location-draft-${timestamp}`;
const eventSlug = `test-event-draft-${timestamp}`;
const initialLocationSummary = "Initial location draft for expanded type slice test.";
const updatedLocationSummary = "Updated location draft proving revision-on-save for Phase 1 expanded types.";
const initialEventSummary = "Initial event draft for expanded type slice test.";
const updatedEventSummary = "Updated event draft proving revision-on-save for Phase 1 expanded types.";

let apiBaseUrl = "";

const ensureOk = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Request failed with ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
};

const createSessionCookie = async (email: string, password: string): Promise<string> => {
  const response = await fetch(`${apiBaseUrl}/auth/session`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to create session: ${response.status} ${errorText}`);
  }

  const sessionCookie = response.headers.get("set-cookie");

  if (!sessionCookie) {
    throw new Error("Session creation did not return a cookie");
  }

  const cookieValue = sessionCookie.split(";")[0];

  if (!cookieValue) {
    throw new Error("Session cookie header was empty");
  }

  return cookieValue;
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
  const editorPasswordHash = await passwordHasher.hashPassword(phase0FixtureConfig.editor.password);

  await prismaClient.user.upsert({
    where: { email: phase0FixtureConfig.authorAdmin.email },
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

  await prismaClient.user.upsert({
    where: { email: phase0FixtureConfig.editor.email },
    update: {
      displayName: phase0FixtureConfig.editor.displayName,
      passwordHash: editorPasswordHash,
      role: Role.EDITOR
    },
    create: {
      email: phase0FixtureConfig.editor.email,
      displayName: phase0FixtureConfig.editor.displayName,
      passwordHash: editorPasswordHash,
      role: Role.EDITOR
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
        email: {
          in: [phase0FixtureConfig.authorAdmin.email, phase0FixtureConfig.editor.email]
        }
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

test("editor can create a location draft and re-saving produces a new revision record", async () => {
  const editorCookie = await createSessionCookie(
    phase0FixtureConfig.editor.email,
    phase0FixtureConfig.editor.password
  );

  const first = await ensureOk<DraftResponse>(
    await fetch(`${apiBaseUrl}/admin/locations/drafts`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: editorCookie
      },
      body: JSON.stringify({
        slug: locationSlug,
        name: "Phase 1 Slice Location",
        summary: initialLocationSummary,
        visibility: "PRIVATE"
      })
    })
  );

  assert.equal(first.slug, locationSlug);
  assert.equal(first.summary, initialLocationSummary);
  assert.equal(first.visibility, Visibility.PRIVATE);
  assert.equal(first.version, 1);
  assert.ok(first.revisionId, "first save must return a revisionId");

  const second = await ensureOk<DraftResponse>(
    await fetch(`${apiBaseUrl}/admin/locations/drafts`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: editorCookie
      },
      body: JSON.stringify({
        slug: locationSlug,
        name: "Phase 1 Slice Location",
        summary: updatedLocationSummary,
        visibility: "RESTRICTED"
      })
    })
  );

  assert.equal(second.slug, locationSlug);
  assert.equal(second.summary, updatedLocationSummary);
  assert.equal(second.visibility, Visibility.RESTRICTED);
  assert.equal(second.version, 2);
  assert.notEqual(second.revisionId, first.revisionId);
});

test("author-admin can create an event draft and re-saving produces a new revision record", async () => {
  const authorCookie = await createSessionCookie(
    phase0FixtureConfig.authorAdmin.email,
    phase0FixtureConfig.authorAdmin.password
  );

  const first = await ensureOk<DraftResponse>(
    await fetch(`${apiBaseUrl}/admin/events/drafts`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: authorCookie
      },
      body: JSON.stringify({
        slug: eventSlug,
        name: "Phase 1 Slice Event",
        summary: initialEventSummary,
        visibility: "PRIVATE"
      })
    })
  );

  assert.equal(first.slug, eventSlug);
  assert.equal(first.summary, initialEventSummary);
  assert.equal(first.version, 1);
  assert.ok(first.revisionId, "first save must return a revisionId");

  const second = await ensureOk<DraftResponse>(
    await fetch(`${apiBaseUrl}/admin/events/drafts`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: authorCookie
      },
      body: JSON.stringify({
        slug: eventSlug,
        name: "Phase 1 Slice Event",
        summary: updatedEventSummary,
        visibility: "PUBLIC"
      })
    })
  );

  assert.equal(second.slug, eventSlug);
  assert.equal(second.summary, updatedEventSummary);
  assert.equal(second.version, 2);
  assert.notEqual(second.revisionId, first.revisionId);
});

test("unauthenticated requests to expanded type draft endpoints are rejected with 401", async () => {
  const locationResponse = await fetch(`${apiBaseUrl}/admin/locations/drafts`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      slug: locationSlug,
      name: "Phase 1 Slice Location",
      summary: "Unauthorized attempt",
      visibility: "PRIVATE"
    })
  });

  assert.equal(locationResponse.status, 401);

  const eventResponse = await fetch(`${apiBaseUrl}/admin/events/drafts`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      slug: eventSlug,
      name: "Phase 1 Slice Event",
      summary: "Unauthorized attempt",
      visibility: "PRIVATE"
    })
  });

  assert.equal(eventResponse.status, 401);
});

test("location and event draft saves validate required fields and reject incomplete payloads with 400", async () => {
  const editorCookie = await createSessionCookie(
    phase0FixtureConfig.editor.email,
    phase0FixtureConfig.editor.password
  );

  const missingNameResponse = await fetch(`${apiBaseUrl}/admin/locations/drafts`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorCookie
    },
    body: JSON.stringify({
      slug: locationSlug,
      summary: "Missing name field"
    })
  });

  assert.equal(missingNameResponse.status, 400);

  const missingSummaryResponse = await fetch(`${apiBaseUrl}/admin/events/drafts`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorCookie
    },
    body: JSON.stringify({
      slug: eventSlug,
      name: "Missing summary field"
    })
  });

  assert.equal(missingSummaryResponse.status, 400);
});
