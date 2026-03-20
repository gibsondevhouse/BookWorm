import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";

import { createApp } from "../apps/api/src/app/createApp.js";
import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";

type DiffResponse = {
  source: "cache" | "computed";
  diff: {
    kind: "ENTITY" | "MANUSCRIPT";
    fromRevision: {
      revisionId: string;
      targetId: string;
      targetSlug: string;
      targetType: string;
      version: number;
    };
    toRevision: {
      revisionId: string;
      targetId: string;
      targetSlug: string;
      targetType: string;
      version: number;
    };
    identities: {
      fromContentIdentity: string;
      toContentIdentity: string;
      pairContentIdentity: string;
    };
    changes: {
      addedFields: Array<{ path: string; value: unknown }>;
      removedFields: Array<{ path: string; value: unknown }>;
      modifiedFields: Array<{ path: string; before: unknown; after: unknown }>;
      relationshipChanges: Array<{
        key: string;
        changeType: "ADDED" | "REMOVED" | "MODIFIED";
        before?: unknown;
        after?: unknown;
      }>;
    };
  };
};

const timestamp = Date.now();
const app = createApp();
const server = createServer(app);

const users = {
  admin: {
    email: `phase3-stage04-part01-admin-${timestamp}@example.com`,
    password: "Phase3Stage04Part01Admin!234",
    role: Role.AUTHOR_ADMIN,
    displayName: "Phase3 Stage04 Part01 Admin"
  },
  editor: {
    email: `phase3-stage04-part01-editor-${timestamp}@example.com`,
    password: "Phase3Stage04Part01Editor!234",
    role: Role.EDITOR,
    displayName: "Phase3 Stage04 Part01 Editor"
  }
} as const;

const entitySlug = `phase3-stage04-part01-entity-${timestamp}`;
const chapterSlug = `phase3-stage04-part01-chapter-${timestamp}`;

let apiBaseUrl = "";
let editorCookie = "";

let entityId = "";
let entityRevisionOneId = "";
let entityRevisionTwoId = "";

let manuscriptId = "";
let manuscriptRevisionOneId = "";
let manuscriptRevisionTwoId = "";

const ensureOk = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json() as Promise<T>;
};

const createSession = async (email: string, password: string): Promise<string> => {
  const response = await fetch(`${apiBaseUrl}/auth/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error(`Session creation failed for ${email}: ${response.status} ${await response.text()}`);
  }

  const setCookie = response.headers.get("set-cookie");

  if (!setCookie) {
    throw new Error(`Missing session cookie for ${email}`);
  }

  return setCookie.split(";")[0] ?? "";
};

const computeDiff = async (input: {
  kind: "ENTITY" | "MANUSCRIPT";
  fromRevisionId: string;
  toRevisionId: string;
  cookie?: string;
}): Promise<Response> => {
  return fetch(`${apiBaseUrl}/admin/revision-diffs/compute`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(input.cookie === undefined ? {} : { cookie: input.cookie })
    },
    body: JSON.stringify({
      kind: input.kind,
      fromRevisionId: input.fromRevisionId,
      toRevisionId: input.toRevisionId
    })
  });
};

before(async () => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Unable to resolve test server address");
  }

  apiBaseUrl = `http://127.0.0.1:${address.port}`;

  for (const user of Object.values(users)) {
    const passwordHash = await passwordHasher.hashPassword(user.password);

    await prismaClient.user.upsert({
      where: { email: user.email },
      update: {
        displayName: user.displayName,
        passwordHash,
        role: user.role
      },
      create: {
        email: user.email,
        displayName: user.displayName,
        passwordHash,
        role: user.role
      }
    });
  }

  editorCookie = await createSession(users.editor.email, users.editor.password);

  const entity = await prismaClient.entity.create({
    data: {
      slug: entitySlug,
      type: "CHARACTER"
    },
    select: { id: true }
  });

  entityId = entity.id;

  const [entityRevisionOne, entityRevisionTwo] = await Promise.all([
    prismaClient.entityRevision.create({
      data: {
        entity: { connect: { id: entityId } },
        createdBy: { connect: { email: users.editor.email } },
        version: 1,
        name: "Entity v1",
        summary: "Entity baseline summary",
        visibility: Visibility.PRIVATE,
        payload: {
          metadata: { spoilerTier: "NONE", tags: ["beta", "alpha"] },
          requiredDependencies: [
            { kind: "RELATIONSHIP", sourceEntitySlug: "alice", targetEntitySlug: "bob", relationType: "ALLY" }
          ],
          legacyNote: "legacy"
        }
      },
      select: { id: true }
    }),
    prismaClient.entityRevision.create({
      data: {
        entity: { connect: { id: entityId } },
        createdBy: { connect: { email: users.editor.email } },
        version: 2,
        name: "Entity v2",
        summary: "Entity baseline summary",
        visibility: Visibility.PRIVATE,
        payload: {
          metadata: { spoilerTier: "MINOR", tags: ["alpha", "gamma"] },
          requiredDependencies: [
            { kind: "RELATIONSHIP", sourceEntitySlug: "alice", targetEntitySlug: "claire", relationType: "ALLY" }
          ],
          futureNote: "future"
        }
      },
      select: { id: true }
    })
  ]);

  entityRevisionOneId = entityRevisionOne.id;
  entityRevisionTwoId = entityRevisionTwo.id;

  const manuscript = await prismaClient.manuscript.create({
    data: {
      slug: chapterSlug,
      type: "CHAPTER"
    },
    select: { id: true }
  });

  manuscriptId = manuscript.id;

  const [manuscriptRevisionOne, manuscriptRevisionTwo] = await Promise.all([
    prismaClient.manuscriptRevision.create({
      data: {
        manuscript: { connect: { id: manuscriptId } },
        createdBy: { connect: { email: users.editor.email } },
        version: 1,
        title: "Chapter v1",
        summary: "Chapter summary",
        visibility: Visibility.PRIVATE,
        payload: {
          body: "old body",
          notes: { intro: true },
          archivedTag: "old"
        }
      },
      select: { id: true }
    }),
    prismaClient.manuscriptRevision.create({
      data: {
        manuscript: { connect: { id: manuscriptId } },
        createdBy: { connect: { email: users.editor.email } },
        version: 2,
        title: "Chapter v2",
        summary: "Chapter summary",
        visibility: Visibility.PUBLIC,
        payload: {
          body: "new body",
          notes: { intro: true },
          releaseTag: "new"
        }
      },
      select: { id: true }
    })
  ]);

  manuscriptRevisionOneId = manuscriptRevisionOne.id;
  manuscriptRevisionTwoId = manuscriptRevisionTwo.id;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  await prismaClient.revisionDiff.deleteMany({
    where: {
      OR: [
        { fromRevisionId: entityRevisionOneId },
        { toRevisionId: entityRevisionTwoId },
        { fromRevisionId: manuscriptRevisionOneId },
        { toRevisionId: manuscriptRevisionTwoId }
      ]
    }
  });
  await prismaClient.entityRevision.deleteMany({ where: { entityId } });
  await prismaClient.entity.deleteMany({ where: { id: entityId } });
  await prismaClient.manuscriptRevision.deleteMany({ where: { manuscriptId } });
  await prismaClient.manuscript.deleteMany({ where: { id: manuscriptId } });
  await prismaClient.session.deleteMany({ where: { user: { email: { in: [users.admin.email, users.editor.email] } } } });
  await prismaClient.user.deleteMany({ where: { email: { in: [users.admin.email, users.editor.email] } } });

  await prismaClient.$disconnect();
});

test("AC-01 compute diff between two entity revisions", async () => {
  const response = await computeDiff({
    kind: "ENTITY",
    fromRevisionId: entityRevisionOneId,
    toRevisionId: entityRevisionTwoId,
    cookie: editorCookie
  });
  const result = await ensureOk<DiffResponse>(response);

  assert.equal(result.source, "computed");
  assert.equal(result.diff.kind, "ENTITY");
  assert.equal(result.diff.fromRevision.revisionId, entityRevisionOneId);
  assert.equal(result.diff.toRevision.revisionId, entityRevisionTwoId);
});

test("AC-02 compute diff between two manuscript revisions", async () => {
  const response = await computeDiff({
    kind: "MANUSCRIPT",
    fromRevisionId: manuscriptRevisionOneId,
    toRevisionId: manuscriptRevisionTwoId,
    cookie: editorCookie
  });
  const result = await ensureOk<DiffResponse>(response);

  assert.equal(result.diff.kind, "MANUSCRIPT");
  assert.equal(result.diff.changes.relationshipChanges.length, 0);
});

test("AC-03 classify added removed and modified fields", async () => {
  const response = await computeDiff({
    kind: "ENTITY",
    fromRevisionId: entityRevisionOneId,
    toRevisionId: entityRevisionTwoId,
    cookie: editorCookie
  });
  const result = await ensureOk<DiffResponse>(response);

  assert.ok(result.diff.changes.addedFields.some((item) => item.path === "payload.futureNote"));
  assert.ok(result.diff.changes.removedFields.some((item) => item.path === "payload.legacyNote"));
  assert.ok(result.diff.changes.modifiedFields.some((item) => item.path === "name"));
  assert.ok(result.diff.changes.modifiedFields.some((item) => item.path === "payload.metadata.spoilerTier"));
  assert.ok(result.diff.changes.relationshipChanges.some((item) => item.changeType === "REMOVED"));
  assert.ok(result.diff.changes.relationshipChanges.some((item) => item.changeType === "ADDED"));
});

test("AC-04 deterministic ordering of diff records", async () => {
  const response = await computeDiff({
    kind: "ENTITY",
    fromRevisionId: entityRevisionOneId,
    toRevisionId: entityRevisionTwoId,
    cookie: editorCookie
  });
  const result = await ensureOk<DiffResponse>(response);

  const addedPaths = result.diff.changes.addedFields.map((item) => item.path);
  const removedPaths = result.diff.changes.removedFields.map((item) => item.path);
  const modifiedPaths = result.diff.changes.modifiedFields.map((item) => item.path);
  const relationshipKeys = result.diff.changes.relationshipChanges.map((item) => item.key);

  assert.deepEqual(addedPaths, [...addedPaths].sort((left, right) => left.localeCompare(right)));
  assert.deepEqual(removedPaths, [...removedPaths].sort((left, right) => left.localeCompare(right)));
  assert.deepEqual(modifiedPaths, [...modifiedPaths].sort((left, right) => left.localeCompare(right)));
  assert.deepEqual(relationshipKeys, [...relationshipKeys].sort((left, right) => left.localeCompare(right)));
});

test("AC-05 cached retrieval returns same diff", async () => {
  const computeResponse = await computeDiff({
    kind: "MANUSCRIPT",
    fromRevisionId: manuscriptRevisionOneId,
    toRevisionId: manuscriptRevisionTwoId,
    cookie: editorCookie
  });
  const computed = await ensureOk<DiffResponse>(computeResponse);

  const cacheResponse = await fetch(
    `${apiBaseUrl}/admin/revision-diffs?kind=MANUSCRIPT&fromRevisionId=${manuscriptRevisionOneId}&toRevisionId=${manuscriptRevisionTwoId}`,
    { headers: { cookie: editorCookie } }
  );
  const cached = await ensureOk<DiffResponse>(cacheResponse);

  assert.equal(cached.source, "cache");
  assert.deepEqual(cached.diff, computed.diff);
});

test("AC-06 invalid revision ids return 404", async () => {
  const response = await computeDiff({
    kind: "ENTITY",
    fromRevisionId: "missing-revision-id",
    toRevisionId: entityRevisionTwoId,
    cookie: editorCookie
  });

  assert.equal(response.status, 404);
});

test("AC-07 unauthorized route access is blocked", async () => {
  const response = await computeDiff({
    kind: "ENTITY",
    fromRevisionId: entityRevisionOneId,
    toRevisionId: entityRevisionTwoId
  });

  assert.equal(response.status, 401);
});

test("AC-08 source revisions remain unchanged after diff operations", async () => {
  const beforeEntityOne = await prismaClient.entityRevision.findUnique({
    where: { id: entityRevisionOneId },
    select: { name: true, summary: true, visibility: true, payload: true, version: true }
  });
  const beforeManuscriptTwo = await prismaClient.manuscriptRevision.findUnique({
    where: { id: manuscriptRevisionTwoId },
    select: { title: true, summary: true, visibility: true, payload: true, version: true }
  });

  await ensureOk<DiffResponse>(
    await computeDiff({
      kind: "ENTITY",
      fromRevisionId: entityRevisionOneId,
      toRevisionId: entityRevisionTwoId,
      cookie: editorCookie
    })
  );
  await ensureOk<DiffResponse>(
    await computeDiff({
      kind: "MANUSCRIPT",
      fromRevisionId: manuscriptRevisionOneId,
      toRevisionId: manuscriptRevisionTwoId,
      cookie: editorCookie
    })
  );

  const afterEntityOne = await prismaClient.entityRevision.findUnique({
    where: { id: entityRevisionOneId },
    select: { name: true, summary: true, visibility: true, payload: true, version: true }
  });
  const afterManuscriptTwo = await prismaClient.manuscriptRevision.findUnique({
    where: { id: manuscriptRevisionTwoId },
    select: { title: true, summary: true, visibility: true, payload: true, version: true }
  });

  assert.deepEqual(afterEntityOne, beforeEntityOne);
  assert.deepEqual(afterManuscriptTwo, beforeManuscriptTwo);
});
