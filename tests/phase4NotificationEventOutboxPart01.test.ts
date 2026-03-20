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

type NotificationEventModel = {
  deleteMany: (args: {
    where: {
      reviewRequestId: {
        in: string[];
      };
    };
  }) => Promise<unknown>;
  findFirst: (args: {
    where?: {
      reviewRequestId?: string;
      eventType?: string;
      status?: string;
    };
    orderBy?: Array<{ createdAt: "asc" | "desc" } | { id: "asc" | "desc" }>;
    select: {
      id: true;
    };
  }) => Promise<{ id: string } | null>;
  update: (args: {
    where: {
      id: string;
    };
    data: {
      status: "FAILED";
      nextAttemptAt: Date;
      processingToken: null;
      lastError: string;
    };
  }) => Promise<unknown>;
};

const proposalModel = (prismaClient as unknown as { proposal: ProposalModel }).proposal;
const reviewRequestModel = (prismaClient as unknown as { reviewRequest: ReviewRequestModel }).reviewRequest;
const notificationEventModel = (prismaClient as unknown as { notificationEvent: NotificationEventModel }).notificationEvent;

type ProposalResponse = {
  id: string;
};

type ReviewRequestResponse = {
  id: string;
};

type NotificationEventListResponse = {
  events: Array<{
    id: string;
    eventType: string;
    eventKey: string;
    status: "PENDING" | "PROCESSING" | "DELIVERED" | "FAILED";
    reviewRequestId: string | null;
    actorUserId: string | null;
    createdAt: string;
  }>;
  total: number;
  limit: number;
  offset: number;
};

type ProcessOutboxResponse = {
  fetched: number;
  delivered: number;
  failed: number;
  processedAt: string;
  limit: number;
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
    email: `phase4-notification-editor-a-${timestamp}@example.com`,
    password: "Phase4NotificationEditorA!234",
    role: Role.EDITOR,
    displayName: "Phase4 Notification Editor A"
  },
  editorB: {
    email: `phase4-notification-editor-b-${timestamp}@example.com`,
    password: "Phase4NotificationEditorB!234",
    role: Role.EDITOR,
    displayName: "Phase4 Notification Editor B"
  }
} as const;

const slugs = {
  entity: `phase4-notification-entity-${timestamp}`
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

const listNotificationEvents = async (query = ""): Promise<NotificationEventListResponse> => {
  const queryString = query.length > 0 ? `?${query}` : "";
  const response = await fetch(`${apiBaseUrl}/admin/notification-events${queryString}`, {
    headers: {
      cookie: adminCookie
    }
  });

  assert.equal(response.status, 200);
  return (await response.json()) as NotificationEventListResponse;
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
          name: "Part 01 Notification Event Character",
          summary: "Part 01 notification outbox target",
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

  if (createdReviewRequestIds.length > 0) {
    await notificationEventModel.deleteMany({
      where: {
        reviewRequestId: {
          in: createdReviewRequestIds
        }
      }
    });
  }

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
          in: [userRecords.editorA.email, userRecords.editorB.email]
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

test("AC-01: review-request, assignment, decision, delegation, and escalation transitions emit notification events", async () => {
  const proposalId = await createProposalInReview("Part 01 AC-01 Proposal");
  const reviewRequestId = await createReviewRequest(proposalId);

  await assignReviewRequest(reviewRequestId, editorAUserId);

  const acknowledgeResponse = await fetch(
    `${apiBaseUrl}/review-requests/${reviewRequestId}/approval-steps/1/acknowledge`,
    {
      method: "PATCH",
      headers: {
        cookie: editorACookie
      }
    }
  );
  assert.equal(acknowledgeResponse.status, 200);

  const decisionResponse = await fetch(
    `${apiBaseUrl}/review-requests/${reviewRequestId}/approval-steps/1/decision`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: editorACookie
      },
      body: JSON.stringify({
        decision: "APPROVE",
        decisionNote: "Part 01 decision emitted"
      })
    }
  );
  assert.equal(decisionResponse.status, 200);

  const proposalIdDelegation = await createProposalInReview("Part 01 AC-01 Delegation Proposal");
  const delegatedRequestId = await createReviewRequest(proposalIdDelegation);

  await assignReviewRequest(delegatedRequestId, editorAUserId);

  const delegateResponse = await fetch(
    `${apiBaseUrl}/review-requests/${delegatedRequestId}/approval-steps/1/delegate`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: editorACookie
      },
      body: JSON.stringify({
        delegateToUserId: editorBUserId,
        reasonCode: "WORKLOAD_BALANCING",
        reasonNote: "Part 01 delegation emitted"
      })
    }
  );
  assert.equal(delegateResponse.status, 200);

  const escalateResponse = await fetch(
    `${apiBaseUrl}/review-requests/${delegatedRequestId}/approval-steps/1/escalate`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: editorBCookie
      },
      body: JSON.stringify({
        reasonCode: "UNAVAILABLE_REVIEWER",
        reasonNote: "Part 01 escalation emitted"
      })
    }
  );
  assert.equal(escalateResponse.status, 200);

  const events = await listNotificationEvents(`reviewRequestId=${delegatedRequestId}&limit=50&offset=0`);

  assert.ok(events.events.some((event) => event.eventType === "REVIEW_REQUEST_CREATED"));
  assert.ok(events.events.some((event) => event.eventType === "REVIEW_REQUEST_ASSIGNED"));
  assert.ok(events.events.some((event) => event.eventType === "APPROVAL_STEP_DELEGATED"));
  assert.ok(events.events.some((event) => event.eventType === "APPROVAL_STEP_ESCALATED"));

  const decisionEvents = await listNotificationEvents(
    `reviewRequestId=${reviewRequestId}&eventType=APPROVAL_STEP_DECISION_RECORDED&limit=50&offset=0`
  );
  assert.equal(decisionEvents.total, 1);
});

test("AC-02: admin notification inspection supports deterministic filtering and pagination", async () => {
  const responsePageOne = await listNotificationEvents("eventType=REVIEW_REQUEST_CREATED&limit=2&offset=0");
  const responsePageTwo = await listNotificationEvents("eventType=REVIEW_REQUEST_CREATED&limit=2&offset=2");

  assert.equal(responsePageOne.limit, 2);
  assert.equal(responsePageOne.offset, 0);
  assert.equal(responsePageTwo.limit, 2);
  assert.equal(responsePageTwo.offset, 2);

  assert.ok(responsePageOne.total >= responsePageOne.events.length);
  assert.ok(responsePageTwo.total >= responsePageTwo.events.length);

  const firstPageIds = responsePageOne.events.map((event) => event.id);
  const secondPageIds = responsePageTwo.events.map((event) => event.id);

  for (const id of firstPageIds) {
    assert.equal(secondPageIds.includes(id), false);
  }

  for (let index = 1; index < responsePageOne.events.length; index += 1) {
    const previous = responsePageOne.events[index - 1];
    const current = responsePageOne.events[index];

    assert.ok(previous.createdAt >= current.createdAt);
  }
});

test("AC-03: outbox processor is idempotent and safely retries failed events", async () => {
  const firstRunResponse = await fetch(`${apiBaseUrl}/admin/notification-events/process`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({ limit: 100 })
  });

  assert.equal(firstRunResponse.status, 200);
  const firstRun = (await firstRunResponse.json()) as ProcessOutboxResponse;
  assert.ok(firstRun.delivered >= 1);

  const secondRunResponse = await fetch(`${apiBaseUrl}/admin/notification-events/process`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({ limit: 100 })
  });

  assert.equal(secondRunResponse.status, 200);
  const secondRun = (await secondRunResponse.json()) as ProcessOutboxResponse;
  assert.equal(secondRun.delivered, 0);

  const deliveredEvent = await notificationEventModel.findFirst({
    where: {
      status: "DELIVERED"
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true
    }
  });

  assert.notEqual(deliveredEvent, null);

  await notificationEventModel.update({
    where: {
      id: deliveredEvent.id
    },
    data: {
      status: "FAILED",
      nextAttemptAt: new Date(Date.now() - 1_000),
      processingToken: null,
      lastError: "forced retry for part-01 test"
    }
  });

  const retryRunResponse = await fetch(`${apiBaseUrl}/admin/notification-events/process`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({ limit: 10 })
  });

  assert.equal(retryRunResponse.status, 200);
  const retryRun = (await retryRunResponse.json()) as ProcessOutboxResponse;
  assert.equal(retryRun.delivered, 1);
});

test("AC-04: notification inspection and processing endpoints are admin-only", async () => {
  const listResponse = await fetch(`${apiBaseUrl}/admin/notification-events`, {
    headers: {
      cookie: editorACookie
    }
  });

  assert.equal(listResponse.status, 403);

  const processResponse = await fetch(`${apiBaseUrl}/admin/notification-events/process`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorACookie
    },
    body: JSON.stringify({ limit: 1 })
  });

  assert.equal(processResponse.status, 403);
});
