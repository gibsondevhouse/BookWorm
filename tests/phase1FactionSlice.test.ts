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
  summary: string;
};

type PublicFactionResponse = {
  releaseSlug: string;
  factionSlug: string;
  summary: string;
  version: number;
};

const app = createApp();
const server = createServer(app);
const testFactionSlug = `test-faction-${Date.now()}`;
const initialReleaseSlug = `test-faction-release-initial-${Date.now()}`;
const nextReleaseSlug = `test-faction-release-next-${Date.now()}`;
const initialSummary = "Initial released faction summary for the Phase 1 slice test.";
const updatedSummary = "Updated faction summary that should remain hidden until activation.";

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
    body: JSON.stringify({
      email,
      password
    })
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

  await prismaClient.user.upsert({
    where: {
      email: phase0FixtureConfig.editor.email
    },
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

  const entity = await prismaClient.entity.upsert({
    where: {
      slug: testFactionSlug
    },
    update: {
      type: "FACTION"
    },
    create: {
      slug: testFactionSlug,
      type: "FACTION"
    }
  });

  const initialRevision = await prismaClient.entityRevision.upsert({
    where: {
      entityId_version: {
        entityId: entity.id,
        version: 1
      }
    },
    update: {
      createdById: author.id,
      name: "Phase 1 Slice Faction",
      summary: initialSummary,
      visibility: Visibility.PUBLIC,
      payload: {
        name: "Phase 1 Slice Faction",
        summary: initialSummary,
        visibility: Visibility.PUBLIC
      }
    },
    create: {
      entityId: entity.id,
      createdById: author.id,
      version: 1,
      name: "Phase 1 Slice Faction",
      summary: initialSummary,
      visibility: Visibility.PUBLIC,
      payload: {
        name: "Phase 1 Slice Faction",
        summary: initialSummary,
        visibility: Visibility.PUBLIC
      }
    }
  });

  const initialRelease = await prismaClient.release.upsert({
    where: {
      slug: initialReleaseSlug
    },
    update: {
      name: "Phase 1 Slice Initial Release",
      status: "ACTIVE",
      createdById: author.id,
      activatedAt: new Date()
    },
    create: {
      slug: initialReleaseSlug,
      name: "Phase 1 Slice Initial Release",
      status: "ACTIVE",
      createdById: author.id,
      activatedAt: new Date()
    }
  });

  await prismaClient.release.updateMany({
    where: {
      id: {
        not: initialRelease.id
      },
      status: "ACTIVE"
    },
    data: {
      status: "ARCHIVED"
    }
  });

  await prismaClient.releaseEntry.upsert({
    where: {
      releaseId_entityId: {
        releaseId: initialRelease.id,
        entityId: entity.id
      }
    },
    update: {
      revisionId: initialRevision.id
    },
    create: {
      releaseId: initialRelease.id,
      entityId: entity.id,
      revisionId: initialRevision.id
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

  await prismaClient.releaseEntry.deleteMany({
    where: {
      entity: {
        slug: testFactionSlug
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
        slug: testFactionSlug
      }
    }
  });

  await prismaClient.entity.deleteMany({
    where: {
      slug: testFactionSlug
    }
  });

  await prismaClient.$disconnect();
});

test("editor session can save faction drafts and public faction reads remain release-bound", async () => {
  const editorCookie = await createSessionCookie(
    phase0FixtureConfig.editor.email,
    phase0FixtureConfig.editor.password
  );

  const draft = await ensureOk<DraftResponse>(
    await fetch(`${apiBaseUrl}/admin/factions/drafts`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: editorCookie
      },
      body: JSON.stringify({
        slug: testFactionSlug,
        name: "Phase 1 Slice Faction",
        summary: updatedSummary,
        visibility: "PUBLIC"
      })
    })
  );

  assert.equal(draft.summary, updatedSummary);
  assert.ok(draft.version >= 2);

  const publicBeforeRelease = await ensureOk<PublicFactionResponse>(
    await fetch(`${apiBaseUrl}/factions/${testFactionSlug}`)
  );

  assert.equal(publicBeforeRelease.summary, initialSummary);

  const authorCookie = await createSessionCookie(
    phase0FixtureConfig.authorAdmin.email,
    phase0FixtureConfig.authorAdmin.password
  );

  await ensureOk(
    await fetch(`${apiBaseUrl}/admin/releases`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: authorCookie
      },
      body: JSON.stringify({
        slug: nextReleaseSlug,
        name: "Phase 1 Slice Next Release"
      })
    })
  );

  await ensureOk(
    await fetch(`${apiBaseUrl}/admin/releases/${nextReleaseSlug}/entries`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: authorCookie
      },
      body: JSON.stringify({
        factionSlug: testFactionSlug,
        revisionId: draft.revisionId
      })
    })
  );

  await ensureOk(
    await fetch(`${apiBaseUrl}/admin/releases/${nextReleaseSlug}/activate`, {
      method: "POST",
      headers: {
        cookie: authorCookie
      }
    })
  );

  const publicAfterRelease = await ensureOk<PublicFactionResponse>(
    await fetch(`${apiBaseUrl}/factions/${testFactionSlug}`)
  );

  assert.equal(publicAfterRelease.summary, updatedSummary);
});