import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";

import { createApp } from "../apps/api/src/app/createApp.js";
import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";

type CommentTag = "SPELLING" | "FACTUAL" | "CONSISTENCY" | "CLARITY" | "TONE";
type CommentType = "GENERAL" | "QUESTION" | "SUGGESTION" | "CONCERN" | "RESOLVED";
type CommentSeverity = "INFO" | "MINOR" | "MAJOR";
type CommentStatus = "ACTIVE" | "RESOLVED" | "ARCHIVED";

type CommentResponse = {
  id: string;
  body: string;
  type: CommentType;
  severity: CommentSeverity;
  tags: CommentTag[];
  status: CommentStatus;
  parentCommentId: string | null;
  replies: CommentResponse[];
};

type CommentHistoryResponse = {
  order: "asc";
  history: Array<{
    id: string;
    commentId: string;
    version: number;
    editedById: string;
    editReason: string;
    createdAt: string;
    previous: {
      body: string;
      type: CommentType;
      severity: CommentSeverity;
      tags: CommentTag[];
      status: CommentStatus;
    };
    resulting: {
      body: string;
      type: CommentType;
      severity: CommentSeverity;
      tags: CommentTag[];
      status: CommentStatus;
    };
  }>;
};

type ListCommentsResponse = {
  threads: CommentResponse[];
};

const timestamp = Date.now();
const app = createApp();
const server = createServer(app);

const users = {
  admin: {
    email: `phase3-part03-admin-${timestamp}@example.com`,
    password: "Phase3Part03Admin!234",
    role: Role.AUTHOR_ADMIN,
    displayName: "Phase3 Part03 Admin"
  },
  editor: {
    email: `phase3-part03-editor-${timestamp}@example.com`,
    password: "Phase3Part03Editor!234",
    role: Role.EDITOR,
    displayName: "Phase3 Part03 Editor"
  }
} as const;

const entitySlug = `phase3-part03-comment-entity-${timestamp}`;

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

const createEntityComment = async (input: {
  body: string;
  cookie: string;
  type?: CommentType;
  severity?: CommentSeverity;
  tags?: CommentTag[];
}): Promise<CommentResponse> => {
  const response = await fetch(`${apiBaseUrl}/entities/CHARACTER/${entitySlug}/comments`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: input.cookie
    },
    body: JSON.stringify({
      body: input.body,
      ...(input.type === undefined ? {} : { type: input.type }),
      ...(input.severity === undefined ? {} : { severity: input.severity }),
      ...(input.tags === undefined ? {} : { tags: input.tags })
    })
  });

  return ensureOk<CommentResponse>(response);
};

const getCommentHistory = async (commentId: string, cookie: string): Promise<CommentHistoryResponse> => {
  const response = await fetch(`${apiBaseUrl}/comments/${commentId}/history`, {
    headers: { cookie }
  });

  return ensureOk<CommentHistoryResponse>(response);
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
          name: "Part 03 Comment Target",
          summary: "Part 03 comment target summary",
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

test("AC-01 create comment then edit body creates history entry", async () => {
  const created = await createEntityComment({ body: "Initial body", cookie: editorCookie });

  const editResponse = await fetch(`${apiBaseUrl}/comments/${created.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: editorCookie },
    body: JSON.stringify({ body: "Edited body", editReason: "Clarified the note" })
  });
  await ensureOk<CommentResponse>(editResponse);

  const history = await getCommentHistory(created.id, editorCookie);

  assert.equal(history.order, "asc");
  assert.equal(history.history.length, 1);
  assert.equal(history.history[0]?.version, 1);
  assert.equal(history.history[0]?.editReason, "Clarified the note");
  assert.equal(history.history[0]?.previous.body, "Initial body");
  assert.equal(history.history[0]?.resulting.body, "Edited body");
});

test("AC-02 metadata update creates history entry", async () => {
  const created = await createEntityComment({ body: "Metadata target", cookie: editorCookie });

  const editResponse = await fetch(`${apiBaseUrl}/comments/${created.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: editorCookie },
    body: JSON.stringify({ type: "QUESTION", severity: "MAJOR", tags: ["FACTUAL", "CLARITY"] })
  });
  await ensureOk<CommentResponse>(editResponse);

  const history = await getCommentHistory(created.id, editorCookie);
  const item = history.history[0];

  assert.ok(item);
  assert.equal(item?.editReason, "Comment metadata updated");
  assert.equal(item?.previous.type, "GENERAL");
  assert.equal(item?.resulting.type, "QUESTION");
  assert.equal(item?.previous.severity, "INFO");
  assert.equal(item?.resulting.severity, "MAJOR");
  assert.deepEqual(item?.previous.tags, []);
  assert.deepEqual(item?.resulting.tags, ["FACTUAL", "CLARITY"]);
});

test("AC-03 lifecycle status transition creates history entry", async () => {
  const created = await createEntityComment({ body: "Lifecycle target", cookie: editorCookie });

  const resolveResponse = await fetch(`${apiBaseUrl}/comments/${created.id}/resolve`, {
    method: "POST",
    headers: { cookie: editorCookie }
  });
  await ensureOk<CommentResponse>(resolveResponse);

  const history = await getCommentHistory(created.id, editorCookie);
  const item = history.history[0];

  assert.ok(item);
  assert.equal(item?.editReason, "Comment resolved");
  assert.equal(item?.previous.status, "ACTIVE");
  assert.equal(item?.resulting.status, "RESOLVED");
});

test("AC-04 history endpoint returns ascending ordered version records", async () => {
  const created = await createEntityComment({ body: "Ordered history", cookie: editorCookie });

  const firstEditResponse = await fetch(`${apiBaseUrl}/comments/${created.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: editorCookie },
    body: JSON.stringify({ body: "Ordered history v2" })
  });
  await ensureOk<CommentResponse>(firstEditResponse);

  const secondEditResponse = await fetch(`${apiBaseUrl}/comments/${created.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: editorCookie },
    body: JSON.stringify({ severity: "MINOR" })
  });
  await ensureOk<CommentResponse>(secondEditResponse);

  const history = await getCommentHistory(created.id, editorCookie);

  assert.deepEqual(
    history.history.map((item) => item.version),
    [1, 2]
  );
  assert.equal(history.history[0]?.resulting.body, "Ordered history v2");
  assert.equal(history.history[1]?.resulting.severity, "MINOR");
});

test("AC-05 fallback edit reasons are deterministic when omitted", async () => {
  const created = await createEntityComment({ body: "Fallback reason", cookie: editorCookie });

  const editResponse = await fetch(`${apiBaseUrl}/comments/${created.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: editorCookie },
    body: JSON.stringify({ body: "Fallback reason updated", type: "CONCERN" })
  });
  await ensureOk<CommentResponse>(editResponse);

  const history = await getCommentHistory(created.id, editorCookie);

  assert.equal(history.history[0]?.editReason, "Comment body and metadata updated");
});

test("AC-06 unauthorized history access is blocked", async () => {
  const created = await createEntityComment({ body: "Unauthorized history", cookie: editorCookie });

  const response = await fetch(`${apiBaseUrl}/comments/${created.id}/history`);

  assert.equal(response.status, 401);
});

test("AC-07 history returns 404 for missing comment", async () => {
  const response = await fetch(`${apiBaseUrl}/comments/missing-history-${timestamp}/history`, {
    headers: { cookie: editorCookie }
  });

  assert.equal(response.status, 404);
});

test("AC-08 backward compatible create and reply flows remain intact", async () => {
  const created = await createEntityComment({ body: "Root comment", cookie: editorCookie });

  const replyResponse = await fetch(`${apiBaseUrl}/entities/CHARACTER/${entitySlug}/comments/${created.id}/replies`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: editorCookie },
    body: JSON.stringify({ body: "Reply body" })
  });
  const reply = await ensureOk<CommentResponse>(replyResponse);

  assert.equal(reply.parentCommentId, created.id);

  const listResponse = await fetch(`${apiBaseUrl}/entities/CHARACTER/${entitySlug}/comments?page=1&limit=100`, {
    headers: { cookie: editorCookie }
  });
  const list = await ensureOk<ListCommentsResponse>(listResponse);
  const thread = list.threads.find((item) => item.id === created.id);

  assert.ok(thread);
  assert.equal(thread?.status, "ACTIVE");
  assert.equal(thread?.type, "GENERAL");
  assert.equal(thread?.severity, "INFO");
  assert.deepEqual(thread?.tags, []);
  assert.equal(thread?.replies.length, 1);
});