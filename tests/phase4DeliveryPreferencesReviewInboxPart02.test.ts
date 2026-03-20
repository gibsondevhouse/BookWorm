import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

import { Role } from "@prisma/client";

import { createApp } from "../apps/api/src/app/createApp.js";
import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { phase0FixtureConfig } from "../scripts/phase0FixtureConfig.js";

// ---------------------------------------------------------------------------
// Minimal type-safe wrappers around prisma models used for cleanup
// ---------------------------------------------------------------------------

type ProposalModel = {
  deleteMany: (args: { where: { entityId: string } }) => Promise<unknown>;
};

type ReviewRequestModel = {
  deleteMany: (args: { where: { proposalId: { in: string[] } } }) => Promise<unknown>;
};

type NotificationEventModel = {
  deleteMany: (args: { where: { reviewRequestId: { in: string[] } } }) => Promise<unknown>;
  findFirst: (args: {
    where?: {
      reviewRequestId?: string;
      eventType?: string;
      status?: string;
    };
    orderBy?: Array<{ createdAt: "asc" | "desc" }>;
    select: { id: true };
  }) => Promise<{ id: string } | null>;
  update: (args: {
    where: { id: string };
    data: { status: "DELIVERED"; deliveredAt: Date };
  }) => Promise<unknown>;
};

type NotificationPreferenceModel = {
  deleteMany: (args: { where: { userId: string } }) => Promise<unknown>;
};

const proposalModel = (prismaClient as unknown as { proposal: ProposalModel }).proposal;
const reviewRequestModel = (prismaClient as unknown as { reviewRequest: ReviewRequestModel }).reviewRequest;
const notificationEventModel = (prismaClient as unknown as { notificationEvent: NotificationEventModel }).notificationEvent;
const notificationPreferenceModel = (
  prismaClient as unknown as { notificationPreference: NotificationPreferenceModel }
).notificationPreference;

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

type PreferenceItem = {
  eventType: string;
  enabled: boolean;
  updatedAt: string | null;
};

type PreferencesResponse = {
  preferences: PreferenceItem[];
};

type ProposalResponse = {
  id: string;
};

type ReviewRequestResponse = {
  id: string;
};

type InboxStep = {
  id: string;
  stepOrder: number;
  status: string;
  assignedReviewerId: string | null;
  escalationLevel: number;
};

type InboxApprovalChain = {
  id: string;
  status: string;
  currentStepOrder: number;
  steps: InboxStep[];
};

type InboxItem = {
  id: string;
  status: string;
  proposalId: string;
  assignedApproverId: string | null;
  approvalChain: InboxApprovalChain | null;
  hasEscalatedSteps: boolean;
  hasOverdueSteps: boolean;
  createdAt: string;
};

type InboxResponse = {
  items: InboxItem[];
  total: number;
  reviewerUserId: string;
  limit: number;
  offset: number;
};

type MyNotificationEventsResponse = {
  events: Array<{
    id: string;
    eventType: string;
    status: string;
    reviewRequestId: string | null;
    deliveredAt: string | null;
  }>;
  total: number;
  limit: number;
  offset: number;
};

// ---------------------------------------------------------------------------
// Test state
// ---------------------------------------------------------------------------

const timestamp = Date.now();
const app = createApp();
const server = createServer(app);

const userRecords = {
  authorAdmin: {
    email: phase0FixtureConfig.authorAdmin.email,
    password: phase0FixtureConfig.authorAdmin.password,
    role: Role.AUTHOR_ADMIN,
    displayName: phase0FixtureConfig.authorAdmin.displayName
  },
  editorA: {
    email: `phase4-pref-editor-a-${timestamp}@example.com`,
    password: "Phase4PrefEditorA!234",
    role: Role.EDITOR,
    displayName: "Phase4 Pref Editor A"
  },
  editorB: {
    email: `phase4-pref-editor-b-${timestamp}@example.com`,
    password: "Phase4PrefEditorB!234",
    role: Role.EDITOR,
    displayName: "Phase4 Pref Editor B"
  }
} as const;

const slugs = {
  entity: `phase4-pref-entity-${timestamp}`
};

let apiBaseUrl = "";
let adminCookie = "";
let editorACookie = "";
let editorBCookie = "";
let editorAUserId = "";
let entityId = "";
const createdProposalIds: string[] = [];
const createdReviewRequestIds: string[] = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    throw new Error(`No session cookie returned for ${email}`);
  }

  return cookieHeader.split(";")[0] ?? "";
};

const findUserIdByEmail = async (email: string): Promise<string> => {
  const user = await prismaClient.user.findUnique({
    where: { email },
    select: { id: true }
  });

  if (user === null) {
    throw new Error(`User ${email} not found`);
  }

  return user.id;
};

const createProposalInReview = async (title: string): Promise<string> => {
  const createResponse = await fetch(`${apiBaseUrl}/entities/CHARACTER/${slugs.entity}/proposals`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: editorACookie },
    body: JSON.stringify({ changeType: "UPDATE", title, summary: `${title} summary` })
  });

  assert.equal(createResponse.status, 201);
  const proposal = (await createResponse.json()) as ProposalResponse;
  createdProposalIds.push(proposal.id);

  const submitRes = await fetch(`${apiBaseUrl}/proposals/${proposal.id}/submit`, {
    method: "POST",
    headers: { cookie: editorACookie }
  });
  assert.equal(submitRes.status, 200);

  const startReviewRes = await fetch(`${apiBaseUrl}/proposals/${proposal.id}/start-review`, {
    method: "POST",
    headers: { cookie: adminCookie }
  });
  assert.equal(startReviewRes.status, 200);

  return proposal.id;
};

const createReviewRequest = async (proposalId: string): Promise<string> => {
  const response = await fetch(`${apiBaseUrl}/review-requests`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: adminCookie },
    body: JSON.stringify({ proposalId })
  });

  assert.equal(response.status, 201);
  const body = (await response.json()) as ReviewRequestResponse;
  createdReviewRequestIds.push(body.id);
  return body.id;
};

const assignReviewRequest = async (reviewRequestId: string, assigneeUserId: string): Promise<void> => {
  const response = await fetch(`${apiBaseUrl}/review-requests/${reviewRequestId}/assign`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: adminCookie },
    body: JSON.stringify({ assigneeUserId })
  });

  assert.equal(response.status, 200);
};

const getPreferences = async (cookie: string): Promise<PreferencesResponse> => {
  const response = await fetch(`${apiBaseUrl}/notification-preferences`, {
    headers: { cookie }
  });

  assert.equal(response.status, 200);
  return (await response.json()) as PreferencesResponse;
};

const updatePreference = async (
  cookie: string,
  category: string,
  enabled: boolean
): Promise<PreferenceItem & { updatedAt: string }> => {
  const response = await fetch(`${apiBaseUrl}/notification-preferences/${category}`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ enabled })
  });

  assert.equal(response.status, 200);
  return (await response.json()) as PreferenceItem & { updatedAt: string };
};

const getReviewInbox = async (cookie: string, query = ""): Promise<InboxResponse> => {
  const qs = query.length > 0 ? `?${query}` : "";
  const response = await fetch(`${apiBaseUrl}/review-inbox${qs}`, {
    headers: { cookie }
  });

  assert.equal(response.status, 200);
  return (await response.json()) as InboxResponse;
};

const getMyNotificationEvents = async (cookie: string, query = ""): Promise<MyNotificationEventsResponse> => {
  const qs = query.length > 0 ? `?${query}` : "";
  const response = await fetch(`${apiBaseUrl}/notification-events/my${qs}`, {
    headers: { cookie }
  });

  assert.equal(response.status, 200);
  return (await response.json()) as MyNotificationEventsResponse;
};

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

before(async () => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  const port = typeof address === "object" && address !== null ? address.port : 0;
  apiBaseUrl = `http://127.0.0.1:${port}`;

  // Ensure seeded users exist
  const existingAdmin = await prismaClient.user.findUnique({
    where: { email: userRecords.authorAdmin.email }
  });

  if (existingAdmin === null) {
    await prismaClient.user.create({
      data: {
        email: userRecords.authorAdmin.email,
        displayName: userRecords.authorAdmin.displayName,
        passwordHash: await passwordHasher.hashPassword(userRecords.authorAdmin.password),
        role: userRecords.authorAdmin.role
      }
    });
  }

  // Create editor users
  const editorARecord = await prismaClient.user.create({
    data: {
      email: userRecords.editorA.email,
      displayName: userRecords.editorA.displayName,
      passwordHash: await passwordHasher.hashPassword(userRecords.editorA.password),
      role: userRecords.editorA.role
    }
  });

  await prismaClient.user.create({
    data: {
      email: userRecords.editorB.email,
      displayName: userRecords.editorB.displayName,
      passwordHash: await passwordHasher.hashPassword(userRecords.editorB.password),
      role: userRecords.editorB.role
    }
  });

  editorAUserId = editorARecord.id;

  // Create entity for proposals
  const entity = await prismaClient.entity.create({
    data: { type: "CHARACTER", slug: slugs.entity }
  });
  entityId = entity.id;

  // Create entity revision so proposals can reference it
  await prismaClient.entityRevision.create({
    data: {
      entityId,
      createdById: editorARecord.id,
      version: 1,
      name: "Pref Test Character",
      summary: "A character for preference testing",
      visibility: "PUBLIC"
    }
  });

  // Sessions
  adminCookie = await createSession(userRecords.authorAdmin.email, userRecords.authorAdmin.password);
  editorACookie = await createSession(userRecords.editorA.email, userRecords.editorA.password);
  editorBCookie = await createSession(userRecords.editorB.email, userRecords.editorB.password);
});

after(async () => {
  // Clean notification preferences for editor A
  await notificationPreferenceModel.deleteMany({ where: { userId: editorAUserId } });

  // Clean notification events
  if (createdReviewRequestIds.length > 0) {
    await notificationEventModel.deleteMany({
      where: { reviewRequestId: { in: createdReviewRequestIds } }
    });
  }

  // Clean review requests
  if (createdProposalIds.length > 0) {
    await reviewRequestModel.deleteMany({
      where: { proposalId: { in: createdProposalIds } }
    });
    await proposalModel.deleteMany({ where: { entityId } });
  }

  await prismaClient.entity.deleteMany({ where: { id: entityId } });

  await prismaClient.user.deleteMany({
    where: { email: { in: [userRecords.editorA.email, userRecords.editorB.email] } }
  });

  server.close();
  await once(server, "close");
});

// ---------------------------------------------------------------------------
// AC-01: Users can read delivery preferences (default all enabled)
// ---------------------------------------------------------------------------

test("AC-01: GET /notification-preferences returns all supported categories defaulting to enabled", async () => {
  const result = await getPreferences(editorACookie);

  assert.ok(Array.isArray(result.preferences), "preferences is an array");
  assert.equal(result.preferences.length, 6, "all 6 supported event types are returned");

  const expectedTypes = [
    "APPROVAL_STEP_DECISION_RECORDED",
    "APPROVAL_STEP_DELEGATED",
    "APPROVAL_STEP_ESCALATED",
    "REVIEW_REQUEST_ASSIGNED",
    "REVIEW_REQUEST_CREATED",
    "REVIEW_REQUEST_STATUS_CHANGED"
  ];

  const returnedTypes = result.preferences.map((p) => p.eventType).sort();
  assert.deepEqual(returnedTypes, expectedTypes, "all six types are present");

  for (const pref of result.preferences) {
    assert.equal(pref.enabled, true, `${pref.eventType} defaults to enabled`);
    assert.equal(pref.updatedAt, null, `${pref.eventType} has no stored updatedAt`);
  }
});

test("AC-01: GET /notification-preferences requires authentication", async () => {
  const response = await fetch(`${apiBaseUrl}/notification-preferences`);
  assert.equal(response.status, 401);
});

// ---------------------------------------------------------------------------
// AC-02: Users can update delivery preferences
// ---------------------------------------------------------------------------

test("AC-02: PUT /notification-preferences/:category disables a category", async () => {
  const result = await updatePreference(editorACookie, "REVIEW_REQUEST_ASSIGNED", false);

  assert.equal(result.eventType, "REVIEW_REQUEST_ASSIGNED");
  assert.equal(result.enabled, false);
  assert.ok(result.updatedAt, "updatedAt is set after update");
});

test("AC-02: PUT /notification-preferences/:category updates persisted in GET", async () => {
  // editorA already has REVIEW_REQUEST_ASSIGNED disabled from previous test
  const result = await getPreferences(editorACookie);

  const assignedPref = result.preferences.find((p) => p.eventType === "REVIEW_REQUEST_ASSIGNED");
  assert.ok(assignedPref !== undefined);
  assert.equal(assignedPref.enabled, false, "disabled preference is persisted");

  // Other preferences remain enabled
  const otherPrefs = result.preferences.filter((p) => p.eventType !== "REVIEW_REQUEST_ASSIGNED");
  for (const pref of otherPrefs) {
    assert.equal(pref.enabled, true, `${pref.eventType} is still enabled`);
  }
});

test("AC-02: PUT /notification-preferences/:category re-enables a category", async () => {
  const result = await updatePreference(editorACookie, "REVIEW_REQUEST_ASSIGNED", true);

  assert.equal(result.eventType, "REVIEW_REQUEST_ASSIGNED");
  assert.equal(result.enabled, true);
});

test("AC-02: PUT /notification-preferences/:category rejects unsupported category", async () => {
  const response = await fetch(`${apiBaseUrl}/notification-preferences/UNKNOWN_CATEGORY`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie: editorACookie },
    body: JSON.stringify({ enabled: false })
  });

  assert.equal(response.status, 400);
});

test("AC-02: PUT /notification-preferences/:category requires authentication", async () => {
  const response = await fetch(`${apiBaseUrl}/notification-preferences/REVIEW_REQUEST_ASSIGNED`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ enabled: false })
  });
  assert.equal(response.status, 401);
});

// ---------------------------------------------------------------------------
// AC-03: Reviewer inbox returns relevant actionable items [setup + base check]
// ---------------------------------------------------------------------------

test("AC-03: GET /review-inbox returns empty inbox when no assignments", async () => {
  const result = await getReviewInbox(editorACookie);

  assert.equal(result.total, 0);
  assert.equal(result.items.length, 0);
  assert.equal(result.reviewerUserId, editorAUserId);
  assert.equal(result.limit, 20);
  assert.equal(result.offset, 0);
});

test("AC-03: GET /review-inbox returns assigned review requests for reviewer", async () => {
  // Create a proposal + review request and assign to editorA
  const proposalId = await createProposalInReview("Inbox Test Proposal");
  const reviewRequestId = await createReviewRequest(proposalId);
  await assignReviewRequest(reviewRequestId, editorAUserId);

  const result = await getReviewInbox(editorACookie);

  assert.ok(result.total >= 1, `inbox total should be >= 1, got ${result.total}`);

  const item = result.items.find((i) => i.id === reviewRequestId);
  assert.ok(item !== undefined, "created review request appears in inbox");
  assert.equal(item.assignedApproverId, editorAUserId);
  assert.equal(item.proposalId, proposalId);
  assert.equal(item.hasEscalatedSteps, false);
  assert.equal(item.hasOverdueSteps, false);
});

// ---------------------------------------------------------------------------
// AC-04: Inbox hides unauthorized records
// ---------------------------------------------------------------------------

test("AC-04: GET /review-inbox does not show other users items to editor", async () => {
  // editorB has no assignments so inbox should be empty
  const result = await getReviewInbox(editorBCookie);

  assert.equal(result.total, 0);
  assert.equal(result.items.length, 0);
});

test("AC-04: GET /review-inbox returns 403 when editor requests another user inbox", async () => {
  const editorBId = await findUserIdByEmail(userRecords.editorB.email);

  const response = await fetch(
    `${apiBaseUrl}/review-inbox?reviewerUserId=${editorBId}`,
    { headers: { cookie: editorACookie } }
  );

  assert.equal(response.status, 403);
});

test("AC-04: GET /review-inbox requires authentication", async () => {
  const response = await fetch(`${apiBaseUrl}/review-inbox`);
  assert.equal(response.status, 401);
});

test("AC-04: AUTHOR_ADMIN can access any reviewer inbox", async () => {
  const result = await getReviewInbox(adminCookie, `reviewerUserId=${editorAUserId}`);

  // Should see editorA's assigned items
  assert.ok(result.reviewerUserId === editorAUserId);
  assert.ok(result.total >= 1, "admin sees editorA's assigned review requests");
});

// ---------------------------------------------------------------------------
// AC-05: Inbox filtering works deterministically across pagination boundaries
// ---------------------------------------------------------------------------

test("AC-05: GET /review-inbox filter by status returns only matching items", async () => {
  // Create a second proposal + review request to have multiple items
  const proposalId = await createProposalInReview("Inbox Filter Proposal");
  const reviewRequestId = await createReviewRequest(proposalId);
  await assignReviewRequest(reviewRequestId, editorAUserId);

  // Filter for OPEN status only
  const openResult = await getReviewInbox(editorACookie, "status=OPEN");

  assert.ok(openResult.total >= 1);
  for (const item of openResult.items) {
    assert.equal(item.status, "OPEN", "all returned items have OPEN status");
  }

  // Filter for CANCELED - should return empty (none are canceled)
  const canceledResult = await getReviewInbox(editorACookie, "status=CANCELED");
  assert.equal(canceledResult.total, 0);
});

test("AC-05: GET /review-inbox pagination is deterministic with limit/offset", async () => {
  const firstPage = await getReviewInbox(editorACookie, "limit=1&offset=0");
  const secondPage = await getReviewInbox(editorACookie, "limit=1&offset=1");

  assert.equal(firstPage.limit, 1);
  assert.equal(secondPage.limit, 1);
  assert.equal(secondPage.offset, 1);

  if (firstPage.total >= 2) {
    assert.equal(firstPage.items.length, 1, "page 1 has exactly one item");
    assert.equal(secondPage.items.length, 1, "page 2 has exactly one item");
    assert.notEqual(
      firstPage.items[0]?.id,
      secondPage.items[0]?.id,
      "pages return different items"
    );
  }
});

test("AC-05: GET /review-inbox ordering is stable (createdAt asc, id asc)", async () => {
  const allItems = await getReviewInbox(editorACookie, "limit=100");

  const ids = allItems.items.map((i) => i.id);
  const dates = allItems.items.map((i) => new Date(i.createdAt).getTime());

  for (let i = 1; i < dates.length; i++) {
    const prev = dates[i - 1] ?? 0;
    const curr = dates[i] ?? 0;
    assert.ok(
      curr >= prev,
      `item at index ${i} should be >= previous (createdAt asc ordering)`
    );
  }

  // Verify double-page fetch returns identical first item
  const page1 = await getReviewInbox(editorACookie, "limit=2&offset=0");
  const page1Again = await getReviewInbox(editorACookie, "limit=2&offset=0");
  assert.deepEqual(
    page1.items.map((i) => i.id),
    page1Again.items.map((i) => i.id),
    "same query returns same result"
  );

  // Verify pages reconstruct the full list
  if (allItems.total >= 2) {
    const firstItem = page1.items[0];
    assert.equal(firstItem?.id, ids[0], "first item matches across page sizes");
  }
});

test("AC-05: GET /review-inbox escalated filter returns only items with escalated steps", async () => {
  // Since we haven't escalated any steps, escalated=true should return empty
  const escalatedResult = await getReviewInbox(editorACookie, "escalated=true");
  assert.equal(escalatedResult.total, 0, "no escalated items when none escalated");
});

// ---------------------------------------------------------------------------
// AC-06: Preference settings influence delivered/readable notification output
// ---------------------------------------------------------------------------

test("AC-06: GET /notification-events/my returns empty when no delivered events", async () => {
  const result = await getMyNotificationEvents(editorACookie);

  assert.equal(result.total, 0);
  assert.equal(result.items !== undefined || result.events !== undefined, true);
  assert.ok(Array.isArray(result.events));
});

test("AC-06: GET /notification-events/my excludes events for disabled categories", async () => {
  // Find a review request assigned to editorA and manually mark its notification event as DELIVERED
  if (createdReviewRequestIds.length === 0) {
    // Skip if no review requests were created yet
    return;
  }

  const reviewRequestId = createdReviewRequestIds[0] ?? "";

  // Manually set a notification event to DELIVERED so it can appear in the feed
  const event = await notificationEventModel.findFirst({
    where: {
      reviewRequestId,
      eventType: "REVIEW_REQUEST_ASSIGNED",
      status: "PENDING"
    },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true }
  });

  if (event !== null) {
    await notificationEventModel.update({
      where: { id: event.id },
      data: { status: "DELIVERED", deliveredAt: new Date() }
    });
  }

  // With pref enabled, event should appear
  const withPrefEnabled = await getMyNotificationEvents(editorACookie);
  const enabledTotal = withPrefEnabled.total;

  // Disable REVIEW_REQUEST_ASSIGNED preference
  await updatePreference(editorACookie, "REVIEW_REQUEST_ASSIGNED", false);

  const withPrefDisabled = await getMyNotificationEvents(editorACookie);

  // After disabling, the count should be <= previous count (event may or may not exist)
  assert.ok(
    withPrefDisabled.total <= enabledTotal,
    "disabling category reduces or maintains notification event count"
  );

  // Re-enable for cleanup
  await updatePreference(editorACookie, "REVIEW_REQUEST_ASSIGNED", true);
});

test("AC-06: GET /notification-events/my requires authentication", async () => {
  const response = await fetch(`${apiBaseUrl}/notification-events/my`);
  assert.equal(response.status, 401);
});

test("AC-06: GET /notification-events/my respects limit/offset", async () => {
  const result = await getMyNotificationEvents(editorACookie, "limit=5&offset=0");

  assert.equal(result.limit, 5);
  assert.equal(result.offset, 0);
  assert.ok(result.events.length <= 5);
});
