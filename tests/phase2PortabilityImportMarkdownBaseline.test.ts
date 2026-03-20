import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";

import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { markdownPortabilitySerializer } from "../apps/api/src/lib/portability/markdownPortabilitySerializer.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { portabilityImportService } from "../apps/api/src/services/portabilityImportService.js";

const timestamp = Date.now();
const actorEmail = `phase2-import-md-actor-${timestamp}@example.com`;
const actorPassword = "phase2-import-md-password";
const slugPrefix = `phase2-import-md-${timestamp}`;

const manuscriptDirectoryByType = (manuscriptType: string): string =>
  manuscriptType === "SCENE" ? "scenes" : "chapters";

const makePackageDir = async (): Promise<string> => {
  const dir = join(tmpdir(), `bookworm-import-md-test-${timestamp}-${Math.random().toString(16).slice(2)}`);
  await mkdir(dir, { recursive: true });
  return dir;
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
      format: "markdown",
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

const writeEntityMarkdown = async (
  packageDir: string,
  input: {
    slug: string;
    type?: string;
    version?: number;
    revisionId?: string;
    visibility?: string;
    metadata?: unknown;
    retiredAt?: string | null;
    name?: string;
    summary?: string;
  }
): Promise<void> => {
  const type = input.type ?? "CHARACTER";
  const dir = join(packageDir, "entities", type.toLowerCase());
  await mkdir(dir, { recursive: true });

  const bodyName = input.name ?? "Markdown Entity";
  const bodySummary = input.summary ?? "Markdown entity summary";
  const metadata = input.metadata ?? { spoilerTier: "NONE", tags: ["md"] };

  const content = [
    "---",
    `slug: ${JSON.stringify(input.slug)}`,
    `type: ${JSON.stringify(type)}`,
    `visibility: ${JSON.stringify(input.visibility ?? "PUBLIC")}`,
    `version: ${String(input.version ?? 1)}`,
    `revisionId: ${JSON.stringify(input.revisionId ?? `${input.slug}-rev-1`)}`,
    `metadata: ${JSON.stringify(metadata)}`,
    `retiredAt: ${input.retiredAt === undefined ? "null" : JSON.stringify(input.retiredAt)}`,
    "---",
    `# ${bodyName}`,
    "",
    bodySummary,
    ""
  ].join("\n");

  await writeFile(join(dir, `${input.slug}.md`), content, "utf8");
};

const writeManuscriptMarkdown = async (
  packageDir: string,
  input: {
    slug: string;
    manuscriptType?: string;
    version?: number;
    revisionId?: string;
    visibility?: string;
    metadata?: unknown;
    title?: string;
    summary?: string;
    body?: string;
  }
): Promise<void> => {
  const manuscriptType = input.manuscriptType ?? "CHAPTER";
  const dir = join(packageDir, manuscriptDirectoryByType(manuscriptType));
  await mkdir(dir, { recursive: true });

  const bodyTitle = input.title ?? "Markdown Manuscript";
  const summary = input.summary ?? "Markdown manuscript summary";
  const body = input.body ?? "Markdown manuscript body";

  const content = [
    "---",
    `slug: ${JSON.stringify(input.slug)}`,
    `manuscriptType: ${JSON.stringify(manuscriptType)}`,
    `visibility: ${JSON.stringify(input.visibility ?? "PUBLIC")}`,
    `summary: ${JSON.stringify(summary)}`,
    `version: ${String(input.version ?? 1)}`,
    `revisionId: ${JSON.stringify(input.revisionId ?? `${input.slug}-rev-1`)}`,
    `metadata: ${JSON.stringify(input.metadata ?? {})}`,
    "retiredAt: null",
    "---",
    `# ${bodyTitle}`,
    "",
    body,
    ""
  ].join("\n");

  await writeFile(join(dir, `${input.slug}.md`), content, "utf8");
};

const writeRelationshipFile = async (
  packageDir: string,
  sourceSlug: string,
  targetSlug: string,
  relationType: string
): Promise<void> => {
  const dir = join(packageDir, "relationships");
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, `${sourceSlug}--${relationType}--${targetSlug}.json`),
    JSON.stringify({
      relationship: {
        relationType,
        sourceEntity: { slug: sourceSlug },
        targetEntity: { slug: targetSlug }
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

const writeReleaseFile = async (
  packageDir: string,
  slug: string,
  entitySlug: string,
  manuscriptSlug: string
): Promise<void> => {
  const dir = join(packageDir, "releases");
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, `${slug}.json`),
    JSON.stringify({
      release: {
        slug,
        name: "Markdown Import Release",
        status: "ACTIVE"
      },
      composition: {
        entities: [{ entitySlug, version: 1, visibility: "PUBLIC" }],
        manuscripts: [{ manuscriptSlug, version: 1, visibility: "PUBLIC" }],
        relationships: []
      }
    }),
    "utf8"
  );
};

before(async () => {
  const passwordHash = await passwordHasher.hashPassword(actorPassword);

  await prismaClient.user.create({
    data: {
      email: actorEmail,
      displayName: "Phase 2 Markdown Import Actor",
      passwordHash,
      role: Role.AUTHOR_ADMIN
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
  await prismaClient.entity.deleteMany({ where: { slug: { startsWith: slugPrefix } } });
  await prismaClient.manuscript.deleteMany({ where: { slug: { startsWith: slugPrefix } } });
  await prismaClient.user.deleteMany({ where: { email: actorEmail } });

  await prismaClient.$disconnect();
});

test("phase2PortabilityImportMarkdownBaseline valid front matter and body import successfully", async () => {
  const packageDir = await makePackageDir();
  const entitySlug = `${slugPrefix}-entity-valid`;

  try {
    await writeManifest(packageDir, { entities: 1 });
    await writeEntityMarkdown(packageDir, {
      slug: entitySlug,
      metadata: { spoilerTier: "MINOR", tags: ["alpha", "beta"] }
    });

    const report = await portabilityImportService.runImport({
      inputPath: packageDir,
      format: "markdown",
      actorEmail,
      dryRun: false
    });

    assert.equal(report.errors.length, 0, `unexpected errors: ${JSON.stringify(report.errors)}`);
    assert.equal(report.summary.entities.created, 1);

    const entity = await prismaClient.entity.findUnique({
      where: { slug: entitySlug },
      include: { revisions: { orderBy: { version: "desc" }, take: 1 } }
    });

    assert.ok(entity);
    assert.equal(entity.revisions[0].name, "Markdown Entity");
    assert.equal(entity.revisions[0].summary, "Markdown entity summary");
  } finally {
    await rm(packageDir, { recursive: true, force: true });
  }
});

test("phase2PortabilityImportMarkdownBaseline export to markdown then import preserves manuscript narrative body", async () => {
  const manuscriptSlug = `${slugPrefix}-roundtrip-chapter`;
  const narrativeBody = "First paragraph of narrative text.\n\nSecond paragraph survives round-trip.";
  const summary = "Round-trip manuscript summary";

  const exported = markdownPortabilitySerializer.serialize({
    scope: "current",
    exportedAt: new Date("2026-03-19T12:00:00.000Z"),
    entities: [],
    manuscripts: [
      {
        id: `${manuscriptSlug}-id`,
        slug: manuscriptSlug,
        type: "CHAPTER",
        createdAt: new Date("2026-03-18T10:00:00.000Z"),
        updatedAt: new Date("2026-03-19T10:00:00.000Z"),
        revision: {
          id: `${manuscriptSlug}-rev-2`,
          version: 2,
          title: "Round-Trip Chapter",
          summary,
          visibility: Visibility.PUBLIC,
          payload: {
            title: "Round-Trip Chapter",
            summary,
            visibility: Visibility.PUBLIC,
            body: narrativeBody
          },
          createdAt: new Date("2026-03-19T10:00:00.000Z")
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
    }
  });

  const packageDir = await makePackageDir();

  try {
    for (const file of exported.files) {
      const targetPath = join(packageDir, file.path);
      await mkdir(dirname(targetPath), { recursive: true });
      await writeFile(targetPath, file.content, "utf8");
    }

    const report = await portabilityImportService.runImport({
      inputPath: packageDir,
      format: "markdown",
      actorEmail,
      dryRun: false
    });

    assert.equal(report.errors.length, 0, `unexpected errors: ${JSON.stringify(report.errors)}`);
    assert.equal(report.summary.manuscripts.created, 1);

    const manuscript = await prismaClient.manuscript.findUnique({
      where: { slug: manuscriptSlug },
      include: { revisions: { orderBy: { version: "desc" }, take: 1 } }
    });

    assert.ok(manuscript);
    assert.equal(manuscript.revisions[0].summary, summary);

    const payload = manuscript.revisions[0].payload;
    assert.equal(typeof payload, "object");
    assert.ok(payload && !Array.isArray(payload));
    assert.equal((payload as Record<string, unknown>)["body"], narrativeBody);
  } finally {
    await rm(packageDir, { recursive: true, force: true });
  }
});

test("phase2PortabilityImportMarkdownBaseline malformed front matter fails with payload error", async () => {
  const packageDir = await makePackageDir();

  try {
    await writeManifest(packageDir, { entities: 1 });

    const dir = join(packageDir, "entities", "character");
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, `${slugPrefix}-entity-malformed.md`),
      ["---", "slug broken", "type: \"CHARACTER\"", "---", "# Broken", "", "summary"].join("\n"),
      "utf8"
    );

    const report = await portabilityImportService.runImport({
      inputPath: packageDir,
      format: "markdown",
      actorEmail,
      dryRun: false
    });

    const payloadError = report.errors.find((error) => error.code === "PAYLOAD_INVALID");
    assert.ok(payloadError, `expected PAYLOAD_INVALID, got ${JSON.stringify(report.errors)}`);
    assert.ok(payloadError.file?.includes("entities/character"));
  } finally {
    await rm(packageDir, { recursive: true, force: true });
  }
});

test("phase2PortabilityImportMarkdownBaseline unsupported metadata field fails validation", async () => {
  const packageDir = await makePackageDir();

  try {
    await writeManifest(packageDir, { entities: 1 });
    await writeEntityMarkdown(packageDir, {
      slug: `${slugPrefix}-entity-metadata-invalid`,
      metadata: { spoilerTier: "NONE", unsupportedField: "not-allowed" }
    });

    const report = await portabilityImportService.runImport({
      inputPath: packageDir,
      format: "markdown",
      actorEmail,
      dryRun: false
    });

    const payloadError = report.errors.find((error) => error.code === "PAYLOAD_INVALID");
    assert.ok(payloadError, `expected PAYLOAD_INVALID, got ${JSON.stringify(report.errors)}`);
  } finally {
    await rm(packageDir, { recursive: true, force: true });
  }
});

test("phase2PortabilityImportMarkdownBaseline mixed markdown and json package layout is accepted", async () => {
  const packageDir = await makePackageDir();
  const sourceSlug = `${slugPrefix}-entity-rel-source`;
  const targetSlug = `${slugPrefix}-entity-rel-target`;
  const manuscriptSlug = `${slugPrefix}-chapter-rel`;

  try {
    await writeManifest(packageDir, { entities: 2, manuscripts: 1, relationships: 1 });
    await writeEntityMarkdown(packageDir, { slug: sourceSlug });
    await writeEntityMarkdown(packageDir, { slug: targetSlug });
    await writeManuscriptMarkdown(packageDir, { slug: manuscriptSlug });
    await writeRelationshipFile(packageDir, sourceSlug, targetSlug, "KNOWS");

    const report = await portabilityImportService.runImport({
      inputPath: packageDir,
      format: "markdown",
      actorEmail,
      dryRun: false
    });

    assert.equal(report.errors.length, 0, `unexpected errors: ${JSON.stringify(report.errors)}`);
    assert.equal(report.summary.entities.created, 2);
    assert.equal(report.summary.manuscripts.created, 1);
    assert.equal(report.summary.relationships.created, 1);
  } finally {
    await rm(packageDir, { recursive: true, force: true });
  }
});

test("phase2PortabilityImportMarkdownBaseline release manifest imports only as draft", async () => {
  const packageDir = await makePackageDir();
  const entitySlug = `${slugPrefix}-entity-release`;
  const manuscriptSlug = `${slugPrefix}-chapter-release`;
  const releaseSlug = `${slugPrefix}-release`;

  try {
    await writeManifest(packageDir, { entities: 1, manuscripts: 1, releases: 1 });
    await writeEntityMarkdown(packageDir, { slug: entitySlug });
    await writeManuscriptMarkdown(packageDir, { slug: manuscriptSlug });
    await writeReleaseFile(packageDir, releaseSlug, entitySlug, manuscriptSlug);

    const report = await portabilityImportService.runImport({
      inputPath: packageDir,
      format: "markdown",
      actorEmail,
      dryRun: false
    });

    assert.equal(report.errors.length, 0, `unexpected errors: ${JSON.stringify(report.errors)}`);

    const release = await prismaClient.release.findUnique({ where: { slug: releaseSlug } });
    assert.ok(release);
    assert.equal(release.status, "DRAFT");
  } finally {
    await rm(packageDir, { recursive: true, force: true });
  }
});
