import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";

import { createApp } from "../apps/api/src/app/createApp.js";
import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { phase0FixtureConfig } from "../scripts/phase0FixtureConfig.js";

type ProposalPreviewResponse = {
  proposal: {
    id: string;
    proposedById: string;
    status: "PENDING" | "ACCEPTED" | "REJECTED";
    workflowState: "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "APPLIED" | "ARCHIVED";
    changeType: "CREATE" | "UPDATE" | "DELETE";
    entityId: string | null;
    manuscriptId: string | null;
    rejectionReason: string | null;
  };
  validation: {
    canApply: boolean;
    errors: string[];
  };
  currentSnapshot: {
    exists: boolean;
    kind: "ENTITY" | "MANUSCRIPT";
    targetSlug: string | null;
    revisionId: string | null;
    version: number | null;
    name: string | null;
    title: string | null;
    summary: string | null;
    visibility: Visibility | null;
    payload: Record<string, unknown> | null;
  };
  proposedSnapshot: {
    exists: boolean;
    kind: "ENTITY" | "MANUSCRIPT";
    version: number | null;
    name: string | null;
    title: string | null;
    summary: string | null;
    visibility: Visibility | null;
    payload: Record<string, unknown> | null;
  };
  changeSummary: {
    addedFieldCount: number;
    removedFieldCount: number;
    modifiedFieldCount: number;
    relationshipChangeCount: number;
    affectedFields: string[];
    addedFields: Array<{ path: string; value: unknown }>;
    removedFields: Array<{ path: string; value: unknown }>;
    modifiedFields: Array<{ path: string; before: unknown; after: unknown }>;
    relationshipChanges: Array<{
      key: string;
      changeType: "ADDED" | "REMOVED" | "MODIFIED";
      before: unknown | null;
      after: unknown | null;
    }>;
  };
  impactSummary: {
    affectedFields: string[];
    relationshipImpact: {
      added: string[];
      removed: string[];
      modified: string[];
    };
    deletionImpact: {
      relationshipCount: number;
      relatedRelationshipKeys: string[];
      dependencyReferenceCount: number;
      referencingEntitySlugs: string[];
      revisionCount: number;
      releaseEntryCount: number;
      proposalCount: number;
      commentCount: number;
      continuityIssueCount: number;
    } | null;
  };
};

type ProposalResponse = {
  id: string;
};

const timestamp = Date.now();
const app = createApp();
const server = createServer(app);

const users = {
  admin: {
    email: phase0FixtureConfig.authorAdmin.email,
    password: phase0FixtureConfig.authorAdmin.password,
    role: Role.AUTHOR_ADMIN,
    displayName: phase0FixtureConfig.authorAdmin.displayName
  },
  submitter: {
    email: `phase3-stage04-part02-editor-${timestamp}@example.com`,
    password: "Phase3Stage04Part02Editor!234",
    role: Role.EDITOR,
    displayName: "Phase3 Stage04 Part02 Editor"
  },
  otherEditor: {
    email: `phase3-stage04-part02-other-${timestamp}@example.com`,
    password: "Phase3Stage04Part02Other!234",
    role: Role.EDITOR,
    displayName: "Phase3 Stage04 Part02 Other"
  }
} as const;

const slugs = {
  entity: `phase3-stage04-part02-entity-${timestamp}`,
  related: `phase3-stage04-part02-related-${timestamp}`,
  referencing: `phase3-stage04-part02-ref-${timestamp}`,
  manuscript: `phase3-stage04-part02-manuscript-${timestamp}`
};

let apiBaseUrl = "";
let adminCookie = "";
let submitterCookie = "";
let otherEditorCookie = "";
let entityId = "";
let manuscriptId = "";
let acceptedEntityProposalId = "";
let acceptedManuscriptProposalId = "";
let acceptedDeleteProposalId = "";
let rejectedProposalId = "";

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
    throw new Error(`Missing cookie for ${email}`);
  }

  return cookieHeader.split(";")[0] ?? "";
};

const createProposal = async (input: {
  path: string;
  changeType: "CREATE" | "UPDATE" | "DELETE";
  title: string;
  summary: string;
  payload?: Record<string, unknown>;
}): Promise<string> => {
  const response = await fetch(`${apiBaseUrl}${input.path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: submitterCookie
    },
    body: JSON.stringify({
      changeType: input.changeType,
      title: input.title,
      summary: input.summary,
      ...(input.payload === undefined ? {} : { payload: input.payload })
    })
  });

  assert.equal(response.status, 201);
  const proposal = (await response.json()) as ProposalResponse;
  return proposal.id;
};

const acceptProposal = async (proposalId: string, note: string): Promise<void> => {
  const response = await fetch(`${apiBaseUrl}/proposals/${proposalId}/accept`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({ decisionNote: note })
  });

  assert.equal(response.status, 200);
};

const rejectProposal = async (proposalId: string, note: string): Promise<void> => {
  const response = await fetch(`${apiBaseUrl}/proposals/${proposalId}/reject`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
    },
    body: JSON.stringify({ decisionNote: note })
  });

  assert.equal(response.status, 200);
};

const fetchPreview = async (proposalId: string, cookie: string): Promise<Response> => {
  return fetch(`${apiBaseUrl}/proposals/${proposalId}/preview`, {
    headers: {
      cookie
    }
  });
};

before(async () => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Unable to resolve test server address");
  }

  apiBaseUrl = `http://127.0.0.1:${address.port}`;

  for (const user of Object.values(users)) {
    const passwordHash = await passwordHasher.hashPassword(user.password);

    await prismaClient.user.upsert({
      where: { email: user.email },
      update: {
        displayName: user.displayName,
        passwordHash,
        role: user.role
      },
      create: {
        email: user.email,
        displayName: user.displayName,
        passwordHash,
        role: user.role
      }
    });
  }

  adminCookie = await createSession(users.admin.email, users.admin.password);
  submitterCookie = await createSession(users.submitter.email, users.submitter.password);
  otherEditorCookie = await createSession(users.otherEditor.email, users.otherEditor.password);

  const [entity, relatedEntity, referencingEntity, manuscript] = await Promise.all([
    prismaClient.entity.create({
      data: {
        slug: slugs.entity,
        type: "CHARACTER",
        revisions: {
          create: {
            createdBy: { connect: { email: users.admin.email } },
            version: 1,
            name: "Stage 04 Entity v1",
            summary: "Original entity summary",
            visibility: Visibility.PRIVATE,
            payload: {
              biography: "Old biography",
              requiredDependencies: [
                {
                  kind: "RELATIONSHIP",
                  sourceEntitySlug: slugs.entity,
                  targetEntitySlug: slugs.related,
                  relationType: "ALLY"
                }
              ]
            }
          }
        }
      },
      select: { id: true }
    }),
    prismaClient.entity.create({
      data: {
        slug: slugs.related,
        type: "FACTION"
      },
      select: { id: true }
    }),
    prismaClient.entity.create({
      data: {
        slug: slugs.referencing,
        type: "EVENT",
        revisions: {
          create: {
            createdBy: { connect: { email: users.admin.email } },
            version: 1,
            name: "Referencing Event",
            summary: "References the preview target",
            visibility: Visibility.PRIVATE,
            payload: {
              requiredDependencies: [
                {
                  kind: "RELATIONSHIP",
                  sourceEntitySlug: slugs.entity,
                  targetEntitySlug: slugs.related,
                  relationType: "ALLY"
                }
              ]
            }
          }
        }
      },
      select: { id: true }
    }),
    prismaClient.manuscript.create({
      data: {
        slug: slugs.manuscript,
        type: "CHAPTER",
        revisions: {
          create: {
            createdBy: { connect: { email: users.admin.email } },
            version: 1,
            title: "Stage 04 Chapter v1",
            summary: "Original chapter summary",
            visibility: Visibility.PRIVATE,
            payload: {
              body: "Original chapter body",
              notes: {
                beat: "arrival"
              }
            }
          }
        }
      },
      select: { id: true }
    })
  ]);

  entityId = entity.id;
  manuscriptId = manuscript.id;

  await prismaClient.relationship.create({
    data: {
      sourceEntityId: entity.id,
      targetEntityId: relatedEntity.id,
      relationType: "ALLY"
    }
  });

  await prismaClient.comment.create({
    data: {
      userId: (await prismaClient.user.findUniqueOrThrow({ where: { email: users.submitter.email }, select: { id: true } })).id,
      entityId: entity.id,
      body: "Preview impact comment"
    }
  });

  acceptedEntityProposalId = await createProposal({
    path: `/entities/CHARACTER/${slugs.entity}/proposals`,
    changeType: "UPDATE",
    title: "Stage 04 Entity v2",
    summary: "Updated entity summary",
    payload: {
      biography: "Updated biography",
      requiredDependencies: [
        {
          kind: "RELATIONSHIP",
          sourceEntitySlug: slugs.entity,
          targetEntitySlug: slugs.referencing,
          relationType: "ALLY"
        }
      ],
      titleCard: "previewable"
    }
  });
  await acceptProposal(acceptedEntityProposalId, "Accepted entity preview proposal");

  acceptedManuscriptProposalId = await createProposal({
    path: `/manuscripts/${manuscript.id}/proposals`,
    changeType: "UPDATE",
    title: "Stage 04 Chapter v2",
    summary: "Updated chapter summary",
    payload: {
      body: "Updated chapter body",
      notes: {
        beat: "departure"
      },
      appendix: "Preview appendix"
    }
  });
  await acceptProposal(acceptedManuscriptProposalId, "Accepted manuscript preview proposal");

  acceptedDeleteProposalId = await createProposal({
    path: `/entities/CHARACTER/${slugs.entity}/proposals`,
    changeType: "DELETE",
    title: "Delete Stage 04 Entity",
    summary: "Delete the current entity"
  });
  await acceptProposal(acceptedDeleteProposalId, "Accepted delete preview proposal");

  rejectedProposalId = await createProposal({
    path: `/entities/CHARACTER/${slugs.entity}/proposals`,
    changeType: "UPDATE",
    title: "Rejected Stage 04 Entity",
    summary: "Rejected preview content",
    payload: {
      biography: "Rejected biography"
    }
  });
  await rejectProposal(rejectedProposalId, "Rejected because chronology does not line up.");
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  await prismaClient.comment.deleteMany({
    where: {
      entityId
    }
  });
  await prismaClient.relationship.deleteMany({
    where: {
      OR: [{ sourceEntityId: entityId }, { targetEntityId: entityId }]
    }
  });
  await prismaClient.proposal.deleteMany({
    where: {
      OR: [{ entityId }, { manuscriptId }]
    }
  });
  await prismaClient.entityRevision.deleteMany({
    where: {
      entityId: {
        in: [entityId]
      }
    }
  });
  await prismaClient.manuscriptRevision.deleteMany({ where: { manuscriptId } });
  await prismaClient.entity.deleteMany({
    where: {
      slug: {
        in: [slugs.entity, slugs.related, slugs.referencing]
      }
    }
  });
  await prismaClient.manuscript.deleteMany({ where: { id: manuscriptId } });
  await prismaClient.session.deleteMany({
    where: {
      user: {
        email: {
          in: [users.admin.email, users.submitter.email, users.otherEditor.email]
        }
      }
    }
  });
  await prismaClient.user.deleteMany({
    where: {
      email: {
        in: [users.submitter.email, users.otherEditor.email]
      }
    }
  });

  await prismaClient.$disconnect();
});

test("AC-01: preview accepted entity proposal returns current and proposed snapshots", async () => {
  const response = await fetchPreview(acceptedEntityProposalId, submitterCookie);
  assert.equal(response.status, 200);

  const preview = (await response.json()) as ProposalPreviewResponse;
  assert.equal(preview.currentSnapshot.kind, "ENTITY");
  assert.equal(preview.currentSnapshot.exists, true);
  assert.equal(preview.currentSnapshot.name, "Stage 04 Entity v1");
  assert.equal(preview.proposedSnapshot.exists, true);
  assert.equal(preview.proposedSnapshot.name, "Stage 04 Entity v2");
  assert.equal(preview.proposedSnapshot.visibility, "PRIVATE");
  assert.equal(preview.validation.canApply, true);
});

test("AC-02: preview accepted manuscript proposal returns current and proposed snapshots", async () => {
  const response = await fetchPreview(acceptedManuscriptProposalId, adminCookie);
  assert.equal(response.status, 200);

  const preview = (await response.json()) as ProposalPreviewResponse;
  assert.equal(preview.currentSnapshot.kind, "MANUSCRIPT");
  assert.equal(preview.currentSnapshot.title, "Stage 04 Chapter v1");
  assert.equal(preview.proposedSnapshot.title, "Stage 04 Chapter v2");
  assert.equal(preview.proposedSnapshot.version, 2);
});

test("AC-03: preview includes structured change summary", async () => {
  const response = await fetchPreview(acceptedEntityProposalId, submitterCookie);
  assert.equal(response.status, 200);

  const preview = (await response.json()) as ProposalPreviewResponse;
  assert.ok(preview.changeSummary.modifiedFields.some((item) => item.path === "name"));
  assert.ok(preview.changeSummary.modifiedFields.some((item) => item.path === "payload.biography"));
  assert.ok(preview.changeSummary.addedFields.some((item) => item.path === "payload.titleCard"));
  assert.ok(preview.changeSummary.relationshipChanges.some((item) => item.changeType === "REMOVED"));
  assert.ok(preview.changeSummary.relationshipChanges.some((item) => item.changeType === "ADDED"));
  assert.deepEqual(preview.changeSummary.affectedFields, [...preview.changeSummary.affectedFields].sort((left, right) => left.localeCompare(right)));
});

test("AC-04: delete proposal preview returns deletion impact summary", async () => {
  const response = await fetchPreview(acceptedDeleteProposalId, adminCookie);
  assert.equal(response.status, 200);

  const preview = (await response.json()) as ProposalPreviewResponse;
  assert.equal(preview.proposedSnapshot.exists, false);
  assert(preview.impactSummary.deletionImpact !== null);
  assert.equal(preview.impactSummary.deletionImpact?.relationshipCount, 1);
  assert.ok(preview.impactSummary.deletionImpact?.relatedRelationshipKeys.includes(`${slugs.entity}|ALLY|${slugs.related}`));
  assert.equal(preview.impactSummary.deletionImpact?.dependencyReferenceCount, 1);
  assert.deepEqual(preview.impactSummary.deletionImpact?.referencingEntitySlugs, [slugs.referencing]);
});

test("AC-05: rejected proposal exposes rejection reason to submitter", async () => {
  const response = await fetchPreview(rejectedProposalId, submitterCookie);
  assert.equal(response.status, 200);

  const preview = (await response.json()) as ProposalPreviewResponse;
  assert.equal(preview.proposal.status, "REJECTED");
  assert.equal(preview.proposal.rejectionReason, "Rejected because chronology does not line up.");
  assert.equal(preview.validation.canApply, false);
  assert.ok(preview.validation.errors.some((error) => error.includes("REJECTED")));
});

test("AC-06: rejected proposal exposes rejection reason to admin", async () => {
  const response = await fetchPreview(rejectedProposalId, adminCookie);
  assert.equal(response.status, 200);

  const preview = (await response.json()) as ProposalPreviewResponse;
  assert.equal(preview.proposal.rejectionReason, "Rejected because chronology does not line up.");
});

test("AC-07: unauthorized preview access is blocked for non-owner editor", async () => {
  const response = await fetchPreview(acceptedEntityProposalId, otherEditorCookie);
  assert.equal(response.status, 403);
});

test("AC-08: preview is read-only and leaves source state unchanged", async () => {
  const beforeProposal = await prismaClient.proposal.findUniqueOrThrow({
    where: { id: acceptedEntityProposalId },
    select: {
      updatedAt: true,
      appliedAt: true
    }
  });
  const beforeEntityRevisionCount = await prismaClient.entityRevision.count({ where: { entityId } });
  const beforeManuscriptRevisionCount = await prismaClient.manuscriptRevision.count({ where: { manuscriptId } });
  const beforeDiffCount = await prismaClient.revisionDiff.count();

  const response = await fetchPreview(acceptedEntityProposalId, submitterCookie);
  assert.equal(response.status, 200);

  const afterProposal = await prismaClient.proposal.findUniqueOrThrow({
    where: { id: acceptedEntityProposalId },
    select: {
      updatedAt: true,
      appliedAt: true
    }
  });
  const afterEntityRevisionCount = await prismaClient.entityRevision.count({ where: { entityId } });
  const afterManuscriptRevisionCount = await prismaClient.manuscriptRevision.count({ where: { manuscriptId } });
  const afterDiffCount = await prismaClient.revisionDiff.count();

  assert.equal(afterProposal.updatedAt.toISOString(), beforeProposal.updatedAt.toISOString());
  assert.equal(afterProposal.appliedAt, beforeProposal.appliedAt);
  assert.equal(afterEntityRevisionCount, beforeEntityRevisionCount);
  assert.equal(afterManuscriptRevisionCount, beforeManuscriptRevisionCount);
  assert.equal(afterDiffCount, beforeDiffCount);
});