import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";
import { strToU8, zipSync } from "fflate";

import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { jsonPortabilitySerializer } from "../apps/api/src/lib/portability/jsonPortabilitySerializer.js";
import { portabilityZipPackage } from "../apps/api/src/lib/portability/portabilityZipPackage.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { portabilityExportService } from "../apps/api/src/services/portabilityExportService.js";
import { portabilityImportService } from "../apps/api/src/services/portabilityImportService.js";

const timestamp = Date.now();
const slugPrefix = `phase5-zip-foundation-${timestamp}`;
const actorEmail = `${slugPrefix}-admin@example.com`;
const actorPassword = "phase5-zip-password";
const entitySlug = `${slugPrefix}-entity`;
const manuscriptSlug = `${slugPrefix}-chapter`;
const releaseSlug = `${slugPrefix}-release`;

let actorId = "";

const writeZipFile = async (archive: Uint8Array, suffix: string): Promise<string> => {
  const path = join(tmpdir(), `${slugPrefix}-${suffix}-${Math.random().toString(16).slice(2)}.zip`);
  await writeFile(path, archive);
  return path;
};

before(async () => {
  const passwordHash = await passwordHasher.hashPassword(actorPassword);

  const actor = await prismaClient.user.create({
    data: {
      email: actorEmail,
      displayName: "Phase 5 Zip Admin",
      passwordHash,
      role: Role.AUTHOR_ADMIN
    }
  });

  actorId = actor.id;

  const entity = await prismaClient.entity.create({
    data: {
      slug: entitySlug,
      type: "CHARACTER"
    }
  });

  const entityRevision = await prismaClient.entityRevision.create({
    data: {
      entityId: entity.id,
      createdById: actorId,
      version: 1,
      name: "Zip Foundation Entity",
      summary: "Seeded for zip portability export",
      visibility: Visibility.PUBLIC,
      payload: {
        name: "Zip Foundation Entity",
        summary: "Seeded for zip portability export",
        visibility: Visibility.PUBLIC,
        metadata: {
          spoilerTier: "NONE",
          tags: ["zip", "part-01"]
        }
      }
    }
  });

  const manuscript = await prismaClient.manuscript.create({
    data: {
      slug: manuscriptSlug,
      type: "CHAPTER"
    }
  });

  const manuscriptRevision = await prismaClient.manuscriptRevision.create({
    data: {
      manuscriptId: manuscript.id,
      createdById: actorId,
      version: 1,
      title: "Zip Foundation Chapter",
      summary: "Seeded chapter",
      visibility: Visibility.PUBLIC,
      payload: {
        title: "Zip Foundation Chapter",
        summary: "Seeded chapter",
        body: "Zip portability body"
      }
    }
  });

  const release = await prismaClient.release.create({
    data: {
      slug: releaseSlug,
      name: "Zip Foundation Source Release",
      status: "ARCHIVED",
      activatedAt: new Date("2026-03-20T12:00:00.000Z"),
      createdById: actorId
    }
  });

  await prismaClient.releaseEntry.create({
    data: {
      releaseId: release.id,
      entityId: entity.id,
      revisionId: entityRevision.id
    }
  });

  await prismaClient.releaseManuscriptEntry.create({
    data: {
      releaseId: release.id,
      manuscriptId: manuscript.id,
      manuscriptRevisionId: manuscriptRevision.id
    }
  });
});

after(async () => {
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

test("phase5PortabilityZipFoundationPart01 AC-01 deterministic zip export and import layout", async () => {
  const exportedAt = new Date("2026-03-20T15:30:00.000Z");

  const first = await portabilityExportService.prepareZipExport({
    scope: "release",
    format: "json",
    releaseSlug,
    exportedAt
  });
  const second = await portabilityExportService.prepareZipExport({
    scope: "release",
    format: "json",
    releaseSlug,
    exportedAt
  });

  assert.equal(Buffer.compare(Buffer.from(first.archive), Buffer.from(second.archive)), 0);
  assert.equal(first.packageManifest.payload.manifestPath, "payload/manifests/export-manifest.json");

  const zipPath = await writeZipFile(first.archive, "deterministic");
  const parsed = await portabilityZipPackage.parseArchiveToDirectory(zipPath);

  assert.equal(parsed.success, true);

  if (parsed.success) {
    try {
      const payloadManifestRaw = await readFile(join(parsed.inputPath, "manifests", "export-manifest.json"), "utf8");
      const payloadManifest = JSON.parse(payloadManifestRaw) as {
        schemaVersion: number;
        counts: {
          entities: number;
          manuscripts: number;
          relationships: number;
          releases: number;
        };
      };

      assert.equal(payloadManifest.schemaVersion, 1);
      assert.deepEqual(payloadManifest.counts, first.manifest.counts);
      assert.equal(parsed.packageManifest.payload.format, "json");
      assert.equal(parsed.packageManifest.payload.scope, "release");
    } finally {
      await parsed.cleanup();
      await rm(zipPath, { force: true });
    }
  }
});

test("phase5PortabilityZipFoundationPart01 AC-02 malformed zip is rejected with actionable errors", async () => {
  const malformedPath = join(tmpdir(), `${slugPrefix}-malformed.zip`);
  await writeFile(malformedPath, "not-a-zip", "utf8");

  try {
    const report = await portabilityImportService.runZipImport({
      inputPath: malformedPath,
      actorEmail,
      dryRun: true
    });

    assert.equal(report.errors.length, 1);
    assert.equal(report.errors[0].code, "ARCHIVE_INVALID");
    assert.match(report.errors[0].message, /malformed|valid zip/i);
  } finally {
    await rm(malformedPath, { force: true });
  }
});

test("phase5PortabilityZipFoundationPart01 AC-02 unsafe archive paths are rejected", async () => {
  const packageManifest = {
    schemaVersion: 1,
    container: "bookworm-portability-zip",
    payload: {
      format: "json",
      scope: "current",
      exportedAt: "2026-03-20T00:00:00.000Z",
      rootPath: "payload",
      manifestPath: "payload/manifests/export-manifest.json",
      counts: {
        entities: 0,
        manuscripts: 0,
        relationships: 0,
        releases: 0
      }
    }
  };

  const archive = zipSync({
    "package-manifest.json": strToU8(`${JSON.stringify(packageManifest, null, 2)}\n`),
    "payload/manifests/export-manifest.json": strToU8(
      `${JSON.stringify(
        {
          schemaVersion: 1,
          format: "json",
          scope: "current",
          exportedAt: "2026-03-20T00:00:00.000Z",
          counts: {
            entities: 0,
            manuscripts: 0,
            relationships: 0,
            releases: 0
          }
        },
        null,
        2
      )}\n`
    ),
    "payload/../escape.json": strToU8("{}\n")
  });

  const unsafePath = await writeZipFile(archive, "unsafe-path");

  try {
    const report = await portabilityImportService.runZipImport({
      inputPath: unsafePath,
      actorEmail,
      dryRun: true
    });

    assert.equal(report.errors.length, 1);
    assert.equal(report.errors[0].code, "PATH_UNSAFE");
  } finally {
    await rm(unsafePath, { force: true });
  }
});

test("phase5PortabilityZipFoundationPart01 AC-03 and AC-04 zip import preserves metadata and draft-safe release invariants", async () => {
  const importReleaseSlug = `${slugPrefix}-import-release`;
  const importEntitySlug = `${slugPrefix}-import-entity`;
  const importManuscriptSlug = `${slugPrefix}-import-chapter`;

  const exported = jsonPortabilitySerializer.serialize({
    scope: "release",
    exportedAt: new Date("2026-03-20T16:00:00.000Z"),
    entities: [
      {
        id: `${importEntitySlug}-id`,
        slug: importEntitySlug,
        type: "CHARACTER",
        retiredAt: null,
        createdAt: new Date("2026-03-20T10:00:00.000Z"),
        updatedAt: new Date("2026-03-20T10:00:00.000Z"),
        revision: {
          id: `${importEntitySlug}-rev-1`,
          version: 1,
          name: "Import Zip Entity",
          summary: "Entity from zip package",
          visibility: Visibility.PUBLIC,
          payload: {
            name: "Import Zip Entity",
            summary: "Entity from zip package",
            visibility: Visibility.PUBLIC
          },
          createdAt: new Date("2026-03-20T10:00:00.000Z")
        }
      }
    ],
    manuscripts: [
      {
        id: `${importManuscriptSlug}-id`,
        slug: importManuscriptSlug,
        type: "CHAPTER",
        createdAt: new Date("2026-03-20T10:00:00.000Z"),
        updatedAt: new Date("2026-03-20T10:00:00.000Z"),
        revision: {
          id: `${importManuscriptSlug}-rev-1`,
          version: 1,
          title: "Import Zip Chapter",
          summary: "Chapter from zip package",
          visibility: Visibility.PUBLIC,
          payload: {
            title: "Import Zip Chapter",
            summary: "Chapter from zip package",
            body: "Chapter body"
          },
          createdAt: new Date("2026-03-20T10:00:00.000Z")
        }
      }
    ],
    relationships: [],
    governance: {
      reviewRequests: [],
      approvalChains: [],
      approvalSteps: [],
      approvalStepEvents: [],
      notificationEvents: [],
      notificationPreferences: []
    },
    release: {
      id: `${importReleaseSlug}-id`,
      slug: importReleaseSlug,
      name: "Import Zip Release",
      status: "ACTIVE",
      createdById: actorId,
      createdAt: new Date("2026-03-20T10:00:00.000Z"),
      activatedAt: new Date("2026-03-20T12:00:00.000Z")
    }
  });

  const zip = portabilityZipPackage.buildArchive({
    format: "json",
    scope: "release",
    exportedAt: new Date("2026-03-20T16:00:00.000Z"),
    manifestCounts: exported.manifest.counts,
    files: exported.files
  });

  assert.equal(zip.packageManifest.payload.counts.releases, 1);
  assert.equal(zip.packageManifest.payload.counts.entities, 1);

  const zipPath = await writeZipFile(zip.archive, "import");

  try {
    const report = await portabilityImportService.runZipImport({
      inputPath: zipPath,
      actorEmail,
      dryRun: false
    });

    assert.equal(report.errors.length, 0, JSON.stringify(report.errors));
    assert.equal(report.summary.releases.created, 1);

    const importedRelease = await prismaClient.release.findUnique({ where: { slug: importReleaseSlug } });
    assert.ok(importedRelease);
    assert.equal(importedRelease?.status, "DRAFT");
    assert.equal(importedRelease?.activatedAt, null);
  } finally {
    await prismaClient.release.deleteMany({ where: { slug: importReleaseSlug } });
    await prismaClient.manuscript.deleteMany({ where: { slug: importManuscriptSlug } });
    await prismaClient.entity.deleteMany({ where: { slug: importEntitySlug } });
    await rm(zipPath, { force: true });
  }
});
