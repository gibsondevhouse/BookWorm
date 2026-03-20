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
  workflowState: "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "APPLIED" | "ARCHIVED";
};

type ReviewRequestStatusValue = "OPEN" | "ACKNOWLEDGED" | "IN_REVIEW" | "RESOLVED" | "CANCELED";

type LifecycleHistoryEntry = {
  transitionedAt: string;
  fromStatus: ReviewRequestStatusValue;
  toStatus: ReviewRequestStatusValue;
  transitionedById: string;
  transitionedByRole: "PUBLIC" | "EDITOR" | "AUTHOR_ADMIN";
};

type ReviewRequestResponse = {
  id: string;
  createdAt: string;
  updatedAt: string;
  proposalId: string;
  createdById: string;
  assignedApproverId: string | null;
  assignedAt: string | null;
  assignmentHistory: {
    assignedAt: string;
    assignedById: string;
    assignedApproverId: string;
    previousAssignedApproverId: string | null;
  }[];
  lifecycleHistory: LifecycleHistoryEntry[];
  status: ReviewRequestStatusValue;
};

type ReviewRequestLifecycleHistoryResponse = {
  reviewRequestId: string;
  currentStatus: ReviewRequestStatusValue;
  lifecycleHistory: LifecycleHistoryEntry[];
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
    email: `phase4-lifecycle-editor-a-${timestamp}@example.com`,
    password: "Phase4LifecycleEditorA!234",
    role: Role.EDITOR,
    displayName: "Phase4 Lifecycle Editor A"
  },
  editorB: {
    email: `phase4-lifecycle-editor-b-${timestamp}@example.com`,
    password: "Phase4LifecycleEditorB!234",
    role: Role.EDITOR,
    displayName: "Phase4 Lifecycle Editor B"
  }
} as const;

const slugs = {
  entity: `phase4-lifecycle-entity-${timestamp}`
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
    const text = await response.text();
    throw new Error(`Failed to create session for ${email}: ${response.status} ${text}`);
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

const createProposalAsEditorA = async (title: string): Promise<string> => {
  const response = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/proposals`, {
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

  assert.equal(response.status, 201);
  const proposal = (await response.json()) as ProposalResponse;
  createdProposalIds.push(proposal.id);

  return proposal.id;
};

const transitionProposalToInReview = async (proposalId: string): Promise<void> => {
  const submitResponse = await fetch(`${apiBaseUrl}/proposals/${proposalId}/submit`, {
    method: "POST",
    headers: {
      cookie: editorACookie
    }
  });
  assert.equal(submitResponse.status, 200);

  const startReviewResponse = await fetch(`${apiBaseUrl}/proposals/${proposalId}/start-review`, {
    method: "POST",
    headers: {
      cookie: adminCookie
    }
  });
  assert.equal(startReviewResponse.status, 200);
};

const rejectProposal = async (proposalId: string): Promise<void> => {
  const response = await fetch(`${apiBaseUrl}/proposals/${proposalId}/reject`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      reviewNotes: "Rejected for lifecycle validation",
      decisionNote: "Rejected for lifecycle validation"
    })
  });

  if (response.status !== 200) {
    throw new Error(`Expected reject proposal to return 200, received ${response.status}: ${await response.text()}`);
  }
};

const createEligibleProposal = async (title: string): Promise<string> => {
  const proposalId = await createProposalAsEditorA(title);
  await transitionProposalToInReview(proposalId);

  return proposalId;
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

const assignReviewRequest = async (input: {
  reviewRequestId: string;
  assigneeUserId: string;
  cookie: string;
}): Promise<Response> => {
  return fetch(`${apiBaseUrl}/review-requests/${input.reviewRequestId}/assign`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: input.cookie
    },
    body: JSON.stringify({ assigneeUserId: input.assigneeUserId })
  });
};

const transitionReviewRequest = async (input: {
  reviewRequestId: string;
  status: ReviewRequestStatusValue;
  cookie: string;
}): Promise<Response> => {
  return fetch(`${apiBaseUrl}/review-requests/${input.reviewRequestId}/lifecycle`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: input.cookie
    },
    body: JSON.stringify({ status: input.status })
  });
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
          name: "Part 03 Review Request Character",
          summary: "Part 03 lifecycle target",
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

test("AC-01: permitted lifecycle transitions are attributed and queryable", async () => {
  const proposalId = await createEligibleProposal("Part 03 AC-01 Proposal");
  const reviewRequest = await createReviewRequest(proposalId);

  const assignResponse = await assignReviewRequest({
    reviewRequestId: reviewRequest.id,
    assigneeUserId: editorAUserId,
    cookie: adminCookie
  });
  assert.equal(assignResponse.status, 200);

  const acknowledgeResponse = await transitionReviewRequest({
    reviewRequestId: reviewRequest.id,
    status: "ACKNOWLEDGED",
    cookie: editorACookie
  });
  assert.equal(acknowledgeResponse.status, 200);

  const inReviewResponse = await transitionReviewRequest({
    reviewRequestId: reviewRequest.id,
    status: "IN_REVIEW",
    cookie: editorACookie
  });
  assert.equal(inReviewResponse.status, 200);

  await rejectProposal(proposalId);

  const resolveResponse = await transitionReviewRequest({
    reviewRequestId: reviewRequest.id,
    status: "RESOLVED",
    cookie: editorACookie
  });
  if (resolveResponse.status !== 200) {
    throw new Error(`Expected resolve transition to return 200, received ${resolveResponse.status}: ${await resolveResponse.text()}`);
  }
  const resolved = (await resolveResponse.json()) as ReviewRequestResponse;

  assert.equal(resolved.status, "RESOLVED");
  assert.equal(resolved.lifecycleHistory.length, 3);
  assert.equal(resolved.lifecycleHistory[0]?.fromStatus, "OPEN");
  assert.equal(resolved.lifecycleHistory[0]?.toStatus, "ACKNOWLEDGED");
  assert.equal(resolved.lifecycleHistory[2]?.fromStatus, "IN_REVIEW");
  assert.equal(resolved.lifecycleHistory[2]?.toStatus, "RESOLVED");
  assert.equal(resolved.lifecycleHistory[2]?.transitionedById, editorAUserId);

  const historyResponse = await fetch(`${apiBaseUrl}/review-requests/${reviewRequest.id}/lifecycle-history`, {
    headers: {
      cookie: adminCookie
    }
  });

  assert.equal(historyResponse.status, 200);
  const history = (await historyResponse.json()) as ReviewRequestLifecycleHistoryResponse;

  assert.equal(history.reviewRequestId, reviewRequest.id);
  assert.equal(history.currentStatus, "RESOLVED");
  assert.equal(history.lifecycleHistory.length, 3);
  assert.equal(history.lifecycleHistory[1]?.fromStatus, "ACKNOWLEDGED");
  assert.equal(history.lifecycleHistory[1]?.toStatus, "IN_REVIEW");
  assert.equal(history.lifecycleHistory.every((entry) => entry.transitionedByRole === "EDITOR"), true);
});

test("AC-02: forbidden lifecycle transitions are rejected deterministically", async () => {
  const proposalId = await createEligibleProposal("Part 03 AC-02 Proposal");
  const reviewRequest = await createReviewRequest(proposalId);

  const assignResponse = await assignReviewRequest({
    reviewRequestId: reviewRequest.id,
    assigneeUserId: editorAUserId,
    cookie: adminCookie
  });
  assert.equal(assignResponse.status, 200);

  const invalidFromOpen = await transitionReviewRequest({
    reviewRequestId: reviewRequest.id,
    status: "RESOLVED",
    cookie: editorACookie
  });

  assert.equal(invalidFromOpen.status, 409);
  const invalidFromOpenBody = (await invalidFromOpen.json()) as { error: string };
  assert.equal(invalidFromOpenBody.error, "Review request lifecycle transition is not permitted");

  const acknowledgeResponse = await transitionReviewRequest({
    reviewRequestId: reviewRequest.id,
    status: "ACKNOWLEDGED",
    cookie: editorACookie
  });
  assert.equal(acknowledgeResponse.status, 200);

  const invalidFromAcknowledged = await transitionReviewRequest({
    reviewRequestId: reviewRequest.id,
    status: "RESOLVED",
    cookie: editorACookie
  });

  assert.equal(invalidFromAcknowledged.status, 409);
  const invalidFromAcknowledgedBody = (await invalidFromAcknowledged.json()) as { error: string };
  assert.equal(invalidFromAcknowledgedBody.error, "Review request lifecycle transition is not permitted");
});

test("AC-03: conflicting review-request and proposal state combinations are blocked", async () => {
  const proposalId = await createEligibleProposal("Part 03 AC-03 Proposal");
  const reviewRequest = await createReviewRequest(proposalId);

  const assignResponse = await assignReviewRequest({
    reviewRequestId: reviewRequest.id,
    assigneeUserId: editorAUserId,
    cookie: adminCookie
  });
  assert.equal(assignResponse.status, 200);

  const acknowledgeResponse = await transitionReviewRequest({
    reviewRequestId: reviewRequest.id,
    status: "ACKNOWLEDGED",
    cookie: editorACookie
  });
  assert.equal(acknowledgeResponse.status, 200);

  const inReviewResponse = await transitionReviewRequest({
    reviewRequestId: reviewRequest.id,
    status: "IN_REVIEW",
    cookie: editorACookie
  });
  assert.equal(inReviewResponse.status, 200);

  const resolveBeforeDecision = await transitionReviewRequest({
    reviewRequestId: reviewRequest.id,
    status: "RESOLVED",
    cookie: editorACookie
  });

  assert.equal(resolveBeforeDecision.status, 409);
  const resolveBeforeDecisionBody = (await resolveBeforeDecision.json()) as { error: string };
  assert.equal(resolveBeforeDecisionBody.error, "Review request lifecycle transition conflicts with current proposal status");

  await rejectProposal(proposalId);

  const resolveAfterDecision = await transitionReviewRequest({
    reviewRequestId: reviewRequest.id,
    status: "RESOLVED",
    cookie: editorACookie
  });
  if (resolveAfterDecision.status !== 200) {
    throw new Error(
      `Expected post-decision resolve transition to return 200, received ${resolveAfterDecision.status}: ${await resolveAfterDecision.text()}`
    );
  }
});

test("AC-04: transition authorization and concurrent transition guardrails apply", async () => {
  const proposalId = await createEligibleProposal("Part 03 AC-04 Proposal");
  const reviewRequest = await createReviewRequest(proposalId);

  const assignResponse = await assignReviewRequest({
    reviewRequestId: reviewRequest.id,
    assigneeUserId: editorAUserId,
    cookie: adminCookie
  });
  assert.equal(assignResponse.status, 200);

  const unauthorizedEditorTransition = await transitionReviewRequest({
    reviewRequestId: reviewRequest.id,
    status: "ACKNOWLEDGED",
    cookie: editorBCookie
  });

  assert.equal(unauthorizedEditorTransition.status, 403);

  const [firstTransition, secondTransition] = await Promise.all([
    transitionReviewRequest({
      reviewRequestId: reviewRequest.id,
      status: "ACKNOWLEDGED",
      cookie: editorACookie
    }),
    transitionReviewRequest({
      reviewRequestId: reviewRequest.id,
      status: "ACKNOWLEDGED",
      cookie: adminCookie
    })
  ]);

  const statusCodes = [firstTransition.status, secondTransition.status].sort((a, b) => a - b);
  assert.deepEqual(statusCodes, [200, 409]);
});
