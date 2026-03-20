import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";

import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { portabilityImportService } from "../apps/api/src/services/portabilityImportService.js";

const timestamp = Date.now();
const slugPrefix = `phase5-stage03-part02-${timestamp}`;
const actorEmail = `${slugPrefix}-admin@example.com`;
const actorPassword = "phase5-stage03-part02-password";

const existingEntitySlug = `${slugPrefix}-existing-entity`;
const existingReleaseSlug = `${slugPrefix}-existing-release`;

let actorId = "";
let existingEntityId = "";

const writeManifest = async (
  packageDir: string,
  input: { schemaVersion?: number; format?: "json" | "markdown" } = {}
): Promise<void> => {
  await mkdir(join(packageDir, "manifests"), { recursive: true });
  await writeFile(
    join(packageDir, "manifests", "export-manifest.json"),
    JSON.stringify({
      schemaVersion: input.schemaVersion ?? 1,
      format: input.format ?? "json",
      scope: "current",
      exportedAt: new Date().toISOString(),
      counts: {
        entities: 0,
        manuscripts: 0,
        relationships: 0,
        releases: 0
      }
    }),
    "utf8"
  );
};

const writeEntityFile = async (packageDir: string, input: {
  slug: string;
  entityId?: string;
  name?: string;
  summary?: string;
  payload?: unknown;
}): Promise<void> => {
  await mkdir(join(packageDir, "entities", "character"), { recursive: true });
  await writeFile(
    join(packageDir, "entities", "character", `${input.slug}.json`),
    JSON.stringify({
      entity: {
        ...(input.entityId ? { id: input.entityId } : {}),
        slug: input.slug,
        type: "CHARACTER",
        retiredAt: null
      },
      revision: {
        version: 1,
        name: input.name ?? "Part 02 Entity",
        summary: input.summary ?? "Part 02 summary",
        visibility: "PUBLIC",
        payload: input.payload ?? { marker: "part-02" }
      }
    }),
    "utf8"
  );
};

const writeRelationshipFile = async (packageDir: string, input: {
  sourceSlug: string;
  targetSlug: string;
  relationType: string;
}): Promise<void> => {
  await mkdir(join(packageDir, "relationships"), { recursive: true });
  await writeFile(
    join(packageDir, "relationships", `${input.sourceSlug}--${input.relationType}--${input.targetSlug}.json`),
    JSON.stringify({
      relationship: {
        relationType: input.relationType,
        sourceEntity: { slug: input.sourceSlug },
        targetEntity: { slug: input.targetSlug }
      },
      revision: {
        version: 1,
        state: "CREATE",
        visibility: "PUBLIC",
        metadata: null
      }
    }),
    "utf8"
  );
};

const writeReleaseFile = async (packageDir: string, releaseSlug: string): Promise<void> => {
  await mkdir(join(packageDir, "releases"), { recursive: true });
  await writeFile(
    join(packageDir, "releases", `${releaseSlug}.json`),
    JSON.stringify({
      release: {
        slug: releaseSlug,
        name: "Part 02 Release",
        status: "ACTIVE"
      },
      composition: {
        entities: [],
        manuscripts: [],
        relationships: []
      }
    }),
    "utf8"
  );
};

const writeNotificationEventFile = async (packageDir: string, input: {
  id: string;
  eventKey: string;
}): Promise<void> => {
  await mkdir(join(packageDir, "governance", "notification-events"), { recursive: true });
  await writeFile(
    join(packageDir, "governance", "notification-events", `${input.id}.json`),
    JSON.stringify({
      notificationEvent: {
        id: input.id,
        eventType: "APPROVAL_STEP_DELEGATED",
        eventKey: input.eventKey,
        status: "PENDING",
        reviewRequestId: null,
        approvalChainId: null,
        approvalStepId: null,
        actorUserId: actorId,
        payload: {
          source: "phase5-part02"
        },
        attemptCount: 0,
        nextAttemptAt: "2026-03-20T10:00:00.000Z",
        lastAttemptAt: null,
        deliveredAt: null,
        lastError: null,
        processingToken: null,
        createdAt: "2026-03-20T10:00:00.000Z",
        updatedAt: "2026-03-20T10:00:00.000Z"
      }
    }),
    "utf8"
  );
};

before(async () => {
  const passwordHash = await passwordHasher.hashPassword(actorPassword);
  const actor = await prismaClient.user.create({
    data: {
      email: actorEmail,
      displayName: "Phase 5 Stage 03 Part 02 Admin",
      passwordHash,
      role: Role.AUTHOR_ADMIN
    }
  });

  actorId = actor.id;

  const existingEntity = await prismaClient.entity.create({
    data: {
      slug: existingEntitySlug,
      type: "CHARACTER"
    }
  });

  existingEntityId = existingEntity.id;

  await prismaClient.entityRevision.create({
    data: {
      entityId: existingEntityId,
      createdById: actorId,
      version: 1,
      name: "Existing Entity",
      summary: "Existing summary",
      visibility: Visibility.PUBLIC,
      payload: {
        marker: "existing"
      }
    }
  });

  await prismaClient.release.create({
    data: {
      slug: existingReleaseSlug,
      name: "Existing release",
      status: "DRAFT",
      createdById: actorId
    }
  });
});

after(async () => {
  await prismaClient.notificationEvent.deleteMany({ where: { id: { startsWith: slugPrefix } } });
  await prismaClient.release.deleteMany({ where: { slug: { startsWith: slugPrefix } } });
  await prismaClient.relationship.deleteMany({
    where: {
      OR: [
        { sourceEntity: { slug: { startsWith: slugPrefix } } },
        { targetEntity: { slug: { startsWith: slugPrefix } } }
      ]
    }
  });
  await prismaClient.manuscript.deleteMany({ where: { slug: { startsWith: slugPrefix } } });
  await prismaClient.entity.deleteMany({ where: { slug: { startsWith: slugPrefix } } });
  await prismaClient.user.deleteMany({ where: { email: actorEmail } });

  await prismaClient.$disconnect();
});

test("phase5PortabilityConflictResolutionRollbackPart02 AC-01 deterministic conflict outcomes across conflict classes", async () => {
  const duplicatePackage = await mkdtemp(join(tmpdir(), `${slugPrefix}-duplicate-`));
  const identityPackage = await mkdtemp(join(tmpdir(), `${slugPrefix}-identity-`));
  const releasePackage = await mkdtemp(join(tmpdir(), `${slugPrefix}-release-`));
  const relationshipPackage = await mkdtemp(join(tmpdir(), `${slugPrefix}-relationship-`));
  const schemaPackage = await mkdtemp(join(tmpdir(), `${slugPrefix}-schema-`));

  try {
    await writeManifest(duplicatePackage);
    await writeEntityFile(duplicatePackage, {
      slug: existingEntitySlug,
      name: "Changed name",
      payload: { marker: "changed" }
    });

    const duplicateFail = await portabilityImportService.runImport({
      inputPath: duplicatePackage,
      format: "json",
      actorEmail,
      dryRun: true,
      conflictMode: "fail"
    });

    assert.equal(duplicateFail.execution.status, "failed");
    assert.ok(
      duplicateFail.conflicts.some(
        (entry) =>
          entry.conflictClass === "DUPLICATE_SLUG" &&
          entry.policy === "fail" &&
          entry.outcome === "ERROR"
      )
    );

    const duplicateRevision = await portabilityImportService.runImport({
      inputPath: duplicatePackage,
      format: "json",
      actorEmail,
      dryRun: true,
      conflictMode: "create-revision"
    });

    assert.equal(duplicateRevision.errors.length, 0);
    assert.ok(
      duplicateRevision.conflicts.some(
        (entry) =>
          entry.conflictClass === "DUPLICATE_SLUG" &&
          entry.policy === "create-revision" &&
          entry.outcome === "CREATE_REVISION"
      )
    );

    await writeManifest(identityPackage);
    await writeEntityFile(identityPackage, {
      slug: `${slugPrefix}-identity-mismatch-slug`,
      entityId: existingEntityId
    });

    const identityMismatch = await portabilityImportService.runImport({
      inputPath: identityPackage,
      format: "json",
      actorEmail,
      dryRun: true
    });

    assert.equal(identityMismatch.execution.status, "failed");
    assert.ok(
      identityMismatch.conflicts.some((entry) => entry.conflictClass === "IDENTITY_MISMATCH" && entry.outcome === "ERROR")
    );

    await writeManifest(releasePackage);
    await writeReleaseFile(releasePackage, existingReleaseSlug);

    const releaseCollision = await portabilityImportService.runImport({
      inputPath: releasePackage,
      format: "json",
      actorEmail,
      dryRun: true
    });

    assert.equal(releaseCollision.execution.status, "failed");
    assert.ok(
      releaseCollision.conflicts.some(
        (entry) => entry.conflictClass === "RELEASE_SLUG_COLLISION" && entry.outcome === "ERROR"
      )
    );

    await writeManifest(relationshipPackage);
    await writeRelationshipFile(relationshipPackage, {
      sourceSlug: existingEntitySlug,
      targetSlug: `${slugPrefix}-missing-target`,
      relationType: "ALLY"
    });

    const unresolvedRelationship = await portabilityImportService.runImport({
      inputPath: relationshipPackage,
      format: "json",
      actorEmail,
      dryRun: true
    });

    assert.equal(unresolvedRelationship.execution.status, "failed");
    assert.ok(
      unresolvedRelationship.conflicts.some(
        (entry) => entry.conflictClass === "UNRESOLVED_RELATIONSHIP_REFERENCE" && entry.outcome === "ERROR"
      )
    );
    assert.ok(unresolvedRelationship.decisions.some((decision) => decision.file?.includes("relationships")));

    await writeManifest(schemaPackage, { schemaVersion: 2 });

    const schemaMismatch = await portabilityImportService.runImport({
      inputPath: schemaPackage,
      format: "json",
      actorEmail,
      dryRun: true
    });

    assert.equal(schemaMismatch.execution.status, "failed");
    assert.ok(
      schemaMismatch.conflicts.some(
        (entry) => entry.conflictClass === "SCHEMA_VERSION_INCOMPATIBLE" && entry.outcome === "ERROR"
      )
    );
  } finally {
    await rm(duplicatePackage, { recursive: true, force: true });
    await rm(identityPackage, { recursive: true, force: true });
    await rm(releasePackage, { recursive: true, force: true });
    await rm(relationshipPackage, { recursive: true, force: true });
    await rm(schemaPackage, { recursive: true, force: true });
  }
});

test("phase5PortabilityConflictResolutionRollbackPart02 AC-02 apply failures report rollback confirmation and leave no partial writes", async () => {
  const packageDir = await mkdtemp(join(tmpdir(), `${slugPrefix}-rollback-`));
  const rollbackEntitySlug = `${slugPrefix}-rollback-entity`;
  const eventKey = `${slugPrefix}-rollback-event-key`;

  try {
    await writeManifest(packageDir);
    await writeEntityFile(packageDir, { slug: rollbackEntitySlug });
    await writeNotificationEventFile(packageDir, { id: `${slugPrefix}-rollback-ne-1`, eventKey });
    await writeNotificationEventFile(packageDir, { id: `${slugPrefix}-rollback-ne-2`, eventKey });

    const report = await portabilityImportService.runImport({
      inputPath: packageDir,
      format: "json",
      actorEmail,
      dryRun: false
    });

    assert.equal(report.execution.status, "failed");
    assert.equal(report.execution.rollback.status, "confirmed");
    assert.equal(report.errors[0]?.code, "APPLY_ROLLED_BACK");
    assert.ok(report.changes.some((change) => change.kind === "entity" && change.slug === rollbackEntitySlug));

    const entityAfterFailure = await prismaClient.entity.findUnique({ where: { slug: rollbackEntitySlug } });
    assert.equal(entityAfterFailure, null);

    const eventsAfterFailure = await prismaClient.notificationEvent.findMany({
      where: {
        id: {
          in: [`${slugPrefix}-rollback-ne-1`, `${slugPrefix}-rollback-ne-2`]
        }
      }
    });

    assert.equal(eventsAfterFailure.length, 0);
  } finally {
    await rm(packageDir, { recursive: true, force: true });
  }
});

test("phase5PortabilityConflictResolutionRollbackPart02 AC-03 stable report structure across dry-run and apply modes", async () => {
  const packageDir = await mkdtemp(join(tmpdir(), `${slugPrefix}-stable-`));
  const entitySlug = `${slugPrefix}-stable-entity`;

  try {
    await writeManifest(packageDir);
    await writeEntityFile(packageDir, { slug: entitySlug });

    const dryRunReport = await portabilityImportService.runImport({
      inputPath: packageDir,
      format: "json",
      actorEmail,
      dryRun: true
    });

    const applyReport = await portabilityImportService.runImport({
      inputPath: packageDir,
      format: "json",
      actorEmail,
      dryRun: false
    });

    assert.deepEqual(Object.keys(dryRunReport).sort(), Object.keys(applyReport).sort());
    assert.equal(dryRunReport.execution.mode, "dry-run");
    assert.equal(dryRunReport.execution.status, "succeeded");
    assert.equal(dryRunReport.execution.rollback.status, "not-applicable");

    assert.equal(applyReport.execution.mode, "apply");
    assert.equal(applyReport.execution.status, "succeeded");
    assert.equal(applyReport.execution.rollback.status, "not-required");

    const created = await prismaClient.entity.findUnique({ where: { slug: entitySlug } });
    assert.ok(created);
  } finally {
    await rm(packageDir, { recursive: true, force: true });
  }
});
