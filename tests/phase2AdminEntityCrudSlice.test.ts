import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

import { Role } from "@prisma/client";

import { createApp } from "../apps/api/src/app/createApp.js";
import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { phase0FixtureConfig } from "../scripts/phase0FixtureConfig.js";

type EntityDraftResponse = {
  entityType: string;
  entitySlug: string;
  revisionId: string;
  version: number;
  name: string;
  summary: string;
  visibility: string;
};

type AdminEntityDetailResponse = {
  entitySlug: string;
  entityType: string;
  latestDraft: {
    revisionId: string;
    version: number;
    name: string;
    summary: string;
    visibility: string;
    payload: unknown;
    createdBy: { email: string; role: string };
  };
  releaseSummary: { includedInReleaseCount: number };
};

type AdminEntityHistoryResponse = {
  entitySlug: string;
  entityType: string;
  latestDraftRevisionId: string;
  activeReleaseRevisionId: string | null;
  revisionSummaries: Array<{ revisionId: string; version: number }>;
};

type AdminEntityListResponse = {
  entities: Array<{ entitySlug: string; entityType: string }>;
};

type RetireOutcomeResponse = {
  outcome: "deleted" | "retired";
};

const newEntityTypes = [
  "ARTIFACT",
  "CREATURE",
  "BELIEF_SYSTEM",
  "POLITICAL_BODY",
  "LANGUAGE",
  "SECRET",
  "REVEAL",
  "TAG",
  "TIMELINE_ERA"
] as const;

const app = createApp();
const server = createServer(app);
const timestamp = Date.now();

const slugFor = (type: string) => `phase2-crud-${type.toLowerCase().replace("_", "-")}-${timestamp}`;

const allTestSlugs = newEntityTypes.map((t) => slugFor(t));

const slug02bUpdate = `phase2-02b-update-${timestamp}`;
const slug02bDelete = `phase2-02b-delete-${timestamp}`;
const slug02bRetire = `phase2-02b-retire-${timestamp}`;
const slug02bLifecycle = `phase2-02b-lifecycle-${timestamp}`;
const releaseSlug02b = `phase2-02b-release-${timestamp}`;

const allPart02bSlugs = [slug02bUpdate, slug02bDelete, slug02bRetire, slug02bLifecycle];

let apiBaseUrl = "";
let sessionCookie = "";

const ensureOk = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  return response.json() as Promise<T>;
};

before(async () => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to determine test server address");
  }
  apiBaseUrl = `http://127.0.0.1:${address.port}`;

  const hash = await passwordHasher.hashPassword(phase0FixtureConfig.authorAdmin.password);
  await prismaClient.user.upsert({
    where: { email: phase0FixtureConfig.authorAdmin.email },
    update: { passwordHash: hash, role: Role.AUTHOR_ADMIN },
    create: {
      email: phase0FixtureConfig.authorAdmin.email,
      displayName: phase0FixtureConfig.authorAdmin.displayName,
      passwordHash: hash,
      role: Role.AUTHOR_ADMIN
    }
  });

  const sessionResponse = await fetch(`${apiBaseUrl}/auth/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: phase0FixtureConfig.authorAdmin.email,
      password: phase0FixtureConfig.authorAdmin.password
    })
  });

  if (!sessionResponse.ok) {
    throw new Error(`Session creation failed: ${sessionResponse.status}`);
  }

  const cookieHeader = sessionResponse.headers.get("set-cookie");
  if (!cookieHeader) throw new Error("No session cookie returned");
  sessionCookie = cookieHeader.split(";")[0] ?? "";
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });

  await prismaClient.session.deleteMany({
    where: { user: { email: phase0FixtureConfig.authorAdmin.email } }
  });

  // Clean up release created for retire test (cascades to ReleaseEntries)
  await prismaClient.release.deleteMany({
    where: { slug: releaseSlug02b }
  });

  const allSlugs = [...allTestSlugs, ...allPart02bSlugs];

  await prismaClient.entityRevision.deleteMany({
    where: { entity: { slug: { in: allSlugs } } }
  });

  await prismaClient.entity.deleteMany({
    where: { slug: { in: allSlugs } }
  });

  await prismaClient.$disconnect();
});

test("unauthenticated POST to /admin/entities/:type/drafts returns 401", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/entities/ARTIFACT/drafts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug: "irrelevant", name: "Test", summary: "Test" })
  });
  assert.equal(response.status, 401);
});

test("POST with unsupported entity type returns 400", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/entities/UNKNOWN_TYPE/drafts`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: sessionCookie },
    body: JSON.stringify({ slug: "irrelevant", name: "Test", summary: "Test" })
  });
  assert.equal(response.status, 400);
});

test("POST with missing required body fields returns 400", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/entities/ARTIFACT/drafts`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: sessionCookie },
    body: JSON.stringify({ slug: "irrelevant" })
  });
  assert.equal(response.status, 400);
});

test("all 9 new entity types can be created and retrieved via admin entity routes", async () => {
  for (const entityType of newEntityTypes) {
    const slug = slugFor(entityType);
    const createResponse = await fetch(`${apiBaseUrl}/admin/entities/${entityType}/drafts`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: sessionCookie },
      body: JSON.stringify({
        slug,
        name: `Test ${entityType}`,
        summary: `Summary for ${entityType}`,
        visibility: "PRIVATE"
      })
    });

    assert.equal(createResponse.status, 201, `POST drafts failed for ${entityType}`);

    const draft = await (createResponse.json() as Promise<EntityDraftResponse>);
    assert.equal(draft.entityType, entityType);
    assert.equal(draft.entitySlug, slug);
    assert.equal(draft.version, 1);
    assert.equal(draft.visibility, "PRIVATE");
    assert.ok(draft.revisionId, `Missing revisionId for ${entityType}`);

    const detailResponse = await fetch(`${apiBaseUrl}/admin/entities/${entityType}/${slug}`, {
      headers: { cookie: sessionCookie }
    });

    assert.equal(detailResponse.status, 200, `GET detail failed for ${entityType}`);

    const detail = await (detailResponse.json() as Promise<AdminEntityDetailResponse>);
    assert.equal(detail.entitySlug, slug);
    assert.equal(detail.entityType, entityType);
    assert.equal(detail.latestDraft.version, 1);
    assert.equal(detail.releaseSummary.includedInReleaseCount, 0);
  }
});

test("drafting the same slug twice creates a new revision", async () => {
  const entityType = "ARTIFACT";
  const slug = slugFor(entityType);

  const updateResponse = await fetch(`${apiBaseUrl}/admin/entities/${entityType}/drafts`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: sessionCookie },
    body: JSON.stringify({
      slug,
      name: "Updated Artifact",
      summary: "Updated summary",
      visibility: "PUBLIC"
    })
  });

  assert.equal(updateResponse.status, 201);

  const updated = await (updateResponse.json() as Promise<EntityDraftResponse>);
  assert.equal(updated.version, 2);
  assert.equal(updated.name, "Updated Artifact");
  assert.equal(updated.visibility, "PUBLIC");
});

test("history endpoint returns all revisions for an entity", async () => {
  const entityType = "ARTIFACT";
  const slug = slugFor(entityType);

  const historyResponse = await fetch(`${apiBaseUrl}/admin/entities/${entityType}/${slug}/history`, {
    headers: { cookie: sessionCookie }
  });

  assert.equal(historyResponse.status, 200);

  const history = await (historyResponse.json() as Promise<AdminEntityHistoryResponse>);
  assert.equal(history.entitySlug, slug);
  assert.equal(history.entityType, entityType);
  assert.ok(history.revisionSummaries.length >= 2, "Expected at least 2 revisions");
  assert.equal(history.revisionSummaries[0]?.version, 2);
  assert.equal(history.revisionSummaries[1]?.version, 1);
});

test("GET /admin/entities list returns all supported entity types when queried individually", async () => {
  for (const entityType of newEntityTypes) {
    const slug = slugFor(entityType);

    const listResponse = await fetch(`${apiBaseUrl}/admin/entities?type=${entityType}`, {
      headers: { cookie: sessionCookie }
    });

    assert.equal(listResponse.status, 200, `List failed for type ${entityType}`);

    const list = await (listResponse.json() as Promise<AdminEntityListResponse>);
    const match = list.entities.find((e) => e.entitySlug === slug);
    assert.ok(match, `Entity ${slug} not found in list for type ${entityType}`);
    assert.equal(match?.entityType, entityType);
  }
});

// Part 02b: update and retire tests

test("unauthenticated PATCH to /:type/:slug/drafts returns 401", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/entities/CREATURE/some-slug/drafts`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "test", summary: "test" })
  });
  assert.equal(response.status, 401);
});

test("PATCH with unsupported entity type returns 400", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/entities/UNKNOWN_TYPE/some-slug/drafts`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: sessionCookie },
    body: JSON.stringify({ name: "test", summary: "test" })
  });
  assert.equal(response.status, 400);
});

test("PATCH with missing required body fields returns 400", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/entities/CREATURE/${slug02bUpdate}/drafts`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: sessionCookie },
    body: JSON.stringify({ name: "only-name-no-summary" })
  });
  assert.equal(response.status, 400);
});

test("PATCH returns 404 for non-existent entity", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/entities/CREATURE/nonexistent-slug-${timestamp}/drafts`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: sessionCookie },
    body: JSON.stringify({ name: "Test", summary: "Test" })
  });
  assert.equal(response.status, 404);
});

test("PATCH creates a new revision for an existing entity draft", async () => {
  // Create initial draft
  const createResponse = await fetch(`${apiBaseUrl}/admin/entities/CREATURE/drafts`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: sessionCookie },
    body: JSON.stringify({
      slug: slug02bUpdate,
      name: "Original Creature",
      summary: "Original summary",
      visibility: "PRIVATE"
    })
  });
  assert.equal(createResponse.status, 201, "Initial create failed");

  const initial = await (createResponse.json() as Promise<EntityDraftResponse>);
  assert.equal(initial.version, 1);

  // Update via PATCH
  const patchResponse = await fetch(`${apiBaseUrl}/admin/entities/CREATURE/${slug02bUpdate}/drafts`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: sessionCookie },
    body: JSON.stringify({ name: "Updated Creature", summary: "Updated summary", visibility: "PUBLIC" })
  });
  assert.equal(patchResponse.status, 200, "PATCH failed");

  const updated = await (patchResponse.json() as Promise<EntityDraftResponse>);
  assert.equal(updated.entitySlug, slug02bUpdate);
  assert.equal(updated.entityType, "CREATURE");
  assert.equal(updated.version, 2);
  assert.equal(updated.name, "Updated Creature");
  assert.equal(updated.visibility, "PUBLIC");
  assert.ok(updated.revisionId !== initial.revisionId, "Expected a new revisionId after update");
});

test("unauthenticated DELETE to /:type/:slug returns 401", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/entities/LOCATION/some-slug`, {
    method: "DELETE"
  });
  assert.equal(response.status, 401);
});

test("DELETE with unsupported entity type returns 400", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/entities/UNKNOWN_TYPE/some-slug`, {
    method: "DELETE",
    headers: { cookie: sessionCookie }
  });
  assert.equal(response.status, 400);
});

test("DELETE returns 404 for non-existent entity", async () => {
  const response = await fetch(`${apiBaseUrl}/admin/entities/LOCATION/nonexistent-slug-${timestamp}`, {
    method: "DELETE",
    headers: { cookie: sessionCookie }
  });
  assert.equal(response.status, 404);
});

test("DELETE hard-deletes an entity that has no release entries", async () => {
  // Create entity
  const createResponse = await fetch(`${apiBaseUrl}/admin/entities/LOCATION/drafts`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: sessionCookie },
    body: JSON.stringify({ slug: slug02bDelete, name: "Deletable Location", summary: "No releases here" })
  });
  assert.equal(createResponse.status, 201, "Setup create failed");

  // Delete it
  const deleteResponse = await fetch(`${apiBaseUrl}/admin/entities/LOCATION/${slug02bDelete}`, {
    method: "DELETE",
    headers: { cookie: sessionCookie }
  });
  assert.equal(deleteResponse.status, 200);

  const result = await (deleteResponse.json() as Promise<RetireOutcomeResponse>);
  assert.equal(result.outcome, "deleted");

  // Confirm entity is gone
  const detailResponse = await fetch(`${apiBaseUrl}/admin/entities/LOCATION/${slug02bDelete}`, {
    headers: { cookie: sessionCookie }
  });
  assert.equal(detailResponse.status, 404, "Entity should be hard-deleted");
});

test("DELETE soft-retires an entity that has release entries (preserves history)", async () => {
  // Create entity and a revision
  const createResponse = await fetch(`${apiBaseUrl}/admin/entities/EVENT/drafts`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: sessionCookie },
    body: JSON.stringify({
      slug: slug02bRetire,
      name: "Retirable Event",
      summary: "Has a release entry"
    })
  });
  assert.equal(createResponse.status, 201, "Setup create failed");

  const created = await (createResponse.json() as Promise<EntityDraftResponse>);

  // Directly insert a ReleaseEntry to simulate the entity being included in a release
  const authorUser = await prismaClient.user.findUniqueOrThrow({
    where: { email: phase0FixtureConfig.authorAdmin.email },
    select: { id: true }
  });

  const release = await prismaClient.release.create({
    data: {
      slug: releaseSlug02b,
      name: "Phase 2 Retire Test Release",
      createdById: authorUser.id
    }
  });

  const entity = await prismaClient.entity.findUniqueOrThrow({
    where: { slug: slug02bRetire },
    select: { id: true }
  });

  const revision = await prismaClient.entityRevision.findUniqueOrThrow({
    where: { id: created.revisionId },
    select: { id: true }
  });

  await prismaClient.releaseEntry.create({
    data: {
      releaseId: release.id,
      entityId: entity.id,
      revisionId: revision.id
    }
  });

  // Attempt to DELETE — should soft-retire instead of hard delete
  const deleteResponse = await fetch(`${apiBaseUrl}/admin/entities/EVENT/${slug02bRetire}`, {
    method: "DELETE",
    headers: { cookie: sessionCookie }
  });
  assert.equal(deleteResponse.status, 200);

  const result = await (deleteResponse.json() as Promise<RetireOutcomeResponse>);
  assert.equal(result.outcome, "retired");

  // Entity should still be retrievable (historical integrity preserved)
  const detailResponse = await fetch(`${apiBaseUrl}/admin/entities/EVENT/${slug02bRetire}`, {
    headers: { cookie: sessionCookie }
  });
  assert.equal(detailResponse.status, 200, "Retired entity should still be retrievable");

  // Calling DELETE again on already-retired entity is idempotent
  const retryDelete = await fetch(`${apiBaseUrl}/admin/entities/EVENT/${slug02bRetire}`, {
    method: "DELETE",
    headers: { cookie: sessionCookie }
  });
  assert.equal(retryDelete.status, 200);
  const retryResult = await (retryDelete.json() as Promise<RetireOutcomeResponse>);
  assert.equal(retryResult.outcome, "retired");
});

test("full create → update → retire lifecycle using CHARACTER type (generic route)", async () => {
  // Create
  const createResponse = await fetch(`${apiBaseUrl}/admin/entities/CHARACTER/drafts`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: sessionCookie },
    body: JSON.stringify({ slug: slug02bLifecycle, name: "Lifecycle Character", summary: "Initial" })
  });
  assert.equal(createResponse.status, 201, "Create failed");
  const created = await (createResponse.json() as Promise<EntityDraftResponse>);
  assert.equal(created.version, 1);

  // Update
  const patchResponse = await fetch(`${apiBaseUrl}/admin/entities/CHARACTER/${slug02bLifecycle}/drafts`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: sessionCookie },
    body: JSON.stringify({ name: "Updated Lifecycle Character", summary: "Updated", visibility: "RESTRICTED" })
  });
  assert.equal(patchResponse.status, 200, "Update failed");
  const updated = await (patchResponse.json() as Promise<EntityDraftResponse>);
  assert.equal(updated.version, 2);
  assert.equal(updated.visibility, "RESTRICTED");

  // Retire (no release entries → hard delete)
  const deleteResponse = await fetch(`${apiBaseUrl}/admin/entities/CHARACTER/${slug02bLifecycle}`, {
    method: "DELETE",
    headers: { cookie: sessionCookie }
  });
  assert.equal(deleteResponse.status, 200, "Retire failed");
  const retired = await (deleteResponse.json() as Promise<RetireOutcomeResponse>);
  assert.equal(retired.outcome, "deleted");

  // Confirm gone
  const confirmResponse = await fetch(`${apiBaseUrl}/admin/entities/CHARACTER/${slug02bLifecycle}`, {
    headers: { cookie: sessionCookie }
  });
  assert.equal(confirmResponse.status, 404, "Entity should be deleted after lifecycle retire");
});
