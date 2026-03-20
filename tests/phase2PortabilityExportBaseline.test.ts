import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";

import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { exportPortability } from "../scripts/exportPortability.js";

const timestamp = Date.now();
const authorEmail = `phase2-export-author-${timestamp}@example.com`;
const authorPassword = "phase2-export-password";
const characterSlug = `phase2-export-character-${timestamp}`;
const locationSlug = `phase2-export-location-${timestamp}`;
const manuscriptSlug = `phase2-export-chapter-${timestamp}`;
const releaseSlug = `phase2-export-release-${timestamp}`;
const retiredAtIso = "2026-03-19T10:00:00.000Z";
const exportRootPrefix = join(tmpdir(), "bookworm-portability-");

let authorId = "";
let currentOutputDirectory = "";
let releaseOutputDirectory = "";
const cleanupDirectories = new Set<string>();

const listFiles = async (rootDirectory: string, relativeDirectory = ""): Promise<string[]> => {
  const directory = join(rootDirectory, relativeDirectory);
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      files.push(...(await listFiles(rootDirectory, relativePath)));
      continue;
    }

    files.push(relativePath);
  }

  return files;
};

const readJson = async <T>(rootDirectory: string, relativePath: string): Promise<T> => {
  const content = await readFile(join(rootDirectory, relativePath), "utf8");

  return JSON.parse(content) as T;
};

before(async () => {
  const passwordHash = await passwordHasher.hashPassword(authorPassword);
  const author = await prismaClient.user.create({
    data: {
      email: authorEmail,
      displayName: "Phase 2 Export Author",
      passwordHash,
      role: Role.AUTHOR_ADMIN
    }
  });

  authorId = author.id;

  const character = await prismaClient.entity.create({
    data: {
      slug: characterSlug,
      type: "CHARACTER"
    }
  });

  const location = await prismaClient.entity.create({
    data: {
      slug: locationSlug,
      type: "LOCATION",
      retiredAt: new Date(retiredAtIso)
    }
  });

  const characterReleaseRevision = await prismaClient.entityRevision.create({
    data: {
      entityId: character.id,
      createdById: authorId,
      version: 1,
      name: "Captain Rowan Vale",
      summary: "Release summary",
      visibility: Visibility.PUBLIC,
      payload: {
        name: "Captain Rowan Vale",
        summary: "Release summary",
        visibility: Visibility.PUBLIC,
        metadata: {
          spoilerTier: "MINOR",
          tags: ["Harbor", "Scout"]
        }
      }
    }
  });

  await prismaClient.entityRevision.create({
    data: {
      entityId: character.id,
      createdById: authorId,
      version: 2,
      name: "Captain Rowan Vale",
      summary: "Current draft summary",
      visibility: Visibility.RESTRICTED,
      payload: {
        name: "Captain Rowan Vale",
        summary: "Current draft summary",
        visibility: Visibility.RESTRICTED,
        metadata: {
          spoilerTier: "MAJOR",
          tags: ["Harbor", "Scout", "Harbor"]
        }
      }
    }
  });

  const locationRevision = await prismaClient.entityRevision.create({
    data: {
      entityId: location.id,
      createdById: authorId,
      version: 1,
      name: "Cinder Quay",
      summary: "Retired port location",
      visibility: Visibility.PUBLIC,
      payload: {
        name: "Cinder Quay",
        summary: "Retired port location",
        visibility: Visibility.PUBLIC
      }
    }
  });

  const manuscript = await prismaClient.manuscript.create({
    data: {
      slug: manuscriptSlug,
      type: "CHAPTER"
    }
  });

  const manuscriptReleaseRevision = await prismaClient.manuscriptRevision.create({
    data: {
      manuscriptId: manuscript.id,
      createdById: authorId,
      version: 1,
      title: "Chapter One",
      summary: "Release chapter summary",
      visibility: Visibility.PUBLIC,
      payload: {
        title: "Chapter One",
        summary: "Release chapter summary",
        visibility: Visibility.PUBLIC,
        body: "Release chapter body"
      }
    }
  });

  await prismaClient.manuscriptRevision.create({
    data: {
      manuscriptId: manuscript.id,
      createdById: authorId,
      version: 2,
      title: "Chapter One",
      summary: "Current chapter summary",
      visibility: Visibility.RESTRICTED,
      payload: {
        title: "Chapter One",
        summary: "Current chapter summary",
        visibility: Visibility.RESTRICTED,
        body: "Current chapter body"
      }
    }
  });

  const relationship = await prismaClient.relationship.create({
    data: {
      sourceEntityId: character.id,
      targetEntityId: location.id,
      relationType: "GUARDS"
    }
  });

  const relationshipReleaseRevision = await prismaClient.relationshipRevision.create({
    data: {
      relationshipId: relationship.id,
      createdById: authorId,
      version: 1,
      state: "CREATE",
      visibility: Visibility.PUBLIC,
      metadata: {
        reason: "Release connection"
      }
    }
  });

  await prismaClient.relationshipRevision.create({
    data: {
      relationshipId: relationship.id,
      createdById: authorId,
      version: 2,
      state: "UPDATE",
      visibility: Visibility.RESTRICTED,
      metadata: {
        reason: "Current authored connection"
      }
    }
  });

  const release = await prismaClient.release.create({
    data: {
      slug: releaseSlug,
      name: "Phase 2 Export Release",
      status: "ARCHIVED",
      activatedAt: new Date("2026-03-18T09:30:00.000Z"),
      createdById: authorId
    }
  });

  await prismaClient.releaseEntry.createMany({
    data: [
      {
        releaseId: release.id,
        entityId: character.id,
        revisionId: characterReleaseRevision.id
      },
      {
        releaseId: release.id,
        entityId: location.id,
        revisionId: locationRevision.id
      }
    ]
  });

  await prismaClient.releaseManuscriptEntry.create({
    data: {
      releaseId: release.id,
      manuscriptId: manuscript.id,
      manuscriptRevisionId: manuscriptReleaseRevision.id
    }
  });

  await prismaClient.releaseRelationshipEntry.create({
    data: {
      releaseId: release.id,
      relationshipId: relationship.id,
      relationshipRevisionId: relationshipReleaseRevision.id
    }
  });

  currentOutputDirectory = await mkdtemp(exportRootPrefix);
  releaseOutputDirectory = await mkdtemp(exportRootPrefix);
  cleanupDirectories.add(currentOutputDirectory);
  cleanupDirectories.add(releaseOutputDirectory);
});

after(async () => {
  await Promise.all(
    [...cleanupDirectories].map(async (directory) => {
      await rm(directory, { recursive: true, force: true });
    })
  );

  await prismaClient.releaseRelationshipEntry.deleteMany({
    where: {
      release: {
        slug: releaseSlug
      }
    }
  });

  await prismaClient.releaseManuscriptEntry.deleteMany({
    where: {
      release: {
        slug: releaseSlug
      }
    }
  });

  await prismaClient.releaseEntry.deleteMany({
    where: {
      release: {
        slug: releaseSlug
      }
    }
  });

  await prismaClient.release.deleteMany({
    where: {
      slug: releaseSlug
    }
  });

  await prismaClient.relationshipRevision.deleteMany({
    where: {
      relationship: {
        relationType: "GUARDS",
        sourceEntity: {
          slug: characterSlug
        },
        targetEntity: {
          slug: locationSlug
        }
      }
    }
  });

  await prismaClient.relationship.deleteMany({
    where: {
      relationType: "GUARDS",
      sourceEntity: {
        slug: characterSlug
      },
      targetEntity: {
        slug: locationSlug
      }
    }
  });

  await prismaClient.manuscriptRevision.deleteMany({
    where: {
      manuscript: {
        slug: manuscriptSlug
      }
    }
  });

  await prismaClient.manuscript.deleteMany({
    where: {
      slug: manuscriptSlug
    }
  });

  await prismaClient.entityRevision.deleteMany({
    where: {
      entity: {
        slug: {
          in: [characterSlug, locationSlug]
        }
      }
    }
  });

  await prismaClient.entity.deleteMany({
    where: {
      slug: {
        in: [characterSlug, locationSlug]
      }
    }
  });

  await prismaClient.user.deleteMany({
    where: {
      email: authorEmail
    }
  });

  await prismaClient.$disconnect();
});

test("phase2PortabilityExportBaseline current json export writes deterministic implemented content", async () => {
  await exportPortability([
    "--scope=current",
    "--format=json",
    `--output=${currentOutputDirectory}`
  ]);

  const files = await listFiles(currentOutputDirectory);

  assert.ok(files.includes(`entities/character/${characterSlug}.json`));
  assert.ok(files.includes(`entities/location/${locationSlug}.json`));
  assert.ok(files.includes("manifests/export-manifest.json"));
  assert.ok(files.includes(`manuscripts/chapter/${manuscriptSlug}.json`));
  assert.ok(files.includes(`relationships/${characterSlug}--GUARDS--${locationSlug}.json`));

  const manifest = await readJson<{
    scope: string;
    counts: { entities: number; manuscripts: number; relationships: number; releases: number };
  }>(currentOutputDirectory, "manifests/export-manifest.json");
  const characterDocument = await readJson<{
    scope: string;
    entity: { retiredAt: string | null };
    revision: {
      version: number;
      visibility: string;
      summary: string;
      metadata: {
        spoilerTier: string;
        tags: string[];
      };
    };
  }>(currentOutputDirectory, `entities/character/${characterSlug}.json`);
  const locationDocument = await readJson<{
    entity: { retiredAt: string | null };
  }>(currentOutputDirectory, `entities/location/${locationSlug}.json`);
  const relationshipDocument = await readJson<{
    revision: { version: number; state: string; visibility: string };
  }>(currentOutputDirectory, `relationships/${characterSlug}--GUARDS--${locationSlug}.json`);

  assert.equal(manifest.scope, "current");
  assert.ok(manifest.counts.entities >= 2);
  assert.ok(manifest.counts.manuscripts >= 1);
  assert.ok(manifest.counts.relationships >= 1);
  assert.equal(manifest.counts.releases, 0);

  assert.equal(characterDocument.scope, "current");
  assert.equal(characterDocument.entity.retiredAt, null);
  assert.equal(characterDocument.revision.version, 2);
  assert.equal(characterDocument.revision.visibility, "RESTRICTED");
  assert.equal(characterDocument.revision.summary, "Current draft summary");
  assert.equal(characterDocument.revision.metadata.spoilerTier, "MAJOR");
  assert.deepEqual(characterDocument.revision.metadata.tags, ["harbor", "scout"]);

  assert.equal(locationDocument.entity.retiredAt, retiredAtIso);
  assert.equal(relationshipDocument.revision.version, 2);
  assert.equal(relationshipDocument.revision.state, "UPDATE");
  assert.equal(relationshipDocument.revision.visibility, "RESTRICTED");
});

test("phase2PortabilityExportBaseline current json export accepts space-separated CLI args", async () => {
  const outputDirectory = await mkdtemp(exportRootPrefix);

  cleanupDirectories.add(outputDirectory);

  await exportPortability([
    "--scope",
    "current",
    "--format",
    "json",
    "--output",
    outputDirectory
  ]);

  const manifest = await readJson<{ scope: string }>(outputDirectory, "manifests/export-manifest.json");

  assert.equal(manifest.scope, "current");
});

test("phase2PortabilityExportBaseline export rejects non-empty output directories instead of deleting them", async () => {
  const outputDirectory = await mkdtemp(exportRootPrefix);

  cleanupDirectories.add(outputDirectory);
  await writeFile(join(outputDirectory, "sentinel.txt"), "preserve me", "utf8");

  await assert.rejects(
    exportPortability([
      "--scope=current",
      "--format=json",
      `--output=${outputDirectory}`
    ]),
    /--output must point to a missing or empty directory/
  );

  const sentinelContent = await readFile(join(outputDirectory, "sentinel.txt"), "utf8");

  assert.equal(sentinelContent, "preserve me");
});

test("phase2PortabilityExportBaseline release json export writes selected release composition and metadata", async () => {
  await exportPortability([
    "--scope=release",
    "--format=json",
    `--release-slug=${releaseSlug}`,
    `--output=${releaseOutputDirectory}`
  ]);

  const manifest = await readJson<{
    scope: string;
    release: { slug: string; status: string };
    counts: { entities: number; manuscripts: number; relationships: number; releases: number };
  }>(releaseOutputDirectory, "manifests/export-manifest.json");
  const releaseDocument = await readJson<{
    release: { slug: string; status: string };
    composition: {
      entities: Array<{ entitySlug: string; version: number }>;
      manuscripts: Array<{ manuscriptSlug: string; version: number }>;
      relationships: Array<{ relationType: string; version: number }>;
    };
  }>(releaseOutputDirectory, `releases/${releaseSlug}.json`);
  const characterDocument = await readJson<{
    scope: string;
    release: { slug: string; status: string };
    revision: { version: number; visibility: string; summary: string };
  }>(releaseOutputDirectory, `entities/character/${characterSlug}.json`);

  assert.equal(manifest.scope, "release");
  assert.equal(manifest.release.slug, releaseSlug);
  assert.equal(manifest.release.status, "ARCHIVED");
  assert.deepEqual(
    {
      entities: manifest.counts.entities,
      manuscripts: manifest.counts.manuscripts,
      relationships: manifest.counts.relationships,
      releases: manifest.counts.releases
    },
    {
    entities: 2,
    manuscripts: 1,
    relationships: 1,
    releases: 1
    }
  );

  assert.equal(characterDocument.scope, "release");
  assert.equal(characterDocument.release.slug, releaseSlug);
  assert.equal(characterDocument.release.status, "ARCHIVED");
  assert.equal(characterDocument.revision.version, 1);
  assert.equal(characterDocument.revision.visibility, "PUBLIC");
  assert.equal(characterDocument.revision.summary, "Release summary");

  assert.equal(releaseDocument.release.slug, releaseSlug);
  assert.equal(releaseDocument.release.status, "ARCHIVED");
  assert.deepEqual(
    releaseDocument.composition.entities.map((entry) => ({
      entitySlug: entry.entitySlug,
      version: entry.version
    })),
    [
      {
        entitySlug: characterSlug,
        version: 1
      },
      {
        entitySlug: locationSlug,
        version: 1
      }
    ]
  );
  assert.deepEqual(
    releaseDocument.composition.manuscripts.map((entry) => ({
      manuscriptSlug: entry.manuscriptSlug,
      version: entry.version
    })),
    [
      {
        manuscriptSlug: manuscriptSlug,
        version: 1
      }
    ]
  );
  assert.deepEqual(
    releaseDocument.composition.relationships.map((entry) => ({
      relationType: entry.relationType,
      version: entry.version
    })),
    [
      {
        relationType: "GUARDS",
        version: 1
      }
    ]
  );
});

test("phase2PortabilityExportBaseline release markdown export writes mixed markdown and json layout", async () => {
  const markdownOutputDirectory = await mkdtemp(exportRootPrefix);

  cleanupDirectories.add(markdownOutputDirectory);

  await exportPortability([
    "--scope=release",
    "--format=markdown",
    `--release-slug=${releaseSlug}`,
    `--output=${markdownOutputDirectory}`
  ]);

  const files = await listFiles(markdownOutputDirectory);

  assert.ok(files.includes(`entities/character/${characterSlug}.md`));
  assert.ok(files.includes(`entities/location/${locationSlug}.md`));
  assert.ok(files.includes(`chapters/${manuscriptSlug}.md`));
  assert.ok(files.includes(`relationships/${characterSlug}--GUARDS--${locationSlug}.json`));
  assert.ok(files.includes(`releases/${releaseSlug}.json`));
  assert.ok(files.includes("manifests/export-manifest.json"));

  const manifest = await readJson<{ format: string }>(markdownOutputDirectory, "manifests/export-manifest.json");
  const entityMarkdown = await readFile(
    join(markdownOutputDirectory, `entities/character/${characterSlug}.md`),
    "utf8"
  );
  const manuscriptMarkdown = await readFile(
    join(markdownOutputDirectory, `chapters/${manuscriptSlug}.md`),
    "utf8"
  );

  assert.equal(manifest.format, "markdown");
  assert.match(entityMarkdown, /---/);
  assert.match(entityMarkdown, /slug: /);
  assert.match(entityMarkdown, /# Captain Rowan Vale/);
  assert.match(manuscriptMarkdown, /summary: "Release chapter summary"/);
  assert.match(manuscriptMarkdown, /# Chapter One/);
  assert.match(manuscriptMarkdown, /Release chapter body/);
});

test("phase2PortabilityExportBaseline release export fails for unknown release slug", async () => {
  await assert.rejects(
    exportPortability([
      "--scope=release",
      "--format=json",
      `--release-slug=missing-release-${timestamp}`,
      `--output=${releaseOutputDirectory}`
    ]),
    /Release not found/
  );
});