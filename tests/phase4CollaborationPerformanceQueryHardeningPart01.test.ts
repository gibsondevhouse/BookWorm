import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { performance } from "node:perf_hooks";
import test, { after, before } from "node:test";

import { Prisma, Role } from "@prisma/client";

import { createApp } from "../apps/api/src/app/createApp.js";
import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { phase0FixtureConfig } from "../scripts/phase0FixtureConfig.js";

type TimedEndpointResult = {
  responseBody: unknown;
  p95Ms: number;
  averageMs: number;
};

const REVIEW_REQUEST_COUNT = 48;
const timestamp = Date.now();
const app = createApp();
const server = createServer(app);

const users = {
  admin: {
    email: phase0FixtureConfig.authorAdmin.email,
    password: phase0FixtureConfig.authorAdmin.password,
    displayName: phase0FixtureConfig.authorAdmin.displayName,
    role: Role.AUTHOR_ADMIN
  },
  reviewer: {
    email: `phase4-stage04-part01-reviewer-${timestamp}@example.com`,
    password: "Phase4Stage04Part01Reviewer!234",
    displayName: "Phase4 Stage04 Reviewer",
    role: Role.EDITOR
  }
} as const;

const performanceTargetsMs = {
  inboxP95: 1500,
  historyP95: 1800,
  analyticsP95: 1200
} as const;

let apiBaseUrl = "";
let adminCookie = "";
let reviewerCookie = "";
let adminUserId = "";
let reviewerUserId = "";
let entityId = "";

const createdProposalIds: string[] = [];
const createdReviewRequestIds: string[] = [];
const createdApprovalChainIds: string[] = [];
const createdApprovalStepIds: string[] = [];

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

const p95 = (values: number[]): number => {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[index] ?? 0;
};

const average = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, current) => sum + current, 0) / values.length;
};

const runTimedEndpoint = async (input: {
  path: string;
  cookie: string;
  measuredRuns: number;
  warmupRuns: number;
}): Promise<TimedEndpointResult> => {
  let latestBody: unknown = null;
  const durations: number[] = [];

  const totalRuns = input.measuredRuns + input.warmupRuns;

  for (let runIndex = 0; runIndex < totalRuns; runIndex += 1) {
    const startedAt = performance.now();
    const response = await fetch(`${apiBaseUrl}${input.path}`, {
      headers: { cookie: input.cookie }
    });
    const completedAt = performance.now();

    assert.equal(response.status, 200);
    latestBody = (await response.json()) as unknown;

    if (runIndex >= input.warmupRuns) {
      durations.push(completedAt - startedAt);
    }
  }

  return {
    responseBody: latestBody,
    p95Ms: p95(durations),
    averageMs: average(durations)
  };
};

const buildLifecycleHistory = (): Prisma.JsonArray => [
  {
    transitionedAt: new Date().toISOString(),
    fromStatus: "OPEN",
    toStatus: "IN_REVIEW",
    transitionedById: adminUserId,
    transitionedByRole: "AUTHOR_ADMIN"
  }
];

const createDataset = async (): Promise<void> => {
  for (let index = 0; index < REVIEW_REQUEST_COUNT; index += 1) {
    const proposal = await prismaClient.proposal.create({
      data: {
        proposedById: reviewerUserId,
        entityId,
        changeType: "UPDATE",
        title: `Stage04 Part01 Proposal ${index}`,
        summary: `Stage04 Part01 Summary ${index}`,
        status: "PENDING",
        workflowState: "IN_REVIEW"
      },
      select: { id: true }
    });

    createdProposalIds.push(proposal.id);

    const isResolved = index % 3 === 0;
    const requestStatus = isResolved ? "RESOLVED" : "OPEN";
    const createdAt = new Date(Date.now() - (index + 8) * 60_000);

    const reviewRequest = await prismaClient.reviewRequest.create({
      data: {
        proposalId: proposal.id,
        createdById: adminUserId,
        assignedApproverId: reviewerUserId,
        assignedAt: new Date(createdAt.getTime() + 15_000),
        status: requestStatus,
        lifecycleHistory: buildLifecycleHistory()
      },
      select: { id: true }
    });

    createdReviewRequestIds.push(reviewRequest.id);

    const firstStepEscalationLevel = index % 4 === 0 ? 1 : 0;
    const shouldAddDelegationEvent = index % 5 === 0;

    const chain = await prismaClient.approvalChain.create({
      data: {
        reviewRequestId: reviewRequest.id,
        status: isResolved ? "APPROVED" : "ACTIVE",
        currentStepOrder: isResolved ? 2 : 1,
        finalizedAt: isResolved ? new Date(createdAt.getTime() + 120_000) : null,
        steps: {
          create: [
            {
              stepOrder: 1,
              title: "Assigned reviewer decision",
              required: true,
              status: isResolved ? "APPROVED" : "PENDING",
              assignedReviewerId: reviewerUserId,
              assignedRole: "EDITOR",
              escalationLevel: firstStepEscalationLevel,
              createdAt: new Date(createdAt.getTime() - 3 * 24 * 60 * 60 * 1000),
              decidedAt: isResolved ? new Date(createdAt.getTime() + 60_000) : null,
              decidedById: isResolved ? reviewerUserId : null
            },
            {
              stepOrder: 2,
              title: "Author admin final decision",
              required: true,
              status: isResolved ? "APPROVED" : "PENDING",
              assignedReviewerId: adminUserId,
              assignedRole: "AUTHOR_ADMIN",
              decidedAt: isResolved ? new Date(createdAt.getTime() + 120_000) : null,
              decidedById: isResolved ? adminUserId : null
            }
          ]
        }
      },
      select: {
        id: true,
        steps: {
          select: {
            id: true
          }
        }
      }
    });

    createdApprovalChainIds.push(chain.id);
    createdApprovalStepIds.push(...chain.steps.map((step) => step.id));

    if (shouldAddDelegationEvent) {
      const firstStepId = chain.steps[0]?.id;

      if (firstStepId) {
        await prismaClient.approvalStepEvent.create({
          data: {
            stepId: firstStepId,
            eventType: "DELEGATED",
            reasonCode: "WORKLOAD_BALANCING",
            reasonNote: "stage04 perf fixture",
            actorUserId: adminUserId,
            fromAssignedReviewerId: reviewerUserId,
            fromAssignedRole: "EDITOR",
            toAssignedReviewerId: reviewerUserId,
            toAssignedRole: "EDITOR",
            escalationLevel: firstStepEscalationLevel,
            createdAt: new Date(createdAt.getTime() + 20_000)
          }
        });
      }
    }
  }
};

before(async () => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Unable to determine test server address");
  }

  apiBaseUrl = `http://127.0.0.1:${address.port}`;

  for (const user of Object.values(users)) {
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

  const admin = await prismaClient.user.findUnique({ where: { email: users.admin.email }, select: { id: true } });
  const reviewer = await prismaClient.user.findUnique({ where: { email: users.reviewer.email }, select: { id: true } });

  if (admin === null || reviewer === null) {
    throw new Error("Failed to resolve seeded users");
  }

  adminUserId = admin.id;
  reviewerUserId = reviewer.id;

  adminCookie = await createSession(users.admin.email, users.admin.password);
  reviewerCookie = await createSession(users.reviewer.email, users.reviewer.password);

  const entity = await prismaClient.entity.create({
    data: {
      slug: `phase4-stage04-part01-entity-${timestamp}`,
      type: "CHARACTER"
    },
    select: { id: true }
  });

  entityId = entity.id;

  await createDataset();
});

after(async () => {
  await prismaClient.approvalStepEvent.deleteMany({
    where: {
      stepId: {
        in: createdApprovalStepIds
      }
    }
  });

  await prismaClient.approvalStep.deleteMany({
    where: {
      id: {
        in: createdApprovalStepIds
      }
    }
  });

  await prismaClient.approvalChain.deleteMany({
    where: {
      id: {
        in: createdApprovalChainIds
      }
    }
  });

  await prismaClient.reviewRequest.deleteMany({
    where: {
      id: {
        in: createdReviewRequestIds
      }
    }
  });

  await prismaClient.proposal.deleteMany({
    where: {
      id: {
        in: createdProposalIds
      }
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
          in: [users.reviewer.email]
        }
      }
    }
  });

  await prismaClient.user.deleteMany({
    where: {
      email: users.reviewer.email
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("Phase 4 Stage 04 Part 01 AC-01: collaboration endpoints meet baseline response targets", async () => {
  const inbox = await runTimedEndpoint({
    path: "/review-inbox?reviewerUserId=" + reviewerUserId + "&delegated=true&escalated=true&overdue=true&limit=25",
    cookie: reviewerCookie,
    warmupRuns: 1,
    measuredRuns: 4
  });

  const history = await runTimedEndpoint({
    path: "/review-requests/history/timeline?status=RESOLVED&limit=25",
    cookie: adminCookie,
    warmupRuns: 1,
    measuredRuns: 4
  });

  const summary = await runTimedEndpoint({
    path: "/review-requests/analytics/decision-summary?window=30d",
    cookie: adminCookie,
    warmupRuns: 1,
    measuredRuns: 4
  });

  const inboxBody = inbox.responseBody as { items?: unknown[]; total?: number };
  const historyBody = history.responseBody as { items?: unknown[]; total?: number };
  const summaryBody = summary.responseBody as { queueDepth?: { total?: number } };

  assert.ok((inboxBody.items?.length ?? 0) > 0, "inbox delegated/escalated/overdue query returns fixture matches");
  assert.ok((historyBody.items?.length ?? 0) > 0, "history query returns resolved items");
  assert.ok((summaryBody.queueDepth?.total ?? 0) > 0, "summary query returns queue depth totals");

  assert.ok(inbox.p95Ms <= performanceTargetsMs.inboxP95, `inbox p95 ${inbox.p95Ms.toFixed(2)}ms`);
  assert.ok(history.p95Ms <= performanceTargetsMs.historyP95, `history p95 ${history.p95Ms.toFixed(2)}ms`);
  assert.ok(summary.p95Ms <= performanceTargetsMs.analyticsP95, `analytics p95 ${summary.p95Ms.toFixed(2)}ms`);

  assert.ok(inbox.averageMs > 0);
  assert.ok(history.averageMs > 0);
  assert.ok(summary.averageMs > 0);
});
