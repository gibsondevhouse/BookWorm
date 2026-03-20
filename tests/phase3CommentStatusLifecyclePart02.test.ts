import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";

import { createApp } from "../apps/api/src/app/createApp.js";
import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";

type CommentStatus = "ACTIVE" | "RESOLVED" | "ARCHIVED";

type CommentResponse = {
  id: string;
  body: string;
  status: CommentStatus;
  replies: CommentResponse[];
};

type ListCommentsResponse = {
  threads: CommentResponse[];
};

const timestamp = Date.now();
const app = createApp();
const server = createServer(app);

const users = {
  admin: {
    email: `phase3-part02-admin-${timestamp}@example.com`,
    password: "Phase3Part02Admin!234",
    role: Role.AUTHOR_ADMIN,
    displayName: "Phase3 Part02 Admin"
  },
  editor: {
    email: `phase3-part02-editor-${timestamp}@example.com`,
    password: "Phase3Part02Editor!234",
    role: Role.EDITOR,
    displayName: "Phase3 Part02 Editor"
  }
} as const;

const entitySlug = `phase3-part02-comment-entity-${timestamp}`;

let apiBaseUrl = "";
let adminCookie = "";
let editorCookie = "";
let entityId = "";

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

const createEntityComment = async (body: string, cookie: string): Promise<CommentResponse> => {
  const response = await fetch(`${apiBaseUrl}/entities/CHARACTER/${entitySlug}/comments`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie
    },
    body: JSON.stringify({ body })
  });

  return ensureOk<CommentResponse>(response);
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

  adminCookie = await createSession(users.admin.email, users.admin.password);
  editorCookie = await createSession(users.editor.email, users.editor.password);

  const entity = await prismaClient.entity.create({
    data: {
      slug: entitySlug,
      type: "CHARACTER",
      revisions: {
        create: {
          createdBy: { connect: { email: users.admin.email } },
          version: 1,
          name: "Part 02 Lifecycle Target",
          summary: "Part 02 lifecycle target summary",
          visibility: Visibility.PRIVATE
        }
      }
    },
    select: { id: true }
  });

  entityId = entity.id;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  await prismaClient.comment.deleteMany({ where: { entityId } });
  await prismaClient.entityRevision.deleteMany({ where: { entityId } });
  await prismaClient.entity.deleteMany({ where: { id: entityId } });
  await prismaClient.session.deleteMany({ where: { user: { email: { in: [users.admin.email, users.editor.email] } } } });
  await prismaClient.user.deleteMany({ where: { email: { in: [users.admin.email, users.editor.email] } } });

  await prismaClient.$disconnect();
});

test("AC-01 default status ACTIVE on create", async () => {
  const comment = await createEntityComment("Lifecycle default status", editorCookie);

  assert.equal(comment.status, "ACTIVE");
});

test("AC-02 resolve ACTIVE comment succeeds for collaborator", async () => {
  const created = await createEntityComment("Resolve success", editorCookie);

  const resolveResponse = await fetch(`${apiBaseUrl}/comments/${created.id}/resolve`, {
    method: "POST",
    headers: {
      cookie: editorCookie
    }
  });

  const resolved = await ensureOk<CommentResponse>(resolveResponse);

  assert.equal(resolved.status, "RESOLVED");
});

test("AC-03 reopen RESOLVED comment succeeds for collaborator", async () => {
  const created = await createEntityComment("Reopen success", editorCookie);

  const resolveResponse = await fetch(`${apiBaseUrl}/comments/${created.id}/resolve`, {
    method: "POST",
    headers: {
      cookie: editorCookie
    }
  });
  await ensureOk<CommentResponse>(resolveResponse);

  const reopenResponse = await fetch(`${apiBaseUrl}/comments/${created.id}/reopen`, {
    method: "POST",
    headers: {
      cookie: editorCookie
    }
  });

  const reopened = await ensureOk<CommentResponse>(reopenResponse);

  assert.equal(reopened.status, "ACTIVE");
});

test("AC-04 archive ACTIVE comment succeeds for admin", async () => {
  const created = await createEntityComment("Archive by admin", editorCookie);

  const archiveResponse = await fetch(`${apiBaseUrl}/comments/${created.id}/archive`, {
    method: "POST",
    headers: {
      cookie: adminCookie
    }
  });

  const archived = await ensureOk<CommentResponse>(archiveResponse);

  assert.equal(archived.status, "ARCHIVED");
});

test("AC-05 non-admin archive is forbidden", async () => {
  const created = await createEntityComment("Archive forbidden", editorCookie);

  const archiveResponse = await fetch(`${apiBaseUrl}/comments/${created.id}/archive`, {
    method: "POST",
    headers: {
      cookie: editorCookie
    }
  });

  assert.equal(archiveResponse.status, 403);
});

test("AC-06 invalid transitions return 409", async () => {
  const created = await createEntityComment("Invalid transition", editorCookie);

  const reopenResponse = await fetch(`${apiBaseUrl}/comments/${created.id}/reopen`, {
    method: "POST",
    headers: {
      cookie: editorCookie
    }
  });

  assert.equal(reopenResponse.status, 409);

  const archiveResponse = await fetch(`${apiBaseUrl}/comments/${created.id}/archive`, {
    method: "POST",
    headers: {
      cookie: adminCookie
    }
  });
  await ensureOk<CommentResponse>(archiveResponse);

  const resolveArchivedResponse = await fetch(`${apiBaseUrl}/comments/${created.id}/resolve`, {
    method: "POST",
    headers: {
      cookie: editorCookie
    }
  });

  assert.equal(resolveArchivedResponse.status, 409);
});

test("AC-07 archived comments are returned with status in retrieval", async () => {
  const created = await createEntityComment("Archive appears in list", editorCookie);

  const archiveResponse = await fetch(`${apiBaseUrl}/comments/${created.id}/archive`, {
    method: "POST",
    headers: {
      cookie: adminCookie
    }
  });
  await ensureOk<CommentResponse>(archiveResponse);

  const listResponse = await fetch(`${apiBaseUrl}/entities/CHARACTER/${entitySlug}/comments?page=1&limit=100`, {
    headers: {
      cookie: editorCookie
    }
  });

  const list = await ensureOk<ListCommentsResponse>(listResponse);
  const archivedThread = list.threads.find((thread) => thread.id === created.id);

  assert.ok(archivedThread);
  assert.equal(archivedThread?.status, "ARCHIVED");
});

test("AC-08 lifecycle endpoints return 404 for missing comment", async () => {
  const missingId = `missing-lifecycle-comment-${timestamp}`;

  const resolveResponse = await fetch(`${apiBaseUrl}/comments/${missingId}/resolve`, {
    method: "POST",
    headers: {
      cookie: editorCookie
    }
  });

  const reopenResponse = await fetch(`${apiBaseUrl}/comments/${missingId}/reopen`, {
    method: "POST",
    headers: {
      cookie: editorCookie
    }
  });

  const archiveResponse = await fetch(`${apiBaseUrl}/comments/${missingId}/archive`, {
    method: "POST",
    headers: {
      cookie: adminCookie
    }
  });

  assert.equal(resolveResponse.status, 404);
  assert.equal(reopenResponse.status, 404);
  assert.equal(archiveResponse.status, 404);
});
