import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test, { after } from "node:test";

import { Role } from "@prisma/client";

import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { portabilityImportService } from "../apps/api/src/services/portabilityImportService.js";
import { backupDatabase } from "../scripts/backupDatabase.mjs";
import { bootstrapAuthorAdmin } from "../scripts/bootstrapAuthorAdmin.js";
import { restoreDatabase } from "../scripts/restoreDatabase.mjs";

const timestamp = Date.now();
const adminEmail = `phase2-bootstrap-${timestamp}@example.com`;
const adminPassword = "phase2-bootstrap-password";
const editorEmail = `phase2-import-editor-${timestamp}@example.com`;
const editorPassword = "phase2-import-editor-password";

const writeMinimalMarkdownPackage = async (): Promise<string> => {
  const packageDir = await mkdtemp(join(tmpdir(), "bookworm-selfhost-import-"));
  const manifestPath = join(packageDir, "manifests", "export-manifest.json");

  await mkdir(join(packageDir, "manifests"), { recursive: true });

  await writeFile(
    manifestPath,
    JSON.stringify({
      schemaVersion: 1,
      format: "markdown",
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

  return packageDir;
};

const getContentCounts = async (): Promise<{
  entities: number;
  manuscripts: number;
  relationships: number;
  releases: number;
}> => {
  const [entities, manuscripts, relationships, releases] = await Promise.all([
    prismaClient.entity.count(),
    prismaClient.manuscript.count(),
    prismaClient.relationship.count(),
    prismaClient.release.count()
  ]);

  return {
    entities,
    manuscripts,
    relationships,
    releases
  };
};

after(async () => {
  await prismaClient.user.deleteMany({
    where: {
      email: {
        in: [adminEmail, editorEmail]
      }
    }
  });

  await prismaClient.$disconnect();
});

test("phase2SelfHostingBaseline bootstrap admin creates one author-admin user without content seeding", async () => {
  const countsBefore = await getContentCounts();

  await bootstrapAuthorAdmin([
    "--email",
    adminEmail,
    "--display-name",
    "Phase 2 Bootstrap Admin",
    "--password",
    adminPassword
  ]);

  const countsAfter = await getContentCounts();
  const user = await prismaClient.user.findUnique({
    where: {
      email: adminEmail
    },
    select: {
      email: true,
      displayName: true,
      role: true,
      passwordHash: true
    }
  });

  assert.ok(user);
  assert.equal(user.email, adminEmail);
  assert.equal(user.displayName, "Phase 2 Bootstrap Admin");
  assert.equal(user.role, "AUTHOR_ADMIN");
  assert.equal(await passwordHasher.verifyPassword(adminPassword, user.passwordHash), true);
  assert.deepEqual(countsAfter, countsBefore);
});

test("phase2SelfHostingBaseline duplicate bootstrap email fails cleanly", async () => {
  await assert.rejects(
    bootstrapAuthorAdmin([
      `--email=${adminEmail}`,
      "--display-name=Duplicate Admin",
      `--password=${adminPassword}`
    ]),
    /User already exists/
  );
});

test("phase2SelfHostingBaseline docs and package scripts expose the slice commands", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8")
  ) as {
    scripts: Record<string, string>;
  };
  const scriptsReadme = await readFile(new URL("../scripts/README.md", import.meta.url), "utf8");

  assert.equal(typeof packageJson.scripts["portability:export"], "string");
  assert.equal(typeof packageJson.scripts["portability:import"], "string");
  assert.equal(typeof packageJson.scripts["auth:bootstrap-admin"], "string");
  assert.equal(typeof packageJson.scripts["db:backup"], "string");
  assert.equal(typeof packageJson.scripts["db:restore"], "string");
  assert.match(scriptsReadme, /pnpm portability:export/);
  assert.match(scriptsReadme, /pnpm portability:import/);
  assert.match(scriptsReadme, /pnpm auth:bootstrap-admin/);
  assert.match(scriptsReadme, /pnpm db:backup/);
  assert.match(scriptsReadme, /pnpm db:restore/);
  assert.match(scriptsReadme, /missing or empty directory/);
});

test("phase2SelfHostingBaseline backup script rejects missing output path", async () => {
  await assert.rejects(backupDatabase([]), /--output is required/);
});

test("phase2SelfHostingBaseline restore script rejects missing input path", async () => {
  await assert.rejects(restoreDatabase([]), /--input is required/);
});

test("phase2SelfHostingBaseline portability import rejects non-admin actor", async () => {
  const passwordHash = await passwordHasher.hashPassword(editorPassword);

  await prismaClient.user.create({
    data: {
      email: editorEmail,
      displayName: "Phase 2 Import Editor",
      passwordHash,
      role: Role.EDITOR
    }
  });

  const packageDir = await writeMinimalMarkdownPackage();

  try {
    const report = await portabilityImportService.runImport({
      inputPath: packageDir,
      format: "markdown",
      actorEmail: editorEmail,
      dryRun: false
    });

    assert.equal(report.errors.length, 1);
    assert.equal(report.errors[0]?.code, "ACTOR_FORBIDDEN");
    assert.match(report.errors[0]?.message ?? "", /AUTHOR_ADMIN/);
  } finally {
    await rm(packageDir, { recursive: true, force: true });
  }
});