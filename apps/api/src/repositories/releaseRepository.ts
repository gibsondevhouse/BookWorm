import { type ReleaseStatus } from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";

export type CreateReleaseInput = {
  actorId: string;
  slug: string;
  name: string;
};

export type IncludeRevisionInput = {
  releaseSlug: string;
  entitySlug: string;
  revisionId: string;
};

export type IncludeManuscriptRevisionInput = {
  releaseSlug: string;
  manuscriptSlug: string;
  manuscriptRevisionId: string;
};

export type ReleaseCompositionState = {
  slug: string;
  status: ReleaseStatus;
  entityEntryCount: number;
  manuscriptEntryCount: number;
  relationshipEntryCount: number;
};

export const releaseRepository = {
  async createRelease(input: CreateReleaseInput): Promise<{ slug: string; status: ReleaseStatus }> {
    const release = await prismaClient.release.create({
      data: {
        slug: input.slug,
        name: input.name,
        createdById: input.actorId
      }
    });

    return {
      slug: release.slug,
      status: release.status
    };
  },

  async includeRevision(input: IncludeRevisionInput): Promise<{ releaseSlug: string; entitySlug: string; revisionId: string }> {
    return prismaClient.$transaction(async (transaction) => {
      const release = await transaction.release.findUnique({
        where: { slug: input.releaseSlug },
        select: { id: true, slug: true }
      });

      if (!release) {
        throw new Error("Release not found");
      }

      const entity = await transaction.entity.findUnique({
        where: { slug: input.entitySlug },
        select: { id: true, slug: true }
      });

      if (!entity) {
        throw new Error("Entity not found");
      }

      const revision = await transaction.entityRevision.findFirst({
        where: {
          id: input.revisionId,
          entityId: entity.id
        },
        select: { id: true }
      });

      if (!revision) {
        throw new Error("Revision not found for character");
      }

      await transaction.releaseEntry.upsert({
        where: {
          releaseId_entityId: {
            releaseId: release.id,
            entityId: entity.id
          }
        },
        update: {
          revisionId: revision.id
        },
        create: {
          releaseId: release.id,
          entityId: entity.id,
          revisionId: revision.id
        }
      });

      return {
        releaseSlug: release.slug,
        entitySlug: entity.slug,
        revisionId: revision.id
      };
    });
  },

  async includeManuscriptRevision(
    input: IncludeManuscriptRevisionInput
  ): Promise<{ releaseSlug: string; manuscriptSlug: string; manuscriptRevisionId: string }> {
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

  async getReleaseCompositionState(releaseSlug: string): Promise<ReleaseCompositionState> {
    const release = await prismaClient.release.findUnique({
      where: { slug: releaseSlug },
      select: {
        slug: true,
        status: true,
        _count: {
          select: {
            entries: true,
            manuscriptEntries: true,
            relationshipEntries: true
          }
        }
      }
    });

    if (!release) {
      throw new Error("Release not found");
    }

    return {
      slug: release.slug,
      status: release.status,
      entityEntryCount: release._count.entries,
      manuscriptEntryCount: release._count.manuscriptEntries,
      relationshipEntryCount: release._count.relationshipEntries
    };
  },

  async activateRelease(releaseSlug: string): Promise<{ slug: string; status: ReleaseStatus }> {
    return prismaClient.$transaction(async (transaction) => {
      await transaction.release.updateMany({
        where: {
          status: "ACTIVE"
        },
        data: {
          status: "ARCHIVED"
        }
      });

      const release = await transaction.release.update({
        where: { slug: releaseSlug },
        data: {
          status: "ACTIVE",
          activatedAt: new Date()
        }
      });

      return {
        slug: release.slug,
        status: release.status
      };
    });
  }
};