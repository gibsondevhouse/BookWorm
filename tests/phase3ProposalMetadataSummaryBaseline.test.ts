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

type ProposalResponse = {
  id: string;
  workflowState: "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "APPLIED" | "ARCHIVED";
};

type ProposalMetadataResponse = {
  id: string;
  updatedAt: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  workflowState: "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "APPLIED" | "ARCHIVED";
  decisionNote: string | null;
  rationale: string | null;
  reviewNotes: string | null;
  appliedNote: string | null;
  decidedAt: string | null;
  reviewStartedAt: string | null;
  approvedAt: string | null;
  appliedAt: string | null;
};

type WorkflowStateSummaryResponse = {
  counts: {
    DRAFT: number;
    SUBMITTED: number;
    IN_REVIEW: number;
    APPROVED: number;
    REJECTED: number;
    APPLIED: number;
    ARCHIVED: number;
  };
  total: number;
  from: string | null;
  to: string | null;
};

type ChangeTypeSummaryResponse = {
  counts: {
    CREATE: number;
    UPDATE: number;
    DELETE: number;
  };
  total: number;
  from: string | null;
  to: string | null;
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
    email: `phase3-metadata-editor-${timestamp}@example.com`,
    password: "Phase3MetadataEditor!234",
    role: Role.EDITOR,
    displayName: "Phase3 Metadata Editor"
  }
} as const;

const slugs = {
  entity: `phase3-metadata-entity-${timestamp}`,
  manuscript: `phase3-metadata-manuscript-${timestamp}`
};

let apiBaseUrl = "";
let adminCookie = "";
let editorCookie = "";
let entityId = "";
let manuscriptId = "";

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

const createProposalAsEditor = async (input: {
  changeType: "CREATE" | "UPDATE" | "DELETE";
  title: string;
  summary: string;
}): Promise<ProposalResponse> => {
  const response = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/proposals`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: editorCookie
    },
    body: JSON.stringify(input)
  });

  assert.equal(response.status, 201);
  return (await response.json()) as ProposalResponse;
};

const submitProposalAsEditor = async (proposalId: string): Promise<void> => {
  const response = await fetch(`${apiBaseUrl}/proposals/${proposalId}/submit`, {
    method: "POST",
    headers: {
      cookie: editorCookie
    }
  });

  assert.equal(response.status, 200);
};

const acceptProposalAsAdmin = async (proposalId: string, decisionNote = "Accepted for metadata test"): Promise<void> => {
  const response = await fetch(`${apiBaseUrl}/proposals/${proposalId}/accept`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      decisionNote
    })
  });

  assert.equal(response.status, 200);
};

const applyProposalAsAdmin = async (proposalId: string, appliedNote = "Applied for metadata test"): Promise<void> => {
  const response = await fetch(`${apiBaseUrl}/admin/proposals/${proposalId}/apply`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      appliedNote
    })
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

  adminCookie = await createSession(userRecords.authorAdmin.email, userRecords.authorAdmin.password);
  editorCookie = await createSession(userRecords.editor.email, userRecords.editor.password);

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
          name: "Metadata Test Character",
          summary: "Metadata test summary",
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
          title: "Metadata Test Chapter",
          summary: "Metadata test chapter summary",
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
          in: [userRecords.authorAdmin.email, userRecords.editor.email]
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
      email: userRecords.editor.email
    }
  });

  await prismaClient.$disconnect();
});

test("AC-16: metadata endpoint supports authorized and unauthorized retrieval", async () => {
  const proposal = await createProposalAsEditor({
    changeType: "CREATE",
    title: "AC-16 Metadata Read",
    summary: "Metadata read test"
  });

  const authorizedResponse = await fetch(`${apiBaseUrl}/proposals/${proposal.id}/metadata`, {
    headers: {
      cookie: editorCookie
    }
  });

  assert.equal(authorizedResponse.status, 200);
  const metadata = (await authorizedResponse.json()) as ProposalMetadataResponse;
  assert.equal(metadata.id, proposal.id);
  assert.equal(metadata.workflowState, "DRAFT");
  assert.equal(metadata.decisionNote, null);
  assert.equal(metadata.rationale, null);
  assert.equal(metadata.reviewNotes, null);
  assert.equal(metadata.appliedNote, null);

  const unauthorizedResponse = await fetch(`${apiBaseUrl}/proposals/${proposal.id}/metadata`);
  assert.equal(unauthorizedResponse.status, 401);
});

test("AC-17: metadata update is admin-only and updates are audit-traceable via updatedAt", async () => {
  const proposal = await createProposalAsEditor({
    changeType: "UPDATE",
    title: "AC-17 Metadata Update",
    summary: "Metadata update test"
  });

  await acceptProposalAsAdmin(proposal.id, "Initial acceptance note");
  await applyProposalAsAdmin(proposal.id, "Initial application note");

  const beforeResponse = await fetch(`${apiBaseUrl}/proposals/${proposal.id}/metadata`, {
    headers: {
      cookie: adminCookie
    }
  });
  assert.equal(beforeResponse.status, 200);
  const beforeMetadata = (await beforeResponse.json()) as ProposalMetadataResponse;

  await new Promise((resolve) => setTimeout(resolve, 15));

  const editorPatchResponse = await fetch(`${apiBaseUrl}/proposals/${proposal.id}/metadata`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: editorCookie
    },
    body: JSON.stringify({
      reviewNotes: "Editor should not be able to patch metadata"
    })
  });
  assert.equal(editorPatchResponse.status, 403);

  const adminPatchResponse = await fetch(`${apiBaseUrl}/proposals/${proposal.id}/metadata`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      reviewNotes: "Reviewed and accepted",
      decisionNote: "Rationale updated by admin",
      appliedNote: "Applied after metadata patch"
    })
  });

  assert.equal(adminPatchResponse.status, 200);
  const patchedMetadata = (await adminPatchResponse.json()) as ProposalMetadataResponse;
  assert.equal(patchedMetadata.reviewNotes, "Reviewed and accepted");
  assert.equal(patchedMetadata.decisionNote, "Rationale updated by admin");
  assert.equal(patchedMetadata.rationale, "Rationale updated by admin");
  assert.equal(patchedMetadata.appliedNote, "Applied after metadata patch");
  assert.ok(new Date(patchedMetadata.updatedAt).getTime() > new Date(beforeMetadata.updatedAt).getTime());
});

test("AC-18: metadata patch returns validation errors for malformed payloads", async () => {
  const proposal = await createProposalAsEditor({
    changeType: "DELETE",
    title: "AC-18 Metadata Validation",
    summary: "Metadata validation test"
  });

  const emptyBodyResponse = await fetch(`${apiBaseUrl}/proposals/${proposal.id}/metadata`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({})
  });
  assert.equal(emptyBodyResponse.status, 400);

  const malformedBodyResponse = await fetch(`${apiBaseUrl}/proposals/${proposal.id}/metadata`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      reviewNotes: 123
    })
  });
  assert.equal(malformedBodyResponse.status, 400);

  const conflictingDecisionNoteResponse = await fetch(`${apiBaseUrl}/proposals/${proposal.id}/metadata`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      decisionNote: "Decision A",
      rationale: "Decision B"
    })
  });
  assert.equal(conflictingDecisionNoteResponse.status, 400);

  const appliedNoteOnNonAppliedResponse = await fetch(`${apiBaseUrl}/proposals/${proposal.id}/metadata`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({
      appliedNote: "Should fail before application"
    })
  });
  assert.equal(appliedNoteOnNonAppliedResponse.status, 400);
});

test("AC-19: workflow-state summary endpoint returns deterministic counts with date window", async () => {
  const windowStart = new Date().toISOString();

  const draftProposal = await createProposalAsEditor({
    changeType: "CREATE",
    title: "AC-19 Draft",
    summary: "Workflow summary draft"
  });

  const submittedProposal = await createProposalAsEditor({
    changeType: "UPDATE",
    title: "AC-19 Submitted",
    summary: "Workflow summary submitted"
  });
  await submitProposalAsEditor(submittedProposal.id);

  const appliedProposal = await createProposalAsEditor({
    changeType: "DELETE",
    title: "AC-19 Applied",
    summary: "Workflow summary applied"
  });
  await acceptProposalAsAdmin(appliedProposal.id, "Accepted for AC-19");
  await applyProposalAsAdmin(appliedProposal.id, "Applied for AC-19");

  const windowEnd = new Date().toISOString();

  const summaryResponse = await fetch(
    `${apiBaseUrl}/proposals/summary/workflow-states?from=${encodeURIComponent(windowStart)}&to=${encodeURIComponent(windowEnd)}`,
    {
      headers: {
        cookie: adminCookie
      }
    }
  );

  assert.equal(summaryResponse.status, 200);
  const summary = (await summaryResponse.json()) as WorkflowStateSummaryResponse;

  assert.equal(summary.from, windowStart);
  assert.equal(summary.to, windowEnd);
  assert.equal(summary.counts.DRAFT, 1);
  assert.equal(summary.counts.SUBMITTED, 1);
  assert.equal(summary.counts.APPLIED, 1);
  assert.equal(summary.counts.IN_REVIEW, 0);
  assert.equal(summary.counts.APPROVED, 0);
  assert.equal(summary.counts.REJECTED, 0);
  assert.equal(summary.counts.ARCHIVED, 0);
  assert.equal(summary.total, 3);

  const nonAdminSummaryResponse = await fetch(`${apiBaseUrl}/proposals/summary/workflow-states`, {
    headers: {
      cookie: editorCookie
    }
  });
  assert.equal(nonAdminSummaryResponse.status, 403);

  // Ensure we still have access to a created draft proposal id to avoid unused assignment side effects.
  assert.ok(draftProposal.id.length > 0);
});

test("AC-20: change-type summary endpoint returns deterministic counts with date window", async () => {
  const windowStart = new Date().toISOString();

  await createProposalAsEditor({
    changeType: "CREATE",
    title: "AC-20 Type Create",
    summary: "Change type summary create"
  });

  await createProposalAsEditor({
    changeType: "UPDATE",
    title: "AC-20 Type Update",
    summary: "Change type summary update"
  });

  await createProposalAsEditor({
    changeType: "DELETE",
    title: "AC-20 Type Delete",
    summary: "Change type summary delete"
  });

  const windowEnd = new Date().toISOString();

  const summaryResponse = await fetch(
    `${apiBaseUrl}/proposals/summary/change-types?from=${encodeURIComponent(windowStart)}&to=${encodeURIComponent(windowEnd)}`,
    {
      headers: {
        cookie: adminCookie
      }
    }
  );

  assert.equal(summaryResponse.status, 200);
  const summary = (await summaryResponse.json()) as ChangeTypeSummaryResponse;

  assert.equal(summary.from, windowStart);
  assert.equal(summary.to, windowEnd);
  assert.equal(summary.counts.CREATE, 1);
  assert.equal(summary.counts.UPDATE, 1);
  assert.equal(summary.counts.DELETE, 1);
  assert.equal(summary.total, 3);
});

test("AC-21: summary endpoints validate malformed date-window queries", async () => {
  const malformedFromResponse = await fetch(
    `${apiBaseUrl}/proposals/summary/workflow-states?from=not-a-date`,
    {
      headers: {
        cookie: adminCookie
      }
    }
  );

  assert.equal(malformedFromResponse.status, 400);

  const reversedWindowResponse = await fetch(
    `${apiBaseUrl}/proposals/summary/change-types?from=${encodeURIComponent("2026-03-20T00:00:00.000Z")}&to=${encodeURIComponent("2026-03-19T00:00:00.000Z")}`,
    {
      headers: {
        cookie: adminCookie
      }
    }
  );

  assert.equal(reversedWindowResponse.status, 400);
});
