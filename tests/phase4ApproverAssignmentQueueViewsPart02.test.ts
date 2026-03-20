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
  status: "OPEN" | "CLOSED";
  proposal: {
    id: string;
    entityId: string | null;
    manuscriptId: string | null;
    status: "PENDING" | "ACCEPTED" | "REJECTED";
    workflowState: "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "APPLIED" | "ARCHIVED";
  };
  createdBy: {
    userId: string;
    email: string;
    displayName: string;
    role: "PUBLIC" | "EDITOR" | "AUTHOR_ADMIN";
  };
  assignedApprover: {
    userId: string;
    email: string;
    displayName: string;
    role: "PUBLIC" | "EDITOR" | "AUTHOR_ADMIN";
  } | null;
};

type ReviewRequestQueueResponse = {
  reviewRequests: ReviewRequestResponse[];
  total: number;
  assigneeUserId: string | null;
  status: "OPEN" | "CLOSED";
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
  editorA: {
    email: `phase4-assignment-editor-a-${timestamp}@example.com`,
    password: "Phase4AssignEditorA!234",
    role: Role.EDITOR,
    displayName: "Phase4 Assignment Editor A"
  },
  editorB: {
    email: `phase4-assignment-editor-b-${timestamp}@example.com`,
    password: "Phase4AssignEditorB!234",
    role: Role.EDITOR,
    displayName: "Phase4 Assignment Editor B"
  },
  public: {
    email: `phase4-assignment-public-${timestamp}@example.com`,
    password: "Phase4AssignPublic!234",
    role: Role.PUBLIC,
    displayName: "Phase4 Assignment Public"
  }
} as const;

const slugs = {
  entity: `phase4-assignment-queue-entity-${timestamp}`
};

let apiBaseUrl = "";
let adminCookie = "";
let editorACookie = "";
let editorBCookie = "";
let publicCookie = "";
let entityId = "";
let adminUserId = "";
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

const approveProposal = async (proposalId: string): Promise<void> => {
  const approveResponse = await fetch(`${apiBaseUrl}/proposals/${proposalId}/approve`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      reviewNotes: "Approved during queue filtering test"
    })
  });

  assert.equal(approveResponse.status, 200);
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

  adminUserId = await findUserIdByEmail(userRecords.authorAdmin.email);
  editorAUserId = await findUserIdByEmail(userRecords.editorA.email);
  editorBUserId = await findUserIdByEmail(userRecords.editorB.email);

  adminCookie = await createSession(userRecords.authorAdmin.email, userRecords.authorAdmin.password);
  editorACookie = await createSession(userRecords.editorA.email, userRecords.editorA.password);
  editorBCookie = await createSession(userRecords.editorB.email, userRecords.editorB.password);
  publicCookie = await createSession(userRecords.public.email, userRecords.public.password);

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
          name: "Part 02 Review Request Character",
          summary: "Part 02 assignment queue target",
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
          in: [
            userRecords.authorAdmin.email,
            userRecords.editorA.email,
            userRecords.editorB.email,
            userRecords.public.email
          ]
        }
      }
    }
  });

  await prismaClient.user.deleteMany({
    where: {
      email: {
        in: [userRecords.editorA.email, userRecords.editorB.email, userRecords.public.email]
      }
    }
  });

  await prismaClient.$disconnect();
});

test("AC-01: admin can assign and reassign approvers with assignment history", async () => {
  const proposalId = await createEligibleProposal("Part 02 AC-01 Proposal");
  const reviewRequest = await createReviewRequest(proposalId);

  const firstAssignResponse = await assignReviewRequest({
    reviewRequestId: reviewRequest.id,
    assigneeUserId: editorAUserId,
    cookie: adminCookie
  });

  assert.equal(firstAssignResponse.status, 200);
  const firstAssignment = (await firstAssignResponse.json()) as ReviewRequestResponse;

  assert.equal(firstAssignment.assignedApproverId, editorAUserId);
  assert.equal(firstAssignment.assignedApprover?.userId, editorAUserId);
  assert.equal(firstAssignment.assignmentHistory.length, 1);
  assert.equal(firstAssignment.assignmentHistory[0]?.assignedById, adminUserId);
  assert.equal(firstAssignment.assignmentHistory[0]?.previousAssignedApproverId, null);

  const secondAssignResponse = await assignReviewRequest({
    reviewRequestId: reviewRequest.id,
    assigneeUserId: editorBUserId,
    cookie: adminCookie
  });

  assert.equal(secondAssignResponse.status, 200);
  const secondAssignment = (await secondAssignResponse.json()) as ReviewRequestResponse;

  assert.equal(secondAssignment.assignedApproverId, editorBUserId);
  assert.equal(secondAssignment.assignmentHistory.length, 2);
  assert.equal(secondAssignment.assignmentHistory[1]?.assignedById, adminUserId);
  assert.equal(secondAssignment.assignmentHistory[1]?.assignedApproverId, editorBUserId);
  assert.equal(secondAssignment.assignmentHistory[1]?.previousAssignedApproverId, editorAUserId);
});

test("AC-02: assignment enforces role and policy checks", async () => {
  const proposalId = await createEligibleProposal("Part 02 AC-02 Proposal");
  const reviewRequest = await createReviewRequest(proposalId);

  const initialAssignResponse = await assignReviewRequest({
    reviewRequestId: reviewRequest.id,
    assigneeUserId: editorAUserId,
    cookie: adminCookie
  });
  assert.equal(initialAssignResponse.status, 200);

  const unauthorizedEditorResponse = await assignReviewRequest({
    reviewRequestId: reviewRequest.id,
    assigneeUserId: editorBUserId,
    cookie: editorBCookie
  });

  assert.equal(unauthorizedEditorResponse.status, 403);
  const unauthorizedBody = (await unauthorizedEditorResponse.json()) as { error: string };
  assert.equal(unauthorizedBody.error, "You do not have permission to assign approvers");

  const authorizedAssignedEditorResponse = await assignReviewRequest({
    reviewRequestId: reviewRequest.id,
    assigneeUserId: editorBUserId,
    cookie: editorACookie
  });

  assert.equal(authorizedAssignedEditorResponse.status, 200);

  const publicResponse = await assignReviewRequest({
    reviewRequestId: reviewRequest.id,
    assigneeUserId: editorAUserId,
    cookie: publicCookie
  });

  assert.equal(publicResponse.status, 403);
});

test("AC-03: reviewer queue is assignee scoped", async () => {
  const proposalOne = await createEligibleProposal("Part 02 AC-03 Proposal One");
  const proposalTwo = await createEligibleProposal("Part 02 AC-03 Proposal Two");

  const requestOne = await createReviewRequest(proposalOne);
  const requestTwo = await createReviewRequest(proposalTwo);

  const assignOne = await assignReviewRequest({
    reviewRequestId: requestOne.id,
    assigneeUserId: editorAUserId,
    cookie: adminCookie
  });
  assert.equal(assignOne.status, 200);

  const assignTwo = await assignReviewRequest({
    reviewRequestId: requestTwo.id,
    assigneeUserId: editorBUserId,
    cookie: adminCookie
  });
  assert.equal(assignTwo.status, 200);

  const reviewerQueueResponse = await fetch(`${apiBaseUrl}/review-requests/queue/reviewer`, {
    headers: {
      cookie: editorACookie
    }
  });

  assert.equal(reviewerQueueResponse.status, 200);
  const reviewerQueue = (await reviewerQueueResponse.json()) as ReviewRequestQueueResponse;

  assert.equal(reviewerQueue.assigneeUserId, editorAUserId);
  assert.equal(reviewerQueue.reviewRequests.every((item) => item.assignedApproverId === editorAUserId), true);

  const forbiddenScopedQueryResponse = await fetch(
    `${apiBaseUrl}/review-requests/queue/reviewer?assigneeUserId=${editorBUserId}`,
    {
      headers: {
        cookie: editorACookie
      }
    }
  );

  assert.equal(forbiddenScopedQueryResponse.status, 403);
});

test("AC-04: queue filters support workflow state and deterministic ordering", async () => {
  const firstProposalId = await createEligibleProposal("Part 02 AC-04 Proposal One");
  const firstRequest = await createReviewRequest(firstProposalId);
  const firstAssignResponse = await assignReviewRequest({
    reviewRequestId: firstRequest.id,
    assigneeUserId: editorAUserId,
    cookie: adminCookie
  });
  assert.equal(firstAssignResponse.status, 200);

  await new Promise((resolve) => setTimeout(resolve, 10));

  const secondProposalId = await createEligibleProposal("Part 02 AC-04 Proposal Two");
  const secondRequest = await createReviewRequest(secondProposalId);
  const secondAssignResponse = await assignReviewRequest({
    reviewRequestId: secondRequest.id,
    assigneeUserId: editorAUserId,
    cookie: adminCookie
  });
  assert.equal(secondAssignResponse.status, 200);

  await new Promise((resolve) => setTimeout(resolve, 10));

  const thirdProposalId = await createEligibleProposal("Part 02 AC-04 Proposal Three");
  const thirdRequest = await createReviewRequest(thirdProposalId);
  const thirdAssignResponse = await assignReviewRequest({
    reviewRequestId: thirdRequest.id,
    assigneeUserId: editorBUserId,
    cookie: adminCookie
  });
  assert.equal(thirdAssignResponse.status, 200);

  const adminQueueResponse = await fetch(
    `${apiBaseUrl}/review-requests/queue/admin?assigneeUserId=${editorAUserId}&limit=100&offset=0`,
    {
      headers: {
        cookie: adminCookie
      }
    }
  );

  assert.equal(adminQueueResponse.status, 200);
  const adminQueue = (await adminQueueResponse.json()) as ReviewRequestQueueResponse;

  assert.equal(adminQueue.limit, 100);
  assert.equal(adminQueue.offset, 0);
  const firstRequestIndex = adminQueue.reviewRequests.findIndex((item) => item.id === firstRequest.id);
  const secondRequestIndex = adminQueue.reviewRequests.findIndex((item) => item.id === secondRequest.id);
  assert.equal(firstRequestIndex >= 0, true);
  assert.equal(secondRequestIndex >= 0, true);
  assert.equal(firstRequestIndex < secondRequestIndex, true);

  const pagedFirstResponse = await fetch(
    `${apiBaseUrl}/review-requests/queue/admin?assigneeUserId=${editorAUserId}&limit=1&offset=${firstRequestIndex}`,
    {
      headers: {
        cookie: adminCookie
      }
    }
  );

  assert.equal(pagedFirstResponse.status, 200);
  const pagedFirst = (await pagedFirstResponse.json()) as ReviewRequestQueueResponse;
  assert.equal(pagedFirst.reviewRequests.length, 1);
  assert.equal(pagedFirst.reviewRequests[0]?.id, firstRequest.id);

  const pagedSecondResponse = await fetch(
    `${apiBaseUrl}/review-requests/queue/admin?assigneeUserId=${editorAUserId}&limit=1&offset=${secondRequestIndex}`,
    {
      headers: {
        cookie: adminCookie
      }
    }
  );

  assert.equal(pagedSecondResponse.status, 200);
  const pagedSecond = (await pagedSecondResponse.json()) as ReviewRequestQueueResponse;
  assert.equal(pagedSecond.reviewRequests.length, 1);
  assert.equal(pagedSecond.reviewRequests[0]?.id, secondRequest.id);

  const editorAFilteredResponse = await fetch(
    `${apiBaseUrl}/review-requests/queue/admin?assigneeUserId=${editorAUserId}`,
    {
      headers: {
        cookie: adminCookie
      }
    }
  );

  assert.equal(editorAFilteredResponse.status, 200);
  const editorAFilteredQueue = (await editorAFilteredResponse.json()) as ReviewRequestQueueResponse;
  assert.equal(editorAFilteredQueue.reviewRequests.length >= 2, true);
  assert.equal(editorAFilteredQueue.reviewRequests.every((item) => item.assignedApproverId === editorAUserId), true);

  await approveProposal(secondProposalId);

  const inReviewOnlyResponse = await fetch(
    `${apiBaseUrl}/review-requests/queue/admin?workflowState=IN_REVIEW&assigneeUserId=${editorAUserId}`,
    {
      headers: {
        cookie: adminCookie
      }
    }
  );

  assert.equal(inReviewOnlyResponse.status, 200);
  const inReviewOnlyQueue = (await inReviewOnlyResponse.json()) as ReviewRequestQueueResponse;
  assert.equal(inReviewOnlyQueue.reviewRequests.every((item) => item.proposal.workflowState === "IN_REVIEW"), true);
  assert.equal(inReviewOnlyQueue.reviewRequests.some((item) => item.id === secondRequest.id), false);
});

test("AC-05: admin queue access is restricted to admin role", async () => {
  const editorAdminQueueResponse = await fetch(`${apiBaseUrl}/review-requests/queue/admin`, {
    headers: {
      cookie: editorACookie
    }
  });

  assert.equal(editorAdminQueueResponse.status, 403);
});
