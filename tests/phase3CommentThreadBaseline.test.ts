import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";

import { createApp } from "../apps/api/src/app/createApp.js";
import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { phase0FixtureConfig } from "../scripts/phase0FixtureConfig.js";

type CommentModel = {
  deleteMany: (args: {
    where: {
      OR: Array<{ entityId: string } | { manuscriptId: string }>;
    };
  }) => Promise<unknown>;
  findUnique: (args: {
    where: {
      id: string;
    };
  }) => Promise<unknown | null>;
};

const commentModel = (prismaClient as unknown as { comment: CommentModel }).comment;

type CommentResponse = {
  id: string;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  userId: string;
  parentCommentId: string | null;
  entityId: string | null;
  manuscriptId: string | null;
  body: string;
  replies: CommentResponse[];
};

type ListCommentsResponse = {
  page: number;
  limit: number;
  total: number;
  threads: CommentResponse[];
};

const timestamp = Date.now();
const app = createApp();
const server = createServer(app);

const userRecords = {
  authorAdmin: {
    email: phase0FixtureConfig.authorAdmin.email,
    password: phase0FixtureConfig.authorAdmin.password,
    role: Role.AUTHOR_ADMIN,
    displayName: phase0FixtureConfig.authorAdmin.displayName
  },
  editorOne: {
    email: `phase3-editor-one-${timestamp}@example.com`,
    password: "Phase3EditorOne!234",
    role: Role.EDITOR,
    displayName: "Phase3 Editor One"
  },
  editorTwo: {
    email: `phase3-editor-two-${timestamp}@example.com`,
    password: "Phase3EditorTwo!234",
    role: Role.EDITOR,
    displayName: "Phase3 Editor Two"
  }
} as const;

const slugs = {
  entity: `phase3-comment-entity-${timestamp}`,
  manuscript: `phase3-comment-manuscript-${timestamp}`
};

let apiBaseUrl = "";
let adminCookie = "";
let editorOneCookie = "";
let editorTwoCookie = "";
let entityId = "";
let manuscriptId = "";
let createdEntityCommentId = "";
let createdReplyId = "";
let createdManuscriptCommentId = "";
let editorTwoCommentId = "";

const ensureOk = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
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
    const text = await response.text();
    throw new Error(`Failed to create session for ${email}: ${response.status} ${text}`);
  }

  const cookieHeader = response.headers.get("set-cookie");

  if (!cookieHeader) {
    throw new Error(`No session cookie returned for ${email}`);
  }

  return cookieHeader.split(";")[0] ?? "";
};

before(async () => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Unable to determine test server address");
  }

  apiBaseUrl = `http://127.0.0.1:${address.port}`;

  for (const user of Object.values(userRecords)) {
    const hash = await passwordHasher.hashPassword(user.password);

    await prismaClient.user.upsert({
      where: { email: user.email },
      update: {
        displayName: user.displayName,
        passwordHash: hash,
        role: user.role
      },
      create: {
        email: user.email,
        displayName: user.displayName,
        passwordHash: hash,
        role: user.role
      }
    });
  }

  adminCookie = await createSession(userRecords.authorAdmin.email, userRecords.authorAdmin.password);
  editorOneCookie = await createSession(userRecords.editorOne.email, userRecords.editorOne.password);
  editorTwoCookie = await createSession(userRecords.editorTwo.email, userRecords.editorTwo.password);

  const entity = await prismaClient.entity.create({
    data: {
      slug: slugs.entity,
      type: "CHARACTER",
      revisions: {
        create: {
          createdBy: {
            connect: {
              email: userRecords.authorAdmin.email
            }
          },
          version: 1,
          name: "Comment Target Character",
          summary: "Comment target summary",
          visibility: Visibility.PRIVATE
        }
      }
    },
    select: {
      id: true
    }
  });
  entityId = entity.id;

  const manuscript = await prismaClient.manuscript.create({
    data: {
      slug: slugs.manuscript,
      type: "CHAPTER",
      revisions: {
        create: {
          createdBy: {
            connect: {
              email: userRecords.authorAdmin.email
            }
          },
          version: 1,
          title: "Comment Target Chapter",
          summary: "Comment target chapter summary",
          visibility: Visibility.PRIVATE
        }
      }
    },
    select: {
      id: true
    }
  });
  manuscriptId = manuscript.id;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  await prismaClient.session.deleteMany({
    where: {
      user: {
        email: {
          in: [userRecords.authorAdmin.email, userRecords.editorOne.email, userRecords.editorTwo.email]
        }
      }
    }
  });

  await commentModel.deleteMany({
    where: {
      OR: [{ entityId }, { manuscriptId }]
    }
  });

  await prismaClient.entityRevision.deleteMany({
    where: {
      entityId
    }
  });

  await prismaClient.entity.deleteMany({
    where: {
      id: entityId
    }
  });

  await prismaClient.manuscriptRevision.deleteMany({
    where: {
      manuscriptId
    }
  });

  await prismaClient.manuscript.deleteMany({
    where: {
      id: manuscriptId
    }
  });

  await prismaClient.user.deleteMany({
    where: {
      email: {
        in: [userRecords.editorOne.email, userRecords.editorTwo.email]
      }
    }
  });

  await prismaClient.$disconnect();
});

test("create comment on entity", async () => {
  const response = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/comments`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorOneCookie
    },
    body: JSON.stringify({
      body: "Entity root comment"
    })
  });

  assert.equal(response.status, 201);

  const result = await (response.json() as Promise<CommentResponse>);
  createdEntityCommentId = result.id;

  assert.equal(result.parentCommentId, null);
  assert.equal(result.entityId, entityId);
  assert.equal(result.manuscriptId, null);
  assert.equal(result.body, "Entity root comment");
});

test("create comment on manuscript", async () => {
  const response = await fetch(`${apiBaseUrl}/manuscripts/${manuscriptId}/comments`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorOneCookie
    },
    body: JSON.stringify({
      body: "Manuscript root comment"
    })
  });

  assert.equal(response.status, 201);

  const result = await (response.json() as Promise<CommentResponse>);
  createdManuscriptCommentId = result.id;

  assert.equal(result.parentCommentId, null);
  assert.equal(result.manuscriptId, manuscriptId);
  assert.equal(result.entityId, null);
  assert.equal(result.body, "Manuscript root comment");
});

test("reply to comment", async () => {
  const response = await fetch(
    `${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/comments/${createdEntityCommentId}/replies`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: editorOneCookie
      },
      body: JSON.stringify({
        body: "Entity reply comment"
      })
    }
  );

  assert.equal(response.status, 201);

  const result = await (response.json() as Promise<CommentResponse>);
  createdReplyId = result.id;

  assert.equal(result.parentCommentId, createdEntityCommentId);
  assert.equal(result.entityId, entityId);
  assert.equal(result.body, "Entity reply comment");
});

test("list comments with pagination", async () => {
  const additionalRootResponse = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/comments`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorOneCookie
    },
    body: JSON.stringify({
      body: "Second root entity comment"
    })
  });
  await ensureOk<CommentResponse>(additionalRootResponse);

  const response = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/comments?page=1&limit=1`, {
    headers: {
      cookie: editorOneCookie
    }
  });

  assert.equal(response.status, 200);

  const result = await (response.json() as Promise<ListCommentsResponse>);

  assert.equal(result.page, 1);
  assert.equal(result.limit, 1);
  assert.equal(result.total, 2);
  assert.equal(result.threads.length, 1);
  assert.equal(result.threads[0]?.id, createdEntityCommentId);
  assert.equal(result.threads[0]?.replies.length, 1);
  assert.equal(result.threads[0]?.replies[0]?.id, createdReplyId);
});

test("edit own comment", async () => {
  const response = await fetch(`${apiBaseUrl}/comments/${createdEntityCommentId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: editorOneCookie
    },
    body: JSON.stringify({
      body: "Entity root comment edited"
    })
  });

  assert.equal(response.status, 200);

  const result = await (response.json() as Promise<CommentResponse>);

  assert.equal(result.body, "Entity root comment edited");
  assert.ok(result.editedAt);
});

test("edit other user's comment is forbidden", async () => {
  const createByEditorTwo = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/comments`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorTwoCookie
    },
    body: JSON.stringify({
      body: "Editor two root comment"
    })
  });

  const created = await ensureOk<CommentResponse>(createByEditorTwo);
  editorTwoCommentId = created.id;

  const response = await fetch(`${apiBaseUrl}/comments/${editorTwoCommentId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: editorOneCookie
    },
    body: JSON.stringify({
      body: "Unauthorized edit attempt"
    })
  });

  assert.equal(response.status, 403);
});

test("delete own comment", async () => {
  const response = await fetch(`${apiBaseUrl}/comments/${createdManuscriptCommentId}`, {
    method: "DELETE",
    headers: {
      cookie: editorOneCookie
    }
  });

  assert.equal(response.status, 204);

  const persisted = await commentModel.findUnique({
    where: {
      id: createdManuscriptCommentId
    }
  });

  assert.equal(persisted, null);
});

test("delete other user's comment requires author-admin", async () => {
  const editorDeleteResponse = await fetch(`${apiBaseUrl}/comments/${editorTwoCommentId}`, {
    method: "DELETE",
    headers: {
      cookie: editorOneCookie
    }
  });

  assert.equal(editorDeleteResponse.status, 403);

  const adminDeleteResponse = await fetch(`${apiBaseUrl}/comments/${editorTwoCommentId}`, {
    method: "DELETE",
    headers: {
      cookie: adminCookie
    }
  });

  assert.equal(adminDeleteResponse.status, 204);
});

test("verify reply threading", async () => {
  const response = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/comments?page=1&limit=20`, {
    headers: {
      cookie: editorOneCookie
    }
  });

  assert.equal(response.status, 200);

  const result = await (response.json() as Promise<ListCommentsResponse>);
  const parentThread = result.threads.find((thread) => thread.id === createdEntityCommentId);

  assert.ok(parentThread);
  assert.equal(parentThread?.body, "Entity root comment edited");
  assert.equal(parentThread?.replies.length, 1);
  assert.equal(parentThread?.replies[0]?.id, createdReplyId);
  assert.equal(parentThread?.replies[0]?.body, "Entity reply comment");
});

test("reject malformed and oversized comment payloads", async () => {
  const emptyBodyResponse = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/comments`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorOneCookie
    },
    body: JSON.stringify({
      body: ""
    })
  });

  assert.equal(emptyBodyResponse.status, 400);

  const oversizedBodyResponse = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/comments`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorOneCookie
    },
    body: JSON.stringify({
      body: "a".repeat(5001)
    })
  });

  assert.equal(oversizedBodyResponse.status, 400);
});

test("reject replies when parent comment does not exist", async () => {
  const response = await fetch(
    `${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/comments/missing-parent-${timestamp}/replies`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: editorOneCookie
      },
      body: JSON.stringify({
        body: "Reply attempt"
      })
    }
  );

  assert.equal(response.status, 404);
});
