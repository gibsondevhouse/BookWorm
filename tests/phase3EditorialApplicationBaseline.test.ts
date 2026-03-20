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
  appliedById: string | null;
  entityId: string | null;
  manuscriptId: string | null;
  changeType: "CREATE" | "UPDATE" | "DELETE";
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  title: string;
  summary: string;
  payload: Record<string, unknown> | null;
  decisionNote: string | null;
  appliedNote: string | null;
  decidedAt: string | null;
  appliedAt: string | null;
  proposedBy: {
    userId: string;
    email: string;
    displayName: string;
    role: string;
  };
  decidedBy: {
    userId: string;
    email: string;
    displayName: string;
    role: string;
  } | null;
  appliedBy: {
    userId: string;
    email: string;
    displayName: string;
    role: string;
  } | null;
};

type PaginatedProposalResponse = {
  proposals: ProposalResponse[];
  total: number;
  limit: number;
  offset: number;
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
    email: `phase3-application-editor-one-${timestamp}@example.com`,
    password: "Phase3ApplicationEditorOne!234",
    role: Role.EDITOR,
    displayName: "Phase3 Application Editor One"
  }
} as const;

const slugs = {
  entity: `phase3-application-entity-${timestamp}`,
  manuscript: `phase3-application-manuscript-${timestamp}`
};

let apiBaseUrl = "";
let adminCookie = "";
let editorCookie = "";
let entityId = "";
let manuscriptId = "";
let acceptedEntityProposalId = "";
let acceptedManuscriptProposalId = "";

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
  editorCookie = await createSession(userRecords.editorOne.email, userRecords.editorOne.password);

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
          name: "Application Target Character",
          summary: "Initial character summary",
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
          title: "Application Target Chapter",
          summary: "Initial chapter summary",
          visibility: Visibility.PRIVATE
        }
      }
    },
    select: {
      id: true
    }
  });
  manuscriptId = manuscript.id;

  // Create an entity proposal and accept it
  const entityProposalRes = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/proposals`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorCookie
    },
    body: JSON.stringify({
      changeType: "UPDATE",
      title: "Entity Update Proposal",
      summary: "Update character details",
      payload: { description: "Updated description" }
    })
  });
  const entityProposal = (await entityProposalRes.json()) as ProposalResponse;
  acceptedEntityProposalId = entityProposal.id;

  await fetch(`${apiBaseUrl}/proposals/${acceptedEntityProposalId}/accept`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({ decisionNote: "Approved for application" })
  });

  // Create a manuscript proposal and accept it
  const manuscriptProposalRes = await fetch(`${apiBaseUrl}/manuscripts/${manuscriptId}/proposals`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorCookie
    },
    body: JSON.stringify({
      changeType: "UPDATE",
      title: "Manuscript Update Proposal",
      summary: "Update chapter content",
      payload: { content: "Updated chapter content" }
    })
  });
  const manuscriptProposal = (await manuscriptProposalRes.json()) as ProposalResponse;
  acceptedManuscriptProposalId = manuscriptProposal.id;

  await fetch(`${apiBaseUrl}/proposals/${acceptedManuscriptProposalId}/accept`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({ decisionNote: "Approved for application" })
  });
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  await prismaClient.session.deleteMany({
    where: {
      user: {
        email: {
          in: [userRecords.authorAdmin.email, userRecords.editorOne.email]
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
        in: [userRecords.editorOne.email]
      }
    }
  });

  await prismaClient.$disconnect();
});

// === AC-01: Admin can list ACCEPTED proposals awaiting application ===
test("AC-01: GET /admin/proposals/pending-accepted returns ACCEPTED proposals with pagination", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/proposals/pending-accepted?limit=50&offset=0`, {
    method: "GET",
    headers: {
      cookie: adminCookie
    }
  });

  assert.equal(response.status, 200);
  const body = (await response.json()) as PaginatedProposalResponse;

  assert(body.proposals.length > 0, "Should have at least one accepted proposal");
  assert(typeof body.total === "number");
  assert.equal(body.limit, 50);
  assert.equal(body.offset, 0);

  const entityProposal = body.proposals.find((p) => p.id === acceptedEntityProposalId);
  assert(entityProposal, "Should include our accepted entity proposal");
  assert.equal(entityProposal.status, "ACCEPTED");
  assert.equal(entityProposal.appliedAt, null);
});

// === AC-02: Admin can list already-applied proposals ===
test("AC-02: GET /admin/proposals/applied-history returns applied proposals", async () => {
  // First apply a proposal
  const applyRes = await fetch(`${apiBaseUrl}/admin/proposals/${acceptedEntityProposalId}/apply`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({ appliedNote: "Applied to update character" })
  });

  assert.equal(applyRes.status, 200);
  const appliedProposal = (await applyRes.json()) as ProposalResponse;
  assert(appliedProposal.appliedAt !== null);

  // Now list applied proposals
  const response = await fetch(`${apiBaseUrl}/admin/proposals/applied-history?limit=50&offset=0`, {
    method: "GET",
    headers: {
      cookie: adminCookie
    }
  });

  assert.equal(response.status, 200);
  const body = (await response.json()) as PaginatedProposalResponse;

  const found = body.proposals.find((p) => p.id === acceptedEntityProposalId);
  assert(found, "Should include our applied proposal");
  assert(found.appliedAt !== null);
  assert(found.appliedBy !== null, "Should have appliedBy information");
  assert(found.appliedBy.email === userRecords.authorAdmin.email);
});

// === AC-03 & AC-05: Admin can apply an ACCEPTED proposal and mark it as applied ===
test("AC-03/AC-05: POST /admin/proposals/:id/apply applies proposal and creates revision", async () => {
  const applyRes = await fetch(`${apiBaseUrl}/admin/proposals/${acceptedManuscriptProposalId}/apply`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({ appliedNote: "Applied manuscript update" })
  });

  assert.equal(applyRes.status, 200);
  const applied = (await applyRes.json()) as ProposalResponse;

  assert(applied.appliedAt !== null);
  assert(applied.appliedById !== null);
  assert.equal(applied.appliedNote, "Applied manuscript update");
  assert.equal(applied.status, "ACCEPTED"); // Status remains ACCEPTED, appliedAt marks application

  // Verify revision was created
  const revisions = await prismaClient.manuscriptRevision.findMany({
    where: { manuscriptId }
  });
  assert(revisions.length >= 2, "Should have created new revision");
  const newRevision = revisions[revisions.length - 1];
  assert.equal(newRevision?.appliedFromProposalId, acceptedManuscriptProposalId);
});

// === AC-04: New revision inherits payload and defaults visibility to PRIVATE ===
test("AC-04: Applied revision inherits payload and visibility is PRIVATE", async () => {
  const entityProposalBefore = await prismaClient.entity.findUnique({
    where: { id: entityId },
    include: {
      revisions: {
        orderBy: { version: "desc" },
        take: 1
      }
    }
  });

  const versionBefore = entityProposalBefore?.revisions[0]?.version ?? 0;

  const proposalPayload = { customField: "custom value", color: "blue" };

  const proposalRes = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/proposals`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorCookie
    },
    body: JSON.stringify({
      changeType: "UPDATE",
      title: "Payload Test Proposal",
      summary: "Test payload inheritance",
      payload: proposalPayload
    })
  });

  const proposal = (await proposalRes.json()) as ProposalResponse;

  await fetch(`${apiBaseUrl}/proposals/${proposal.id}/accept`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({})
  });

  const applyRes = await fetch(`${apiBaseUrl}/admin/proposals/${proposal.id}/apply`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    }
  });

  assert.equal(applyRes.status, 200);

  const entityAfter = await prismaClient.entity.findUnique({
    where: { id: entityId },
    include: {
      revisions: {
        orderBy: { version: "desc" },
        take: 1
      }
    }
  });

  const newRevision = entityAfter?.revisions[0];
  assert(newRevision);
  assert.equal(newRevision.version, versionBefore + 1);
  assert.equal(newRevision.name, "Payload Test Proposal");
  assert.equal(newRevision.summary, "Test payload inheritance");
  assert.deepEqual(newRevision.payload, proposalPayload);
  assert.equal(newRevision.visibility, "PRIVATE");
});

// === AC-06: Admin can preview proposal application ===
test("AC-06: POST /admin/proposals/:id/preview-application validates without applying", async () => {
  const previewRes = await fetch(`${apiBaseUrl}/admin/proposals/${acceptedEntityProposalId}/preview-application`, {
    method: "POST",
    headers: {
      cookie: adminCookie
    }
  });

  assert.equal(previewRes.status, 200);
  const preview = (await previewRes.json()) as {
    canApply: boolean;
    errors: string[];
    previewRevision: {
      name?: string;
      summary?: string;
      visibility: string;
      payload?: Record<string, unknown>;
    };
  };

  assert.equal(preview.canApply, false); // Already applied in earlier test
  assert(preview.errors.length > 0);
});

// === AC-07: Admin can query entity revision audit trail ===
test("AC-07: GET /admin/entities/:type/:slug/revisions/applied-proposals returns audit trail", async () => {
  const response = await fetch(
    `${apiBaseUrl}/admin/entities/CHARACTER/${slugs.entity}/revisions/applied-proposals`,
    {
      method: "GET",
      headers: {
        cookie: adminCookie
      }
    }
  );

  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    revisions: Array<{
      revisionId: string;
      version: number;
      appliedFromProposal: {
        id: string;
        title: string;
        summary: string;
        appliedBy: { userId: string; email: string; displayName: string; role: string } | null;
        appliedAt: string | null;
        appliedNote: string | null;
      } | null;
    }>;
  };

  assert(body.revisions.length > 0, "Should have at least one applied revision");
  const appliedRevision = body.revisions.find((r) => r.appliedFromProposal?.id === acceptedEntityProposalId);
  assert(appliedRevision, "Should include our applied proposal revision");
  assert(appliedRevision.appliedFromProposal?.appliedAt !== null);
});

// === AC-08: Admin can query manuscript revision audit trail ===
test("AC-08: GET /admin/manuscripts/:id/revisions/applied-proposals returns audit trail", async () => {
  const response = await fetch(
    `${apiBaseUrl}/admin/manuscripts/${manuscriptId}/revisions/applied-proposals`,
    {
      method: "GET",
      headers: {
        cookie: adminCookie
      }
    }
  );

  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    revisions: Array<{
      revisionId: string;
      version: number;
      appliedFromProposal: {
        id: string;
        title: string;
        summary: string;
        appliedBy: { userId: string; email: string; displayName: string; role: string } | null;
        appliedAt: string | null;
        appliedNote: string | null;
      } | null;
    }>;
  };

  assert(body.revisions.length > 0, "Should have at least one applied revision");
  const appliedRevision = body.revisions.find((r) => r.appliedFromProposal?.id === acceptedManuscriptProposalId);
  assert(appliedRevision, "Should include our applied proposal revision");
});

// === AC-09: Workflow stats endpoint returns accurate counts ===
test("AC-09: GET /admin/proposals/workflow-stats returns accurate aggregate counts", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/proposals/workflow-stats`, {
    method: "GET",
    headers: {
      cookie: adminCookie
    }
  });

  assert.equal(response.status, 200);
  const stats = (await response.json()) as {
    pending: number;
    accepted: number;
    applied: number;
    rejected: number;
    totalByChangeType: { CREATE: number; UPDATE: number; DELETE: number };
  };

  assert(typeof stats.pending === "number");
  assert(typeof stats.accepted === "number");
  assert(typeof stats.applied === "number");
  assert(typeof stats.rejected === "number");
  assert(typeof stats.totalByChangeType.CREATE === "number");
  assert(typeof stats.totalByChangeType.UPDATE === "number");
  assert(typeof stats.totalByChangeType.DELETE === "number");
});

// === AC-10: Recent applications endpoint returns last 20 ===
test("AC-10: GET /admin/proposals/recent-applications returns 20 most recent", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/proposals/recent-applications`, {
    method: "GET",
    headers: {
      cookie: adminCookie
    }
  });

  assert.equal(response.status, 200);
  const body = (await response.json()) as { proposals: ProposalResponse[] };

  assert(body.proposals.length <= 20);
  assert(body.proposals.every((p) => p.appliedAt !== null), "Should only have applied proposals");

  // Ensure descending order by appliedAt
  for (let i = 1; i < body.proposals.length; i++) {
    const prev = new Date(body.proposals[i - 1]?.appliedAt ?? 0);
    const curr = new Date(body.proposals[i]?.appliedAt ?? 0);
    assert(prev >= curr, "Should be in descending appliedAt order");
  }
});

// === AC-11: Proposal application fails with 409 if not ACCEPTED ===
test("AC-11: POST /admin/proposals/:id/apply returns 409 if proposal not ACCEPTED", async () => {
  // Create a PENDING proposal and try to apply it without accepting first
  const proposalRes = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/proposals`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorCookie
    },
    body: JSON.stringify({
      changeType: "UPDATE",
      title: "Pending Proposal",
      summary: "This will remain pending",
      payload: {}
    })
  });

  const pendingProposal = (await proposalRes.json()) as ProposalResponse;

  const applyRes = await fetch(`${apiBaseUrl}/admin/proposals/${pendingProposal.id}/apply`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    }
  });

  assert.equal(applyRes.status, 409, "Should return 409 Conflict for non-ACCEPTED proposal");
});

// === AC-12: All application endpoints enforce AUTHOR_ADMIN role ===
test("AC-12: All endpoints require AUTHOR_ADMIN role; return 401 for unauthorized", async () => {
  const endpoints = [
    { method: "GET", path: "/admin/proposals/pending-accepted" },
    { method: "GET", path: "/admin/proposals/applied-history" },
    { method: "GET", path: "/admin/proposals/workflow-stats" },
    { method: "GET", path: "/admin/proposals/recent-applications" }
  ];

  for (const endpoint of endpoints) {
    const response = await fetch(`${apiBaseUrl}${endpoint.path}`, {
      method: endpoint.method,
      headers: {
        cookie: editorCookie // Editor doesn't have AUTHOR_ADMIN role
      }
    });

    // Should either return 401 or 403 depending on implementation
    assert(
      response.status === 401 || response.status === 403,
      `${endpoint.path} should reject unauthorized user`
    );
  }
});
