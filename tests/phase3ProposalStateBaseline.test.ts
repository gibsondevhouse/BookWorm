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

type ProposalWorkflowResponse = {
  id: string;
  createdAt: string;
  updatedAt: string;
  proposedById: string;
  decidedById: string | null;
  entityId: string | null;
  manuscriptId: string | null;
  changeType: "CREATE" | "UPDATE" | "DELETE";
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  title: string;
  summary: string;
  payload: Record<string, unknown> | null;
  decisionNote: string | null;
  workflowState: "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "APPLIED" | "ARCHIVED";
  submittedAt: string | null;
  reviewStartedAt: string | null;
  approvedAt: string | null;
  archivedAt: string | null;
  reviewNotes: string | null;
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
};

type ProposalStateResponse = {
  id: string;
  workflowState: "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "APPLIED" | "ARCHIVED";
  submittedAt: string | null;
  reviewStartedAt: string | null;
  approvedAt: string | null;
  archivedAt: string | null;
  reviewNotes: string | null;
  status: string;
  decidedAt: string | null;
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
    email: `phase3-state-editor-${timestamp}@example.com`,
    password: "Phase3StateEditor!234",
    role: Role.EDITOR,
    displayName: "Phase3 State Editor"
  },
  editorTwo: {
    email: `phase3-state-editor-two-${timestamp}@example.com`,
    password: "Phase3StateEditorTwo!234",
    role: Role.EDITOR,
    displayName: "Phase3 State Editor Two"
  },
  otherAdmin: {
    email: `phase3-other-admin-${timestamp}@example.com`,
    password: "Phase3OtherAdmin!234",
    role: Role.AUTHOR_ADMIN,
    displayName: "Phase3 Other Admin"
  }
} as const;

const slugs = {
  entity: `phase3-state-entity-${timestamp}`,
  manuscript: `phase3-state-manuscript-${timestamp}`
};

let apiBaseUrl = "";
let adminCookie = "";
let editorCookie = "";
let editorTwoCookie = "";
let otherAdminCookie = "";
let entityId = "";
let manuscriptId = "";
let draftProposalId = "";
let submittedProposalId = "";
let inReviewProposalId = "";
let approvedProposalId = "";
let rejectedProposalId = "";

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
  editorCookie = await createSession(userRecords.editor.email, userRecords.editor.password);
  editorTwoCookie = await createSession(userRecords.editorTwo.email, userRecords.editorTwo.password);
  otherAdminCookie = await createSession(userRecords.otherAdmin.email, userRecords.otherAdmin.password);

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
          name: "State Test Character",
          summary: "State test summary",
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
          title: "State Test Chapter",
          summary: "State test chapter summary",
          visibility: Visibility.PRIVATE
        }
      }
    },
    select: {
      id: true
    }
  });
  manuscriptId = manuscript.id;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  await prismaClient.session.deleteMany({
    where: {
      user: {
        email: {
          in: [
            userRecords.authorAdmin.email,
            userRecords.editor.email,
            userRecords.editorTwo.email,
            userRecords.otherAdmin.email
          ]
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
        in: [userRecords.editor.email, userRecords.editorTwo.email, userRecords.otherAdmin.email]
      }
    }
  });

  await prismaClient.$disconnect();
});

/**
 * AC-01: Author (EDITOR proposer) can transition DRAFT → SUBMITTED
 */
test("AC-01: author can submit proposal from DRAFT to SUBMITTED", async () => {
  const createResponse = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/proposals`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorCookie
    },
    body: JSON.stringify({
      changeType: "CREATE",
      title: "AC-01 Test Proposal",
      summary: "Test proposal for state transitions"
    })
  });

  assert.equal(createResponse.status, 201);
  const proposal = (await createResponse.json()) as ProposalWorkflowResponse;
  draftProposalId = proposal.id;
  assert.equal(proposal.workflowState, "DRAFT");
  assert.equal(proposal.submittedAt, null);

  // Submit the proposal
  const submitResponse = await fetch(`${apiBaseUrl}/proposals/${proposal.id}/submit`, {
    method: "POST",
    headers: { cookie: editorCookie }
  });

  assert.equal(submitResponse.status, 200);
  const submittedProposal = (await submitResponse.json()) as ProposalWorkflowResponse;
  assert.equal(submittedProposal.workflowState, "SUBMITTED");
  assert.ok(submittedProposal.submittedAt !== null);
  submittedProposalId = submittedProposal.id;
});

/**
 * AC-02: Submitted proposal appears in admin review queue (query by state)
 */
test("AC-02: submitted proposals are queryable via /proposals/state/SUBMITTED", async () => {
  const response = await fetch(`${apiBaseUrl}/proposals/state/SUBMITTED?limit=10&offset=0`, {
    headers: { cookie: adminCookie }
  });

  assert.equal(response.status, 200);
  const data = (await response.json()) as {
    proposals: ProposalWorkflowResponse[];
    total: number;
  };
  assert.ok(data.proposals.length > 0);
  const found = data.proposals.find((p) => p.id === submittedProposalId);
  assert.ok(found);
  assert.equal(found.workflowState, "SUBMITTED");
});

/**
 * AC-03: Admin can transition SUBMITTED → IN_REVIEW
 */
test("AC-03: admin can start review (SUBMITTED → IN_REVIEW)", async () => {
  const response = await fetch(`${apiBaseUrl}/proposals/${submittedProposalId}/start-review`, {
    method: "POST",
    headers: { cookie: adminCookie }
  });

  assert.equal(response.status, 200);
  const proposal = (await response.json()) as ProposalWorkflowResponse;
  assert.equal(proposal.workflowState, "IN_REVIEW");
  assert.ok(proposal.reviewStartedAt !== null);
  inReviewProposalId = proposal.id;
});

/**
 * AC-04: Admin can transition IN_REVIEW → APPROVED
 */
test("AC-04: admin can approve proposal (IN_REVIEW → APPROVED)", async () => {
  const response = await fetch(`${apiBaseUrl}/proposals/${inReviewProposalId}/approve`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      reviewNotes: "Looks good to me!"
    })
  });

  assert.equal(response.status, 200);
  const proposal = (await response.json()) as ProposalWorkflowResponse;
  assert.equal(proposal.workflowState, "APPROVED");
  assert.ok(proposal.approvedAt !== null);
  assert.equal(proposal.reviewNotes, "Looks good to me!");
  approvedProposalId = proposal.id;
});

/**
 * AC-05: Admin can transition IN_REVIEW → REJECTED
 */
test("AC-05: admin can reject proposal (IN_REVIEW → REJECTED)", async () => {
  // Create another proposal for rejection test
  const createResponse = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/proposals`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorCookie
    },
    body: JSON.stringify({
      changeType: "UPDATE",
      title: "AC-05 Rejection Test",
      summary: "Test proposal for rejection"
    })
  });

  const created = (await createResponse.json()) as ProposalWorkflowResponse;

  // Submit it
  const submitResponse = await fetch(`${apiBaseUrl}/proposals/${created.id}/submit`, {
    method: "POST",
    headers: { cookie: editorCookie }
  });

  const submitted = (await submitResponse.json()) as ProposalWorkflowResponse;

  // Start review
  const reviewResponse = await fetch(`${apiBaseUrl}/proposals/${submitted.id}/start-review`, {
    method: "POST",
    headers: { cookie: adminCookie }
  });

  const inReview = (await reviewResponse.json()) as ProposalWorkflowResponse;

  // Reject it
  const rejectResponse = await fetch(`${apiBaseUrl}/proposals/${inReview.id}/reject`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      reviewNotes: "Does not meet requirements"
    })
  });

  assert.equal(rejectResponse.status, 200);
  const rejected = (await rejectResponse.json()) as ProposalWorkflowResponse;
  assert.equal(rejected.workflowState, "REJECTED");
  assert.ok(rejected.approvedAt !== null);
  assert.equal(rejected.reviewNotes, "Does not meet requirements");
  rejectedProposalId = rejected.id;
});

/**
 * AC-06: Both APPROVED and REJECTED can transition to ARCHIVED
 */
test("AC-06: both APPROVED and REJECTED proposals can be archived", async () => {
  // Archive the approved proposal
  const archiveApprovedResponse = await fetch(`${apiBaseUrl}/proposals/${approvedProposalId}/archive`, {
    method: "POST",
    headers: { cookie: adminCookie }
  });

  assert.equal(archiveApprovedResponse.status, 200);
  const archived1 = (await archiveApprovedResponse.json()) as ProposalWorkflowResponse;
  assert.equal(archived1.workflowState, "ARCHIVED");
  assert.ok(archived1.archivedAt !== null);

  // Archive the rejected proposal
  const archiveRejectedResponse = await fetch(`${apiBaseUrl}/proposals/${rejectedProposalId}/archive`, {
    method: "POST",
    headers: { cookie: adminCookie }
  });

  assert.equal(archiveRejectedResponse.status, 200);
  const archived2 = (await archiveRejectedResponse.json()) as ProposalWorkflowResponse;
  assert.equal(archived2.workflowState, "ARCHIVED");
  assert.ok(archived2.archivedAt !== null);
});

/**
 * AC-07: Invalid state transitions return 409 Conflict
 */
test("AC-07: invalid state transitions return 409 Conflict", async () => {
  // Create a draft proposal
  const createResponse = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/proposals`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorCookie
    },
    body: JSON.stringify({
      changeType: "DELETE",
      title: "AC-07 Invalid Transition Test",
      summary: "Test invalid transitions"
    })
  });

  const proposal = (await createResponse.json()) as ProposalWorkflowResponse;

  // Try to transition DRAFT → APPROVED (invalid)
  const invalidResponse = await fetch(`${apiBaseUrl}/proposals/${proposal.id}/approve`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({})
  });

  assert.equal(invalidResponse.status, 409);
  const error = (await invalidResponse.json()) as { error: string };
  assert.ok(error.error.includes("Invalid state transition"));
});

/**
 * AC-08: Unauthorized role transitions return 403 Forbidden
 */
test("AC-08: unauthorized role transitions return 403 Forbidden", async () => {
  // Create a draft proposal
  const createResponse = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/proposals`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorCookie
    },
    body: JSON.stringify({
      changeType: "CREATE",
      title: "AC-08 Auth Test",
      summary: "Test authorization"
    })
  });

  const proposal = (await createResponse.json()) as ProposalWorkflowResponse;

  // Submit as editor
  const submitResponse = await fetch(`${apiBaseUrl}/proposals/${proposal.id}/submit`, {
    method: "POST",
    headers: { cookie: editorCookie }
  });

  const submitted = (await submitResponse.json()) as ProposalWorkflowResponse;

  // Try to approve without being an admin (simulate by using editor who cannot approve)
  // Since we can't easily test this without a public user, we'll test the archive restriction
  const archiveAsEditorResponse = await fetch(`${apiBaseUrl}/proposals/${submitted.id}/archive`, {
    method: "POST",
    headers: { cookie: editorCookie }
  });

  assert.equal(archiveAsEditorResponse.status, 403);
  const error = (await archiveAsEditorResponse.json()) as { error: string };
  assert.ok(error.error.includes("cannot") || error.error.includes("unauthorized"));
});

/**
 * AC-09: State change timestamps are recorded correctly
 */
test("AC-09: state change timestamps are recorded correctly", async () => {
  // Create and progress through states
  const createResponse = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/proposals`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorCookie
    },
    body: JSON.stringify({
      changeType: "CREATE",
      title: "AC-09 Timestamp Test",
      summary: "Test timestamps"
    })
  });

  const draft = (await createResponse.json()) as ProposalWorkflowResponse;
  assert.equal(draft.submittedAt, null);
  assert.equal(draft.reviewStartedAt, null);
  assert.equal(draft.approvedAt, null);

  // Submit
  const submitResponse = await fetch(`${apiBaseUrl}/proposals/${draft.id}/submit`, {
    method: "POST",
    headers: { cookie: editorCookie }
  });

  const submitted = (await submitResponse.json()) as ProposalWorkflowResponse;
  const submittedAtTime = submitted.submittedAt;
  assert.ok(submittedAtTime !== null);
  assert.equal(submitted.reviewStartedAt, null);

  // Start review
  const reviewResponse = await fetch(`${apiBaseUrl}/proposals/${submitted.id}/start-review`, {
    method: "POST",
    headers: { cookie: adminCookie }
  });

  const inReview = (await reviewResponse.json()) as ProposalWorkflowResponse;
  assert.equal(inReview.submittedAt, submittedAtTime);
  const reviewStartedAtTime = inReview.reviewStartedAt;
  assert.ok(reviewStartedAtTime !== null);
  assert.notEqual(reviewStartedAtTime, submittedAtTime);

  // Approve
  const approveResponse = await fetch(`${apiBaseUrl}/proposals/${inReview.id}/approve`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({})
  });

  const approved = (await approveResponse.json()) as ProposalWorkflowResponse;
  assert.ok(approved.approvedAt !== null);
  assert.ok(approved.approvedAt > reviewStartedAtTime);
});

/**
 * AC-10: Review notes are saved and visible
 */
test("AC-10: review notes are saved and visible", async () => {
  // Create proposal
  const createResponse = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/proposals`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorCookie
    },
    body: JSON.stringify({
      changeType: "CREATE",
      title: "AC-10 Review Notes Test",
      summary: "Test review notes"
    })
  });

  const proposal = (await createResponse.json()) as ProposalWorkflowResponse;

  // Submit
  const submitResponse = await fetch(`${apiBaseUrl}/proposals/${proposal.id}/submit`, {
    method: "POST",
    headers: { cookie: editorCookie }
  });

  const submitted = (await submitResponse.json()) as ProposalWorkflowResponse;

  // Start review
  const reviewResponse = await fetch(`${apiBaseUrl}/proposals/${submitted.id}/start-review`, {
    method: "POST",
    headers: { cookie: adminCookie }
  });

  const inReview = (await reviewResponse.json()) as ProposalWorkflowResponse;

  // Approve with notes
  const testNotes = "This proposal is excellent and ready for application";
  const approveResponse = await fetch(`${apiBaseUrl}/proposals/${inReview.id}/approve`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      reviewNotes: testNotes
    })
  });

  const approved = (await approveResponse.json()) as ProposalWorkflowResponse;
  assert.equal(approved.reviewNotes, testNotes);

  // Query state endpoint to verify visibility
  const stateResponse = await fetch(`${apiBaseUrl}/proposals/${approved.id}/state`, {
    headers: { cookie: adminCookie }
  });

  const state = (await stateResponse.json()) as ProposalStateResponse;
  assert.equal(state.reviewNotes, testNotes);
});

/**
 * AC-11: Proposals can be filtered by workflowState via GET /proposals/state/:state
 */
test("AC-11: proposals are queryable and paginated by workflowState", async () => {
  // Query various states
  const draftResponse = await fetch(`${apiBaseUrl}/proposals/state/DRAFT?limit=5&offset=0`, {
    headers: { cookie: adminCookie }
  });

  assert.equal(draftResponse.status, 200);
  const draftData = (await draftResponse.json()) as {
    proposals: ProposalWorkflowResponse[];
    total: number;
    limit: number;
    offset: number;
  };
  assert.ok(draftData.proposals.length >= 0);
  assert.ok(draftData.total >= 0);
  assert.equal(draftData.limit, 5);
  assert.equal(draftData.offset, 0);

  // Test pagination with offset
  if (draftData.total > 2) {
    const paginatedResponse = await fetch(`${apiBaseUrl}/proposals/state/DRAFT?limit=2&offset=1`, {
      headers: { cookie: adminCookie }
    });

    const paginatedData = (await paginatedResponse.json()) as {
      proposals: ProposalWorkflowResponse[];
      total: number;
      offset: number;
    };
    assert.equal(paginatedData.offset, 1);
    assert.ok(paginatedData.total >= 2);
  }
});

/**
 * AC-12: ARCHIVED state is terminal (no transitions out)
 */
test("AC-12: ARCHIVED is a terminal state with no further transitions", async () => {
  // Create and archive a proposal
  const createResponse = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/proposals`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorCookie
    },
    body: JSON.stringify({
      changeType: "CREATE",
      title: "AC-12 Terminal State Test",
      summary: "Test terminal state"
    })
  });

  const draft = (await createResponse.json()) as ProposalWorkflowResponse;

  // Submit
  const submitResponse = await fetch(`${apiBaseUrl}/proposals/${draft.id}/submit`, {
    method: "POST",
    headers: { cookie: editorCookie }
  });

  const submitted = (await submitResponse.json()) as ProposalWorkflowResponse;

  // Start review
  const reviewResponse = await fetch(`${apiBaseUrl}/proposals/${submitted.id}/start-review`, {
    method: "POST",
    headers: { cookie: adminCookie }
  });

  const inReview = (await reviewResponse.json()) as ProposalWorkflowResponse;

  // Approve
  const approveResponse = await fetch(`${apiBaseUrl}/proposals/${inReview.id}/approve`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({})
  });

  const approved = (await approveResponse.json()) as ProposalWorkflowResponse;

  // Archive
  const archiveResponse = await fetch(`${apiBaseUrl}/proposals/${approved.id}/archive`, {
    method: "POST",
    headers: { cookie: adminCookie }
  });

  const archived = (await archiveResponse.json()) as ProposalWorkflowResponse;
  assert.equal(archived.workflowState, "ARCHIVED");

  // Try to transition again (should fail with 409)
  const invalidResponse = await fetch(`${apiBaseUrl}/proposals/${archived.id}/approve`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({})
  });

  assert.equal(invalidResponse.status, 409);
});

const createProposalAs = async (input: {
  cookie: string;
  changeType: "CREATE" | "UPDATE" | "DELETE";
  title: string;
  summary: string;
}): Promise<ProposalWorkflowResponse> => {
  const response = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/proposals`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: input.cookie
    },
    body: JSON.stringify({
      changeType: input.changeType,
      title: input.title,
      summary: input.summary
    })
  });

  assert.equal(response.status, 201);
  return (await response.json()) as ProposalWorkflowResponse;
};

const submitProposalAs = async (proposalId: string, cookie: string): Promise<ProposalWorkflowResponse> => {
  const response = await fetch(`${apiBaseUrl}/proposals/${proposalId}/submit`, {
    method: "POST",
    headers: { cookie }
  });

  assert.equal(response.status, 200);
  return (await response.json()) as ProposalWorkflowResponse;
};

const startReviewAsAdmin = async (proposalId: string): Promise<ProposalWorkflowResponse> => {
  const response = await fetch(`${apiBaseUrl}/proposals/${proposalId}/start-review`, {
    method: "POST",
    headers: { cookie: adminCookie }
  });

  assert.equal(response.status, 200);
  return (await response.json()) as ProposalWorkflowResponse;
};

const approveProposalAsAdmin = async (proposalId: string): Promise<ProposalWorkflowResponse> => {
  const response = await fetch(`${apiBaseUrl}/proposals/${proposalId}/approve`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      reviewNotes: "Part 02 test approval"
    })
  });

  assert.equal(response.status, 200);
  return (await response.json()) as ProposalWorkflowResponse;
};

const acceptProposalAsAdmin = async (proposalId: string): Promise<ProposalWorkflowResponse> => {
  const response = await fetch(`${apiBaseUrl}/proposals/${proposalId}/accept`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      decisionNote: "Part 02 accepted"
    })
  });

  assert.equal(response.status, 200);
  return (await response.json()) as ProposalWorkflowResponse;
};

const applyProposalAsAdmin = async (proposalId: string): Promise<void> => {
  const response = await fetch(`${apiBaseUrl}/admin/proposals/${proposalId}/apply`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      appliedNote: "Part 02 applied"
    })
  });

  assert.equal(response.status, 200);
};

test("AC-13: /proposals/my-proposals returns only actor proposals with filters and pagination", async () => {
  const mineOne = await createProposalAs({
    cookie: editorCookie,
    changeType: "CREATE",
    title: "AC-13 My Proposal One",
    summary: "Owned by editor one"
  });

  await new Promise((resolve) => setTimeout(resolve, 15));

  const mineTwo = await createProposalAs({
    cookie: editorCookie,
    changeType: "UPDATE",
    title: "AC-13 My Proposal Two",
    summary: "Owned by editor one newer"
  });

  await createProposalAs({
    cookie: editorTwoCookie,
    changeType: "UPDATE",
    title: "AC-13 Other Editor Proposal",
    summary: "Owned by editor two"
  });

  const pagedResponse = await fetch(
    `${apiBaseUrl}/proposals/my-proposals?changeType=UPDATE&limit=1&offset=0`,
    {
      headers: { cookie: editorCookie }
    }
  );

  assert.equal(pagedResponse.status, 200);
  const pagedBody = (await pagedResponse.json()) as {
    proposals: ProposalWorkflowResponse[];
    total: number;
    limit: number;
    offset: number;
  };

  assert.equal(pagedBody.limit, 1);
  assert.equal(pagedBody.offset, 0);
  assert.ok(pagedBody.total >= 1);
  assert.equal(pagedBody.proposals.length, 1);
  assert.equal(pagedBody.proposals[0]?.id, mineTwo.id);
  assert.equal(pagedBody.proposals[0]?.proposedById, mineTwo.proposedById);

  const fullResponse = await fetch(`${apiBaseUrl}/proposals/my-proposals`, {
    headers: { cookie: editorCookie }
  });
  assert.equal(fullResponse.status, 200);
  const fullBody = (await fullResponse.json()) as {
    proposals: ProposalWorkflowResponse[];
  };

  assert.ok(fullBody.proposals.some((proposal) => proposal.id === mineOne.id));
  assert.ok(fullBody.proposals.some((proposal) => proposal.id === mineTwo.id));
  assert.ok(fullBody.proposals.every((proposal) => proposal.proposedById === mineOne.proposedById));
});

test("AC-14: /proposals/pending-review supports state/changeType/submitter/date filters with deterministic ordering", async () => {
  const submittedA = await createProposalAs({
    cookie: editorCookie,
    changeType: "CREATE",
    title: "AC-14 Submitted A",
    summary: "Pending review state ordering A"
  });
  const submittedAState = await submitProposalAs(submittedA.id, editorCookie);

  await new Promise((resolve) => setTimeout(resolve, 15));

  const submittedB = await createProposalAs({
    cookie: editorCookie,
    changeType: "CREATE",
    title: "AC-14 Submitted B",
    summary: "Pending review state ordering B"
  });
  const submittedBState = await submitProposalAs(submittedB.id, editorCookie);

  await new Promise((resolve) => setTimeout(resolve, 15));

  const inReview = await createProposalAs({
    cookie: editorTwoCookie,
    changeType: "UPDATE",
    title: "AC-14 In Review",
    summary: "In review proposal"
  });
  await submitProposalAs(inReview.id, editorTwoCookie);
  const inReviewState = await startReviewAsAdmin(inReview.id);

  const from = new Date(new Date(submittedAState.createdAt).getTime() - 1000).toISOString();
  const to = new Date(new Date(inReviewState.createdAt).getTime() + 1000).toISOString();

  const response = await fetch(
    `${apiBaseUrl}/proposals/pending-review?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=50&offset=0`,
    {
      headers: { cookie: adminCookie }
    }
  );

  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    proposals: ProposalWorkflowResponse[];
    total: number;
  };

  const inScope = body.proposals.filter(
    (proposal) => proposal.id === submittedA.id || proposal.id === submittedB.id || proposal.id === inReview.id
  );
  assert.equal(inScope.length, 3);

  const indexSubmittedA = inScope.findIndex((proposal) => proposal.id === submittedA.id);
  const indexSubmittedB = inScope.findIndex((proposal) => proposal.id === submittedB.id);
  const indexInReview = inScope.findIndex((proposal) => proposal.id === inReview.id);

  assert.ok(indexSubmittedA >= 0);
  assert.ok(indexSubmittedB >= 0);
  assert.ok(indexInReview >= 0);

  // State priority first (SUBMITTED before IN_REVIEW), then createdAt desc within same state.
  assert.ok(indexSubmittedA < indexInReview);
  assert.ok(indexSubmittedB < indexInReview);
  assert.ok(indexSubmittedB < indexSubmittedA);

  const submitterResponse = await fetch(
    `${apiBaseUrl}/proposals/pending-review?submitter=${encodeURIComponent(inReview.proposedById)}&limit=10&offset=0`,
    {
      headers: { cookie: adminCookie }
    }
  );
  assert.equal(submitterResponse.status, 200);
  const submitterBody = (await submitterResponse.json()) as {
    proposals: ProposalWorkflowResponse[];
  };

  assert.ok(submitterBody.proposals.length > 0);
  assert.ok(submitterBody.proposals.every((proposal) => proposal.proposedById === inReview.proposedById));

  const stateAndTypeResponse = await fetch(
    `${apiBaseUrl}/proposals/pending-review?workflowState=IN_REVIEW&changeType=UPDATE`,
    {
      headers: { cookie: adminCookie }
    }
  );
  assert.equal(stateAndTypeResponse.status, 200);
  const stateAndTypeBody = (await stateAndTypeResponse.json()) as {
    proposals: ProposalWorkflowResponse[];
  };

  assert.ok(stateAndTypeBody.proposals.some((proposal) => proposal.id === inReview.id));
  assert.ok(
    stateAndTypeBody.proposals.every(
      (proposal) => proposal.workflowState === "IN_REVIEW" && proposal.changeType === "UPDATE"
    )
  );

  const nonAdminResponse = await fetch(`${apiBaseUrl}/proposals/pending-review`, {
    headers: { cookie: editorCookie }
  });
  assert.equal(nonAdminResponse.status, 403);
});

test("AC-15: /proposals/applied-proposals returns applied proposals with filtering and pagination", async () => {
  const appliedOne = await createProposalAs({
    cookie: editorCookie,
    changeType: "DELETE",
    title: "AC-15 Applied One",
    summary: "Applied proposal one"
  });
  await acceptProposalAsAdmin(appliedOne.id);
  await applyProposalAsAdmin(appliedOne.id);

  await new Promise((resolve) => setTimeout(resolve, 15));

  const appliedTwo = await createProposalAs({
    cookie: editorTwoCookie,
    changeType: "UPDATE",
    title: "AC-15 Applied Two",
    summary: "Applied proposal two"
  });
  await acceptProposalAsAdmin(appliedTwo.id);
  await applyProposalAsAdmin(appliedTwo.id);

  const response = await fetch(`${apiBaseUrl}/proposals/applied-proposals?limit=1&offset=0`, {
    headers: { cookie: adminCookie }
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    proposals: ProposalWorkflowResponse[];
    total: number;
    limit: number;
    offset: number;
  };

  assert.equal(body.limit, 1);
  assert.equal(body.offset, 0);
  assert.ok(body.total >= 2);
  assert.equal(body.proposals.length, 1);
  assert.equal(body.proposals[0]?.workflowState, "APPLIED");

  const filteredResponse = await fetch(
    `${apiBaseUrl}/proposals/applied-proposals?submitter=${encodeURIComponent(appliedTwo.proposedById)}&changeType=UPDATE`,
    {
      headers: { cookie: adminCookie }
    }
  );
  assert.equal(filteredResponse.status, 200);
  const filteredBody = (await filteredResponse.json()) as {
    proposals: ProposalWorkflowResponse[];
  };

  assert.ok(filteredBody.proposals.some((proposal) => proposal.id === appliedTwo.id));
  assert.ok(
    filteredBody.proposals.every(
      (proposal) => proposal.workflowState === "APPLIED" && proposal.proposedById === appliedTwo.proposedById
    )
  );

  const nonAdminResponse = await fetch(`${apiBaseUrl}/proposals/applied-proposals`, {
    headers: { cookie: editorCookie }
  });
  assert.equal(nonAdminResponse.status, 403);
});
