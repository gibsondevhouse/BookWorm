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
};

type ReviewRequestListResponse = {
  reviewRequests: ReviewRequestResponse[];
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
  editor: {
    email: `phase4-review-request-editor-${timestamp}@example.com`,
    password: "Phase4ReviewEditor!234",
    role: Role.EDITOR,
    displayName: "Phase4 Review Editor"
  },
  public: {
    email: `phase4-review-request-public-${timestamp}@example.com`,
    password: "Phase4ReviewPublic!234",
    role: Role.PUBLIC,
    displayName: "Phase4 Review Public"
  }
} as const;

const slugs = {
  entity: `phase4-review-request-entity-${timestamp}`
};

let apiBaseUrl = "";
let adminCookie = "";
let editorCookie = "";
let publicCookie = "";
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
    const text = await response.text();
    throw new Error(`Failed to create session for ${email}: ${response.status} ${text}`);
  }

  const cookieHeader = response.headers.get("set-cookie");

  if (!cookieHeader) {
    throw new Error(`No session cookie returned for ${email}`);
  }

  return cookieHeader.split(";")[0] ?? "";
};

const createProposalAsEditor = async (title: string): Promise<string> => {
  const response = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/proposals`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorCookie
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
      cookie: editorCookie
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

const createEligibleProposal = async (title: string): Promise<string> => {
  const proposalId = await createProposalAsEditor(title);
  await transitionProposalToInReview(proposalId);

  return proposalId;
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
  editorCookie = await createSession(userRecords.editor.email, userRecords.editor.password);
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
          name: "Review Request Target Character",
          summary: "Review request target summary",
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
          in: [userRecords.authorAdmin.email, userRecords.editor.email, userRecords.public.email]
        }
      }
    }
  });

  await prismaClient.user.deleteMany({
    where: {
      email: {
        in: [userRecords.editor.email, userRecords.public.email]
      }
    }
  });

  await prismaClient.$disconnect();
});

test("AC-01: create review request success", async () => {
  const eligibleProposalId = await createEligibleProposal("AC-01 Eligible Proposal");

  const response = await fetch(`${apiBaseUrl}/review-requests`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      proposalId: eligibleProposalId
    })
  });

  assert.equal(response.status, 201);
  const reviewRequest = (await response.json()) as ReviewRequestResponse;
  createdReviewRequestIds.push(reviewRequest.id);

  assert.equal(reviewRequest.proposalId, eligibleProposalId);
  assert.equal(reviewRequest.status, "OPEN");
  assert.equal(reviewRequest.createdBy.role, "AUTHOR_ADMIN");
});

test("AC-02: create rejects missing proposal reference", async () => {
  const response = await fetch(`${apiBaseUrl}/review-requests`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({})
  });

  assert.equal(response.status, 400);
});

test("AC-03: create rejects invalid proposal reference", async () => {
  const response = await fetch(`${apiBaseUrl}/review-requests`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      proposalId: "proposal-does-not-exist"
    })
  });

  assert.equal(response.status, 404);
  const body = (await response.json()) as { error: string };
  assert.equal(body.error, "Review request proposal reference is invalid");
});

test("AC-04: get review request by id success", async () => {
  const response = await fetch(`${apiBaseUrl}/review-requests/${createdReviewRequestIds[0]}`, {
    headers: {
      cookie: adminCookie
    }
  });

  assert.equal(response.status, 200);
  const reviewRequest = (await response.json()) as ReviewRequestResponse;

  assert.equal(reviewRequest.id, createdReviewRequestIds[0]);
  assert.equal(reviewRequest.proposal.workflowState, "IN_REVIEW");
});

test("AC-05: list review requests supports pagination and deterministic ordering", async () => {
  const firstProposalId = await createEligibleProposal("AC-05 Eligible Proposal One");
  const firstCreateResponse = await fetch(`${apiBaseUrl}/review-requests`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      proposalId: firstProposalId
    })
  });
  assert.equal(firstCreateResponse.status, 201);
  const firstReviewRequest = (await firstCreateResponse.json()) as ReviewRequestResponse;
  createdReviewRequestIds.push(firstReviewRequest.id);

  await new Promise((resolve) => setTimeout(resolve, 10));

  const secondProposalId = await createEligibleProposal("AC-05 Eligible Proposal Two");
  const secondCreateResponse = await fetch(`${apiBaseUrl}/review-requests`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      proposalId: secondProposalId
    })
  });
  assert.equal(secondCreateResponse.status, 201);
  const secondReviewRequest = (await secondCreateResponse.json()) as ReviewRequestResponse;
  createdReviewRequestIds.push(secondReviewRequest.id);

  const listResponse = await fetch(`${apiBaseUrl}/review-requests?limit=2&offset=0`, {
    headers: {
      cookie: adminCookie
    }
  });

  assert.equal(listResponse.status, 200);
  const listBody = (await listResponse.json()) as ReviewRequestListResponse;

  assert.equal(listBody.limit, 2);
  assert.equal(listBody.offset, 0);
  assert.equal(listBody.reviewRequests.length, 2);
  assert.equal(listBody.reviewRequests[0]?.id, secondReviewRequest.id);
  assert.equal(listBody.reviewRequests[1]?.id, firstReviewRequest.id);
});

test("AC-06: unauthorized create blocked", async () => {
  const eligibleProposalId = await createEligibleProposal("AC-06 Eligible Proposal");

  const response = await fetch(`${apiBaseUrl}/review-requests`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorCookie
    },
    body: JSON.stringify({
      proposalId: eligibleProposalId
    })
  });

  assert.equal(response.status, 403);
});

test("AC-07: unauthorized read and list blocked", async () => {
  const getResponse = await fetch(`${apiBaseUrl}/review-requests/${createdReviewRequestIds[0]}`, {
    headers: {
      cookie: editorCookie
    }
  });
  assert.equal(getResponse.status, 403);

  const listResponse = await fetch(`${apiBaseUrl}/review-requests`, {
    headers: {
      cookie: editorCookie
    }
  });
  assert.equal(listResponse.status, 403);

  const publicListResponse = await fetch(`${apiBaseUrl}/review-requests`, {
    headers: {
      cookie: publicCookie
    }
  });
  assert.equal(publicListResponse.status, 403);
});

test("AC-08: ineligible proposal linkage blocked", async () => {
  const draftProposalId = await createProposalAsEditor("AC-08 Draft Proposal");

  const response = await fetch(`${apiBaseUrl}/review-requests`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      proposalId: draftProposalId
    })
  });

  assert.equal(response.status, 409);
  const body = (await response.json()) as { error: string };
  assert.equal(body.error, "Proposal is not eligible for review request linkage");
});
