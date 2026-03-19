import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";

import { createApp } from "../apps/api/src/app/createApp.js";
import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { releaseRepository } from "../apps/api/src/repositories/releaseRepository.js";
import { phase0FixtureConfig } from "../scripts/phase0FixtureConfig.js";

type PublicCodexTimelineResponse = {
  releaseSlug: string | null;
  items: Array<{
    releaseSlug: string;
    entityType: "EVENT";
    slug: string;
    name: string;
    summary: string;
    visibility: string;
    metadata: {
      spoilerTier: string;
      tags: string[];
      timelineAnchor: {
        timelineEraSlug: string | null;
        anchorLabel: string;
        sortKey: string | null;
      } | null;
    };
    timelineAnchor: {
      timelineEraSlug: string | null;
      anchorLabel: string;
      sortKey: string;
    };
    version: number;
    detailPath: string;
    detailHref: string;
  }>;
};

const app = createApp();
const server = createServer(app);
const timestamp = Date.now();

const archivedReleaseSlug = `public-codex-timeline-archived-${timestamp}`;
const activeReleaseSlug = `public-codex-timeline-active-${timestamp}`;
const draftReleaseSlug = `public-codex-timeline-draft-${timestamp}`;

const eligibleEarlySlug = `public-codex-timeline-eligible-early-${timestamp}`;
const eligibleAlphaSlug = `public-codex-timeline-eligible-alpha-${timestamp}`;
const eligibleZuluSlug = `public-codex-timeline-eligible-zulu-${timestamp}`;
const eligibleBetaSlug = `public-codex-timeline-eligible-beta-${timestamp}`;
const missingAnchorSlug = `public-codex-timeline-missing-anchor-${timestamp}`;
const nullSortKeySlug = `public-codex-timeline-null-sort-${timestamp}`;
const restrictedSlug = `public-codex-timeline-restricted-${timestamp}`;
const retiredSlug = `public-codex-timeline-retired-${timestamp}`;
const locationSlug = `public-codex-timeline-location-${timestamp}`;

let apiBaseUrl = "";
let authorId = "";

const ensureOk = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Request failed with ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
};

const buildTimelineUrl = (input?: { releaseSlug?: string; limit?: number }): string => {
  const url = new URL("/codex/timeline/events", apiBaseUrl);

  if (input?.releaseSlug !== undefined) {
    url.searchParams.set("releaseSlug", input.releaseSlug);
  }

  if (input?.limit !== undefined) {
    url.searchParams.set("limit", String(input.limit));
  }

  return url.toString();
};

const createRevision = async (input: {
  entityId: string;
  name: string;
  summary: string;
  visibility?: Visibility;
  timelineAnchor?: {
    timelineEraSlug?: string | null;
    anchorLabel: string;
    sortKey?: string | null;
  } | null;
}) => {
  const latestRevision = await prismaClient.entityRevision.findFirst({
    where: {
      entityId: input.entityId
    },
    orderBy: {
      version: "desc"
    },
    select: {
      version: true
    }
  });

  return prismaClient.entityRevision.create({
    data: {
      entityId: input.entityId,
      createdById: authorId,
      version: (latestRevision?.version ?? 0) + 1,
      name: input.name,
      summary: input.summary,
      visibility: input.visibility ?? Visibility.PUBLIC,
      payload: {
        name: input.name,
        summary: input.summary,
        visibility: input.visibility ?? Visibility.PUBLIC,
        metadata:
          input.timelineAnchor === undefined
            ? {}
            : {
                timelineAnchor: input.timelineAnchor
              }
      }
    }
  });
};

before(async () => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Unable to determine test server address");
  }

  apiBaseUrl = `http://127.0.0.1:${address.port}`;

  const authorPasswordHash = await passwordHasher.hashPassword(phase0FixtureConfig.authorAdmin.password);
  const author = await prismaClient.user.upsert({
    where: {
      email: phase0FixtureConfig.authorAdmin.email
    },
    update: {
      displayName: phase0FixtureConfig.authorAdmin.displayName,
      passwordHash: authorPasswordHash,
      role: Role.AUTHOR_ADMIN
    },
    create: {
      email: phase0FixtureConfig.authorAdmin.email,
      displayName: phase0FixtureConfig.authorAdmin.displayName,
      passwordHash: authorPasswordHash,
      role: Role.AUTHOR_ADMIN
    }
  });

  authorId = author.id;

  const [
    eligibleEarly,
    eligibleAlpha,
    eligibleZulu,
    eligibleBeta,
    missingAnchor,
    nullSortKey,
    restricted,
    retired,
    location
  ] = await Promise.all([
    prismaClient.entity.create({ data: { slug: eligibleEarlySlug, type: "EVENT" } }),
    prismaClient.entity.create({ data: { slug: eligibleAlphaSlug, type: "EVENT" } }),
    prismaClient.entity.create({ data: { slug: eligibleZuluSlug, type: "EVENT" } }),
    prismaClient.entity.create({ data: { slug: eligibleBetaSlug, type: "EVENT" } }),
    prismaClient.entity.create({ data: { slug: missingAnchorSlug, type: "EVENT" } }),
    prismaClient.entity.create({ data: { slug: nullSortKeySlug, type: "EVENT" } }),
    prismaClient.entity.create({ data: { slug: restrictedSlug, type: "EVENT" } }),
    prismaClient.entity.create({ data: { slug: retiredSlug, type: "EVENT" } }),
    prismaClient.entity.create({ data: { slug: locationSlug, type: "LOCATION" } })
  ]);

  await prismaClient.entity.update({
    where: {
      id: retired.id
    },
    data: {
      retiredAt: new Date()
    }
  });

  const archivedEventRevision = await createRevision({
    entityId: eligibleEarly.id,
    name: "Archived Timeline Event",
    summary: "Archived timeline summary",
    timelineAnchor: {
      timelineEraSlug: null,
      anchorLabel: "Archived anchor",
      sortKey: "0010.000"
    }
  });

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: archivedReleaseSlug,
    name: "Public Codex Timeline Archived"
  });

  await releaseRepository.includeRevision({
    releaseSlug: archivedReleaseSlug,
    entitySlug: eligibleEarlySlug,
    revisionId: archivedEventRevision.id
  });

  await releaseRepository.activateRelease(archivedReleaseSlug);

  const [
    activeEarly,
    activeAlpha,
    activeZulu,
    activeBeta,
    activeMissingAnchor,
    activeNullSortKey,
    activeRestricted,
    activeRetired,
    activeLocation
  ] = await Promise.all([
    createRevision({
      entityId: eligibleEarly.id,
      name: "Prelude Event",
      summary: "Chronology baseline earliest",
      timelineAnchor: {
        timelineEraSlug: null,
        anchorLabel: "Prelude anchor",
        sortKey: "0001.000"
      }
    }),
    createRevision({
      entityId: eligibleAlpha.id,
      name: "Aurora Event",
      summary: "Chronology tie on sort key and name",
      timelineAnchor: {
        timelineEraSlug: null,
        anchorLabel: "Aurora alpha anchor",
        sortKey: "0100.100"
      }
    }),
    createRevision({
      entityId: eligibleZulu.id,
      name: "Aurora Event",
      summary: "Chronology tie on sort key and name with slug fallback",
      timelineAnchor: {
        timelineEraSlug: null,
        anchorLabel: "Aurora zulu anchor",
        sortKey: "0100.100"
      }
    }),
    createRevision({
      entityId: eligibleBeta.id,
      name: "Beacon Event",
      summary: "Chronology tie on sort key with name fallback",
      timelineAnchor: {
        timelineEraSlug: null,
        anchorLabel: "Beacon anchor",
        sortKey: "0100.100"
      }
    }),
    createRevision({
      entityId: missingAnchor.id,
      name: "No Anchor Event",
      summary: "Should be excluded for missing timeline anchor"
    }),
    createRevision({
      entityId: nullSortKey.id,
      name: "Null Sort Key Event",
      summary: "Should be excluded for null sort key",
      timelineAnchor: {
        timelineEraSlug: null,
        anchorLabel: "Null sort anchor",
        sortKey: null
      }
    }),
    createRevision({
      entityId: restricted.id,
      name: "Restricted Event",
      summary: "Should be excluded by visibility",
      visibility: Visibility.RESTRICTED,
      timelineAnchor: {
        timelineEraSlug: null,
        anchorLabel: "Restricted anchor",
        sortKey: "0000.500"
      }
    }),
    createRevision({
      entityId: retired.id,
      name: "Retired Event",
      summary: "Should be excluded by retirement",
      timelineAnchor: {
        timelineEraSlug: null,
        anchorLabel: "Retired anchor",
        sortKey: "0000.750"
      }
    }),
    createRevision({
      entityId: location.id,
      name: "Timeline Location",
      summary: "Should be excluded because timeline feed is event-only"
    })
  ]);

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: activeReleaseSlug,
    name: "Public Codex Timeline Active"
  });

  await releaseRepository.includeRevision({
    releaseSlug: activeReleaseSlug,
    entitySlug: eligibleEarlySlug,
    revisionId: activeEarly.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: activeReleaseSlug,
    entitySlug: eligibleAlphaSlug,
    revisionId: activeAlpha.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: activeReleaseSlug,
    entitySlug: eligibleZuluSlug,
    revisionId: activeZulu.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: activeReleaseSlug,
    entitySlug: eligibleBetaSlug,
    revisionId: activeBeta.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: activeReleaseSlug,
    entitySlug: missingAnchorSlug,
    revisionId: activeMissingAnchor.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: activeReleaseSlug,
    entitySlug: nullSortKeySlug,
    revisionId: activeNullSortKey.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: activeReleaseSlug,
    entitySlug: restrictedSlug,
    revisionId: activeRestricted.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: activeReleaseSlug,
    entitySlug: retiredSlug,
    revisionId: activeRetired.id
  });
  await releaseRepository.includeRevision({
    releaseSlug: activeReleaseSlug,
    entitySlug: locationSlug,
    revisionId: activeLocation.id
  });

  await releaseRepository.activateRelease(activeReleaseSlug);

  const draftEventRevision = await createRevision({
    entityId: eligibleAlpha.id,
    name: "Draft Timeline Event",
    summary: "Draft release should not be selectable",
    timelineAnchor: {
      timelineEraSlug: null,
      anchorLabel: "Draft anchor",
      sortKey: "9999.999"
    }
  });

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: draftReleaseSlug,
    name: "Public Codex Timeline Draft"
  });

  await releaseRepository.includeRevision({
    releaseSlug: draftReleaseSlug,
    entitySlug: eligibleAlphaSlug,
    revisionId: draftEventRevision.id
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

  await prismaClient.releaseEntry.deleteMany({
    where: {
      release: {
        slug: {
          in: [archivedReleaseSlug, activeReleaseSlug, draftReleaseSlug]
        }
      }
    }
  });

  await prismaClient.release.deleteMany({
    where: {
      slug: {
        in: [archivedReleaseSlug, activeReleaseSlug, draftReleaseSlug]
      }
    }
  });

  await prismaClient.entityRevision.deleteMany({
    where: {
      entity: {
        slug: {
          in: [
            eligibleEarlySlug,
            eligibleAlphaSlug,
            eligibleZuluSlug,
            eligibleBetaSlug,
            missingAnchorSlug,
            nullSortKeySlug,
            restrictedSlug,
            retiredSlug,
            locationSlug
          ]
        }
      }
    }
  });

  await prismaClient.entity.deleteMany({
    where: {
      slug: {
        in: [
          eligibleEarlySlug,
          eligibleAlphaSlug,
          eligibleZuluSlug,
          eligibleBetaSlug,
          missingAnchorSlug,
          nullSortKeySlug,
          restrictedSlug,
          retiredSlug,
          locationSlug
        ]
      }
    }
  });

  await prismaClient.$disconnect();
});

test("public codex timeline event feed falls back to active release and applies chronology ordering with stable tie-breakers", async () => {
  const timeline = await ensureOk<PublicCodexTimelineResponse>(await fetch(buildTimelineUrl({ limit: 3 })));

  assert.equal(timeline.releaseSlug, activeReleaseSlug);
  assert.equal(timeline.items.length, 3);

  assert.deepEqual(
    timeline.items.map((item) => ({
      slug: item.slug,
      name: item.name,
      sortKey: item.timelineAnchor.sortKey,
      detailPath: item.detailPath,
      detailHref: item.detailHref
    })),
    [
      {
        slug: eligibleEarlySlug,
        name: "Prelude Event",
        sortKey: "0001.000",
        detailPath: `/events/${eligibleEarlySlug}`,
        detailHref: `/events/${eligibleEarlySlug}`
      },
      {
        slug: eligibleAlphaSlug,
        name: "Aurora Event",
        sortKey: "0100.100",
        detailPath: `/events/${eligibleAlphaSlug}`,
        detailHref: `/events/${eligibleAlphaSlug}`
      },
      {
        slug: eligibleZuluSlug,
        name: "Aurora Event",
        sortKey: "0100.100",
        detailPath: `/events/${eligibleZuluSlug}`,
        detailHref: `/events/${eligibleZuluSlug}`
      }
    ]
  );

  assert.equal(timeline.items.every((item) => item.entityType === "EVENT"), true);
  assert.equal(timeline.items.every((item) => item.visibility === "PUBLIC"), true);
  assert.equal(timeline.items.every((item) => item.metadata.timelineAnchor !== null), true);
  assert.equal(timeline.items.every((item) => item.timelineAnchor.sortKey.length > 0), true);
  assert.equal(timeline.items.some((item) => item.slug === missingAnchorSlug), false);
  assert.equal(timeline.items.some((item) => item.slug === nullSortKeySlug), false);
  assert.equal(timeline.items.some((item) => item.slug === restrictedSlug), false);
  assert.equal(timeline.items.some((item) => item.slug === retiredSlug), false);
  assert.equal(timeline.items.some((item) => item.slug === locationSlug), false);
});

test("public codex timeline event feed supports archived release selection with release-aware navigation fields", async () => {
  const archivedTimeline = await ensureOk<PublicCodexTimelineResponse>(
    await fetch(buildTimelineUrl({ releaseSlug: archivedReleaseSlug }))
  );

  assert.equal(archivedTimeline.releaseSlug, archivedReleaseSlug);
  assert.equal(archivedTimeline.items.length, 1);

  assert.deepEqual(archivedTimeline.items[0], {
    releaseSlug: archivedReleaseSlug,
    entityType: "EVENT",
    slug: eligibleEarlySlug,
    name: "Archived Timeline Event",
    summary: "Archived timeline summary",
    visibility: "PUBLIC",
    metadata: {
      spoilerTier: "NONE",
      tags: [],
      timelineAnchor: {
        timelineEraSlug: null,
        anchorLabel: "Archived anchor",
        sortKey: "0010.000"
      }
    },
    timelineAnchor: {
      timelineEraSlug: null,
      anchorLabel: "Archived anchor",
      sortKey: "0010.000"
    },
    version: 1,
    detailPath: `/events/${eligibleEarlySlug}`,
    detailHref: `/events/${eligibleEarlySlug}?releaseSlug=${encodeURIComponent(archivedReleaseSlug)}`
  });
});

test("public codex timeline event feed returns leak-safe 404s for draft and unknown release selectors", async () => {
  const [draftReleaseResponse, unknownReleaseResponse] = await Promise.all([
    fetch(buildTimelineUrl({ releaseSlug: draftReleaseSlug })),
    fetch(buildTimelineUrl({ releaseSlug: `missing-codex-timeline-release-${timestamp}` }))
  ]);

  assert.equal(draftReleaseResponse.status, 404);
  assert.equal(unknownReleaseResponse.status, 404);
});
