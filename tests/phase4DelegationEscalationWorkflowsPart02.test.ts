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

type ApprovalStepModel = {
  updateMany: (args: {
    where: {
      chain: {
        reviewRequestId: string;
      };
      stepOrder: number;
    };
    data: {
      updatedAt: Date;
    };
  }) => Promise<{ count: number }>;
};

const proposalModel = (prismaClient as unknown as { proposal: ProposalModel }).proposal;
const reviewRequestModel = (prismaClient as unknown as { reviewRequest: ReviewRequestModel }).reviewRequest;
const approvalStepModel = (prismaClient as unknown as { approvalStep: ApprovalStepModel }).approvalStep;

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
    assignedReviewerId: string | null;
    assignedRole: "PUBLIC" | "EDITOR" | "AUTHOR_ADMIN" | null;
    escalationLevel: number;
    escalatedAt: string | null;
    escalatedById: string | null;
  }[];
};

type EscalationStateResponse = {
  reviewRequestId: string;
  stepOrder: number;
  stepId: string;
  status: "PENDING" | "ACKNOWLEDGED" | "APPROVED" | "REJECTED" | "CANCELED";
  isEscalated: boolean;
  escalationLevel: number;
  escalatedAt: string | null;
  escalatedById: string | null;
  assignedReviewerId: string | null;
  assignedRole: "PUBLIC" | "EDITOR" | "AUTHOR_ADMIN" | null;
};

type LineageResponse = {
  reviewRequestId: string;
  stepOrder: number;
  stepId: string;
  currentStatus: "PENDING" | "ACKNOWLEDGED" | "APPROVED" | "REJECTED" | "CANCELED";
  currentAssignedReviewerId: string | null;
  currentAssignedRole: "PUBLIC" | "EDITOR" | "AUTHOR_ADMIN" | null;
  escalationLevel: number;
  events: {
    eventType: "DELEGATED" | "ESCALATED";
    reasonCode: string;
    actorUserId: string;
    fromAssignedReviewerId: string | null;
    toAssignedReviewerId: string | null;
    toAssignedRole: "PUBLIC" | "EDITOR" | "AUTHOR_ADMIN" | null;
    escalationLevel: number;
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
    email: `phase4-delegation-editor-a-${timestamp}@example.com`,
    password: "Phase4DelegationEditorA!234",
    role: Role.EDITOR,
    displayName: "Phase4 Delegation Editor A"
  },
  editorB: {
    email: `phase4-delegation-editor-b-${timestamp}@example.com`,
    password: "Phase4DelegationEditorB!234",
    role: Role.EDITOR,
    displayName: "Phase4 Delegation Editor B"
  }
} as const;

const slugs = {
  entity: `phase4-delegation-entity-${timestamp}`
};

let apiBaseUrl = "";
let adminCookie = "";
let editorACookie = "";
let editorBCookie = "";
let entityId = "";
let editorAUserId = "";
let editorBUserId = "";
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
  editorBUserId = await findUserIdByEmail(userRecords.editorB.email);

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
          name: "Part 02 Delegation Character",
          summary: "Part 02 delegation target",
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

test("AC-01: delegation reassigns the step and records lineage attribution", async () => {
  const proposalId = await createEligibleProposal("AC-01 Delegation Lineage");
  const reviewRequest = await createReviewRequest(proposalId);
  await assignReviewRequest(reviewRequest.id);

  const delegateResponse = await fetch(
    `${apiBaseUrl}/review-requests/${reviewRequest.id}/approval-steps/1/delegate`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: editorACookie
      },
      body: JSON.stringify({
        delegateToUserId: editorBUserId,
        reasonCode: "UNAVAILABLE",
        reasonNote: "Out of office"
      })
    }
  );

  assert.equal(delegateResponse.status, 200);
  const chain = (await delegateResponse.json()) as ApprovalChainResponse;
  const stepOne = chain.steps.find((step) => step.stepOrder === 1);
  assert.ok(stepOne);
  assert.equal(stepOne.assignedReviewerId, editorBUserId);
  assert.equal(stepOne.status, "PENDING");

  const lineageResponse = await fetch(
    `${apiBaseUrl}/review-requests/${reviewRequest.id}/approval-steps/1/lineage`,
    {
      method: "GET",
      headers: {
        cookie: adminCookie
      }
    }
  );

  assert.equal(lineageResponse.status, 200);
  const lineage = (await lineageResponse.json()) as LineageResponse;
  assert.equal(lineage.events.length, 1);
  assert.equal(lineage.events[0]?.eventType, "DELEGATED");
  assert.equal(lineage.events[0]?.reasonCode, "UNAVAILABLE");
  assert.equal(lineage.events[0]?.actorUserId, editorAUserId);
  assert.equal(lineage.events[0]?.fromAssignedReviewerId, editorAUserId);
  assert.equal(lineage.events[0]?.toAssignedReviewerId, editorBUserId);
});

test("AC-02: unauthorized delegation attempts are rejected", async () => {
  const proposalId = await createEligibleProposal("AC-02 Unauthorized Delegation");
  const reviewRequest = await createReviewRequest(proposalId);
  await assignReviewRequest(reviewRequest.id);

  const response = await fetch(`${apiBaseUrl}/review-requests/${reviewRequest.id}/approval-steps/1/delegate`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: editorBCookie
    },
    body: JSON.stringify({
      delegateToUserId: editorAUserId,
      reasonCode: "WORKLOAD_BALANCING"
    })
  });

  assert.equal(response.status, 403);
  const body = (await response.json()) as { error: string };
  assert.equal(body.error, "You do not have permission to act on this approval step");
});

test("AC-03: escalation threshold reason requires configured elapsed time", async () => {
  const proposalId = await createEligibleProposal("AC-03 Escalation Threshold");
  const reviewRequest = await createReviewRequest(proposalId);
  await assignReviewRequest(reviewRequest.id);

  const tooEarlyResponse = await fetch(
    `${apiBaseUrl}/review-requests/${reviewRequest.id}/approval-steps/1/escalate`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: editorACookie
      },
      body: JSON.stringify({
        reasonCode: "TIME_THRESHOLD_EXCEEDED"
      })
    }
  );

  assert.equal(tooEarlyResponse.status, 409);

  const staleTimestamp = new Date(Date.now() - 25 * 60 * 60 * 1000);
  const updateResult = await approvalStepModel.updateMany({
    where: {
      chain: {
        reviewRequestId: reviewRequest.id
      },
      stepOrder: 1
    },
    data: {
      updatedAt: staleTimestamp
    }
  });
  assert.equal(updateResult.count, 1);

  const escalateResponse = await fetch(
    `${apiBaseUrl}/review-requests/${reviewRequest.id}/approval-steps/1/escalate`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: editorACookie
      },
      body: JSON.stringify({
        reasonCode: "TIME_THRESHOLD_EXCEEDED",
        reasonNote: "SLA exceeded"
      })
    }
  );

  assert.equal(escalateResponse.status, 200);
  const chain = (await escalateResponse.json()) as ApprovalChainResponse;
  const stepOne = chain.steps.find((step) => step.stepOrder === 1);
  assert.ok(stepOne);
  assert.equal(stepOne.assignedReviewerId, null);
  assert.equal(stepOne.assignedRole, "AUTHOR_ADMIN");
  assert.equal(stepOne.escalationLevel, 1);
  assert.notEqual(stepOne.escalatedAt, null);
  assert.notEqual(stepOne.escalatedById, null);
});

test("AC-04: unauthorized escalation attempts are rejected", async () => {
  const proposalId = await createEligibleProposal("AC-04 Unauthorized Escalation");
  const reviewRequest = await createReviewRequest(proposalId);
  await assignReviewRequest(reviewRequest.id);

  const response = await fetch(`${apiBaseUrl}/review-requests/${reviewRequest.id}/approval-steps/1/escalate`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: editorBCookie
    },
    body: JSON.stringify({
      reasonCode: "UNAVAILABLE_REVIEWER"
    })
  });

  assert.equal(response.status, 403);
  const body = (await response.json()) as { error: string };
  assert.equal(body.error, "You do not have permission to act on this approval step");
});

test("AC-05: read endpoints expose escalation state and lineage history", async () => {
  const proposalId = await createEligibleProposal("AC-05 Escalation Read Surface");
  const reviewRequest = await createReviewRequest(proposalId);
  await assignReviewRequest(reviewRequest.id);

  const escalateResponse = await fetch(
    `${apiBaseUrl}/review-requests/${reviewRequest.id}/approval-steps/1/escalate`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: editorACookie
      },
      body: JSON.stringify({
        reasonCode: "UNAVAILABLE_REVIEWER",
        reasonNote: "Reviewer unavailable"
      })
    }
  );
  assert.equal(escalateResponse.status, 200);

  const escalationStateResponse = await fetch(
    `${apiBaseUrl}/review-requests/${reviewRequest.id}/approval-steps/1/escalation-state`,
    {
      method: "GET",
      headers: {
        cookie: adminCookie
      }
    }
  );

  assert.equal(escalationStateResponse.status, 200);
  const state = (await escalationStateResponse.json()) as EscalationStateResponse;
  assert.equal(state.isEscalated, true);
  assert.equal(state.escalationLevel, 1);
  assert.equal(state.assignedRole, "AUTHOR_ADMIN");

  const lineageResponse = await fetch(
    `${apiBaseUrl}/review-requests/${reviewRequest.id}/approval-steps/1/lineage`,
    {
      method: "GET",
      headers: {
        cookie: adminCookie
      }
    }
  );

  assert.equal(lineageResponse.status, 200);
  const lineage = (await lineageResponse.json()) as LineageResponse;
  assert.equal(lineage.events.length, 1);
  assert.equal(lineage.events[0]?.eventType, "ESCALATED");
  assert.equal(lineage.events[0]?.reasonCode, "UNAVAILABLE_REVIEWER");
  assert.equal(lineage.events[0]?.toAssignedRole, "AUTHOR_ADMIN");
  assert.equal(lineage.events[0]?.actorUserId, editorAUserId);
});

test("AC-06: escalation is blocked when the step is already escalated", async () => {
  const proposalId = await createEligibleProposal("AC-06 Escalation Already Applied");
  const reviewRequest = await createReviewRequest(proposalId);
  await assignReviewRequest(reviewRequest.id);

  const firstEscalate = await fetch(`${apiBaseUrl}/review-requests/${reviewRequest.id}/approval-steps/1/escalate`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: editorACookie
    },
    body: JSON.stringify({
      reasonCode: "UNAVAILABLE_REVIEWER"
    })
  });
  assert.equal(firstEscalate.status, 200);

  const secondEscalate = await fetch(`${apiBaseUrl}/review-requests/${reviewRequest.id}/approval-steps/1/escalate`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      reasonCode: "CONFLICT_OF_INTEREST"
    })
  });

  assert.equal(secondEscalate.status, 409);
  const body = (await secondEscalate.json()) as { error: string };
  assert.equal(body.error, "Approval step is already escalated to AUTHOR_ADMIN");
});
