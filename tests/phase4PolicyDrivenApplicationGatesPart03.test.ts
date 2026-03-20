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
      entityId: string;
    };
  }) => Promise<unknown>;
};

type ReviewRequestModel = {
  deleteMany: (args: {
    where: {
      proposalId: {
        in: string[];
      };
    };
  }) => Promise<unknown>;
};

const proposalModel = (prismaClient as unknown as { proposal: ProposalModel }).proposal;
const reviewRequestModel = (prismaClient as unknown as { reviewRequest: ReviewRequestModel }).reviewRequest;

type ProposalResponse = {
  id: string;
};

type ReviewRequestResponse = {
  id: string;
};

type ApplicationReadinessResponse = {
  proposalId: string;
  ready: boolean;
  evaluatedAt: string;
  reviewRequest: {
    id: string;
    status: string;
    hasApprovalChain: boolean;
    approvalChainStatus: string | null;
    requiredStepsTotal: number;
    requiredStepsApproved: number;
  } | null;
  unmetConditions: Array<{
    code: string;
    message: string;
    details: Record<string, unknown>;
  }>;
};

type GateBlockedResponse = {
  error: string;
  code: "APPLICATION_GATE_BLOCKED";
  reasons: Array<{
    code: string;
    message: string;
    details: Record<string, unknown>;
  }>;
  readiness: ApplicationReadinessResponse;
};

type ProposalMetadataResponse = {
  id: string;
  reviewNotes: string | null;
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
  editorA: {
    email: `phase4-gates-editor-a-${timestamp}@example.com`,
    password: "Phase4GatesEditorA!234",
    role: Role.EDITOR,
    displayName: "Phase4 Gates Editor A"
  },
  editorB: {
    email: `phase4-gates-editor-b-${timestamp}@example.com`,
    password: "Phase4GatesEditorB!234",
    role: Role.EDITOR,
    displayName: "Phase4 Gates Editor B"
  }
} as const;

const slugs = {
  entity: `phase4-policy-gates-entity-${timestamp}`
};

let apiBaseUrl = "";
let adminCookie = "";
let editorACookie = "";
let editorBCookie = "";
let editorAUserId = "";
let entityId = "";
const createdProposalIds: string[] = [];

const createSession = async (email: string, password: string): Promise<string> => {
  const response = await fetch(`${apiBaseUrl}/auth/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error(`Failed to create session for ${email}: ${response.status} ${await response.text()}`);
  }

  const cookieHeader = response.headers.get("set-cookie");

  if (!cookieHeader) {
    throw new Error(`No session cookie returned for ${email}`);
  }

  return cookieHeader.split(";")[0] ?? "";
};

const findUserIdByEmail = async (email: string): Promise<string> => {
  const user = await prismaClient.user.findUnique({
    where: { email },
    select: { id: true }
  });

  if (user === null) {
    throw new Error(`User ${email} not found`);
  }

  return user.id;
};

const createProposalInReview = async (title: string): Promise<string> => {
  const createResponse = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/proposals`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorACookie
    },
    body: JSON.stringify({
      changeType: "UPDATE",
      title,
      summary: `${title} summary`
    })
  });

  assert.equal(createResponse.status, 201);
  const proposal = (await createResponse.json()) as ProposalResponse;
  createdProposalIds.push(proposal.id);

  const submitResponse = await fetch(`${apiBaseUrl}/proposals/${proposal.id}/submit`, {
    method: "POST",
    headers: { cookie: editorACookie }
  });
  assert.equal(submitResponse.status, 200);

  const startReviewResponse = await fetch(`${apiBaseUrl}/proposals/${proposal.id}/start-review`, {
    method: "POST",
    headers: { cookie: adminCookie }
  });
  assert.equal(startReviewResponse.status, 200);

  return proposal.id;
};

const createAndAssignReviewRequest = async (proposalId: string): Promise<string> => {
  const createResponse = await fetch(`${apiBaseUrl}/review-requests`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({ proposalId })
  });

  assert.equal(createResponse.status, 201);
  const reviewRequest = (await createResponse.json()) as ReviewRequestResponse;

  const assignResponse = await fetch(`${apiBaseUrl}/review-requests/${reviewRequest.id}/assign`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({ assigneeUserId: editorAUserId })
  });

  assert.equal(assignResponse.status, 200);

  return reviewRequest.id;
};

const acceptProposal = async (proposalId: string): Promise<void> => {
  const response = await fetch(`${apiBaseUrl}/proposals/${proposalId}/accept`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({ reviewNotes: "Phase 4 part 03 acceptance" })
  });

  assert.equal(response.status, 200);
};

const approveFullChainAndResolve = async (
  reviewRequestId: string,
  proposalId: string
): Promise<void> => {
  const acknowledgeOne = await fetch(
    `${apiBaseUrl}/review-requests/${reviewRequestId}/approval-steps/1/acknowledge`,
    {
      method: "PATCH",
      headers: { cookie: editorACookie }
    }
  );
  assert.equal(acknowledgeOne.status, 200);

  const approveOne = await fetch(
    `${apiBaseUrl}/review-requests/${reviewRequestId}/approval-steps/1/decision`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: editorACookie
      },
      body: JSON.stringify({
        decision: "APPROVE",
        decisionNote: "Step one approved"
      })
    }
  );
  assert.equal(approveOne.status, 200);

  const acknowledgeTwo = await fetch(
    `${apiBaseUrl}/review-requests/${reviewRequestId}/approval-steps/2/acknowledge`,
    {
      method: "PATCH",
      headers: { cookie: adminCookie }
    }
  );
  assert.equal(acknowledgeTwo.status, 200);

  const approveTwo = await fetch(
    `${apiBaseUrl}/review-requests/${reviewRequestId}/approval-steps/2/decision`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: adminCookie
      },
      body: JSON.stringify({
        decision: "APPROVE",
        decisionNote: "Step two approved"
      })
    }
  );
  assert.equal(approveTwo.status, 200);

  const inReviewResponse = await fetch(`${apiBaseUrl}/review-requests/${reviewRequestId}/lifecycle`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({ status: "IN_REVIEW" })
  });

  assert.equal(inReviewResponse.status, 200);

  await acceptProposal(proposalId);

  const resolveResponse = await fetch(`${apiBaseUrl}/review-requests/${reviewRequestId}/lifecycle`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({ status: "RESOLVED" })
  });

  assert.equal(resolveResponse.status, 200);
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

  editorAUserId = await findUserIdByEmail(userRecords.editorA.email);

  adminCookie = await createSession(userRecords.authorAdmin.email, userRecords.authorAdmin.password);
  editorACookie = await createSession(userRecords.editorA.email, userRecords.editorA.password);
  editorBCookie = await createSession(userRecords.editorB.email, userRecords.editorB.password);

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
          name: "Part 03 Policy Gate Character",
          summary: "Part 03 policy gate target",
          visibility: Visibility.PRIVATE
        }
      }
    },
    select: {
      id: true
    }
  });

  entityId = entity.id;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  if (createdProposalIds.length > 0) {
    await reviewRequestModel.deleteMany({
      where: {
        proposalId: {
          in: createdProposalIds
        }
      }
    });
  }

  await proposalModel.deleteMany({
    where: {
      entityId
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

  await prismaClient.session.deleteMany({
    where: {
      user: {
        email: {
          in: [userRecords.authorAdmin.email, userRecords.editorA.email, userRecords.editorB.email]
        }
      }
    }
  });

  await prismaClient.user.deleteMany({
    where: {
      email: {
        in: [userRecords.editorA.email, userRecords.editorB.email]
      }
    }
  });

  await prismaClient.$disconnect();
});

test("AC-01: readiness endpoint reports unmet gate conditions for incomplete chain", async () => {
  const proposalId = await createProposalInReview("AC-01 Gate Readiness");
  const reviewRequestId = await createAndAssignReviewRequest(proposalId);
  await acceptProposal(proposalId);

  const response = await fetch(`${apiBaseUrl}/admin/proposals/${proposalId}/application-readiness`, {
    method: "GET",
    headers: {
      cookie: adminCookie
    }
  });

  assert.equal(response.status, 200);
  const readiness = (await response.json()) as ApplicationReadinessResponse;

  assert.equal(readiness.proposalId, proposalId);
  assert.equal(readiness.ready, false);
  assert.equal(readiness.reviewRequest?.id, reviewRequestId);

  const codes = readiness.unmetConditions.map((condition) => condition.code);
  assert(codes.includes("REVIEW_REQUEST_NOT_RESOLVED"));
  assert(codes.includes("APPROVAL_CHAIN_NOT_APPROVED"));
  assert(codes.includes("REQUIRED_STEP_INCOMPLETE"));
});

test("AC-02: apply endpoint blocks and returns machine-readable gate-failure reasons", async () => {
  const proposalId = await createProposalInReview("AC-02 Gate Block Reasons");
  await createAndAssignReviewRequest(proposalId);
  await acceptProposal(proposalId);

  const response = await fetch(`${apiBaseUrl}/admin/proposals/${proposalId}/apply`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({ appliedNote: "Attempt without gate completion" })
  });

  assert.equal(response.status, 409);
  const body = (await response.json()) as GateBlockedResponse;

  assert.equal(body.code, "APPLICATION_GATE_BLOCKED");
  assert.equal(body.readiness.ready, false);
  assert(body.reasons.length > 0);

  const reasonCodes = body.reasons.map((reason) => reason.code);
  assert(reasonCodes.includes("REVIEW_REQUEST_NOT_RESOLVED"));
  assert(reasonCodes.includes("APPROVAL_CHAIN_NOT_APPROVED"));
});

test("AC-03: override attempt by non-admin actor is rejected", async () => {
  const proposalId = await createProposalInReview("AC-03 Unauthorized Override");
  await createAndAssignReviewRequest(proposalId);
  await acceptProposal(proposalId);

  const response = await fetch(`${apiBaseUrl}/admin/proposals/${proposalId}/apply`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorBCookie
    },
    body: JSON.stringify({
      override: {
        reasonCode: "INCIDENT_RESPONSE",
        reasonNote: "Editor is not authorized to override"
      }
    })
  });

  assert(response.status === 401 || response.status === 403);
});

test("AC-04: authorized override applies proposal and writes explicit override audit entry", async () => {
  const proposalId = await createProposalInReview("AC-04 Authorized Override");
  await createAndAssignReviewRequest(proposalId);
  await acceptProposal(proposalId);

  const applyResponse = await fetch(`${apiBaseUrl}/admin/proposals/${proposalId}/apply`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      appliedNote: "Applied under emergency override",
      override: {
        reasonCode: "EMERGENCY_HOTFIX",
        reasonNote: "Critical continuity fix for release" }
    })
  });

  assert.equal(applyResponse.status, 200);

  const metadataResponse = await fetch(`${apiBaseUrl}/proposals/${proposalId}/metadata`, {
    method: "GET",
    headers: {
      cookie: adminCookie
    }
  });

  assert.equal(metadataResponse.status, 200);
  const metadata = (await metadataResponse.json()) as ProposalMetadataResponse;

  assert(metadata.reviewNotes !== null);
  assert(metadata.reviewNotes?.includes("[policy-gate]"));
  assert(metadata.reviewNotes?.includes("APPLICATION_OVERRIDE"));
  assert(metadata.reviewNotes?.includes("EMERGENCY_HOTFIX"));
});

test("AC-05: completed chain and resolved review request allow normal application", async () => {
  const proposalId = await createProposalInReview("AC-05 Gate Pass Path");
  const reviewRequestId = await createAndAssignReviewRequest(proposalId);
  await approveFullChainAndResolve(reviewRequestId, proposalId);

  const readinessResponse = await fetch(
    `${apiBaseUrl}/admin/proposals/${proposalId}/application-readiness`,
    {
      method: "GET",
      headers: {
        cookie: adminCookie
      }
    }
  );

  assert.equal(readinessResponse.status, 200);
  const readiness = (await readinessResponse.json()) as ApplicationReadinessResponse;
  assert.equal(readiness.ready, true);
  assert.equal(readiness.unmetConditions.length, 0);

  const applyResponse = await fetch(`${apiBaseUrl}/admin/proposals/${proposalId}/apply`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({ appliedNote: "Applied with full gate completion" })
  });

  assert.equal(applyResponse.status, 200);
});
