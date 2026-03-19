import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";

import { createApp } from "../apps/api/src/app/createApp.js";
import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";

type AdminEntityListResponse = {
  entities: Array<{
    entitySlug: string;
    entityType: string;
    latestDraft: {
      revisionId: string;
      version: number;
      name: string;
      summary: string;
      visibility: string;
      createdBy: {
        email: string;
        role: string;
      };
    };
    releaseSummary: {
      activeRelease: null | {
        releaseSlug: string;
        releaseStatus: string;
        revisionId: string;
        version: number;
      };
      latestRelease: null | {
        releaseSlug: string;
        releaseStatus: string;
        revisionId: string;
        version: number;
      };
      includedInReleaseCount: number;
      draftMatchesActiveRelease: boolean;
    };
  }>;
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
    payload: {
      name: string;
      summary: string;
      visibility: string;
      note?: string;
    };
    createdBy: {
      email: string;
      role: string;
    };
  };
  releaseSummary: {
    activeRelease: null | {
      releaseSlug: string;
      releaseStatus: string;
      revisionId: string;
      version: number;
    };
    latestRelease: null | {
      releaseSlug: string;
      releaseStatus: string;
      revisionId: string;
      version: number;
    };
    includedInReleaseCount: number;
    draftMatchesActiveRelease: boolean;
  };
};

type AdminEntityHistoryResponse = {
  entitySlug: string;
  entityType: string;
  latestDraftRevisionId: string;
  activeReleaseRevisionId: string | null;
  revisionSummaries: Array<{
    revisionId: string;
    version: number;
    name: string;
    summary: string;
    visibility: string;
    createdBy: {
      email: string;
      role: string;
    };
    releaseSummary: {
      includedInReleaseCount: number;
      includedInActiveRelease: boolean;
      latestRelease: null | {
        releaseSlug: string;
        releaseStatus: string;
        revisionId: string;
        version: number;
      };
    };
  }>;
};

const app = createApp();
const server = createServer(app);
const timestamp = Date.now();
const authorAdminEmail = `phase1-admin-author-${timestamp}@example.com`;
const editorEmail = `phase1-admin-editor-${timestamp}@example.com`;
const publicEmail = `phase1-admin-public-${timestamp}@example.com`;
const password = "SliceTestPassword123!";
const characterSlug = `phase1-admin-character-${timestamp}`;
const factionSlug = `phase1-admin-faction-${timestamp}`;
const eventSlug = `phase1-admin-event-${timestamp}`;
const activeReleaseSlug = `phase1-admin-active-${timestamp}`;
const draftReleaseSlug = `phase1-admin-draft-${timestamp}`;

let apiBaseUrl = "";
let authorAdminId = "";
let editorId = "";
let characterPublishedRevisionId = "";
let characterDraftRevisionId = "";
let eventRevisionId = "";

const ensureOk = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Request failed with ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
};

const createSessionCookie = async (email: string): Promise<string> => {
  const response = await fetch(`${apiBaseUrl}/auth/session`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      email,
      password
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to create session: ${response.status} ${errorText}`);
  }

  const sessionCookie = response.headers.get("set-cookie");

  if (!sessionCookie) {
    throw new Error("Session creation did not return a cookie");
  }

  const cookieValue = sessionCookie.split(";")[0];

  if (!cookieValue) {
    throw new Error("Session cookie header was empty");
  }

  return cookieValue;
};

before(async () => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Unable to determine test server address");
  }

  apiBaseUrl = `http://127.0.0.1:${address.port}`;

  const passwordHash = await passwordHasher.hashPassword(password);

  const authorAdmin = await prismaClient.user.create({
    data: {
      email: authorAdminEmail,
      displayName: "Phase 1 Author Admin",
      passwordHash,
      role: Role.AUTHOR_ADMIN
    }
  });

  const editor = await prismaClient.user.create({
    data: {
      email: editorEmail,
      displayName: "Phase 1 Editor",
      passwordHash,
      role: Role.EDITOR
    }
  });

  await prismaClient.user.create({
    data: {
      email: publicEmail,
      displayName: "Phase 1 Public",
      passwordHash,
      role: Role.PUBLIC
    }
  });

  authorAdminId = authorAdmin.id;
  editorId = editor.id;

  const character = await prismaClient.entity.create({
    data: {
      slug: characterSlug,
      type: "CHARACTER"
    }
  });

  const faction = await prismaClient.entity.create({
    data: {
      slug: factionSlug,
      type: "FACTION"
    }
  });

  const event = await prismaClient.entity.create({
    data: {
      slug: eventSlug,
      type: "EVENT"
    }
  });

  const characterPublishedRevision = await prismaClient.entityRevision.create({
    data: {
      entityId: character.id,
      createdById: authorAdminId,
      version: 1,
      name: "Phase 1 Retrieval Character",
      summary: "Published character summary for retrieval baseline.",
      visibility: Visibility.PUBLIC,
      payload: {
        name: "Phase 1 Retrieval Character",
        summary: "Published character summary for retrieval baseline.",
        visibility: Visibility.PUBLIC
      }
    }
  });

  const characterDraftRevision = await prismaClient.entityRevision.create({
    data: {
      entityId: character.id,
      createdById: editorId,
      version: 2,
      name: "Phase 1 Retrieval Character",
      summary: "Updated draft summary that should stay distinct from the active release.",
      visibility: Visibility.RESTRICTED,
      payload: {
        name: "Phase 1 Retrieval Character",
        summary: "Updated draft summary that should stay distinct from the active release.",
        visibility: Visibility.RESTRICTED,
        note: "editor-draft"
      }
    }
  });

  await prismaClient.entityRevision.create({
    data: {
      entityId: faction.id,
      createdById: editorId,
      version: 1,
      name: "Phase 1 Retrieval Faction",
      summary: "Unreleased faction draft for list coverage.",
      visibility: Visibility.PRIVATE,
      payload: {
        name: "Phase 1 Retrieval Faction",
        summary: "Unreleased faction draft for list coverage.",
        visibility: Visibility.PRIVATE
      }
    }
  });

  const eventRevision = await prismaClient.entityRevision.create({
    data: {
      entityId: event.id,
      createdById: authorAdminId,
      version: 1,
      name: "Phase 1 Retrieval Event",
      summary: "Released event draft for active release metadata.",
      visibility: Visibility.PUBLIC,
      payload: {
        name: "Phase 1 Retrieval Event",
        summary: "Released event draft for active release metadata.",
        visibility: Visibility.PUBLIC
      }
    }
  });

  characterPublishedRevisionId = characterPublishedRevision.id;
  characterDraftRevisionId = characterDraftRevision.id;
  eventRevisionId = eventRevision.id;

  const activeRelease = await prismaClient.release.create({
    data: {
      slug: activeReleaseSlug,
      name: "Phase 1 Admin Active Release",
      status: "ACTIVE",
      createdById: authorAdminId,
      activatedAt: new Date(Date.now() - 60_000)
    }
  });

  const draftRelease = await prismaClient.release.create({
    data: {
      slug: draftReleaseSlug,
      name: "Phase 1 Admin Draft Release",
      status: "DRAFT",
      createdById: authorAdminId
    }
  });

  await prismaClient.releaseEntry.createMany({
    data: [
      {
        releaseId: activeRelease.id,
        entityId: character.id,
        revisionId: characterPublishedRevision.id
      },
      {
        releaseId: activeRelease.id,
        entityId: event.id,
        revisionId: eventRevision.id
      },
      {
        releaseId: draftRelease.id,
        entityId: character.id,
        revisionId: characterDraftRevision.id
      }
    ]
  });
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  await prismaClient.session.deleteMany({
    where: {
      user: {
        email: {
          in: [authorAdminEmail, editorEmail, publicEmail]
        }
      }
    }
  });

  await prismaClient.releaseEntry.deleteMany({
    where: {
      release: {
        slug: {
          in: [activeReleaseSlug, draftReleaseSlug]
        }
      }
    }
  });

  await prismaClient.release.deleteMany({
    where: {
      slug: {
        in: [activeReleaseSlug, draftReleaseSlug]
      }
    }
  });

  await prismaClient.entityRevision.deleteMany({
    where: {
      entity: {
        slug: {
          in: [characterSlug, factionSlug, eventSlug]
        }
      }
    }
  });

  await prismaClient.entity.deleteMany({
    where: {
      slug: {
        in: [characterSlug, factionSlug, eventSlug]
      }
    }
  });

  await prismaClient.user.deleteMany({
    where: {
      email: {
        in: [authorAdminEmail, editorEmail, publicEmail]
      }
    }
  });

  await prismaClient.$disconnect();
});

test("admin entity retrieval exposes draft and release-aware summaries for editors and author-admins", async () => {
  const editorCookie = await createSessionCookie(editorEmail);
  const authorAdminCookie = await createSessionCookie(authorAdminEmail);
  const publicCookie = await createSessionCookie(publicEmail);

  const editorList = await ensureOk<AdminEntityListResponse>(
    await fetch(`${apiBaseUrl}/admin/entities?type=CHARACTER&type=FACTION&type=EVENT`, {
      headers: {
        cookie: editorCookie
      }
    })
  );

  assert.ok(editorList.entities.length >= 3);
  assert.ok(
    editorList.entities.every((entity) => ["CHARACTER", "FACTION", "EVENT"].includes(entity.entityType))
  );

  const characterSummary = editorList.entities.find((entity) => entity.entitySlug === characterSlug);
  const factionSummary = editorList.entities.find((entity) => entity.entitySlug === factionSlug);
  const eventSummary = editorList.entities.find((entity) => entity.entitySlug === eventSlug);

  assert.ok(characterSummary);
  assert.ok(factionSummary);
  assert.ok(eventSummary);
  assert.equal(characterSummary?.latestDraft.revisionId, characterDraftRevisionId);
  assert.equal(characterSummary?.latestDraft.version, 2);
  assert.equal(characterSummary?.latestDraft.createdBy.email, editorEmail);
  assert.equal(characterSummary?.releaseSummary.includedInReleaseCount, 2);
  assert.equal(characterSummary?.releaseSummary.draftMatchesActiveRelease, false);
  assert.equal(characterSummary?.releaseSummary.activeRelease?.releaseSlug, activeReleaseSlug);
  assert.equal(characterSummary?.releaseSummary.activeRelease?.revisionId, characterPublishedRevisionId);
  assert.equal(characterSummary?.releaseSummary.latestRelease?.releaseSlug, draftReleaseSlug);
  assert.equal(characterSummary?.releaseSummary.latestRelease?.releaseStatus, "DRAFT");
  assert.equal(characterSummary?.releaseSummary.latestRelease?.revisionId, characterDraftRevisionId);
  assert.equal(factionSummary?.releaseSummary.includedInReleaseCount, 0);
  assert.equal(factionSummary?.releaseSummary.activeRelease, null);
  assert.equal(factionSummary?.releaseSummary.latestRelease, null);
  assert.equal(eventSummary?.releaseSummary.draftMatchesActiveRelease, true);
  assert.equal(eventSummary?.releaseSummary.activeRelease?.revisionId, eventRevisionId);

  const authorAdminDetail = await ensureOk<AdminEntityDetailResponse>(
    await fetch(`${apiBaseUrl}/admin/entities/CHARACTER/${characterSlug}`, {
      headers: {
        cookie: authorAdminCookie
      }
    })
  );

  assert.equal(authorAdminDetail.entitySlug, characterSlug);
  assert.equal(authorAdminDetail.entityType, "CHARACTER");
  assert.equal(authorAdminDetail.latestDraft.revisionId, characterDraftRevisionId);
  assert.equal(authorAdminDetail.latestDraft.version, 2);
  assert.equal(
    authorAdminDetail.latestDraft.summary,
    "Updated draft summary that should stay distinct from the active release."
  );
  assert.equal(authorAdminDetail.latestDraft.visibility, "RESTRICTED");
  assert.equal(authorAdminDetail.latestDraft.payload.note, "editor-draft");
  assert.equal(authorAdminDetail.releaseSummary.activeRelease?.revisionId, characterPublishedRevisionId);
  assert.equal(authorAdminDetail.releaseSummary.latestRelease?.revisionId, characterDraftRevisionId);
  assert.equal(authorAdminDetail.releaseSummary.draftMatchesActiveRelease, false);

  const characterHistory = await ensureOk<AdminEntityHistoryResponse>(
    await fetch(`${apiBaseUrl}/admin/entities/CHARACTER/${characterSlug}/history`, {
      headers: {
        cookie: authorAdminCookie
      }
    })
  );

  assert.equal(characterHistory.entitySlug, characterSlug);
  assert.equal(characterHistory.entityType, "CHARACTER");
  assert.equal(characterHistory.latestDraftRevisionId, characterDraftRevisionId);
  assert.equal(characterHistory.activeReleaseRevisionId, characterPublishedRevisionId);
  assert.equal(characterHistory.revisionSummaries.length, 2);
  assert.equal(characterHistory.revisionSummaries[0]?.revisionId, characterDraftRevisionId);
  assert.equal(characterHistory.revisionSummaries[0]?.releaseSummary.includedInReleaseCount, 1);
  assert.equal(characterHistory.revisionSummaries[0]?.releaseSummary.includedInActiveRelease, false);
  assert.equal(characterHistory.revisionSummaries[0]?.releaseSummary.latestRelease?.releaseSlug, draftReleaseSlug);
  assert.equal(characterHistory.revisionSummaries[1]?.revisionId, characterPublishedRevisionId);
  assert.equal(characterHistory.revisionSummaries[1]?.releaseSummary.includedInReleaseCount, 1);
  assert.equal(characterHistory.revisionSummaries[1]?.releaseSummary.includedInActiveRelease, true);
  assert.equal(characterHistory.revisionSummaries[1]?.releaseSummary.latestRelease?.releaseSlug, activeReleaseSlug);

  const publicResponse = await fetch(`${apiBaseUrl}/admin/entities`, {
    headers: {
      cookie: publicCookie
    }
  });

  assert.equal(publicResponse.status, 403);
  assert.match(await publicResponse.text(), /Insufficient role for this action/);
});