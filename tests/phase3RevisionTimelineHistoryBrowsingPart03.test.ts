import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";

import { createApp } from "../apps/api/src/app/createApp.js";
import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";

type TimelineResponse = {
  revisions: Array<{
    revisionId?: string;
    manuscriptRevisionId?: string;
    version: number;
    createdAt: string;
    modifiedAt: string;
    modifiedBy: {
      userId: string;
      email: string;
      displayName: string;
      role: Role;
    };
    appliedFromProposalId: string | null;
    appliedFromProposal: {
      id: string;
      title: string;
      summary: string;
      appliedAt: string | null;
      appliedBy: {
        userId: string;
        email: string;
        displayName: string;
        role: Role;
      } | null;
    } | null;
  }>;
};

type CompareResponse = {
  source: "computed";
  diff: {
    kind: "ENTITY" | "MANUSCRIPT";
    fromRevision: {
      revisionId: string;
      version: number;
    };
    toRevision: {
      revisionId: string;
      version: number;
    };
    changes: {
      addedFields: Array<{ path: string; value: unknown }>;
      removedFields: Array<{ path: string; value: unknown }>;
      modifiedFields: Array<{ path: string; before: unknown; after: unknown }>;
      relationshipChanges: Array<{
        key: string;
        changeType: "ADDED" | "REMOVED" | "MODIFIED";
      }>;
    };
  };
};

const timestamp = Date.now();
const app = createApp();
const server = createServer(app);

const users = {
  admin: {
    email: `phase3-stage04-part03-admin-${timestamp}@example.com`,
    password: "Phase3Stage04Part03Admin!234",
    role: Role.AUTHOR_ADMIN,
    displayName: "Phase3 Stage04 Part03 Admin"
  },
  editor: {
    email: `phase3-stage04-part03-editor-${timestamp}@example.com`,
    password: "Phase3Stage04Part03Editor!234",
    role: Role.EDITOR,
    displayName: "Phase3 Stage04 Part03 Editor"
  },
  otherEditor: {
    email: `phase3-stage04-part03-other-${timestamp}@example.com`,
    password: "Phase3Stage04Part03Other!234",
    role: Role.EDITOR,
    displayName: "Phase3 Stage04 Part03 Other"
  }
} as const;

const entitySlug = `phase3-stage04-part03-entity-${timestamp}`;
const manuscriptSlug = `phase3-stage04-part03-chapter-${timestamp}`;

const revisionDates = {
  entityOne: new Date("2026-01-10T10:00:00.000Z"),
  entityTwo: new Date("2026-02-12T11:00:00.000Z"),
  entityThree: new Date("2026-03-14T12:00:00.000Z"),
  manuscriptOne: new Date("2026-01-11T10:00:00.000Z"),
  manuscriptTwo: new Date("2026-03-15T12:00:00.000Z")
};

let apiBaseUrl = "";
let editorCookie = "";

let adminUserId = "";
let editorUserId = "";
let otherEditorUserId = "";

let entityId = "";
let manuscriptId = "";

let entityProposalId = "";
let manuscriptProposalId = "";

let entityRevisionOneId = "";
let entityRevisionTwoId = "";
let entityRevisionThreeId = "";
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

  const [adminUser, editorUser, otherEditorUser] = await Promise.all([
    prismaClient.user.findUniqueOrThrow({ where: { email: users.admin.email }, select: { id: true } }),
    prismaClient.user.findUniqueOrThrow({ where: { email: users.editor.email }, select: { id: true } }),
    prismaClient.user.findUniqueOrThrow({ where: { email: users.otherEditor.email }, select: { id: true } })
  ]);

  adminUserId = adminUser.id;
  editorUserId = editorUser.id;
  otherEditorUserId = otherEditorUser.id;

  editorCookie = await createSession(users.editor.email, users.editor.password);

  const entity = await prismaClient.entity.create({
    data: {
      slug: entitySlug,
      type: "CHARACTER"
    },
    select: { id: true }
  });
  entityId = entity.id;

  const manuscript = await prismaClient.manuscript.create({
    data: {
      slug: manuscriptSlug,
      type: "CHAPTER"
    },
    select: { id: true }
  });
  manuscriptId = manuscript.id;

  const [entityProposal, manuscriptProposal] = await Promise.all([
    prismaClient.proposal.create({
      data: {
        proposedById: editorUserId,
        decidedById: adminUserId,
        appliedById: adminUserId,
        entityId,
        changeType: "UPDATE",
        status: "ACCEPTED",
        workflowState: "APPLIED",
        title: "Timeline Entity Proposal",
        summary: "Entity proposal for revision linkage",
        payload: { notes: "entity" },
        appliedAt: new Date("2026-02-12T12:00:00.000Z")
      },
      select: { id: true }
    }),
    prismaClient.proposal.create({
      data: {
        proposedById: editorUserId,
        decidedById: adminUserId,
        appliedById: adminUserId,
        manuscriptId,
        changeType: "UPDATE",
        status: "ACCEPTED",
        workflowState: "APPLIED",
        title: "Timeline Manuscript Proposal",
        summary: "Manuscript proposal for revision linkage",
        payload: { notes: "manuscript" },
        appliedAt: new Date("2026-03-15T13:00:00.000Z")
      },
      select: { id: true }
    })
  ]);

  entityProposalId = entityProposal.id;
  manuscriptProposalId = manuscriptProposal.id;

  const [entityRevisionOne, entityRevisionTwo, entityRevisionThree] = await Promise.all([
    prismaClient.entityRevision.create({
      data: {
        entityId,
        createdById: editorUserId,
        version: 1,
        name: "Timeline Entity v1",
        summary: "Entity timeline baseline",
        visibility: Visibility.PRIVATE,
        payload: {
          metadata: { spoilerTier: "NONE" },
          biography: "Before"
        },
        createdAt: revisionDates.entityOne
      },
      select: { id: true }
    }),
    prismaClient.entityRevision.create({
      data: {
        entityId,
        createdById: otherEditorUserId,
        version: 2,
        name: "Timeline Entity v2",
        summary: "Entity timeline with proposal",
        visibility: Visibility.PRIVATE,
        payload: {
          metadata: { spoilerTier: "MINOR" },
          biography: "After proposal"
        },
        appliedFromProposalId: entityProposalId,
        createdAt: revisionDates.entityTwo
      },
      select: { id: true }
    }),
    prismaClient.entityRevision.create({
      data: {
        entityId,
        createdById: editorUserId,
        version: 3,
        name: "Timeline Entity v3",
        summary: "Entity timeline latest",
        visibility: Visibility.PUBLIC,
        payload: {
          metadata: { spoilerTier: "MAJOR" },
          biography: "Latest"
        },
        createdAt: revisionDates.entityThree
      },
      select: { id: true }
    })
  ]);

  entityRevisionOneId = entityRevisionOne.id;
  entityRevisionTwoId = entityRevisionTwo.id;
  entityRevisionThreeId = entityRevisionThree.id;

  const [chapterRevisionOne, chapterRevisionTwo] = await Promise.all([
    prismaClient.manuscriptRevision.create({
      data: {
        manuscriptId,
        createdById: editorUserId,
        version: 1,
        title: "Timeline Chapter v1",
        summary: "Chapter timeline baseline",
        visibility: Visibility.PRIVATE,
        payload: {
          body: "Old chapter body"
        },
        createdAt: revisionDates.manuscriptOne
      },
      select: { id: true }
    }),
    prismaClient.manuscriptRevision.create({
      data: {
        manuscriptId,
        createdById: otherEditorUserId,
        version: 2,
        title: "Timeline Chapter v2",
        summary: "Chapter timeline latest",
        visibility: Visibility.PUBLIC,
        payload: {
          body: "New chapter body"
        },
        appliedFromProposalId: manuscriptProposalId,
        createdAt: revisionDates.manuscriptTwo
      },
      select: { id: true }
    })
  ]);

  manuscriptRevisionOneId = chapterRevisionOne.id;
  manuscriptRevisionTwoId = chapterRevisionTwo.id;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  await prismaClient.revisionDiff.deleteMany({
    where: {
      OR: [{ fromRevisionId: entityRevisionOneId }, { toRevisionId: entityRevisionThreeId }]
    }
  });
  await prismaClient.entityRevision.deleteMany({ where: { entityId } });
  await prismaClient.manuscriptRevision.deleteMany({ where: { manuscriptId } });
  await prismaClient.proposal.deleteMany({ where: { id: { in: [entityProposalId, manuscriptProposalId] } } });
  await prismaClient.entity.deleteMany({ where: { id: entityId } });
  await prismaClient.manuscript.deleteMany({ where: { id: manuscriptId } });
  await prismaClient.session.deleteMany({ where: { user: { email: { in: [users.admin.email, users.editor.email, users.otherEditor.email] } } } });
  await prismaClient.user.deleteMany({ where: { email: { in: [users.admin.email, users.editor.email, users.otherEditor.email] } } });

  await prismaClient.$disconnect();
});

test("AC-01 entity revision timeline retrieval", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/revision-history/entities/CHARACTER/${entitySlug}/timeline`, {
    headers: { cookie: editorCookie }
  });
  const result = await ensureOk<TimelineResponse>(response);

  assert.equal(result.revisions.length, 3);
  assert.equal(result.revisions[0]?.revisionId, entityRevisionThreeId);
  assert.equal(result.revisions[1]?.appliedFromProposalId, entityProposalId);
  assert.equal(result.revisions[1]?.appliedFromProposal?.id, entityProposalId);
  assert.equal(typeof result.revisions[0]?.createdAt, "string");
  assert.equal(typeof result.revisions[0]?.modifiedAt, "string");
  assert.equal(result.revisions[0]?.modifiedBy.userId, editorUserId);
});

test("AC-02 manuscript revision timeline retrieval", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/revision-history/manuscripts/CHAPTER/${manuscriptSlug}/timeline`, {
    headers: { cookie: editorCookie }
  });
  const result = await ensureOk<TimelineResponse>(response);

  assert.equal(result.revisions.length, 2);
  assert.equal(result.revisions[0]?.manuscriptRevisionId, manuscriptRevisionTwoId);
  assert.equal(result.revisions[0]?.appliedFromProposalId, manuscriptProposalId);
  assert.equal(result.revisions[0]?.appliedFromProposal?.id, manuscriptProposalId);
});

test("AC-03 timeline ordered deterministically", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/revision-history/entities/CHARACTER/${entitySlug}/timeline`, {
    headers: { cookie: editorCookie }
  });
  const result = await ensureOk<TimelineResponse>(response);

  assert.deepEqual(
    result.revisions.map((revision) => revision.version),
    [3, 2, 1]
  );
});

test("AC-04 filter timeline by date range", async () => {
  const from = encodeURIComponent("2026-02-01T00:00:00.000Z");
  const to = encodeURIComponent("2026-02-28T23:59:59.000Z");
  const response = await fetch(
    `${apiBaseUrl}/admin/revision-history/entities/CHARACTER/${entitySlug}/timeline?from=${from}&to=${to}`,
    {
      headers: { cookie: editorCookie }
    }
  );
  const result = await ensureOk<TimelineResponse>(response);

  assert.equal(result.revisions.length, 1);
  assert.equal(result.revisions[0]?.revisionId, entityRevisionTwoId);
});

test("AC-05 filter timeline by proposal linkage", async () => {
  const proposalId = encodeURIComponent(entityProposalId);
  const response = await fetch(
    `${apiBaseUrl}/admin/revision-history/entities/CHARACTER/${entitySlug}/timeline?appliedFromProposalId=${proposalId}`,
    {
      headers: { cookie: editorCookie }
    }
  );
  const result = await ensureOk<TimelineResponse>(response);

  assert.equal(result.revisions.length, 1);
  assert.equal(result.revisions[0]?.revisionId, entityRevisionTwoId);
});

test("AC-06 compare two historical revisions returns diff payload", async () => {
  const response = await fetch(
    `${apiBaseUrl}/admin/revision-history/compare?kind=ENTITY&fromRevisionId=${entityRevisionOneId}&toRevisionId=${entityRevisionThreeId}`,
    {
      headers: { cookie: editorCookie }
    }
  );
  const result = await ensureOk<CompareResponse>(response);

  assert.equal(result.source, "computed");
  assert.equal(result.diff.kind, "ENTITY");
  assert.equal(result.diff.fromRevision.revisionId, entityRevisionOneId);
  assert.equal(result.diff.toRevision.revisionId, entityRevisionThreeId);
  assert.ok(result.diff.changes.modifiedFields.some((item) => item.path === "name"));
});

test("AC-07 unauthorized access blocked", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/revision-history/entities/CHARACTER/${entitySlug}/timeline`);

  assert.equal(response.status, 401);
});

test("AC-08 read-only guarantee for timeline and compare routes", async () => {
  const beforeCounts = await Promise.all([
    prismaClient.entityRevision.count({ where: { entityId } }),
    prismaClient.manuscriptRevision.count({ where: { manuscriptId } }),
    prismaClient.revisionDiff.count({
      where: {
        OR: [{ fromRevisionId: entityRevisionOneId }, { toRevisionId: entityRevisionThreeId }]
      }
    })
  ]);

  const timelineResponse = await fetch(`${apiBaseUrl}/admin/revision-history/entities/CHARACTER/${entitySlug}/timeline`, {
    headers: { cookie: editorCookie }
  });
  assert.equal(timelineResponse.status, 200);

  const compareResponse = await fetch(
    `${apiBaseUrl}/admin/revision-history/compare?kind=ENTITY&fromRevisionId=${entityRevisionOneId}&toRevisionId=${entityRevisionThreeId}`,
    {
      headers: { cookie: editorCookie }
    }
  );
  assert.equal(compareResponse.status, 200);

  const afterCounts = await Promise.all([
    prismaClient.entityRevision.count({ where: { entityId } }),
    prismaClient.manuscriptRevision.count({ where: { manuscriptId } }),
    prismaClient.revisionDiff.count({
      where: {
        OR: [{ fromRevisionId: entityRevisionOneId }, { toRevisionId: entityRevisionThreeId }]
      }
    })
  ]);

  assert.deepEqual(afterCounts, beforeCounts);
});

test("AC-09 filter timeline by modifier", async () => {
  const modifiedById = encodeURIComponent(otherEditorUserId);
  const response = await fetch(
    `${apiBaseUrl}/admin/revision-history/entities/CHARACTER/${entitySlug}/timeline?modifiedById=${modifiedById}`,
    {
      headers: { cookie: editorCookie }
    }
  );
  const result = await ensureOk<TimelineResponse>(response);

  assert.equal(result.revisions.length, 1);
  assert.equal(result.revisions[0]?.revisionId, entityRevisionTwoId);
  assert.equal(result.revisions[0]?.modifiedBy.userId, otherEditorUserId);
});