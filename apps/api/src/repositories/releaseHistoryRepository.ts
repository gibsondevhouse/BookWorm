import { type ReleaseStatus } from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";

type ReleaseEntryCounts = {
  entities: number;
  manuscripts: number;
  relationships: number;
};

export type ReleaseHistoryListRecord = {
  slug: string;
  name: string;
  status: ReleaseStatus;
  createdAt: Date;
  activatedAt: Date | null;
  entryCounts: ReleaseEntryCounts;
};

export type ReleaseHistoryDetailRecord = {
  slug: string;
  name: string;
  status: ReleaseStatus;
  createdAt: Date;
  activatedAt: Date | null;
  entityEntries: Array<{
    entitySlug: string;
    entityType: string;
    revisionId: string;
    version: number;
    visibility: "PUBLIC" | "RESTRICTED" | "PRIVATE";
  }>;
  manuscriptEntries: Array<{
    manuscriptSlug: string;
    manuscriptType: string;
    manuscriptRevisionId: string;
    version: number;
    visibility: "PUBLIC" | "RESTRICTED" | "PRIVATE";
  }>;
  relationshipEntries: Array<{
    relationshipId: string;
    relationshipRevisionId: string;
    relationType: string;
    version: number;
    visibility: "PUBLIC" | "RESTRICTED" | "PRIVATE";
  }>;
};

export type PublicArchiveReleaseRecord = {
  slug: string;
  name: string;
  status: "ACTIVE" | "ARCHIVED";
  activatedAt: Date | null;
  createdAt: Date;
};

export const releaseHistoryRepository = {
  async listReleaseHistory(input: {
    status?: ReleaseStatus;
    limit: number;
    offset: number;
  }): Promise<{
    items: ReleaseHistoryListRecord[];
    total: number;
  }> {
    const whereClause = input.status === undefined ? {} : { status: input.status };

    const [items, total] = await prismaClient.$transaction([
      prismaClient.release.findMany({
        where: whereClause,
        orderBy: [{ createdAt: "desc" }, { slug: "asc" }],
        take: input.limit,
        skip: input.offset,
        select: {
          slug: true,
          name: true,
          status: true,
          createdAt: true,
          activatedAt: true,
          _count: {
            select: {
              entries: true,
              manuscriptEntries: true,
              relationshipEntries: true
            }
          }
        }
      }),
      prismaClient.release.count({
        where: whereClause
      })
    ]);

    return {
      items: items.map((item) => ({
        slug: item.slug,
        name: item.name,
        status: item.status,
        createdAt: item.createdAt,
        activatedAt: item.activatedAt,
        entryCounts: {
          entities: item._count.entries,
          manuscripts: item._count.manuscriptEntries,
          relationships: item._count.relationshipEntries
        }
      })),
      total
    };
  },

  async getReleaseHistoryDetail(releaseSlug: string): Promise<ReleaseHistoryDetailRecord | null> {
    const release = await prismaClient.release.findUnique({
      where: {
        slug: releaseSlug
      },
      select: {
        slug: true,
        name: true,
        status: true,
        createdAt: true,
        activatedAt: true,
        entries: {
          orderBy: [{ entity: { type: "asc" } }, { entity: { slug: "asc" } }],
          select: {
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
                visibility: true
              }
            }
          }
        },
        manuscriptEntries: {
          orderBy: [{ manuscript: { type: "asc" } }, { manuscript: { slug: "asc" } }],
          select: {
            manuscript: {
              select: {
                slug: true,
                type: true
              }
            },
            manuscriptRevision: {
              select: {
                id: true,
                version: true,
                visibility: true
              }
            }
          }
        },
        relationshipEntries: {
          orderBy: [{ relationship: { relationType: "asc" } }, { relationship: { id: "asc" } }],
          select: {
            relationship: {
              select: {
                id: true,
                relationType: true
              }
            },
            relationshipRevision: {
              select: {
                id: true,
                version: true,
                visibility: true
              }
            }
          }
        }
      }
    });

    if (!release) {
      return null;
    }

    return {
      slug: release.slug,
      name: release.name,
      status: release.status,
      createdAt: release.createdAt,
      activatedAt: release.activatedAt,
      entityEntries: release.entries.map((entry) => ({
        entitySlug: entry.entity.slug,
        entityType: entry.entity.type,
        revisionId: entry.revision.id,
        version: entry.revision.version,
        visibility: entry.revision.visibility
      })),
      manuscriptEntries: release.manuscriptEntries.map((entry) => ({
        manuscriptSlug: entry.manuscript.slug,
        manuscriptType: entry.manuscript.type,
        manuscriptRevisionId: entry.manuscriptRevision.id,
        version: entry.manuscriptRevision.version,
        visibility: entry.manuscriptRevision.visibility
      })),
      relationshipEntries: release.relationshipEntries.map((entry) => ({
        relationshipId: entry.relationship.id,
        relationshipRevisionId: entry.relationshipRevision.id,
        relationType: entry.relationship.relationType,
        version: entry.relationshipRevision.version,
        visibility: entry.relationshipRevision.visibility
      }))
    };
  },

  async listPublicArchiveReleases(input: {
    limit: number;
    offset: number;
  }): Promise<{
    items: PublicArchiveReleaseRecord[];
    total: number;
  }> {
    const whereClause: {
      status: {
        in: ReleaseStatus[];
      };
    } = {
      status: {
        in: ["ACTIVE", "ARCHIVED"]
      }
    };

    const [items, total] = await prismaClient.$transaction([
      prismaClient.release.findMany({
        where: whereClause,
        orderBy: [{ activatedAt: "desc" }, { createdAt: "desc" }, { slug: "asc" }],
        take: input.limit,
        skip: input.offset,
        select: {
          slug: true,
          name: true,
          status: true,
          activatedAt: true,
          createdAt: true
        }
      }),
      prismaClient.release.count({
        where: whereClause
      })
    ]);

    return {
      items: items.map((item) => {
        if (item.status === "DRAFT") {
          throw new Error("Draft releases are not allowed in public archive listings");
        }

        return {
          slug: item.slug,
          name: item.name,
          status: item.status,
          activatedAt: item.activatedAt,
          createdAt: item.createdAt
        };
      }),
      total
    };
  }
};