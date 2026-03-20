import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";

import { createApp } from "../apps/api/src/app/createApp.js";
import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { phase0FixtureConfig } from "../scripts/phase0FixtureConfig.js";

type ProposalModel = {
  deleteMany: (args: {
    where: {
      OR: Array<{ entityId: string } | { manuscriptId: string }>;
    };
  }) => Promise<unknown>;
};

const proposalModel = (prismaClient as unknown as { proposal: ProposalModel }).proposal;

type ProposalResponse = {
  id: string;
  createdAt: string;
  updatedAt: string;
  proposedById: string;
  decidedById: string | null;
  entityId: string | null;
  manuscriptId: string | null;
  changeType: "CREATE" | "UPDATE" | "DELETE";
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  title: string;
  summary: string;
  payload: Record<string, unknown> | null;
  decisionNote: string | null;
  decidedAt: string | null;
};

type ProposalListResponse = {
  proposals: ProposalResponse[];
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
    email: `phase3-proposal-editor-one-${timestamp}@example.com`,
    password: "Phase3ProposalEditorOne!234",
    role: Role.EDITOR,
    displayName: "Phase3 Proposal Editor One"
  },
  editorTwo: {
    email: `phase3-proposal-editor-two-${timestamp}@example.com`,
    password: "Phase3ProposalEditorTwo!234",
    role: Role.EDITOR,
    displayName: "Phase3 Proposal Editor Two"
  }
} as const;

const slugs = {
  entity: `phase3-proposal-entity-${timestamp}`,
  manuscript: `phase3-proposal-manuscript-${timestamp}`
};

let apiBaseUrl = "";
let adminCookie = "";
let editorOneCookie = "";
let editorTwoCookie = "";
let entityId = "";
let manuscriptId = "";
let acceptedProposalId = "";
let rejectedProposalId = "";
let pendingProposalId = "";
let latestEntityProposalId = "";

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
          name: "Proposal Target Character",
          summary: "Proposal target summary",
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
          title: "Proposal Target Chapter",
          summary: "Proposal target chapter summary",
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

  await proposalModel.deleteMany({
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

test("AC-01: create entity proposal", async () => {
  const response = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/proposals`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorOneCookie
    },
    body: JSON.stringify({
      changeType: "UPDATE",
      title: "Adjust character profile",
      summary: "Update profile details for continuity alignment.",
      payload: { field: "summary", value: "Updated text" }
    })
  });

  assert.equal(response.status, 201);

  const result = await (response.json() as Promise<ProposalResponse>);
  acceptedProposalId = result.id;

  assert.equal(result.entityId, entityId);
  assert.equal(result.manuscriptId, null);
  assert.equal(result.status, "PENDING");
  assert.equal(result.changeType, "UPDATE");
});

test("AC-02: create manuscript proposal", async () => {
  const response = await fetch(`${apiBaseUrl}/manuscripts/${manuscriptId}/proposals`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorOneCookie
    },
    body: JSON.stringify({
      changeType: "CREATE",
      title: "Propose chapter insert",
      summary: "Add a transitional chapter between scenes.",
      payload: { chapterTitle: "The Interlude" }
    })
  });

  assert.equal(response.status, 201);

  const result = await (response.json() as Promise<ProposalResponse>);
  rejectedProposalId = result.id;

  assert.equal(result.manuscriptId, manuscriptId);
  assert.equal(result.entityId, null);
  assert.equal(result.status, "PENDING");
});

test("AC-03: list entity proposals", async () => {
  const response = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/proposals`, {
    headers: {
      cookie: editorOneCookie
    }
  });

  assert.equal(response.status, 200);

  const result = await (response.json() as Promise<ProposalListResponse>);
  const found = result.proposals.find((proposal) => proposal.id === acceptedProposalId);

  assert.ok(found);
  assert.equal(found?.title, "Adjust character profile");
});

test("AC-04: list manuscript proposals", async () => {
  const response = await fetch(`${apiBaseUrl}/manuscripts/${manuscriptId}/proposals`, {
    headers: {
      cookie: editorOneCookie
    }
  });

  assert.equal(response.status, 200);

  const result = await (response.json() as Promise<ProposalListResponse>);
  const found = result.proposals.find((proposal) => proposal.id === rejectedProposalId);

  assert.ok(found);
  assert.equal(found?.title, "Propose chapter insert");
});

test("AC-05: get proposal by id", async () => {
  const response = await fetch(`${apiBaseUrl}/proposals/${acceptedProposalId}`, {
    headers: {
      cookie: editorOneCookie
    }
  });

  assert.equal(response.status, 200);

  const result = await (response.json() as Promise<ProposalResponse>);

  assert.equal(result.id, acceptedProposalId);
  assert.equal(result.status, "PENDING");
});

test("AC-06: list admin proposals", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/proposals`, {
    headers: {
      cookie: adminCookie
    }
  });

  assert.equal(response.status, 200);

  const result = await (response.json() as Promise<ProposalListResponse>);

  assert.ok(result.proposals.some((proposal) => proposal.id === acceptedProposalId));
  assert.ok(result.proposals.some((proposal) => proposal.id === rejectedProposalId));
});

test("AC-07: non-admin cannot list admin proposals", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/proposals`, {
    headers: {
      cookie: editorOneCookie
    }
  });

  assert.equal(response.status, 403);
});

test("AC-08: admin can accept pending proposal", async () => {
  const response = await fetch(`${apiBaseUrl}/proposals/${acceptedProposalId}/accept`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      decisionNote: "Approved for implementation."
    })
  });

  assert.equal(response.status, 200);

  const result = await (response.json() as Promise<ProposalResponse>);

  assert.equal(result.status, "ACCEPTED");
  assert.equal(result.decisionNote, "Approved for implementation.");
  assert.ok(result.decidedById);
  assert.ok(result.decidedAt);
});

test("AC-09: accepted proposal reflects decided metadata on fetch", async () => {
  const response = await fetch(`${apiBaseUrl}/proposals/${acceptedProposalId}`, {
    headers: {
      cookie: editorOneCookie
    }
  });

  assert.equal(response.status, 200);

  const result = await (response.json() as Promise<ProposalResponse>);

  assert.equal(result.status, "ACCEPTED");
  assert.equal(result.decisionNote, "Approved for implementation.");
  assert.ok(result.decidedById);
  assert.ok(result.decidedAt);
});

test("AC-10: admin can reject pending proposal", async () => {
  const response = await fetch(`${apiBaseUrl}/proposals/${rejectedProposalId}/reject`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      decisionNote: "Needs additional manuscript references."
    })
  });

  assert.equal(response.status, 200);

  const result = await (response.json() as Promise<ProposalResponse>);

  assert.equal(result.status, "REJECTED");
  assert.equal(result.decisionNote, "Needs additional manuscript references.");
  assert.ok(result.decidedById);
  assert.ok(result.decidedAt);
});

test("AC-11: reject requires decision note", async () => {
  const createResponse = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/proposals`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorTwoCookie
    },
    body: JSON.stringify({
      changeType: "DELETE",
      title: "Remove stale alias",
      summary: "Alias is no longer canonical."
    })
  });

  const created = await (createResponse.json() as Promise<ProposalResponse>);
  pendingProposalId = created.id;

  const rejectResponse = await fetch(`${apiBaseUrl}/proposals/${pendingProposalId}/reject`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      decisionNote: ""
    })
  });

  assert.equal(rejectResponse.status, 400);
});

test("AC-12: cannot accept already accepted proposal", async () => {
  const response = await fetch(`${apiBaseUrl}/proposals/${acceptedProposalId}/accept`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      decisionNote: "Second pass approval"
    })
  });

  assert.equal(response.status, 409);
});

test("AC-13: cannot reject already rejected proposal", async () => {
  const response = await fetch(`${apiBaseUrl}/proposals/${rejectedProposalId}/reject`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      decisionNote: "Second pass rejection"
    })
  });

  assert.equal(response.status, 409);
});

test("AC-14: get missing proposal returns 404", async () => {
  const response = await fetch(`${apiBaseUrl}/proposals/missing-proposal-${timestamp}`, {
    headers: {
      cookie: editorOneCookie
    }
  });

  assert.equal(response.status, 404);
});

test("AC-15: accept missing proposal returns 404", async () => {
  const response = await fetch(`${apiBaseUrl}/proposals/missing-proposal-${timestamp}/accept`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      decisionNote: "Missing"
    })
  });

  assert.equal(response.status, 404);
});

test("AC-16: reject missing proposal returns 404", async () => {
  const response = await fetch(`${apiBaseUrl}/proposals/missing-proposal-${timestamp}/reject`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      decisionNote: "Missing"
    })
  });

  assert.equal(response.status, 404);
});

test("AC-17: malformed proposal payload returns 400", async () => {
  const response = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/proposals`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorOneCookie
    },
    body: JSON.stringify({
      changeType: "UPDATE",
      summary: "Missing title"
    })
  });

  assert.equal(response.status, 400);
});

test("AC-18: listing proposals for unknown entity returns 404", async () => {
  const response = await fetch(`${apiBaseUrl}/entities/CHARACTER/missing-entity-${timestamp}/proposals`, {
    headers: {
      cookie: editorOneCookie
    }
  });

  assert.equal(response.status, 404);
});

test("AC-19: listing proposals for unknown manuscript returns 404", async () => {
  const response = await fetch(`${apiBaseUrl}/manuscripts/missing-manuscript-${timestamp}/proposals`, {
    headers: {
      cookie: editorOneCookie
    }
  });

  assert.equal(response.status, 404);
});

test("AC-20: submission requires authentication", async () => {
  const response = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/proposals`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      changeType: "UPDATE",
      title: "Unauthenticated attempt",
      summary: "Should fail"
    })
  });

  assert.equal(response.status, 401);
});

test("AC-21: entity proposal listing is newest-first", async () => {
  const response = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/proposals`, {
    headers: {
      cookie: editorOneCookie
    }
  });

  assert.equal(response.status, 200);

  const result = await (response.json() as Promise<ProposalListResponse>);
  latestEntityProposalId = result.proposals[0]?.id ?? "";

  assert.equal(latestEntityProposalId, pendingProposalId);
});
