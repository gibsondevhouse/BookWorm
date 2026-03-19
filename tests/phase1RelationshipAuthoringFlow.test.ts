import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";

import { createApp } from "../apps/api/src/app/createApp.js";
import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { phase0FixtureConfig } from "../scripts/phase0FixtureConfig.js";

type RelationshipRevisionResponse = {
  relationshipId: string;
  relationshipRevisionId: string;
  sourceEntitySlug: string;
  targetEntitySlug: string;
  relationType: string;
  version: number;
  state: string;
  visibility: string;
};

type AdminRelationshipDetailResponse = {
  relationshipId: string;
  sourceEntitySlug: string;
  targetEntitySlug: string;
  relationType: string;
  latestRevision: {
    revisionId: string;
    version: number;
    state: string;
    visibility: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    createdBy: {
      userId: string;
      email: string;
      role: string;
    };
  };
};

type AdminRelationshipHistoryResponse = {
  sourceEntitySlug: string;
  targetEntitySlug: string;
  relationType: string;
  revisions: Array<{
    revisionId: string;
    version: number;
    state: string;
    visibility: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    createdBy: {
      userId: string;
      email: string;
      role: string;
    };
  }>;
};

const app = createApp();
const server = createServer(app);
const timestamp = Date.now();
const sourceSlug = `authoring-source-${timestamp}`;
const targetSlug = `authoring-target-${timestamp}`;
const relationType = "ALLIED_WITH";

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
    headers: { "content-type": "application/json" },
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

  await prismaClient.entity.createMany({
    data: [
      { slug: sourceSlug, type: "CHARACTER" },
      { slug: targetSlug, type: "FACTION" }
    ]
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

  await prismaClient.relationshipRevision.deleteMany({
    where: {
      relationship: {
        sourceEntity: { slug: sourceSlug },
        targetEntity: { slug: targetSlug }
      }
    }
  });

  await prismaClient.relationship.deleteMany({
    where: {
      sourceEntity: { slug: sourceSlug },
      targetEntity: { slug: targetSlug }
    }
  });

  await prismaClient.entity.deleteMany({
    where: {
      slug: { in: [sourceSlug, targetSlug] }
    }
  });

  await prismaClient.$disconnect();
});

test("editor can create a CREATE relationship revision through the admin path", async () => {
  const editorCookie = await createSessionCookie(
    phase0FixtureConfig.editor.email,
    phase0FixtureConfig.editor.password
  );

  const revision = await ensureOk<RelationshipRevisionResponse>(
    await fetch(`${apiBaseUrl}/admin/relationships/revisions`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: editorCookie },
      body: JSON.stringify({
        sourceEntitySlug: sourceSlug,
        targetEntitySlug: targetSlug,
        relationType,
        visibility: "PRIVATE",
        state: "CREATE",
        metadata: { note: "Initial canon link" }
      })
    })
  );

  assert.equal(revision.sourceEntitySlug, sourceSlug);
  assert.equal(revision.targetEntitySlug, targetSlug);
  assert.equal(revision.relationType, relationType);
  assert.equal(revision.state, "CREATE");
  assert.equal(revision.visibility, Visibility.PRIVATE);
  assert.equal(revision.version, 1);
  assert.ok(revision.relationshipRevisionId, "must return a relationshipRevisionId");
  assert.ok(revision.relationshipId, "must return a relationshipId");
});

test("author-admin can create an UPDATE revision for an existing relationship", async () => {
  const authorCookie = await createSessionCookie(
    phase0FixtureConfig.authorAdmin.email,
    phase0FixtureConfig.authorAdmin.password
  );

  const revision = await ensureOk<RelationshipRevisionResponse>(
    await fetch(`${apiBaseUrl}/admin/relationships/revisions`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: authorCookie },
      body: JSON.stringify({
        sourceEntitySlug: sourceSlug,
        targetEntitySlug: targetSlug,
        relationType,
        visibility: "PUBLIC",
        state: "UPDATE",
        metadata: { note: "Revised canon link" }
      })
    })
  );

  assert.equal(revision.state, "UPDATE");
  assert.equal(revision.version, 2);
  assert.equal(revision.visibility, Visibility.PUBLIC);
});

test("author-admin can create a DELETE revision to mark a relationship removed", async () => {
  const authorCookie = await createSessionCookie(
    phase0FixtureConfig.authorAdmin.email,
    phase0FixtureConfig.authorAdmin.password
  );

  const revision = await ensureOk<RelationshipRevisionResponse>(
    await fetch(`${apiBaseUrl}/admin/relationships/revisions`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: authorCookie },
      body: JSON.stringify({
        sourceEntitySlug: sourceSlug,
        targetEntitySlug: targetSlug,
        relationType,
        visibility: "PRIVATE",
        state: "DELETE"
      })
    })
  );

  assert.equal(revision.state, "DELETE");
  assert.equal(revision.version, 3);
});

test("admin GET endpoint returns the latest relationship revision", async () => {
  const editorCookie = await createSessionCookie(
    phase0FixtureConfig.editor.email,
    phase0FixtureConfig.editor.password
  );

  const detail = await ensureOk<AdminRelationshipDetailResponse>(
    await fetch(
      `${apiBaseUrl}/admin/relationships/${sourceSlug}/${relationType}/${targetSlug}`,
      { headers: { cookie: editorCookie } }
    )
  );

  assert.equal(detail.sourceEntitySlug, sourceSlug);
  assert.equal(detail.targetEntitySlug, targetSlug);
  assert.equal(detail.relationType, relationType);
  // state should be DELETE (version 3 from the prior test)
  assert.equal(detail.latestRevision.state, "DELETE");
  assert.equal(detail.latestRevision.version, 3);
  assert.ok(detail.latestRevision.revisionId);
  assert.ok(detail.latestRevision.createdBy.email);
});

test("admin GET history endpoint returns all revisions in descending version order", async () => {
  const editorCookie = await createSessionCookie(
    phase0FixtureConfig.editor.email,
    phase0FixtureConfig.editor.password
  );

  const history = await ensureOk<AdminRelationshipHistoryResponse>(
    await fetch(
      `${apiBaseUrl}/admin/relationships/${sourceSlug}/${relationType}/${targetSlug}/history`,
      { headers: { cookie: editorCookie } }
    )
  );

  assert.equal(history.sourceEntitySlug, sourceSlug);
  assert.equal(history.targetEntitySlug, targetSlug);
  assert.equal(history.relationType, relationType);
  assert.equal(history.revisions.length, 3);
  assert.equal(history.revisions[0]?.state, "DELETE");
  assert.equal(history.revisions[1]?.state, "UPDATE");
  assert.equal(history.revisions[2]?.state, "CREATE");
});

test("relationship revisions are distinguishable by state across CREATE, UPDATE, and DELETE", async () => {
  const editorCookie = await createSessionCookie(
    phase0FixtureConfig.editor.email,
    phase0FixtureConfig.editor.password
  );

  const history = await ensureOk<AdminRelationshipHistoryResponse>(
    await fetch(
      `${apiBaseUrl}/admin/relationships/${sourceSlug}/${relationType}/${targetSlug}/history`,
      { headers: { cookie: editorCookie } }
    )
  );

  const states = history.revisions.map((r) => r.state);
  assert.ok(states.includes("CREATE"), "history must contain a CREATE revision");
  assert.ok(states.includes("UPDATE"), "history must contain an UPDATE revision");
  assert.ok(states.includes("DELETE"), "history must contain a DELETE revision");

  const revisionIds = history.revisions.map((r) => r.revisionId);
  const uniqueIds = new Set(revisionIds);
  assert.equal(uniqueIds.size, revisionIds.length, "every revision must have a distinct id");
});

test("invalid state transition is rejected with 403", async () => {
  const authorCookie = await createSessionCookie(
    phase0FixtureConfig.authorAdmin.email,
    phase0FixtureConfig.authorAdmin.password
  );

  // The relationship is already in DELETE state — attempting CREATE must fail
  const response = await fetch(`${apiBaseUrl}/admin/relationships/revisions`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: authorCookie },
    body: JSON.stringify({
      sourceEntitySlug: sourceSlug,
      targetEntitySlug: targetSlug,
      relationType,
      visibility: "PRIVATE",
      state: "CREATE"
    })
  });

  assert.equal(response.status, 403);
});

test("unauthenticated requests to relationship admin endpoints are rejected with 401", async () => {
  const postResponse = await fetch(`${apiBaseUrl}/admin/relationships/revisions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sourceEntitySlug: sourceSlug,
      targetEntitySlug: targetSlug,
      relationType,
      visibility: "PRIVATE",
      state: "CREATE"
    })
  });

  assert.equal(postResponse.status, 401);

  const getResponse = await fetch(
    `${apiBaseUrl}/admin/relationships/${sourceSlug}/${relationType}/${targetSlug}`
  );

  assert.equal(getResponse.status, 401);
});

test("relationship revision save rejects incomplete payloads with 400", async () => {
  const editorCookie = await createSessionCookie(
    phase0FixtureConfig.editor.email,
    phase0FixtureConfig.editor.password
  );

  // Missing required state field
  const missingStateResponse = await fetch(`${apiBaseUrl}/admin/relationships/revisions`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: editorCookie },
    body: JSON.stringify({
      sourceEntitySlug: sourceSlug,
      targetEntitySlug: targetSlug,
      relationType,
      visibility: "PRIVATE"
    })
  });

  assert.equal(missingStateResponse.status, 400);

  // Missing required sourceEntitySlug
  const missingSourceResponse = await fetch(`${apiBaseUrl}/admin/relationships/revisions`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: editorCookie },
    body: JSON.stringify({
      targetEntitySlug: targetSlug,
      relationType,
      visibility: "PRIVATE",
      state: "CREATE"
    })
  });

  assert.equal(missingSourceResponse.status, 400);
});
