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

type PublicCharacterResponse = {
  releaseSlug: string;
  characterSlug: string;
  summary: string;
  version: number;
};

const app = createApp();
const server = createServer(app);
const testCharacterSlug = `test-character-${Date.now()}`;
const initialReleaseSlug = `test-release-initial-${Date.now()}`;
const nextReleaseSlug = `test-release-next-${Date.now()}`;
const initialSummary = "Initial released summary for the slice test.";
const updatedSummary = "Updated summary that should remain hidden until activation.";

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
      slug: testCharacterSlug
    },
    update: {
      type: "CHARACTER"
    },
    create: {
      slug: testCharacterSlug,
      type: "CHARACTER"
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
      name: "Slice Test Character",
      summary: initialSummary,
      visibility: Visibility.PUBLIC,
      payload: {
        name: "Slice Test Character",
        summary: initialSummary,
        visibility: Visibility.PUBLIC
      }
    },
    create: {
      entityId: entity.id,
      createdById: author.id,
      version: 1,
      name: "Slice Test Character",
      summary: initialSummary,
      visibility: Visibility.PUBLIC,
      payload: {
        name: "Slice Test Character",
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
      name: "Slice Test Initial Release",
      status: "ACTIVE",
      createdById: author.id,
      activatedAt: new Date()
    },
    create: {
      slug: initialReleaseSlug,
      name: "Slice Test Initial Release",
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
        slug: testCharacterSlug
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
        slug: testCharacterSlug
      }
    }
  });

  await prismaClient.entity.deleteMany({
    where: {
      slug: testCharacterSlug
    }
  });

  await prismaClient.$disconnect();
});

test("admin character draft route requires a valid session", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/characters/drafts`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      slug: testCharacterSlug,
      name: "Slice Test Character",
      summary: updatedSummary,
      visibility: "PUBLIC"
    })
  });

  assert.equal(response.status, 401);
});

test("editor session can save drafts but cannot manage releases", async () => {
  const editorCookie = await createSessionCookie(
    phase0FixtureConfig.editor.email,
    phase0FixtureConfig.editor.password
  );

  const draft = await ensureOk<DraftResponse>(
    await fetch(`${apiBaseUrl}/admin/characters/drafts`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: editorCookie
      },
      body: JSON.stringify({
        slug: testCharacterSlug,
        name: "Slice Test Character",
        summary: updatedSummary,
        visibility: "PUBLIC"
      })
    })
  );

  assert.equal(draft.summary, updatedSummary);
  assert.ok(draft.version >= 2);

  const releaseResponse = await fetch(`${apiBaseUrl}/admin/releases`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorCookie
    },
    body: JSON.stringify({
      slug: nextReleaseSlug,
      name: "Slice Test Next Release"
    })
  });

  assert.equal(releaseResponse.status, 403);
});

test("public reads remain release-bound until an author-admin activates a new release", async () => {
  const authorCookie = await createSessionCookie(
    phase0FixtureConfig.authorAdmin.email,
    phase0FixtureConfig.authorAdmin.password
  );

  const publicBeforeDraft = await ensureOk<PublicCharacterResponse>(
    await fetch(`${apiBaseUrl}/characters/${testCharacterSlug}`)
  );

  assert.equal(publicBeforeDraft.summary, initialSummary);

  const draft = await ensureOk<DraftResponse>(
    await fetch(`${apiBaseUrl}/admin/characters/drafts`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: authorCookie
      },
      body: JSON.stringify({
        slug: testCharacterSlug,
        name: "Slice Test Character",
        summary: updatedSummary,
        visibility: "PUBLIC"
      })
    })
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
        name: "Slice Test Next Release"
      })
    })
  );

  const publicBeforeActivation = await ensureOk<PublicCharacterResponse>(
    await fetch(`${apiBaseUrl}/characters/${testCharacterSlug}`)
  );

  assert.equal(publicBeforeActivation.summary, initialSummary);

  await ensureOk(
    await fetch(`${apiBaseUrl}/admin/releases/${nextReleaseSlug}/entries`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: authorCookie
      },
      body: JSON.stringify({
        characterSlug: testCharacterSlug,
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

  const publicAfterActivation = await ensureOk<PublicCharacterResponse>(
    await fetch(`${apiBaseUrl}/characters/${testCharacterSlug}`)
  );

  assert.equal(publicAfterActivation.summary, updatedSummary);
});