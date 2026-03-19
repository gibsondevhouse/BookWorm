import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";

import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { portabilityImportService } from "../apps/api/src/services/portabilityImportService.js";

const timestamp = Date.now();
const actorEmail = `phase2-import-actor-${timestamp}@example.com`;
const actorPassword = "phase2-import-password";
const editorEmail = `phase2-import-editor-${timestamp}@example.com`;

// Slugs for pre-seeded content (will exist before import runs)
const existingEntitySlug = `phase2-import-existing-entity-${timestamp}`;
const existingManuscriptSlug = `phase2-import-existing-ms-${timestamp}`;
const collisionReleaseSlug = `phase2-import-collision-release-${timestamp}`;
const noChangeEntitySlug = `phase2-import-no-change-entity-${timestamp}`;

// Slugs for fresh import targets (will NOT exist before import)
const newEntitySlug = `phase2-import-new-entity-${timestamp}`;
const newManuscriptSlug = `phase2-import-new-ms-${timestamp}`;
const newEntityForRelSlug = `phase2-import-rel-source-${timestamp}`;
const newEntityForRelTargetSlug = `phase2-import-rel-target-${timestamp}`;

let actorId = "";
let editorId = "";
let existingEntityId = "";
let existingEntityRevisionId = "";
let existingManuscriptId = "";
let existingManuscriptRevisionId = "";
let noChangeEntityId = "";

const existingRevisionPayload = {
  name: "Original Name",
  summary: "Original Summary",
  visibility: "PUBLIC",
  metadata: { spoilerTier: "NONE", tags: ["tag-a"] }
};

// Helper: write a minimal valid entity file
const writeEntityFile = async (
  packageDir: string,
  slug: string,
  opts: {
    type?: string;
    name?: string;
    summary?: string;
    visibility?: string;
    payload?: unknown;
    retiredAt?: string | null;
    entityId?: string;
  } = {}
): Promise<void> => {
  const type = opts.type ?? "CHARACTER";
  const dir = join(packageDir, "entities", type.toLowerCase());
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, `${slug}.json`),
    JSON.stringify({
      entity: {
        ...(opts.entityId ? { id: opts.entityId } : {}),
        slug,
        type,
        retiredAt: opts.retiredAt !== undefined ? opts.retiredAt : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      revision: {
        version: 1,
        name: opts.name ?? "Test Entity",
        summary: opts.summary ?? "Test summary",
        visibility: opts.visibility ?? "PUBLIC",
        payload: opts.payload ?? null,
        createdAt: new Date().toISOString()
      }
    }),
    "utf8"
  );
};

const writeManuscriptFile = async (
  packageDir: string,
  slug: string,
  opts: {
    type?: string;
    title?: string;
    summary?: string;
    visibility?: string;
    payload?: unknown;
    manuscriptId?: string;
  } = {}
): Promise<void> => {
  const type = opts.type ?? "CHAPTER";
  const dir = join(packageDir, "manuscripts", type.toLowerCase());
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, `${slug}.json`),
    JSON.stringify({
      manuscript: {
        ...(opts.manuscriptId ? { id: opts.manuscriptId } : {}),
        slug,
        type,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      revision: {
        version: 1,
        title: opts.title ?? "Test Chapter",
        summary: opts.summary ?? "Test chapter summary",
        visibility: opts.visibility ?? "PUBLIC",
        payload: opts.payload ?? null,
        createdAt: new Date().toISOString()
      }
    }),
    "utf8"
  );
};

const writeRelationshipFile = async (
  packageDir: string,
  sourceSlug: string,
  targetSlug: string,
  relationType: string,
  opts: { state?: string; visibility?: string; metadata?: unknown } = {}
): Promise<void> => {
  const dir = join(packageDir, "relationships");
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, `${sourceSlug}--${relationType}--${targetSlug}.json`),
    JSON.stringify({
      relationship: {
        relationType,
        sourceEntity: { slug: sourceSlug },
        targetEntity: { slug: targetSlug },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      revision: {
        version: 1,
        state: opts.state ?? "CREATE",
        visibility: opts.visibility ?? "PUBLIC",
        metadata: opts.metadata ?? null,
        createdAt: new Date().toISOString()
      }
    }),
    "utf8"
  );
};

const writeReleaseFile = async (
  packageDir: string,
  slug: string,
  opts: {
    name?: string;
    status?: string;
    entitySlugs?: string[];
    manuscriptSlugs?: string[];
    relationships?: Array<{
      sourceEntitySlug: string;
      relationType: string;
      targetEntitySlug: string;
    }>;
  } = {}
): Promise<void> => {
  const dir = join(packageDir, "releases");
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, `${slug}.json`),
    JSON.stringify({
      release: {
        slug,
        name: opts.name ?? "Test Release",
        status: opts.status ?? "ACTIVE",
        createdAt: new Date().toISOString()
      },
      composition: {
        entities: (opts.entitySlugs ?? []).map((s) => ({
          entitySlug: s,
          version: 1,
          visibility: "PUBLIC"
        })),
        manuscripts: (opts.manuscriptSlugs ?? []).map((s) => ({
          manuscriptSlug: s,
          version: 1,
          visibility: "PUBLIC"
        })),
        relationships: (opts.relationships ?? []).map((relationship) => ({
          sourceEntitySlug: relationship.sourceEntitySlug,
          targetEntitySlug: relationship.targetEntitySlug,
          relationType: relationship.relationType,
          version: 1,
          visibility: "PUBLIC"
        }))
      }
    }),
    "utf8"
  );
};

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

const makePackageDir = async (): Promise<string> => {
  const dir = join(tmpdir(), `bookworm-import-test-${timestamp}-${Math.random().toString(16).slice(2)}`);
  await mkdir(dir, { recursive: true });
  return dir;
};

before(async () => {
  const passwordHash = await passwordHasher.hashPassword(actorPassword);

  const actor = await prismaClient.user.create({
    data: {
      email: actorEmail,
      displayName: "Phase 2 Import Actor",
      passwordHash,
      role: Role.AUTHOR_ADMIN
    }
  });

  actorId = actor.id;

  const editor = await prismaClient.user.create({
    data: {
      email: editorEmail,
      displayName: "Phase 2 Import Editor",
      passwordHash,
      role: Role.EDITOR
    }
  });

  editorId = editor.id;

  // Pre-seed an entity and manuscript for conflict/NO_CHANGE tests
  const existingEntity = await prismaClient.entity.create({
    data: { slug: existingEntitySlug, type: "CHARACTER" }
  });

  existingEntityId = existingEntity.id;

  const existingRevision = await prismaClient.entityRevision.create({
    data: {
      entityId: existingEntityId,
      createdById: actorId,
      version: 1,
      name: existingRevisionPayload.name,
      summary: existingRevisionPayload.summary,
      visibility: Visibility.PUBLIC,
      payload: existingRevisionPayload
    }
  });

  existingEntityRevisionId = existingRevision.id;

  // Seed a separate entity exclusively for the NO_CHANGE test (test 3 mutates existingEntitySlug)
  const noChangeEntity = await prismaClient.entity.create({
    data: { slug: noChangeEntitySlug, type: "CHARACTER" }
  });

  noChangeEntityId = noChangeEntity.id;

  await prismaClient.entityRevision.create({
    data: {
      entityId: noChangeEntityId,
      createdById: actorId,
      version: 1,
      name: existingRevisionPayload.name,
      summary: existingRevisionPayload.summary,
      visibility: Visibility.PUBLIC,
      payload: existingRevisionPayload
    }
  });

  const existingManuscript = await prismaClient.manuscript.create({
    data: { slug: existingManuscriptSlug, type: "CHAPTER" }
  });

  existingManuscriptId = existingManuscript.id;

  const existingMsRevision = await prismaClient.manuscriptRevision.create({
    data: {
      manuscriptId: existingManuscriptId,
      createdById: actorId,
      version: 1,
      title: "Existing Chapter",
      summary: "Existing chapter summary",
      visibility: Visibility.PUBLIC
    }
  });

  existingManuscriptRevisionId = existingMsRevision.id;

  // Pre-seed a release for the RELEASE_CONFLICT test
  await prismaClient.release.create({
    data: {
      slug: collisionReleaseSlug,
      name: "Pre-existing Release",
      status: "DRAFT",
      createdById: actorId
    }
  });
});

after(async () => {
  // Clean up test data in dependency order
  await prismaClient.release.deleteMany({
    where: { OR: [{ slug: collisionReleaseSlug }, { slug: { startsWith: `phase2-import-release-${timestamp}` } }] }
  });

  await prismaClient.relationship.deleteMany({
    where: {
      OR: [
        { sourceEntity: { slug: { startsWith: `phase2-import-` } } },
        { targetEntity: { slug: { startsWith: `phase2-import-` } } }
      ]
    }
  });

  await prismaClient.entity.deleteMany({
    where: { slug: { startsWith: `phase2-import-` } }
  });

  await prismaClient.manuscript.deleteMany({
    where: { slug: { startsWith: `phase2-import-` } }
  });

  await prismaClient.user.deleteMany({
    where: { OR: [{ email: actorEmail }, { email: editorEmail }] }
  });

  await prismaClient.$disconnect();
});

test("phase2PortabilityImportJsonBaseline dry-run validates without database writes", async () => {
  const packageDir = await makePackageDir();

  try {
    await writeManifest(packageDir, { entities: 1 });
    await writeEntityFile(packageDir, newEntitySlug);

    const countBefore = await prismaClient.entity.count({ where: { slug: newEntitySlug } });

    const report = await portabilityImportService.runImport({
      inputPath: packageDir,
      format: "json",
      actorEmail,
      dryRun: true
    });

    const countAfter = await prismaClient.entity.count({ where: { slug: newEntitySlug } });

    assert.ok(report.dryRun, "report.dryRun should be true");
    assert.equal(countBefore, 0, "entity should not exist before dry-run");
    assert.equal(countAfter, 0, "entity should NOT be written during dry-run");
    assert.equal(report.errors.length, 0, "no errors expected");
    assert.equal(report.summary.entities.created, 1, "plan should show 1 entity CREATE");

    const entityChange = report.changes.find((c) => c.kind === "entity" && c.slug === newEntitySlug);
    assert.ok(entityChange, "change record for the entity should appear in the report");
    assert.equal(entityChange.action, "CREATE");
  } finally {
    await rm(packageDir, { recursive: true, force: true });
  }
});

test("phase2PortabilityImportJsonBaseline new record import creates expected rows and revisions", async () => {
  const packageDir = await makePackageDir();
  const uniqueSlug = `${newEntitySlug}-new-record`;
  const uniqueMsSlug = `${newManuscriptSlug}-new-record`;

  try {
    await writeManifest(packageDir, { entities: 1, manuscripts: 1 });
    await writeEntityFile(packageDir, uniqueSlug, { name: "New Hero", summary: "New hero summary" });
    await writeManuscriptFile(packageDir, uniqueMsSlug, { title: "New Chapter" });

    const report = await portabilityImportService.runImport({
      inputPath: packageDir,
      format: "json",
      actorEmail,
      dryRun: false
    });

    assert.equal(report.errors.length, 0, "no errors expected");
    assert.equal(report.dryRun, false);
    assert.equal(report.summary.entities.created, 1);
    assert.equal(report.summary.manuscripts.created, 1);

    const createdEntity = await prismaClient.entity.findUnique({
      where: { slug: uniqueSlug },
      include: { revisions: true }
    });

    assert.ok(createdEntity, "entity should be created");
    assert.equal(createdEntity.revisions.length, 1, "one revision should be created");
    assert.equal(createdEntity.revisions[0].name, "New Hero");

    const createdManuscript = await prismaClient.manuscript.findUnique({
      where: { slug: uniqueMsSlug },
      include: { revisions: true }
    });

    assert.ok(createdManuscript, "manuscript should be created");
    assert.equal(createdManuscript.revisions.length, 1);
    assert.equal(createdManuscript.revisions[0].title, "New Chapter");
  } finally {
    await rm(packageDir, { recursive: true, force: true });
  }
});

test("phase2PortabilityImportJsonBaseline matching changed record creates new revision under create-revision", async () => {
  const packageDir = await makePackageDir();

  try {
    await writeManifest(packageDir, { entities: 1 });
    // Import with different content than the existing revision
    await writeEntityFile(packageDir, existingEntitySlug, {
      name: "Updated Name",
      summary: "Updated Summary",
      payload: { name: "Updated Name", summary: "Updated Summary", visibility: "PUBLIC" }
    });

    const revisionCountBefore = await prismaClient.entityRevision.count({
      where: { entityId: existingEntityId }
    });

    const report = await portabilityImportService.runImport({
      inputPath: packageDir,
      format: "json",
      actorEmail,
      dryRun: false,
      conflictMode: "create-revision"
    });

    assert.equal(report.errors.length, 0, "no errors expected");
    assert.equal(report.summary.entities.revised, 1);

    const revisionCountAfter = await prismaClient.entityRevision.count({
      where: { entityId: existingEntityId }
    });

    assert.equal(revisionCountAfter, revisionCountBefore + 1, "a new revision should be created");

    const latestRevision = await prismaClient.entityRevision.findFirst({
      where: { entityId: existingEntityId },
      orderBy: { version: "desc" }
    });

    assert.ok(latestRevision);
    assert.equal(latestRevision.name, "Updated Name");
  } finally {
    await rm(packageDir, { recursive: true, force: true });
  }
});

test("phase2PortabilityImportJsonBaseline identical record reports NO_CHANGE", async () => {
  const packageDir = await makePackageDir();

  try {
    await writeManifest(packageDir, { entities: 1 });
    // Use noChangeEntitySlug — seeded in before() with existingRevisionPayload, never mutated by other tests
    await writeEntityFile(packageDir, noChangeEntitySlug, {
      name: existingRevisionPayload.name,
      summary: existingRevisionPayload.summary,
      visibility: existingRevisionPayload.visibility,
      payload: existingRevisionPayload
    });

    const revisionCountBefore = await prismaClient.entityRevision.count({
      where: { entityId: noChangeEntityId }
    });

    const report = await portabilityImportService.runImport({
      inputPath: packageDir,
      format: "json",
      actorEmail,
      dryRun: false
    });

    assert.equal(report.errors.length, 0, "no errors expected");
    assert.equal(report.summary.entities.unchanged, 1, "entity should be reported as NO_CHANGE");
    assert.equal(report.summary.entities.created, 0);
    assert.equal(report.summary.entities.revised, 0);

    const revisionCountAfter = await prismaClient.entityRevision.count({
      where: { entityId: noChangeEntityId }
    });

    assert.equal(
      revisionCountAfter,
      revisionCountBefore,
      "no new revision should be created for identical content"
    );

    const entityChange = report.changes.find((c) => c.kind === "entity" && c.slug === noChangeEntitySlug);
    assert.ok(entityChange);
    assert.equal(entityChange.action, "NO_CHANGE");
  } finally {
    await rm(packageDir, { recursive: true, force: true });
  }
});


test("phase2PortabilityImportJsonBaseline ambiguous identity fails", async () => {
  const packageDir = await makePackageDir();

  try {
    await writeManifest(packageDir, { entities: 1 });
    // Provide the existing entity's ID but a DIFFERENT slug — this is ambiguous
    await writeEntityFile(packageDir, `phase2-import-wrong-slug-${timestamp}`, {
      entityId: existingEntityId // ID belongs to existingEntitySlug, not this slug
    });

    const report = await portabilityImportService.runImport({
      inputPath: packageDir,
      format: "json",
      actorEmail,
      dryRun: false
    });

    assert.ok(report.errors.length > 0, "errors should be reported for ambiguous identity");

    const ambiguousError = report.errors.find((e) => e.code === "IDENTITY_AMBIGUOUS");
    assert.ok(ambiguousError, `Expected IDENTITY_AMBIGUOUS error, got: ${JSON.stringify(report.errors)}`);
  } finally {
    await rm(packageDir, { recursive: true, force: true });
  }
});

test("phase2PortabilityImportJsonBaseline missing dependency fails and does not write partial data", async () => {
  const packageDir = await makePackageDir();
  const relSourceSlug = `${newEntityForRelSlug}-missing-dep`;
  const missingTargetSlug = `phase2-import-missing-target-${timestamp}`;

  try {
    await writeManifest(packageDir, { entities: 1, relationships: 1 });
    // Source entity IS in the package
    await writeEntityFile(packageDir, relSourceSlug);
    // Target entity is NOT in the package and does NOT exist in the DB
    await writeRelationshipFile(packageDir, relSourceSlug, missingTargetSlug, "KNOWS");

    const countBefore = await prismaClient.entity.count({ where: { slug: relSourceSlug } });

    const report = await portabilityImportService.runImport({
      inputPath: packageDir,
      format: "json",
      actorEmail,
      dryRun: false
    });

    const countAfter = await prismaClient.entity.count({ where: { slug: relSourceSlug } });

    assert.ok(report.errors.length > 0, "errors should be reported for missing dependency");

    const depError = report.errors.find((e) => e.code === "DEPENDENCY_MISSING");
    assert.ok(depError, `Expected DEPENDENCY_MISSING error, got: ${JSON.stringify(report.errors)}`);

    // Entity should NOT have been written because validation failed before writes
    assert.equal(countBefore, 0);
    assert.equal(countAfter, 0, "partial writes must not occur when validation fails");
  } finally {
    await rm(packageDir, { recursive: true, force: true });
  }
});

test("phase2PortabilityImportJsonBaseline release slug collision fails", async () => {
  const packageDir = await makePackageDir();

  try {
    await writeManifest(packageDir, { releases: 1 });
    // Use the pre-seeded collision release slug
    await writeReleaseFile(packageDir, collisionReleaseSlug);

    const report = await portabilityImportService.runImport({
      inputPath: packageDir,
      format: "json",
      actorEmail,
      dryRun: false
    });

    assert.ok(report.errors.length > 0, "errors should be reported for release slug collision");

    const conflictError = report.errors.find((e) => e.code === "RELEASE_CONFLICT");
    assert.ok(conflictError, `Expected RELEASE_CONFLICT error, got: ${JSON.stringify(report.errors)}`);
  } finally {
    await rm(packageDir, { recursive: true, force: true });
  }
});

test("phase2PortabilityImportJsonBaseline release composition relationship binding uses source type target identity", async () => {
  const packageDir = await makePackageDir();
  const releaseSlug = `phase2-import-release-${timestamp}-relationship-binding`;
  const sourceSlug = `phase2-import-rel-binding-source-${timestamp}`;
  const targetASlug = `phase2-import-rel-binding-target-a-${timestamp}`;
  const targetBSlug = `phase2-import-rel-binding-target-b-${timestamp}`;
  const relationType = "ALLY";

  try {
    await writeManifest(packageDir, { entities: 3, relationships: 2, releases: 1 });
    await writeEntityFile(packageDir, sourceSlug);
    await writeEntityFile(packageDir, targetASlug);
    await writeEntityFile(packageDir, targetBSlug);
    await writeRelationshipFile(packageDir, sourceSlug, targetASlug, relationType);
    await writeRelationshipFile(packageDir, sourceSlug, targetBSlug, relationType);
    await writeReleaseFile(packageDir, releaseSlug, {
      status: "ACTIVE",
      entitySlugs: [sourceSlug, targetASlug, targetBSlug],
      relationships: [
        {
          sourceEntitySlug: sourceSlug,
          relationType,
          targetEntitySlug: targetBSlug
        }
      ]
    });

    const report = await portabilityImportService.runImport({
      inputPath: packageDir,
      format: "json",
      actorEmail,
      dryRun: false
    });

    assert.equal(report.errors.length, 0, `unexpected errors: ${JSON.stringify(report.errors)}`);

    const importedRelease = await prismaClient.release.findUnique({
      where: { slug: releaseSlug },
      include: {
        relationshipEntries: {
          include: {
            relationship: {
              include: {
                sourceEntity: { select: { slug: true } },
                targetEntity: { select: { slug: true } }
              }
            }
          }
        }
      }
    });

    assert.ok(importedRelease, "release should exist in DB");
    assert.equal(importedRelease.relationshipEntries.length, 1, "release should include exactly one relationship entry");

    const boundRelationship = importedRelease.relationshipEntries[0].relationship;
    assert.equal(boundRelationship.relationType, relationType);
    assert.equal(boundRelationship.sourceEntity.slug, sourceSlug);
    assert.equal(boundRelationship.targetEntity.slug, targetBSlug);
  } finally {
    await rm(packageDir, { recursive: true, force: true });
  }
});

test("phase2PortabilityImportJsonBaseline imported release is created as DRAFT regardless of source status", async () => {
  const packageDir = await makePackageDir();
  const releaseSlug = `phase2-import-release-${timestamp}-draft-test`;
  const entityForReleaseSlug = `phase2-import-release-entity-${timestamp}`;
  const manuscriptForReleaseSlug = `phase2-import-release-ms-${timestamp}`;

  try {
    await writeManifest(packageDir, { entities: 1, manuscripts: 1, releases: 1 });
    await writeEntityFile(packageDir, entityForReleaseSlug);
    await writeManuscriptFile(packageDir, manuscriptForReleaseSlug);
    // Release has status "ACTIVE" in the package — import must create it as DRAFT
    await writeReleaseFile(packageDir, releaseSlug, {
      name: "Imported Release",
      status: "ACTIVE",
      entitySlugs: [entityForReleaseSlug],
      manuscriptSlugs: [manuscriptForReleaseSlug]
    });

    const report = await portabilityImportService.runImport({
      inputPath: packageDir,
      format: "json",
      actorEmail,
      dryRun: false
    });

    assert.equal(report.errors.length, 0, `unexpected errors: ${JSON.stringify(report.errors)}`);
    assert.equal(report.summary.releases.created, 1, "release should be created");

    const release = await prismaClient.release.findUnique({ where: { slug: releaseSlug } });
    assert.ok(release, "release should exist in DB");
    assert.equal(release.status, "DRAFT", "imported release must always be DRAFT");
    assert.equal(release.createdById, actorId, "release should be attributed to the import actor");
  } finally {
    await rm(packageDir, { recursive: true, force: true });
  }
});

// Suppress unused variable warnings for setup values only used in before/after
void editorId;
void existingEntityRevisionId;
void existingManuscriptRevisionId;
void existingManuscriptId;
