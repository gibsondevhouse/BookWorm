import type { EntityType, Prisma, ReleaseStatus, Role, Visibility } from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";
import { entityMetadataContract } from "../lib/entityMetadataContract.js";
import { entityRevisionRepository } from "./entityRevisionRepository.js";

type EntityMetadataRecord = ReturnType<(typeof entityMetadataContract)["readMetadata"]>;

type AdminEntityCreatedByRecord = {
  userId: string;
  email: string;
  displayName: string;
  role: Role;
};

type AdminEntityDraftSummaryRecord = {
  revisionId: string;
  version: number;
  name: string;
  summary: string;
  visibility: Visibility;
  metadata: EntityMetadataRecord;
  createdAt: Date;
  createdBy: AdminEntityCreatedByRecord;
};

type AdminEntityDraftDetailRecord = AdminEntityDraftSummaryRecord & {
  payload: Prisma.JsonValue | null;
};

type AdminEntityReleaseRecord = {
  releaseSlug: string;
  releaseName: string;
  releaseStatus: ReleaseStatus;
  activatedAt: Date | null;
  revisionId: string;
  version: number;
  name: string;
  summary: string;
  visibility: Visibility;
  metadata: EntityMetadataRecord;
};

type AdminEntityReleaseSummaryRecord = {
  activeRelease: AdminEntityReleaseRecord | null;
  latestRelease: AdminEntityReleaseRecord | null;
  includedInReleaseCount: number;
  draftMatchesActiveRelease: boolean;
};

type AdminEntityHistoryReleaseSummaryRecord = {
  includedInReleaseCount: number;
  includedInActiveRelease: boolean;
  latestRelease: AdminEntityReleaseRecord | null;
};

type AdminEntityListItemRecord = {
  entitySlug: string;
  entityType: EntityType;
  latestDraft: AdminEntityDraftSummaryRecord;
  releaseSummary: AdminEntityReleaseSummaryRecord;
};

type AdminEntityDetailRecord = {
  entitySlug: string;
  entityType: EntityType;
  latestDraft: AdminEntityDraftDetailRecord;
  releaseSummary: AdminEntityReleaseSummaryRecord;
};

type AdminEntityHistoryRevisionRecord = AdminEntityDraftSummaryRecord & {
  releaseSummary: AdminEntityHistoryReleaseSummaryRecord;
};

type AdminEntityHistoryRecord = {
  entitySlug: string;
  entityType: EntityType;
  latestDraftRevisionId: string;
  activeReleaseRevisionId: string | null;
  revisionSummaries: AdminEntityHistoryRevisionRecord[];
};

type ReleaseEntryRecord = {
  createdAt: Date;
  entity: {
    slug: string;
    type: EntityType;
  };
  revision: {
    id: string;
    version: number;
    name: string;
    summary: string;
    visibility: Visibility;
    payload: Prisma.JsonValue | null;
  };
  release: {
    slug: string;
    name: string;
    status: ReleaseStatus;
    activatedAt: Date | null;
    createdAt: Date;
  };
};

const releaseStatusRank: Record<ReleaseStatus, number> = {
  DRAFT: 3,
  ACTIVE: 2,
  ARCHIVED: 1
};

const selectCreatedBy = {
  id: true,
  email: true,
  displayName: true,
  role: true
} as const;

const mapCreatedBy = (createdBy: {
  id: string;
  email: string;
  displayName: string;
  role: Role;
}): AdminEntityCreatedByRecord => ({
  userId: createdBy.id,
  email: createdBy.email,
  displayName: createdBy.displayName,
  role: createdBy.role
});

const mapReleaseRecord = (entry: ReleaseEntryRecord): AdminEntityReleaseRecord => ({
  releaseSlug: entry.release.slug,
  releaseName: entry.release.name,
  releaseStatus: entry.release.status,
  activatedAt: entry.release.activatedAt,
  revisionId: entry.revision.id,
  version: entry.revision.version,
  name: entry.revision.name,
  summary: entry.revision.summary,
  visibility: entry.revision.visibility,
  metadata: entityMetadataContract.readMetadata({
    entityType: entry.entity.type,
    payload: entry.revision.payload
  })
});

const buildEntityReleaseSummary = (
  latestDraftRevisionId: string,
  releaseEntries: ReleaseEntryRecord[]
): AdminEntityReleaseSummaryRecord => {
  const activeReleaseEntry = releaseEntries.find((entry) => entry.release.status === "ACTIVE") ?? null;
  const latestReleaseEntry = releaseEntries[0] ?? null;

  return {
    activeRelease: activeReleaseEntry ? mapReleaseRecord(activeReleaseEntry) : null,
    latestRelease: latestReleaseEntry ? mapReleaseRecord(latestReleaseEntry) : null,
    includedInReleaseCount: releaseEntries.length,
    draftMatchesActiveRelease: activeReleaseEntry?.revision.id === latestDraftRevisionId
  };
};

const buildRevisionReleaseSummary = (
  releaseEntries: ReleaseEntryRecord[]
): AdminEntityHistoryReleaseSummaryRecord => {
  const activeReleaseEntry = releaseEntries.find((entry) => entry.release.status === "ACTIVE") ?? null;
  const latestReleaseEntry = releaseEntries[0] ?? null;

  return {
    includedInReleaseCount: releaseEntries.length,
    includedInActiveRelease: activeReleaseEntry !== null,
    latestRelease: latestReleaseEntry ? mapReleaseRecord(latestReleaseEntry) : null
  };
};

const listReleaseEntriesByEntitySlug = async (entitySlugs: string[]): Promise<Map<string, ReleaseEntryRecord[]>> => {
  if (entitySlugs.length === 0) {
    return new Map();
  }

  const releaseEntries = await prismaClient.releaseEntry.findMany({
    where: {
      entity: {
        slug: {
          in: entitySlugs
        }
      }
    },
    orderBy: [{ release: { createdAt: "desc" } }, { createdAt: "desc" }],
    select: {
      createdAt: true,
      entity: {
        select: {
          slug: true,
          type: true
        }
      },
      revision: {
        select: {
          id: true,
          version: true,
          name: true,
          summary: true,
          visibility: true,
          payload: true
        }
      },
      release: {
        select: {
          slug: true,
          name: true,
          status: true,
          activatedAt: true,
          createdAt: true
        }
      }
    }
  });

  releaseEntries.sort((left, right) => {
    const releaseCreatedAtDiff = right.release.createdAt.getTime() - left.release.createdAt.getTime();

    if (releaseCreatedAtDiff !== 0) {
      return releaseCreatedAtDiff;
    }

    const entryCreatedAtDiff = right.createdAt.getTime() - left.createdAt.getTime();

    if (entryCreatedAtDiff !== 0) {
      return entryCreatedAtDiff;
    }

    const statusRankDiff = releaseStatusRank[right.release.status] - releaseStatusRank[left.release.status];

    if (statusRankDiff !== 0) {
      return statusRankDiff;
    }

    return right.release.slug.localeCompare(left.release.slug);
  });

  return releaseEntries.reduce<Map<string, ReleaseEntryRecord[]>>((entriesBySlug, entry) => {
    const entries = entriesBySlug.get(entry.entity.slug) ?? [];

    entries.push(entry);
    entriesBySlug.set(entry.entity.slug, entries);
    return entriesBySlug;
  }, new Map());
};

export const entityAdminRepository = {
  async listEntities(input: { entityTypes: EntityType[] }): Promise<AdminEntityListItemRecord[]> {
    const entities = await prismaClient.entity.findMany({
      where: {
        type: {
          in: input.entityTypes
        },
        revisions: {
          some: {}
        }
      },
      orderBy: {
        slug: "asc"
      },
      select: {
        slug: true,
        type: true,
        revisions: {
          orderBy: [{ version: "desc" }, { createdAt: "desc" }],
          take: 1,
          select: {
            id: true,
            version: true,
            name: true,
            summary: true,
            visibility: true,
            payload: true,
            createdAt: true,
            createdBy: {
              select: selectCreatedBy
            }
          }
        }
      }
    });

    const releaseEntriesBySlug = await listReleaseEntriesByEntitySlug(entities.map((entity) => entity.slug));

    return entities.flatMap((entity) => {
      const latestDraft = entity.revisions[0];

      if (!latestDraft) {
        return [];
      }

      return {
        entitySlug: entity.slug,
        entityType: entity.type,
        latestDraft: {
          revisionId: latestDraft.id,
          version: latestDraft.version,
          name: latestDraft.name,
          summary: latestDraft.summary,
          visibility: latestDraft.visibility,
          metadata: entityMetadataContract.readMetadata({
            entityType: entity.type,
            payload: latestDraft.payload
          }),
          createdAt: latestDraft.createdAt,
          createdBy: mapCreatedBy(latestDraft.createdBy)
        },
        releaseSummary: buildEntityReleaseSummary(latestDraft.id, releaseEntriesBySlug.get(entity.slug) ?? [])
      };
    });
  },

  async findEntityBySlug(input: { entityType: EntityType; slug: string }): Promise<AdminEntityDetailRecord | null> {
    const latestDraft = await prismaClient.entityRevision.findFirst({
      where: {
        entity: {
          slug: input.slug,
          type: input.entityType
        }
      },
      orderBy: [{ version: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        version: true,
        name: true,
        summary: true,
        visibility: true,
        payload: true,
        createdAt: true,
        createdBy: {
          select: selectCreatedBy
        },
        entity: {
          select: {
            slug: true,
            type: true
          }
        }
      }
    });

    if (!latestDraft) {
      return null;
    }

    const releaseEntriesBySlug = await listReleaseEntriesByEntitySlug([latestDraft.entity.slug]);

    return {
      entitySlug: latestDraft.entity.slug,
      entityType: latestDraft.entity.type,
      latestDraft: {
        revisionId: latestDraft.id,
        version: latestDraft.version,
        name: latestDraft.name,
        summary: latestDraft.summary,
        visibility: latestDraft.visibility,
        metadata: entityMetadataContract.readMetadata({
          entityType: latestDraft.entity.type,
          payload: latestDraft.payload
        }),
        payload: latestDraft.payload,
        createdAt: latestDraft.createdAt,
        createdBy: mapCreatedBy(latestDraft.createdBy)
      },
      releaseSummary: buildEntityReleaseSummary(latestDraft.id, releaseEntriesBySlug.get(latestDraft.entity.slug) ?? [])
    };
  },

  async saveDraft(input: {
    entityType: EntityType;
    actorId: string;
    actorRole: Role;
    slug: string;
    name: string;
    summary: string;
    visibility: Visibility;
    metadata?: Prisma.InputJsonValue;
    requiredDependencies?: Prisma.InputJsonValue;
  }) {
    const existingRevision = await prismaClient.entityRevision.findFirst({
      where: {
        entity: {
          slug: input.slug,
          type: input.entityType
        }
      },
      orderBy: [{ version: "desc" }, { createdAt: "desc" }],
      select: {
        payload: true
      }
    });

    const payload = entityMetadataContract.buildPayload({
      entityType: input.entityType,
      name: input.name,
      summary: input.summary,
      visibility: input.visibility,
      ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
      ...(input.requiredDependencies === undefined ? {} : { requiredDependencies: input.requiredDependencies }),
      previousPayload: existingRevision?.payload ?? null
    });

    return entityRevisionRepository.saveDraft({
      entityType: input.entityType,
      actorId: input.actorId,
      actorRole: input.actorRole,
      slug: input.slug,
      name: input.name,
      summary: input.summary,
      visibility: input.visibility,
      payload
    });
  },

  async retireEntity(input: { entityType: EntityType; slug: string }): Promise<{ outcome: "deleted" | "retired" } | null> {
    const entity = await prismaClient.entity.findFirst({
      where: { slug: input.slug, type: input.entityType },
      select: {
        id: true,
        retiredAt: true,
        _count: { select: { releaseEntries: true } }
      }
    });

    if (!entity) {
      return null;
    }

    if (entity.retiredAt !== null) {
      return { outcome: "retired" };
    }

    if (entity._count.releaseEntries === 0) {
      await prismaClient.entity.delete({ where: { id: entity.id } });
      return { outcome: "deleted" };
    }

    await prismaClient.entity.update({
      where: { id: entity.id },
      data: { retiredAt: new Date() }
    });
    return { outcome: "retired" };
  },

  async getEntityHistory(input: { entityType: EntityType; slug: string }): Promise<AdminEntityHistoryRecord | null> {
    const revisions = await prismaClient.entityRevision.findMany({
      where: {
        entity: {
          slug: input.slug,
          type: input.entityType
        }
      },
      orderBy: [{ version: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        version: true,
        name: true,
        summary: true,
        visibility: true,
        payload: true,
        createdAt: true,
        createdBy: {
          select: selectCreatedBy
        },
        entity: {
          select: {
            slug: true,
            type: true
          }
        }
      }
    });

    const latestDraft = revisions[0];

    if (!latestDraft) {
      return null;
    }

    const releaseEntries = await prismaClient.releaseEntry.findMany({
      where: {
        entity: {
          slug: input.slug,
          type: input.entityType
        }
      },
      orderBy: [{ release: { createdAt: "desc" } }, { createdAt: "desc" }],
      select: {
        createdAt: true,
        entity: {
          select: {
            slug: true,
            type: true
          }
        },
        revision: {
          select: {
            id: true,
            version: true,
            name: true,
            summary: true,
            visibility: true,
            payload: true
          }
        },
        release: {
          select: {
            slug: true,
            name: true,
            status: true,
            activatedAt: true,
            createdAt: true
          }
        }
      }
    });

    const releaseEntriesByRevisionId = releaseEntries.reduce<Map<string, ReleaseEntryRecord[]>>((entriesByRevisionId, entry) => {
      const entries = entriesByRevisionId.get(entry.revision.id) ?? [];

      entries.push(entry);
      entriesByRevisionId.set(entry.revision.id, entries);
      return entriesByRevisionId;
    }, new Map());

    const activeReleaseRevisionId = releaseEntries.find((entry) => entry.release.status === "ACTIVE")?.revision.id ?? null;

    return {
      entitySlug: latestDraft.entity.slug,
      entityType: latestDraft.entity.type,
      latestDraftRevisionId: latestDraft.id,
      activeReleaseRevisionId,
      revisionSummaries: revisions.map((revision) => ({
        revisionId: revision.id,
        version: revision.version,
        name: revision.name,
        summary: revision.summary,
        visibility: revision.visibility,
        metadata: entityMetadataContract.readMetadata({
          entityType: revision.entity.type,
          payload: revision.payload
        }),
        createdAt: revision.createdAt,
        createdBy: mapCreatedBy(revision.createdBy),
        releaseSummary: buildRevisionReleaseSummary(releaseEntriesByRevisionId.get(revision.id) ?? [])
      }))
    };
  }
};