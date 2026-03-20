import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";

import { createApp } from "../apps/api/src/app/createApp.js";
import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";

type CommentResponse = {
  id: string;
  type: "GENERAL" | "QUESTION" | "SUGGESTION" | "CONCERN" | "RESOLVED";
  severity: "INFO" | "MINOR" | "MAJOR";
  tags: Array<"SPELLING" | "FACTUAL" | "CONSISTENCY" | "CLARITY" | "TONE">;
  body: string;
};

type ListCommentsResponse = {
  threads: Array<CommentResponse & { replies: CommentResponse[] }>;
};

const timestamp = Date.now();
const app = createApp();
const server = createServer(app);

const users = {
  admin: {
    email: `phase3-part01-admin-${timestamp}@example.com`,
    password: "Phase3Part01Admin!234",
    role: Role.AUTHOR_ADMIN,
    displayName: "Phase3 Part01 Admin"
  },
  editor: {
    email: `phase3-part01-editor-${timestamp}@example.com`,
    password: "Phase3Part01Editor!234",
    role: Role.EDITOR,
    displayName: "Phase3 Part01 Editor"
  }
} as const;

const entitySlug = `phase3-part01-comment-entity-${timestamp}`;

let apiBaseUrl = "";
let adminCookie = "";
let editorCookie = "";
let entityId = "";
let commentIdForUpdate = "";

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
          name: "Part 01 Comment Target",
          summary: "Part 01 comment target summary",
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

test("AC-01 create comment with explicit type severity tags", async () => {
  const response = await fetch(`${apiBaseUrl}/entities/CHARACTER/${entitySlug}/comments`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: editorCookie },
    body: JSON.stringify({
      body: "Metadata rich comment",
      type: "QUESTION",
      severity: "MAJOR",
      tags: ["CLARITY", "FACTUAL", "CLARITY"]
    })
  });

  const result = await ensureOk<CommentResponse>(response);
  commentIdForUpdate = result.id;

  assert.equal(result.type, "QUESTION");
  assert.equal(result.severity, "MAJOR");
  assert.deepEqual(result.tags, ["FACTUAL", "CLARITY"]);
});

test("AC-02 create comment defaults metadata when omitted", async () => {
  const response = await fetch(`${apiBaseUrl}/entities/CHARACTER/${entitySlug}/comments`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: editorCookie },
    body: JSON.stringify({ body: "Legacy payload comment" })
  });

  const result = await ensureOk<CommentResponse>(response);

  assert.equal(result.type, "GENERAL");
  assert.equal(result.severity, "INFO");
  assert.deepEqual(result.tags, []);
});

test("AC-03 reject invalid type", async () => {
  const response = await fetch(`${apiBaseUrl}/entities/CHARACTER/${entitySlug}/comments`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: editorCookie },
    body: JSON.stringify({ body: "Invalid type", type: "NOTE" })
  });

  assert.equal(response.status, 400);
});

test("AC-04 reject invalid severity", async () => {
  const response = await fetch(`${apiBaseUrl}/entities/CHARACTER/${entitySlug}/comments`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: editorCookie },
    body: JSON.stringify({ body: "Invalid severity", severity: "CRITICAL" })
  });

  assert.equal(response.status, 400);
});

test("AC-05 reject invalid tag", async () => {
  const response = await fetch(`${apiBaseUrl}/entities/CHARACTER/${entitySlug}/comments`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: editorCookie },
    body: JSON.stringify({ body: "Invalid tag", tags: ["TYPO"] })
  });

  assert.equal(response.status, 400);
});

test("AC-06 update metadata on existing comment", async () => {
  const response = await fetch(`${apiBaseUrl}/comments/${commentIdForUpdate}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: editorCookie },
    body: JSON.stringify({ type: "RESOLVED", severity: "MINOR", tags: ["TONE", "SPELLING", "TONE"] })
  });

  const result = await ensureOk<CommentResponse>(response);

  assert.equal(result.type, "RESOLVED");
  assert.equal(result.severity, "MINOR");
  assert.deepEqual(result.tags, ["SPELLING", "TONE"]);
});

test("AC-07 backward compatible create and edit payloads", async () => {
  const createResponse = await fetch(`${apiBaseUrl}/entities/CHARACTER/${entitySlug}/comments`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: editorCookie },
    body: JSON.stringify({ body: "Backward compatibility baseline" })
  });
  const created = await ensureOk<CommentResponse>(createResponse);

  const editResponse = await fetch(`${apiBaseUrl}/comments/${created.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: editorCookie },
    body: JSON.stringify({ body: "Backward compatibility baseline edited" })
  });
  const edited = await ensureOk<CommentResponse>(editResponse);

  assert.equal(edited.body, "Backward compatibility baseline edited");
  assert.equal(edited.type, "GENERAL");
  assert.equal(edited.severity, "INFO");
  assert.deepEqual(edited.tags, []);
});

test("AC-08 retrieval includes metadata fields", async () => {
  const response = await fetch(`${apiBaseUrl}/entities/CHARACTER/${entitySlug}/comments?page=1&limit=20`, {
    headers: { cookie: editorCookie }
  });

  const result = await ensureOk<ListCommentsResponse>(response);
  const updatedComment = result.threads.find((thread) => thread.id === commentIdForUpdate);

  assert.ok(updatedComment);
  assert.equal(updatedComment?.type, "RESOLVED");
  assert.equal(updatedComment?.severity, "MINOR");
  assert.deepEqual(updatedComment?.tags, ["SPELLING", "TONE"]);
});
