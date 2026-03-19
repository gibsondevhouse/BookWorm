import type { EntityType, Prisma, ReleaseStatus, Role, Visibility } from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";
import { entityMetadataContract } from "../lib/entityMetadataContract.js";

type EntityMetadataRecord = ReturnType<(typeof entityMetadataContract)["readMetadata"]>;

export type SaveEntityRevisionInput = {
  entityType: EntityType;
  actorId: string;
  actorRole: Role;
  slug: string;
  name: string;
  summary: string;
  visibility: Visibility;
  payload: Prisma.InputJsonObject;
};

export type SaveEntityRevisionRecord = {
  entityId: string;
  revisionId: string;
  version: number;
  entityType: EntityType;
  slug: string;
  name: string;
  summary: string;
  visibility: Visibility;
  metadata: EntityMetadataRecord;
  actorRole: Role;
};

export type ActivePublicEntityRecord = {
  releaseSlug: string;
  entityType: EntityType;
  slug: string;
  name: string;
  summary: string;
  visibility: Visibility;
  metadata: EntityMetadataRecord;
  version: number;
};

export type PublicEntityLookupInput = {
  entityType: EntityType;
  slug: string;
  releaseSlug?: string;
};

const publicReleaseStatuses: ReleaseStatus[] = ["ACTIVE", "ARCHIVED"];

export type AdminEntityRevisionRecord = {
  entitySlug: string;
  entityType: EntityType;
  revisionId: string;
  version: number;
  name: string;
  summary: string;
  visibility: Visibility;
  metadata: EntityMetadataRecord;
  payload: Prisma.JsonValue | null;
  createdAt: Date;
  createdBy: {
    userId: string;
    email: string;
    displayName: string;
    role: Role;
  };
};

export const entityRevisionRepository = {
  async saveDraft(input: SaveEntityRevisionInput): Promise<SaveEntityRevisionRecord> {
    return prismaClient.$transaction(async (transaction) => {
      const entity = await transaction.entity.upsert({
        where: { slug: input.slug },
        update: {
          type: input.entityType
        },
        create: {
          slug: input.slug,
          type: input.entityType
        }
      });

      const latestRevision = await transaction.entityRevision.findFirst({
        where: { entityId: entity.id },
        orderBy: { version: "desc" },
        select: { version: true }
      });

      const nextVersion = (latestRevision?.version ?? 0) + 1;

      const revision = await transaction.entityRevision.create({
        data: {
          entityId: entity.id,
          createdById: input.actorId,
          version: nextVersion,
          name: input.name,
          summary: input.summary,
          visibility: input.visibility,
          payload: input.payload
        }
      });

      return {
        entityId: entity.id,
        revisionId: revision.id,
        version: revision.version,
        entityType: entity.type,
        slug: entity.slug,
        name: revision.name,
        summary: revision.summary,
        visibility: revision.visibility,
        metadata: entityMetadataContract.readMetadata({
          entityType: entity.type,
          payload: revision.payload
        }),
        actorRole: input.actorRole
      };
    });
  },

  async findPublicBySlug(input: PublicEntityLookupInput): Promise<ActivePublicEntityRecord | null> {
    const releaseEntry = await prismaClient.releaseEntry.findFirst({
      where: {
        entity: {
          slug: input.slug,
          type: input.entityType,
          retiredAt: null
        },
        release:
          input.releaseSlug === undefined
            ? {
                status: "ACTIVE"
              }
            : {
                slug: input.releaseSlug,
                status: {
                  in: publicReleaseStatuses
                }
              },
        revision: {
          visibility: "PUBLIC"
        }
      },
      ...(input.releaseSlug === undefined
        ? {
            orderBy: [{ release: { activatedAt: "desc" } }, { createdAt: "desc" }]
          }
        : {}),
      select: {
        release: {
          select: {
            slug: true
          }
        },
        entity: {
          select: {
            slug: true,
            type: true
          }
        },
        revision: {
          select: {
            name: true,
            summary: true,
            visibility: true,
            payload: true,
            version: true
          }
        }
      }
    });

    if (!releaseEntry) {
      return null;
    }

    return {
      releaseSlug: releaseEntry.release.slug,
      entityType: releaseEntry.entity.type,
      slug: releaseEntry.entity.slug,
      name: releaseEntry.revision.name,
      summary: releaseEntry.revision.summary,
      visibility: releaseEntry.revision.visibility,
      metadata: entityMetadataContract.readMetadata({
        entityType: releaseEntry.entity.type,
        payload: releaseEntry.revision.payload
      }),
      version: releaseEntry.revision.version
    };
  },

  async findActivePublicBySlug(input: { entityType: EntityType; slug: string }): Promise<ActivePublicEntityRecord | null> {
    return entityRevisionRepository.findPublicBySlug(input);
  },

  async findLatestBySlug(input: { entityType: EntityType; slug: string }): Promise<AdminEntityRevisionRecord | null> {
    const revision = await prismaClient.entityRevision.findFirst({
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
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true
          }
        },
        entity: {
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
      entitySlug: revision.entity.slug,
      entityType: revision.entity.type,
      revisionId: revision.id,
      version: revision.version,
      name: revision.name,
      summary: revision.summary,
      visibility: revision.visibility,
      metadata: entityMetadataContract.readMetadata({
        entityType: revision.entity.type,
        payload: revision.payload
      }),
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

  async listHistoryBySlug(input: { entityType: EntityType; slug: string }): Promise<AdminEntityRevisionRecord[]> {
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
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true
          }
        },
        entity: {
          select: {
            slug: true,
            type: true
          }
        }
      }
    });

    return revisions.map((revision) => ({
      entitySlug: revision.entity.slug,
      entityType: revision.entity.type,
      revisionId: revision.id,
      version: revision.version,
      name: revision.name,
      summary: revision.summary,
      visibility: revision.visibility,
      metadata: entityMetadataContract.readMetadata({
        entityType: revision.entity.type,
        payload: revision.payload
      }),
      payload: revision.payload,
      createdAt: revision.createdAt,
      createdBy: {
        userId: revision.createdBy.id,
        email: revision.createdBy.email,
        displayName: revision.createdBy.displayName,
        role: revision.createdBy.role
      }
    }));
  }
};