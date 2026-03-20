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

type ApprovalChainModel = {
  updateMany: (args: {
    where: {
      reviewRequestId: {
        in: string[];
      };
    };
    data: {
      finalizedAt: Date;
    };
  }) => Promise<unknown>;
};

const proposalModel = (prismaClient as unknown as { proposal: ProposalModel }).proposal;
const reviewRequestModel = (prismaClient as unknown as { reviewRequest: ReviewRequestModel }).reviewRequest;
const approvalChainModel = (prismaClient as unknown as { approvalChain: ApprovalChainModel }).approvalChain;

type ProposalResponse = {
  id: string;
};

type ReviewRequestResponse = {
  id: string;
};

type DecisionSummaryResponse = {
  window: {
    key: "24h" | "7d" | "30d";
    start: string;
    end: string;
  };
  queueDepth: {
    open: number;
    acknowledged: number;
    inReview: number;
    resolved: number;
    canceled: number;
    total: number;
  };
  decisionOutcomes: {
    approved: number;
    rejected: number;
    pending: number;
  };
  approvalLatencyMs: {
    count: number;
    minimum: number | null;
    maximum: number | null;
    average: number | null;
  };
};

type HistoryTimelineEvent = {
  kind:
    | "REVIEW_REQUEST_CREATED"
    | "APPROVER_ASSIGNED"
    | "LIFECYCLE_TRANSITION"
    | "APPROVAL_STEP_EVENT"
    | "APPROVAL_STEP_ACKNOWLEDGED"
    | "APPROVAL_STEP_DECIDED";
  occurredAt: string;
  eventType?: "DELEGATED" | "ESCALATED";
};

type DecisionHistoryResponse = {
  items: Array<{
    reviewRequestId: string;
    proposalId: string;
    status: "OPEN" | "ACKNOWLEDGED" | "IN_REVIEW" | "RESOLVED" | "CANCELED";
    createdAt: string;
    updatedAt: string;
    approvalChain: {
      id: string;
      status: "ACTIVE" | "APPROVED" | "REJECTED";
      finalizedAt: string | null;
    } | null;
    timeline: HistoryTimelineEvent[];
  }>;
  total: number;
  limit: number;
  offset: number;
};

type StoredAssignmentHistoryEntry = {
  assignedAt: string;
  assignedById: string;
  assignedApproverId: string;
  previousAssignedApproverId: string | null;
};

type StoredLifecycleHistoryEntry = {
  transitionedAt: string;
  fromStatus: string;
  toStatus: string;
  transitionedById: string;
  transitionedByRole: string;
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
    email: `phase4-part03-editor-a-${timestamp}@example.com`,
    password: "Phase4Part03EditorA!234",
    role: Role.EDITOR,
    displayName: "Phase4 Part03 Editor A"
  },
  editorB: {
    email: `phase4-part03-editor-b-${timestamp}@example.com`,
    password: "Phase4Part03EditorB!234",
    role: Role.EDITOR,
    displayName: "Phase4 Part03 Editor B"
  }
} as const;

const slugs = {
  entity: `phase4-part03-entity-${timestamp}`
};

let apiBaseUrl = "";
let adminCookie = "";
let editorACookie = "";
let editorBCookie = "";
let editorAUserId = "";
let editorBUserId = "";
let entityId = "";

const createdProposalIds: string[] = [];
const createdReviewRequestIds: string[] = [];

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

const createReviewRequest = async (proposalId: string): Promise<string> => {
  const response = await fetch(`${apiBaseUrl}/review-requests`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({ proposalId })
  });

  assert.equal(response.status, 201);
  const body = (await response.json()) as ReviewRequestResponse;
  createdReviewRequestIds.push(body.id);
  return body.id;
};

const assignReviewRequest = async (reviewRequestId: string, assigneeUserId: string): Promise<void> => {
  const response = await fetch(`${apiBaseUrl}/review-requests/${reviewRequestId}/assign`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({ assigneeUserId })
  });

  assert.equal(response.status, 200);
};

const acknowledgeStep = async (reviewRequestId: string, stepOrder: number, cookie: string): Promise<void> => {
  const response = await fetch(
    `${apiBaseUrl}/review-requests/${reviewRequestId}/approval-steps/${stepOrder}/acknowledge`,
    {
      method: "PATCH",
      headers: { cookie }
    }
  );

  assert.equal(response.status, 200);
};

const decideStep = async (input: {
  reviewRequestId: string;
  stepOrder: number;
  decision: "APPROVE" | "REJECT";
  cookie: string;
}): Promise<void> => {
  const response = await fetch(
    `${apiBaseUrl}/review-requests/${input.reviewRequestId}/approval-steps/${input.stepOrder}/decision`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: input.cookie
      },
      body: JSON.stringify({
        decision: input.decision,
        decisionNote: `decision-${input.decision.toLowerCase()}`
      })
    }
  );

  assert.equal(response.status, 200);
};

const delegateStep = async (input: {
  reviewRequestId: string;
  stepOrder: number;
  delegateToUserId: string;
  cookie: string;
}): Promise<void> => {
  const response = await fetch(
    `${apiBaseUrl}/review-requests/${input.reviewRequestId}/approval-steps/${input.stepOrder}/delegate`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: input.cookie
      },
      body: JSON.stringify({
        delegateToUserId: input.delegateToUserId,
        reasonCode: "WORKLOAD_BALANCING",
        reasonNote: "handoff"
      })
    }
  );

  assert.equal(response.status, 200);
};

const transitionLifecycle = async (input: {
  reviewRequestId: string;
  status: "OPEN" | "ACKNOWLEDGED" | "IN_REVIEW" | "RESOLVED" | "CANCELED";
  cookie: string;
}): Promise<void> => {
  const response = await fetch(`${apiBaseUrl}/review-requests/${input.reviewRequestId}/lifecycle`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: input.cookie
    },
    body: JSON.stringify({ status: input.status })
  });

  assert.equal(response.status, 200);
};

const acceptProposal = async (proposalId: string): Promise<void> => {
  const response = await fetch(`${apiBaseUrl}/proposals/${proposalId}/accept`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({ reviewNotes: "accepted for part 03" })
  });

  assert.equal(response.status, 200);
};

const getDecisionSummary = async (cookie: string, window: "24h" | "7d" | "30d"): Promise<Response> => {
  return fetch(`${apiBaseUrl}/review-requests/analytics/decision-summary?window=${window}`, {
    headers: { cookie }
  });
};

const getDecisionHistory = async (cookie: string, query = ""): Promise<Response> => {
  const qs = query.length > 0 ? `?${query}` : "";
  return fetch(`${apiBaseUrl}/review-requests/history/timeline${qs}`, {
    headers: { cookie }
  });
};

const parseStoredAssignmentHistory = (value: unknown): StoredAssignmentHistoryEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((candidate): candidate is StoredAssignmentHistoryEntry => {
    if (typeof candidate !== "object" || candidate === null) {
      return false;
    }

    const entry = candidate as Record<string, unknown>;

    return (
      typeof entry.assignedAt === "string" &&
      typeof entry.assignedById === "string" &&
      typeof entry.assignedApproverId === "string" &&
      (entry.previousAssignedApproverId === null || typeof entry.previousAssignedApproverId === "string")
    );
  });
};

const parseStoredLifecycleHistory = (value: unknown): StoredLifecycleHistoryEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((candidate): candidate is StoredLifecycleHistoryEntry => {
    if (typeof candidate !== "object" || candidate === null) {
      return false;
    }

    const entry = candidate as Record<string, unknown>;

    return (
      typeof entry.transitionedAt === "string" &&
      typeof entry.fromStatus === "string" &&
      typeof entry.toStatus === "string" &&
      typeof entry.transitionedById === "string" &&
      typeof entry.transitionedByRole === "string"
    );
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

  adminCookie = await createSession(userRecords.authorAdmin.email, userRecords.authorAdmin.password);
  editorACookie = await createSession(userRecords.editorA.email, userRecords.editorA.password);
  editorBCookie = await createSession(userRecords.editorB.email, userRecords.editorB.password);

  editorAUserId = await findUserIdByEmail(userRecords.editorA.email);
  editorBUserId = await findUserIdByEmail(userRecords.editorB.email);

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
          name: "Phase 4 Part 03 Character",
          summary: "Decision analytics history target",
          visibility: Visibility.PRIVATE
        }
      }
    },
    select: {
      id: true
    }
  });

  entityId = entity.id;

  const approvedProposalId = await createProposalInReview("Part03 Approved Proposal");
  const approvedReviewRequestId = await createReviewRequest(approvedProposalId);
  await assignReviewRequest(approvedReviewRequestId, editorAUserId);
  await acknowledgeStep(approvedReviewRequestId, 1, editorACookie);
  await decideStep({
    reviewRequestId: approvedReviewRequestId,
    stepOrder: 1,
    decision: "APPROVE",
    cookie: editorACookie
  });
  await acknowledgeStep(approvedReviewRequestId, 2, adminCookie);
  await decideStep({
    reviewRequestId: approvedReviewRequestId,
    stepOrder: 2,
    decision: "APPROVE",
    cookie: adminCookie
  });
  await transitionLifecycle({
    reviewRequestId: approvedReviewRequestId,
    status: "IN_REVIEW",
    cookie: adminCookie
  });
  await acceptProposal(approvedProposalId);
  await transitionLifecycle({
    reviewRequestId: approvedReviewRequestId,
    status: "RESOLVED",
    cookie: adminCookie
  });

  const rejectedProposalId = await createProposalInReview("Part03 Rejected Proposal");
  const rejectedReviewRequestId = await createReviewRequest(rejectedProposalId);
  await assignReviewRequest(rejectedReviewRequestId, editorAUserId);
  await delegateStep({
    reviewRequestId: rejectedReviewRequestId,
    stepOrder: 1,
    delegateToUserId: editorBUserId,
    cookie: editorACookie
  });
  await acknowledgeStep(rejectedReviewRequestId, 1, editorBCookie);
  await decideStep({
    reviewRequestId: rejectedReviewRequestId,
    stepOrder: 1,
    decision: "REJECT",
    cookie: editorBCookie
  });
  await transitionLifecycle({
    reviewRequestId: rejectedReviewRequestId,
    status: "CANCELED",
    cookie: adminCookie
  });

  const pendingProposalId = await createProposalInReview("Part03 Pending Proposal");
  const pendingReviewRequestId = await createReviewRequest(pendingProposalId);

  const now = Date.now();
  const approvedCreatedAt = new Date(now - 2 * 60 * 60 * 1000);
  const rejectedCreatedAt = new Date(now - 4 * 60 * 60 * 1000);
  const pendingCreatedAt = new Date(now - 3 * 60 * 60 * 1000);

  await prismaClient.reviewRequest.update({
    where: { id: approvedReviewRequestId },
    data: { createdAt: approvedCreatedAt }
  });
  await prismaClient.reviewRequest.update({
    where: { id: rejectedReviewRequestId },
    data: { createdAt: rejectedCreatedAt }
  });
  await prismaClient.reviewRequest.update({
    where: { id: pendingReviewRequestId },
    data: { createdAt: pendingCreatedAt }
  });

  await prismaClient.approvalChain.updateMany({
    where: { reviewRequestId: approvedReviewRequestId },
    data: {
      finalizedAt: new Date(approvedCreatedAt.getTime() + 60 * 60 * 1000)
    }
  });

  await approvalChainModel.updateMany({
    where: {
      reviewRequestId: {
        in: [rejectedReviewRequestId]
      }
    },
    data: {
      finalizedAt: new Date(rejectedCreatedAt.getTime() + 2 * 60 * 60 * 1000)
    }
  });
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
});

test("Phase 4 Stage 03 Part 03 AC-01: analytics returns stable counts and latency aggregates for window", async () => {
  const response = await getDecisionSummary(adminCookie, "24h");
  assert.equal(response.status, 200);

  const body = (await response.json()) as DecisionSummaryResponse;

  assert.equal(body.window.key, "24h");
  assert.deepEqual(body.queueDepth, {
    open: 1,
    acknowledged: 0,
    inReview: 0,
    resolved: 1,
    canceled: 1,
    total: 3
  });
  assert.deepEqual(body.decisionOutcomes, {
    approved: 1,
    rejected: 1,
    pending: 1
  });
  assert.deepEqual(body.approvalLatencyMs, {
    count: 2,
    minimum: 60 * 60 * 1000,
    maximum: 2 * 60 * 60 * 1000,
    average: Math.floor((60 * 60 * 1000 + 2 * 60 * 60 * 1000) / 2)
  });
});

test("Phase 4 Stage 03 Part 03 AC-02: history reconstructs decision lineage without transition gaps", async () => {
  const historyResponse = await getDecisionHistory(adminCookie, "outcome=REJECTED&limit=10");
  assert.equal(historyResponse.status, 200);

  const history = (await historyResponse.json()) as DecisionHistoryResponse;
  assert.equal(history.items.length, 1);

  const rejected = history.items[0];
  assert.ok(rejected);

  const record = await prismaClient.reviewRequest.findUnique({
    where: {
      id: rejected.reviewRequestId
    },
    select: {
      assignmentHistory: true,
      lifecycleHistory: true,
      approvalChain: {
        select: {
          steps: {
            select: {
              id: true,
              acknowledgedAt: true,
              decidedAt: true,
              events: {
                select: {
                  id: true
                }
              }
            }
          }
        }
      }
    }
  });

  assert.ok(record !== null);

  const assignmentHistory = parseStoredAssignmentHistory(record.assignmentHistory);
  const lifecycleHistory = parseStoredLifecycleHistory(record.lifecycleHistory);
  const stepAcknowledgements =
    record.approvalChain?.steps.filter((step) => step.acknowledgedAt !== null).length ?? 0;
  const stepDecisions = record.approvalChain?.steps.filter((step) => step.decidedAt !== null).length ?? 0;
  const stepEvents =
    record.approvalChain?.steps.reduce((sum, step) => sum + step.events.length, 0) ?? 0;

  const expectedTimelineEntries =
    1 + assignmentHistory.length + lifecycleHistory.length + stepAcknowledgements + stepDecisions + stepEvents;

  assert.equal(rejected.timeline.length, expectedTimelineEntries);

  const timestamps = rejected.timeline.map((event) => new Date(event.occurredAt).getTime());
  const sortedTimestamps = [...timestamps].sort((left, right) => left - right);
  assert.deepEqual(timestamps, sortedTimestamps);

  assert.ok(
    rejected.timeline.some((event) => event.kind === "APPROVAL_STEP_EVENT" && event.eventType === "DELEGATED")
  );
});

test("Phase 4 Stage 03 Part 03 AC-03: role filtering denies unauthorized analytics visibility", async () => {
  const summaryResponse = await getDecisionSummary(editorACookie, "24h");
  assert.equal(summaryResponse.status, 403);

  const historyResponse = await getDecisionHistory(editorACookie);
  assert.equal(historyResponse.status, 403);
});

test("Phase 4 Stage 03 Part 03 AC-04: summary metrics align with history transition records", async () => {
  const summaryResponse = await getDecisionSummary(adminCookie, "24h");
  assert.equal(summaryResponse.status, 200);
  const summary = (await summaryResponse.json()) as DecisionSummaryResponse;

  const historyResponse = await getDecisionHistory(adminCookie, "limit=50");
  assert.equal(historyResponse.status, 200);
  const history = (await historyResponse.json()) as DecisionHistoryResponse;

  const queueDepthFromHistory = {
    open: history.items.filter((item) => item.status === "OPEN").length,
    acknowledged: history.items.filter((item) => item.status === "ACKNOWLEDGED").length,
    inReview: history.items.filter((item) => item.status === "IN_REVIEW").length,
    resolved: history.items.filter((item) => item.status === "RESOLVED").length,
    canceled: history.items.filter((item) => item.status === "CANCELED").length,
    total: history.items.length
  };

  const approved = history.items.filter((item) => item.approvalChain?.status === "APPROVED").length;
  const rejected = history.items.filter((item) => item.approvalChain?.status === "REJECTED").length;

  const latencies = history.items
    .filter((item) => item.approvalChain?.finalizedAt !== null)
    .map((item) => {
      const finalizedAt = item.approvalChain?.finalizedAt;

      if (finalizedAt === null || finalizedAt === undefined) {
        return -1;
      }

      return new Date(finalizedAt).getTime() - new Date(item.createdAt).getTime();
    })
    .filter((value) => value >= 0);

  const expectedLatency =
    latencies.length === 0
      ? {
          count: 0,
          minimum: null,
          maximum: null,
          average: null
        }
      : {
          count: latencies.length,
          minimum: Math.min(...latencies),
          maximum: Math.max(...latencies),
          average: Math.floor(latencies.reduce((sum, value) => sum + value, 0) / latencies.length)
        };

  assert.deepEqual(summary.queueDepth, queueDepthFromHistory);
  assert.deepEqual(summary.decisionOutcomes, {
    approved,
    rejected,
    pending: history.items.length - approved - rejected
  });
  assert.deepEqual(summary.approvalLatencyMs, expectedLatency);
});
