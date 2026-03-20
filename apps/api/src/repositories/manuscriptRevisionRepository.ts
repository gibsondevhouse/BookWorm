import type { ManuscriptType, Prisma, Role, Visibility } from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";

export type SaveManuscriptRevisionInput = {
  manuscriptType: ManuscriptType;
  actorId: string;
  slug: string;
  title: string;
  summary: string;
  visibility: Visibility;
  payload?: Prisma.InputJsonValue;
};

export type SaveManuscriptRevisionRecord = {
  manuscriptId: string;
  manuscriptRevisionId: string;
  manuscriptType: ManuscriptType;
  version: number;
  slug: string;
  title: string;
  summary: string;
  visibility: Visibility;
};

export type IncludeManuscriptRevisionInReleaseInput = {
  releaseSlug: string;
  manuscriptSlug: string;
  manuscriptRevisionId: string;
};

export type IncludeManuscriptRevisionInReleaseRecord = {
  releaseSlug: string;
  manuscriptSlug: string;
  manuscriptRevisionId: string;
};

export type AdminManuscriptRevisionRecord = {
  manuscriptSlug: string;
  manuscriptType: ManuscriptType;
  manuscriptRevisionId: string;
  version: number;
  title: string;
  summary: string;
  visibility: Visibility;
  payload: Prisma.JsonValue | null;
  createdAt: Date;
  createdBy: {
    userId: string;
    email: string;
    displayName: string;
    role: Role;
  };
};

export type ActivePublicManuscriptRecord = {
  releaseSlug: string;
  manuscriptType: ManuscriptType;
  manuscriptSlug: string;
  title: string;
  summary: string;
  visibility: Visibility;
  version: number;
  payload: Prisma.JsonValue | null;
};

export type ActivePublicManuscriptListResult = {
  releaseSlug: string | null;
  items: ActivePublicManuscriptRecord[];
};

export type ManuscriptRevisionByIdRecord = {
  manuscriptRevisionId: string;
  manuscriptId: string;
  manuscriptType: ManuscriptType;
  manuscriptSlug: string;
  version: number;
  title: string;
  summary: string;
  visibility: Visibility;
  payload: Prisma.JsonValue | null;
};

export const manuscriptRevisionRepository = {
  async saveRevision(input: SaveManuscriptRevisionInput): Promise<SaveManuscriptRevisionRecord> {
    return prismaClient.$transaction(async (transaction) => {
      const manuscript = await transaction.manuscript.upsert({
        where: { slug: input.slug },
        update: {
          type: input.manuscriptType
        },
        create: {
          slug: input.slug,
          type: input.manuscriptType
        }
      });

      const latestRevision = await transaction.manuscriptRevision.findFirst({
        where: {
          manuscriptId: manuscript.id
        },
        orderBy: {
          version: "desc"
        },
        select: {
          version: true
        }
      });

      const nextVersion = (latestRevision?.version ?? 0) + 1;

      const revision = await transaction.manuscriptRevision.create({
        data: {
          manuscriptId: manuscript.id,
          createdById: input.actorId,
          version: nextVersion,
          title: input.title,
          summary: input.summary,
          visibility: input.visibility,
          ...(input.payload === undefined ? {} : { payload: input.payload })
        }
      });

      return {
        manuscriptId: manuscript.id,
        manuscriptRevisionId: revision.id,
        manuscriptType: manuscript.type,
        version: revision.version,
        slug: manuscript.slug,
        title: revision.title,
        summary: revision.summary,
        visibility: revision.visibility
      };
    });
  },

  async includeRevisionInRelease(input: IncludeManuscriptRevisionInReleaseInput): Promise<IncludeManuscriptRevisionInReleaseRecord> {
    return prismaClient.$transaction(async (transaction) => {
      const release = await transaction.release.findUnique({
        where: { slug: input.releaseSlug },
        select: { id: true, slug: true }
      });

      if (!release) {
        throw new Error("Release not found");
      }

      const manuscript = await transaction.manuscript.findUnique({
        where: { slug: input.manuscriptSlug },
        select: { id: true, slug: true }
      });

      if (!manuscript) {
        throw new Error("Manuscript not found");
      }

      const revision = await transaction.manuscriptRevision.findFirst({
        where: {
          id: input.manuscriptRevisionId,
          manuscriptId: manuscript.id
        },
        select: { id: true }
      });

      if (!revision) {
        throw new Error("Revision not found for manuscript");
      }

      await transaction.releaseManuscriptEntry.upsert({
        where: {
          releaseId_manuscriptId: {
            releaseId: release.id,
            manuscriptId: manuscript.id
          }
        },
        update: {
          manuscriptRevisionId: revision.id
        },
        create: {
          releaseId: release.id,
          manuscriptId: manuscript.id,
          manuscriptRevisionId: revision.id
        }
      });

      return {
        releaseSlug: release.slug,
        manuscriptSlug: manuscript.slug,
        manuscriptRevisionId: revision.id
      };
    });
  },

  async findLatestBySlug(input: { manuscriptType: ManuscriptType; slug: string }): Promise<AdminManuscriptRevisionRecord | null> {
    const revision = await prismaClient.manuscriptRevision.findFirst({
      where: {
        manuscript: {
          slug: input.slug,
          type: input.manuscriptType
        }
      },
      orderBy: [{ version: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        version: true,
        title: true,
        summary: true,
        visibility: true,
        payload: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true
          }
        },
        manuscript: {
          select: {
            slug: true,
            type: true
          }
        }
      }
    });

    if (!revision) {
      return null;
    }

    return {
      manuscriptSlug: revision.manuscript.slug,
      manuscriptType: revision.manuscript.type,
      manuscriptRevisionId: revision.id,
      version: revision.version,
      title: revision.title,
      summary: revision.summary,
      visibility: revision.visibility,
      payload: revision.payload,
      createdAt: revision.createdAt,
      createdBy: {
        userId: revision.createdBy.id,
        email: revision.createdBy.email,
        displayName: revision.createdBy.displayName,
        role: revision.createdBy.role
      }
    };
  },

  async listHistoryBySlug(input: { manuscriptType: ManuscriptType; slug: string }): Promise<AdminManuscriptRevisionRecord[]> {
    const revisions = await prismaClient.manuscriptRevision.findMany({
      where: {
        manuscript: {
          slug: input.slug,
          type: input.manuscriptType
        }
      },
      orderBy: [{ version: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        version: true,
        title: true,
        summary: true,
        visibility: true,
        payload: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true
          }
        },
        manuscript: {
          select: {
            slug: true,
            type: true
          }
        }
      }
    });

    return revisions.map((revision) => ({
      manuscriptSlug: revision.manuscript.slug,
      manuscriptType: revision.manuscript.type,
      manuscriptRevisionId: revision.id,
      version: revision.version,
      title: revision.title,
      summary: revision.summary,
      visibility: revision.visibility,
      payload: revision.payload,
      createdAt: revision.createdAt,
      createdBy: {
        userId: revision.createdBy.id,
        email: revision.createdBy.email,
        displayName: revision.createdBy.displayName,
        role: revision.createdBy.role
      }
    }));
  },

  async findActivePublicBySlug(input: { manuscriptType: ManuscriptType; slug: string }): Promise<ActivePublicManuscriptRecord | null> {
    const releaseEntry = await prismaClient.releaseManuscriptEntry.findFirst({
      where: {
        manuscript: {
          slug: input.slug,
          type: input.manuscriptType
        },
        release: {
          status: "ACTIVE"
        },
        manuscriptRevision: {
          visibility: "PUBLIC"
        }
      },
      orderBy: [{ release: { activatedAt: "desc" } }, { createdAt: "desc" }],
      select: {
        release: {
          select: {
            slug: true
          }
        },
        manuscript: {
          select: {
            slug: true,
            type: true
          }
        },
        manuscriptRevision: {
          select: {
            title: true,
            summary: true,
            visibility: true,
            version: true,
            payload: true
          }
        }
      }
    });

    if (!releaseEntry) {
      return null;
    }

    return {
      releaseSlug: releaseEntry.release.slug,
      manuscriptType: releaseEntry.manuscript.type,
      manuscriptSlug: releaseEntry.manuscript.slug,
      title: releaseEntry.manuscriptRevision.title,
      summary: releaseEntry.manuscriptRevision.summary,
      visibility: releaseEntry.manuscriptRevision.visibility,
      version: releaseEntry.manuscriptRevision.version,
      payload: releaseEntry.manuscriptRevision.payload
    };
  },

  async listActivePublicByType(input: { manuscriptType: ManuscriptType; limit: number }): Promise<ActivePublicManuscriptListResult> {
    const activeRelease = await prismaClient.release.findFirst({
      where: {
        status: "ACTIVE"
      },
      orderBy: {
        activatedAt: "desc"
      },
      select: {
        id: true,
        slug: true
      }
    });

    if (!activeRelease) {
      return {
        releaseSlug: null,
        items: []
      };
    }

    const entries = await prismaClient.releaseManuscriptEntry.findMany({
      where: {
        releaseId: activeRelease.id,
        manuscript: {
          type: input.manuscriptType
        },
        manuscriptRevision: {
          visibility: "PUBLIC"
        }
      },
      orderBy: [{ manuscriptRevision: { title: "asc" } }],
      take: input.limit,
      select: {
        manuscript: {
          select: {
            slug: true,
            type: true
          }
        },
        manuscriptRevision: {
          select: {
            title: true,
            summary: true,
            visibility: true,
            version: true,
            payload: true
          }
        }
      }
    });

    return {
      releaseSlug: activeRelease.slug,
      items: entries.map((entry) => ({
        releaseSlug: activeRelease.slug,
        manuscriptType: entry.manuscript.type,
        manuscriptSlug: entry.manuscript.slug,
        title: entry.manuscriptRevision.title,
        summary: entry.manuscriptRevision.summary,
        visibility: entry.manuscriptRevision.visibility,
        version: entry.manuscriptRevision.version,
        payload: entry.manuscriptRevision.payload
      }))
    };
  },

  async findByRevisionId(revisionId: string): Promise<ManuscriptRevisionByIdRecord | null> {
    const revision = await prismaClient.manuscriptRevision.findUnique({
      where: {
        id: revisionId
      },
      select: {
        id: true,
        manuscriptId: true,
        version: true,
        title: true,
        summary: true,
        visibility: true,
        payload: true,
        manuscript: {
          select: {
            slug: true,
            type: true
          }
        }
      }
    });

    if (!revision) {
      return null;
    }

    return {
      manuscriptRevisionId: revision.id,
      manuscriptId: revision.manuscriptId,
      manuscriptType: revision.manuscript.type,
      manuscriptSlug: revision.manuscript.slug,
      version: revision.version,
      title: revision.title,
      summary: revision.summary,
      visibility: revision.visibility,
      payload: revision.payload
    };
  }
};