import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";

import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { portabilityExportService } from "../apps/api/src/services/portabilityExportService.js";
import { portabilityImportService } from "../apps/api/src/services/portabilityImportService.js";

const timestamp = Date.now();
const slugPrefix = `phase4-stage04-part02-${timestamp}`;
const adminEmail = `${slugPrefix}-admin@example.com`;
const reviewerEmail = `${slugPrefix}-reviewer@example.com`;
const actorPassword = "phase4-stage04-part02-password";

let adminUserId = "";
let reviewerUserId = "";
let baseEntityId = "";
let proposalIdForExport = "";
let reviewRequestIdForExport = "";
let approvalChainIdForExport = "";
let approvalStepIdForExport = "";

const writeManifest = async (
  packageDir: string,
  counts: { entities?: number; manuscripts?: number; relationships?: number; releases?: number } = {}
): Promise<void> => {
  const dir = join(packageDir, "manifests");
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "export-manifest.json"),
    JSON.stringify({
      schemaVersion: 1,
      format: "json",
      scope: "current",
      exportedAt: new Date().toISOString(),
      counts: {
        entities: counts.entities ?? 0,
        manuscripts: counts.manuscripts ?? 0,
        relationships: counts.relationships ?? 0,
        releases: counts.releases ?? 0
      }
    }),
    "utf8"
  );
};

const writeGovernancePackage = async (packageDir: string, input: {
  proposalId: string;
  createdById: string;
  assignedApproverId: string;
  reviewRequestId: string;
  approvalChainId: string;
  approvalStepId: string;
  approvalStepEventId: string;
  notificationEventId: string;
  notificationPreferenceId: string;
}): Promise<void> => {
  await mkdir(join(packageDir, "governance", "review-requests"), { recursive: true });
  await mkdir(join(packageDir, "governance", "approval-chains"), { recursive: true });
  await mkdir(join(packageDir, "governance", "approval-steps"), { recursive: true });
  await mkdir(join(packageDir, "governance", "approval-step-events"), { recursive: true });
  await mkdir(join(packageDir, "governance", "notification-events"), { recursive: true });
  await mkdir(join(packageDir, "governance", "notification-preferences"), { recursive: true });

  await writeFile(
    join(packageDir, "governance", "review-requests", `${input.reviewRequestId}.json`),
    JSON.stringify({
      reviewRequest: {
        id: input.reviewRequestId,
        proposalId: input.proposalId,
        createdById: input.createdById,
        assignedApproverId: input.assignedApproverId,
        assignedAt: "2026-03-20T10:00:00.000Z",
        assignmentHistory: { source: "import" },
        lifecycleHistory: { state: "ACKNOWLEDGED" },
        status: "ACKNOWLEDGED",
        createdAt: "2026-03-20T09:00:00.000Z",
        updatedAt: "2026-03-20T10:00:00.000Z"
      }
    }),
    "utf8"
  );

  await writeFile(
    join(packageDir, "governance", "approval-chains", `${input.approvalChainId}.json`),
    JSON.stringify({
      approvalChain: {
        id: input.approvalChainId,
        reviewRequestId: input.reviewRequestId,
        status: "ACTIVE",
        currentStepOrder: 1,
        finalizedAt: null,
        createdAt: "2026-03-20T10:10:00.000Z",
        updatedAt: "2026-03-20T10:10:00.000Z"
      }
    }),
    "utf8"
  );

  await writeFile(
    join(packageDir, "governance", "approval-steps", `${input.approvalStepId}.json`),
    JSON.stringify({
      approvalStep: {
        id: input.approvalStepId,
        chainId: input.approvalChainId,
        stepOrder: 1,
        title: "Imported approval step",
        required: true,
        status: "PENDING",
        assignedReviewerId: input.assignedApproverId,
        assignedRole: "EDITOR",
        acknowledgedAt: null,
        acknowledgedById: null,
        decidedAt: null,
        decidedById: null,
        decisionNote: null,
        escalationLevel: 0,
        escalatedAt: null,
        escalatedById: null,
        createdAt: "2026-03-20T10:15:00.000Z",
        updatedAt: "2026-03-20T10:15:00.000Z"
      }
    }),
    "utf8"
  );

  await writeFile(
    join(packageDir, "governance", "approval-step-events", `${input.approvalStepEventId}.json`),
    JSON.stringify({
      approvalStepEvent: {
        id: input.approvalStepEventId,
        stepId: input.approvalStepId,
        eventType: "DELEGATED",
        reasonCode: "LOAD_BALANCE",
        reasonNote: "imported event",
        actorUserId: input.createdById,
        fromAssignedReviewerId: input.assignedApproverId,
        fromAssignedRole: "EDITOR",
        toAssignedReviewerId: input.createdById,
        toAssignedRole: "AUTHOR_ADMIN",
        escalationLevel: 1,
        createdAt: "2026-03-20T10:20:00.000Z"
      }
    }),
    "utf8"
  );

  await writeFile(
    join(packageDir, "governance", "notification-events", `${input.notificationEventId}.json`),
    JSON.stringify({
      notificationEvent: {
        id: input.notificationEventId,
        eventType: "APPROVAL_STEP_DELEGATED",
        eventKey: `${slugPrefix}-notification-event-key`,
        status: "DELIVERED",
        reviewRequestId: input.reviewRequestId,
        approvalChainId: input.approvalChainId,
        approvalStepId: input.approvalStepId,
        actorUserId: input.createdById,
        payload: {
          note: "imported",
          attribution: {
            actorUserId: input.createdById,
            assignedApproverId: input.assignedApproverId
          }
        },
        attemptCount: 1,
        nextAttemptAt: "2026-03-20T10:30:00.000Z",
        lastAttemptAt: "2026-03-20T10:30:00.000Z",
        deliveredAt: "2026-03-20T10:30:05.000Z",
        lastError: null,
        processingToken: null,
        createdAt: "2026-03-20T10:29:00.000Z",
        updatedAt: "2026-03-20T10:30:05.000Z"
      }
    }),
    "utf8"
  );

  await writeFile(
    join(packageDir, "governance", "notification-preferences", `${input.notificationPreferenceId}.json`),
    JSON.stringify({
      notificationPreference: {
        id: input.notificationPreferenceId,
        userId: input.assignedApproverId,
        eventType: "APPROVAL_STEP_DELEGATED",
        enabled: true,
        createdAt: "2026-03-20T10:00:00.000Z",
        updatedAt: "2026-03-20T10:00:00.000Z"
      }
    }),
    "utf8"
  );
};

before(async () => {
  const passwordHash = await passwordHasher.hashPassword(actorPassword);

  const admin = await prismaClient.user.create({
    data: {
      email: adminEmail,
      displayName: "Phase 4 Part 02 Admin",
      passwordHash,
      role: Role.AUTHOR_ADMIN
    }
  });

  const reviewer = await prismaClient.user.create({
    data: {
      email: reviewerEmail,
      displayName: "Phase 4 Part 02 Reviewer",
      passwordHash,
      role: Role.EDITOR
    }
  });

  adminUserId = admin.id;
  reviewerUserId = reviewer.id;

  const entity = await prismaClient.entity.create({
    data: {
      slug: `${slugPrefix}-entity`,
      type: "CHARACTER"
    }
  });

  baseEntityId = entity.id;

  await prismaClient.entityRevision.create({
    data: {
      entityId: entity.id,
      createdById: adminUserId,
      version: 1,
      name: "Part 02 Entity",
      summary: "Entity for part 02 test",
      visibility: Visibility.PUBLIC
    }
  });

  const proposal = await prismaClient.proposal.create({
    data: {
      proposedById: adminUserId,
      entityId: entity.id,
      changeType: "UPDATE",
      title: "Phase 4 Part 02 Proposal",
      summary: "Proposal for governance artifact export"
    }
  });

  proposalIdForExport = proposal.id;

  const reviewRequest = await prismaClient.reviewRequest.create({
    data: {
      proposalId: proposal.id,
      createdById: adminUserId,
      assignedApproverId: reviewerUserId,
      assignedAt: new Date("2026-03-20T09:00:00.000Z"),
      assignmentHistory: { assignedBy: adminUserId },
      lifecycleHistory: { state: "OPEN" },
      status: "OPEN"
    }
  });

  reviewRequestIdForExport = reviewRequest.id;

  const approvalChain = await prismaClient.approvalChain.create({
    data: {
      reviewRequestId: reviewRequest.id,
      status: "ACTIVE",
      currentStepOrder: 1
    }
  });

  approvalChainIdForExport = approvalChain.id;

  const approvalStep = await prismaClient.approvalStep.create({
    data: {
      chainId: approvalChain.id,
      stepOrder: 1,
      title: "Part 02 Step",
      required: true,
      status: "PENDING",
      assignedReviewerId: reviewerUserId,
      assignedRole: "EDITOR"
    }
  });

  approvalStepIdForExport = approvalStep.id;

  await prismaClient.approvalStepEvent.create({
    data: {
      stepId: approvalStep.id,
      eventType: "DELEGATED",
      reasonCode: "QUEUE_BALANCE",
      reasonNote: "seed",
      actorUserId: adminUserId,
      fromAssignedReviewerId: reviewerUserId,
      fromAssignedRole: "EDITOR",
      toAssignedReviewerId: adminUserId,
      toAssignedRole: "AUTHOR_ADMIN",
      escalationLevel: 1
    }
  });

  await prismaClient.notificationEvent.create({
    data: {
      eventType: "APPROVAL_STEP_DELEGATED",
      eventKey: `${slugPrefix}-seed-event-key`,
      status: "DELIVERED",
      reviewRequestId: reviewRequest.id,
      approvalChainId: approvalChain.id,
      approvalStepId: approvalStep.id,
      actorUserId: adminUserId,
      payload: {
        source: "seed",
        attribution: {
          actorUserId: adminUserId,
          reviewerUserId
        }
      },
      attemptCount: 1,
      nextAttemptAt: new Date("2026-03-20T11:00:00.000Z"),
      lastAttemptAt: new Date("2026-03-20T11:00:00.000Z"),
      deliveredAt: new Date("2026-03-20T11:00:01.000Z")
    }
  });

  await prismaClient.notificationPreference.create({
    data: {
      userId: reviewerUserId,
      eventType: "APPROVAL_STEP_DELEGATED",
      enabled: true
    }
  });
});

after(async () => {
  await prismaClient.notificationPreference.deleteMany({
    where: {
      OR: [
        { userId: reviewerUserId },
        { userId: adminUserId }
      ]
    }
  });

  await prismaClient.notificationEvent.deleteMany({
    where: {
      OR: [
        { eventKey: { startsWith: slugPrefix } },
        { reviewRequestId: reviewRequestIdForExport }
      ]
    }
  });

  await prismaClient.approvalStepEvent.deleteMany({
    where: {
      step: {
        chain: {
          reviewRequestId: reviewRequestIdForExport
        }
      }
    }
  });

  await prismaClient.approvalStep.deleteMany({
    where: {
      chain: {
        reviewRequestId: reviewRequestIdForExport
      }
    }
  });

  await prismaClient.approvalChain.deleteMany({
    where: {
      reviewRequestId: reviewRequestIdForExport
    }
  });

  await prismaClient.reviewRequest.deleteMany({
    where: {
      proposalId: proposalIdForExport
    }
  });

  await prismaClient.proposal.deleteMany({
    where: {
      id: proposalIdForExport
    }
  });

  await prismaClient.entity.deleteMany({
    where: {
      slug: `${slugPrefix}-entity`
    }
  });

  await prismaClient.user.deleteMany({
    where: {
      email: {
        in: [adminEmail, reviewerEmail]
      }
    }
  });

  await prismaClient.$disconnect();
});

test("phase4AuditRetentionPortabilityExtensionsPart02 export includes full governance artifacts", async () => {
  const exported = await portabilityExportService.prepareExport({
    scope: "current",
    format: "json"
  });

  assert.ok(exported.files.some((file) => file.path === `governance/review-requests/${reviewRequestIdForExport}.json`));
  assert.ok(exported.files.some((file) => file.path === `governance/approval-chains/${approvalChainIdForExport}.json`));
  assert.ok(exported.files.some((file) => file.path === `governance/approval-steps/${approvalStepIdForExport}.json`));
  assert.ok(exported.files.some((file) => file.path.startsWith("governance/approval-step-events/")));
  assert.ok(exported.files.some((file) => file.path.startsWith("governance/notification-events/")));
  assert.ok(exported.files.some((file) => file.path.startsWith("governance/notification-preferences/")));

  const manifest = exported.manifest as {
    counts: {
      reviewRequests?: number;
      approvalChains?: number;
      approvalSteps?: number;
      approvalStepEvents?: number;
      notificationEvents?: number;
      notificationPreferences?: number;
    };
  };

  assert.ok((manifest.counts.reviewRequests ?? 0) >= 1);
  assert.ok((manifest.counts.approvalChains ?? 0) >= 1);
  assert.ok((manifest.counts.approvalSteps ?? 0) >= 1);
  assert.ok((manifest.counts.approvalStepEvents ?? 0) >= 1);
  assert.ok((manifest.counts.notificationEvents ?? 0) >= 1);
  assert.ok((manifest.counts.notificationPreferences ?? 0) >= 1);
});

test("phase4AuditRetentionPortabilityExtensionsPart02 import remains backward-compatible without governance payloads", async () => {
  const packageDir = await mkdtemp(join(tmpdir(), `${slugPrefix}-compat-`));
  const entitySlug = `${slugPrefix}-compat-entity`;

  try {
    await writeManifest(packageDir, { entities: 1 });
    await mkdir(join(packageDir, "entities", "character"), { recursive: true });
    await writeFile(
      join(packageDir, "entities", "character", `${entitySlug}.json`),
      JSON.stringify({
        entity: {
          slug: entitySlug,
          type: "CHARACTER",
          retiredAt: null
        },
        revision: {
          version: 1,
          name: "Compatibility Entity",
          summary: "Import should succeed with no governance section",
          visibility: "PUBLIC",
          payload: null
        }
      }),
      "utf8"
    );

    const report = await portabilityImportService.runImport({
      inputPath: packageDir,
      format: "json",
      actorEmail: adminEmail,
      dryRun: false
    });

    assert.equal(report.errors.length, 0);
    assert.equal(report.summary.entities.created, 1);
  } finally {
    await prismaClient.entity.deleteMany({ where: { slug: entitySlug } });
    await rm(packageDir, { recursive: true, force: true });
  }
});

test("phase4AuditRetentionPortabilityExtensionsPart02 import preserves governance attribution and retention semantics are explicit", async () => {
  const importProposal = await prismaClient.proposal.create({
    data: {
      id: `${slugPrefix}-proposal-import`,
      proposedById: adminUserId,
      entityId: baseEntityId,
      changeType: "UPDATE",
      title: "Import Proposal",
      summary: "Target proposal for governance import"
    }
  });

  const packageDir = await mkdtemp(join(tmpdir(), `${slugPrefix}-governance-import-`));
  const importIds = {
    proposalId: importProposal.id,
    createdById: adminUserId,
    assignedApproverId: reviewerUserId,
    reviewRequestId: `${slugPrefix}-rr-import`,
    approvalChainId: `${slugPrefix}-ac-import`,
    approvalStepId: `${slugPrefix}-as-import`,
    approvalStepEventId: `${slugPrefix}-ase-import`,
    notificationEventId: `${slugPrefix}-ne-import`,
    notificationPreferenceId: `${slugPrefix}-np-import`
  };

  try {
    await writeManifest(packageDir);
    await writeGovernancePackage(packageDir, importIds);

    const report = await portabilityImportService.runImport({
      inputPath: packageDir,
      format: "json",
      actorEmail: adminEmail,
      dryRun: false
    });

    assert.equal(report.errors.length, 0, JSON.stringify(report.errors));

    const importedReviewRequest = await prismaClient.reviewRequest.findUnique({
      where: { id: importIds.reviewRequestId }
    });
    const importedStepEvent = await prismaClient.approvalStepEvent.findUnique({
      where: { id: importIds.approvalStepEventId }
    });
    const importedNotificationEvent = await prismaClient.notificationEvent.findUnique({
      where: { id: importIds.notificationEventId }
    });

    assert.ok(importedReviewRequest);
    assert.equal(importedReviewRequest.createdById, adminUserId);
    assert.equal(importedReviewRequest.assignedApproverId, reviewerUserId);

    assert.ok(importedStepEvent);
    assert.equal(importedStepEvent.actorUserId, adminUserId);

    assert.ok(importedNotificationEvent);
    assert.equal(importedNotificationEvent.actorUserId, adminUserId);
    assert.equal(importedNotificationEvent.reviewRequestId, importIds.reviewRequestId);

    await prismaClient.proposal.delete({ where: { id: importIds.proposalId } });

    const reviewRequestAfterProposalDelete = await prismaClient.reviewRequest.findUnique({
      where: { id: importIds.reviewRequestId }
    });
    const approvalChainAfterProposalDelete = await prismaClient.approvalChain.findUnique({
      where: { id: importIds.approvalChainId }
    });
    const approvalStepAfterProposalDelete = await prismaClient.approvalStep.findUnique({
      where: { id: importIds.approvalStepId }
    });
    const stepEventAfterProposalDelete = await prismaClient.approvalStepEvent.findUnique({
      where: { id: importIds.approvalStepEventId }
    });
    const notificationAfterProposalDelete = await prismaClient.notificationEvent.findUnique({
      where: { id: importIds.notificationEventId }
    });

    assert.equal(reviewRequestAfterProposalDelete, null);
    assert.equal(approvalChainAfterProposalDelete, null);
    assert.equal(approvalStepAfterProposalDelete, null);
    assert.equal(stepEventAfterProposalDelete, null);
    assert.ok(notificationAfterProposalDelete);
    assert.equal(notificationAfterProposalDelete.reviewRequestId, null);
    assert.equal(notificationAfterProposalDelete.approvalChainId, null);
    assert.equal(notificationAfterProposalDelete.approvalStepId, null);
  } finally {
    await prismaClient.notificationEvent.deleteMany({
      where: { id: importIds.notificationEventId }
    });
    await prismaClient.approvalStepEvent.deleteMany({
      where: { id: importIds.approvalStepEventId }
    });
    await prismaClient.approvalStep.deleteMany({
      where: { id: importIds.approvalStepId }
    });
    await prismaClient.approvalChain.deleteMany({
      where: { id: importIds.approvalChainId }
    });
    await prismaClient.reviewRequest.deleteMany({
      where: { id: importIds.reviewRequestId }
    });
    await prismaClient.proposal.deleteMany({
      where: { id: importIds.proposalId }
    });
    await rm(packageDir, { recursive: true, force: true });
  }
});
