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

type ApprovalChainResponse = {
  id: string;
  reviewRequestId: string;
  status: "ACTIVE" | "APPROVED" | "REJECTED";
  currentStepOrder: number;
  finalizedAt: string | null;
  steps: {
    id: string;
    stepOrder: number;
    status: "PENDING" | "ACKNOWLEDGED" | "APPROVED" | "REJECTED" | "CANCELED";
    acknowledgedAt: string | null;
    acknowledgedById: string | null;
    decidedAt: string | null;
    decidedById: string | null;
  }[];
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
    email: `phase4-approval-editor-a-${timestamp}@example.com`,
    password: "Phase4ApprovalEditorA!234",
    role: Role.EDITOR,
    displayName: "Phase4 Approval Editor A"
  },
  editorB: {
    email: `phase4-approval-editor-b-${timestamp}@example.com`,
    password: "Phase4ApprovalEditorB!234",
    role: Role.EDITOR,
    displayName: "Phase4 Approval Editor B"
  }
} as const;

const slugs = {
  entity: `phase4-approval-entity-${timestamp}`
};

let apiBaseUrl = "";
let adminCookie = "";
let editorACookie = "";
let editorBCookie = "";
let entityId = "";
let editorAUserId = "";
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

const createEligibleProposal = async (title: string): Promise<string> => {
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
    headers: {
      cookie: editorACookie
    }
  });
  assert.equal(submitResponse.status, 200);

  const startReviewResponse = await fetch(`${apiBaseUrl}/proposals/${proposal.id}/start-review`, {
    method: "POST",
    headers: {
      cookie: adminCookie
    }
  });
  assert.equal(startReviewResponse.status, 200);

  return proposal.id;
};

const createReviewRequest = async (proposalId: string): Promise<ReviewRequestResponse> => {
  const response = await fetch(`${apiBaseUrl}/review-requests`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({ proposalId })
  });

  assert.equal(response.status, 201);
  return (await response.json()) as ReviewRequestResponse;
};

const assignReviewRequest = async (reviewRequestId: string): Promise<void> => {
  const response = await fetch(`${apiBaseUrl}/review-requests/${reviewRequestId}/assign`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({ assigneeUserId: editorAUserId })
  });

  assert.equal(response.status, 200);
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
          name: "Part 01 Approval Chain Character",
          summary: "Part 01 approval chain target",
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

test("AC-01: ordered progression blocks skipping required prior step", async () => {
  const proposalId = await createEligibleProposal("AC-01 Ordered Progression");
  const reviewRequest = await createReviewRequest(proposalId);
  await assignReviewRequest(reviewRequest.id);

  const response = await fetch(`${apiBaseUrl}/review-requests/${reviewRequest.id}/approval-steps/2/acknowledge`, {
    method: "PATCH",
    headers: {
      cookie: adminCookie
    }
  });

  assert.equal(response.status, 409);
  const body = (await response.json()) as { error: string };
  assert.equal(body.error, "Required approval steps must be completed in order");
});

test("AC-02: unauthorized reviewer cannot acknowledge assigned step", async () => {
  const proposalId = await createEligibleProposal("AC-02 Unauthorized Reviewer");
  const reviewRequest = await createReviewRequest(proposalId);
  await assignReviewRequest(reviewRequest.id);

  const response = await fetch(`${apiBaseUrl}/review-requests/${reviewRequest.id}/approval-steps/1/acknowledge`, {
    method: "PATCH",
    headers: {
      cookie: editorBCookie
    }
  });

  assert.equal(response.status, 403);
  const body = (await response.json()) as { error: string };
  assert.equal(body.error, "You do not have permission to act on this approval step");
});

test("AC-03: acknowledgment captures actor attribution and timestamp", async () => {
  const proposalId = await createEligibleProposal("AC-03 Acknowledge Attribution");
  const reviewRequest = await createReviewRequest(proposalId);
  await assignReviewRequest(reviewRequest.id);

  const response = await fetch(`${apiBaseUrl}/review-requests/${reviewRequest.id}/approval-steps/1/acknowledge`, {
    method: "PATCH",
    headers: {
      cookie: editorACookie
    }
  });

  assert.equal(response.status, 200);
  const chain = (await response.json()) as ApprovalChainResponse;

  const stepOne = chain.steps.find((step) => step.stepOrder === 1);
  assert.ok(stepOne);
  assert.equal(stepOne.status, "ACKNOWLEDGED");
  assert.equal(stepOne.acknowledgedById, editorAUserId);
  assert.notEqual(stepOne.acknowledgedAt, null);
});

test("AC-04: required-step rejection applies deterministic downstream state", async () => {
  const proposalId = await createEligibleProposal("AC-04 Rejection Downstream State");
  const reviewRequest = await createReviewRequest(proposalId);
  await assignReviewRequest(reviewRequest.id);

  const response = await fetch(`${apiBaseUrl}/review-requests/${reviewRequest.id}/approval-steps/1/decision`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: editorACookie
    },
    body: JSON.stringify({
      decision: "REJECT",
      decisionNote: "Blocking issue found"
    })
  });

  assert.equal(response.status, 200);
  const chain = (await response.json()) as ApprovalChainResponse;

  assert.equal(chain.status, "REJECTED");
  assert.notEqual(chain.finalizedAt, null);

  const stepOne = chain.steps.find((step) => step.stepOrder === 1);
  const stepTwo = chain.steps.find((step) => step.stepOrder === 2);
  assert.ok(stepOne);
  assert.ok(stepTwo);

  assert.equal(stepOne.status, "REJECTED");
  assert.equal(stepOne.decidedById, editorAUserId);
  assert.notEqual(stepOne.decidedAt, null);
  assert.equal(stepTwo.status, "CANCELED");
});

test("AC-05: in-order decisions can finalize chain approval", async () => {
  const proposalId = await createEligibleProposal("AC-05 Finalize Approval");
  const reviewRequest = await createReviewRequest(proposalId);
  await assignReviewRequest(reviewRequest.id);

  const stepOneDecisionResponse = await fetch(
    `${apiBaseUrl}/review-requests/${reviewRequest.id}/approval-steps/1/decision`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: editorACookie
      },
      body: JSON.stringify({
        decision: "APPROVE",
        decisionNote: "Reviewer approved"
      })
    }
  );
  assert.equal(stepOneDecisionResponse.status, 200);

  const stepTwoDecisionResponse = await fetch(
    `${apiBaseUrl}/review-requests/${reviewRequest.id}/approval-steps/2/decision`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: adminCookie
      },
      body: JSON.stringify({
        decision: "APPROVE",
        decisionNote: "Final approval"
      })
    }
  );

  assert.equal(stepTwoDecisionResponse.status, 200);
  const chain = (await stepTwoDecisionResponse.json()) as ApprovalChainResponse;
  assert.equal(chain.status, "APPROVED");
  assert.notEqual(chain.finalizedAt, null);

  const stepOne = chain.steps.find((step) => step.stepOrder === 1);
  const stepTwo = chain.steps.find((step) => step.stepOrder === 2);
  assert.ok(stepOne);
  assert.ok(stepTwo);
  assert.equal(stepOne.status, "APPROVED");
  assert.equal(stepTwo.status, "APPROVED");
});

test("AC-06: invalid step access returns not found", async () => {
  const proposalId = await createEligibleProposal("AC-06 Invalid Step Access");
  const reviewRequest = await createReviewRequest(proposalId);
  await assignReviewRequest(reviewRequest.id);

  const response = await fetch(`${apiBaseUrl}/review-requests/${reviewRequest.id}/approval-steps/99/decision`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      decision: "APPROVE"
    })
  });

  assert.equal(response.status, 404);
  const body = (await response.json()) as { error: string };
  assert.equal(body.error, "Review request approval step not found");
});
