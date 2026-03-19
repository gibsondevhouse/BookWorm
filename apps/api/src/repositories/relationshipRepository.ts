import type { Prisma, RelationshipRevisionState, Role, Visibility } from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";

export type SaveRelationshipRevisionInput = {
  actorId: string;
  sourceEntitySlug: string;
  targetEntitySlug: string;
  relationType: string;
  visibility: Visibility;
  state: RelationshipRevisionState;
  metadata?: Prisma.InputJsonValue;
};

export type RelationshipRevisionRecord = {
  relationshipId: string;
  relationshipRevisionId: string;
  sourceEntitySlug: string;
  targetEntitySlug: string;
  relationType: string;
  version: number;
  state: RelationshipRevisionState;
  visibility: Visibility;
};

export type PublicRelationshipRecord = {
  releaseSlug: string;
  relationshipId: string;
  relationshipRevisionId: string;
  sourceEntitySlug: string;
  targetEntitySlug: string;
  relationType: string;
  version: number;
  state: RelationshipRevisionState;
  visibility: Visibility;
};

type RelationshipRevisionCreatorRecord = {
  userId: string;
  email: string;
  displayName: string;
  role: Role;
};

export type RelationshipRevisionAdminRecord = {
  relationshipId: string;
  relationshipRevisionId: string;
  sourceEntitySlug: string;
  targetEntitySlug: string;
  relationType: string;
  version: number;
  state: RelationshipRevisionState;
  visibility: Visibility;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  createdBy: RelationshipRevisionCreatorRecord;
};

export type IncludeRelationshipRevisionInput = {
  releaseSlug: string;
  relationshipRevisionId: string;
};

const assertTransition = (latestState: RelationshipRevisionState | null, nextState: RelationshipRevisionState): void => {
  if (!latestState && nextState !== "CREATE") {
    throw new Error("The first relationship revision must use CREATE state");
  }

  if (latestState === "DELETE") {
    throw new Error("Deleted relationships cannot be revised further");
  }

  if (latestState !== null && nextState === "CREATE") {
    throw new Error("Existing relationships cannot create another CREATE revision");
  }
};

export const relationshipRepository = {
  async saveRevision(input: SaveRelationshipRevisionInput): Promise<RelationshipRevisionRecord> {
    return prismaClient.$transaction(async (transaction) => {
      const sourceEntity = await transaction.entity.findUnique({
        where: { slug: input.sourceEntitySlug },
        select: { id: true, slug: true }
      });

      if (!sourceEntity) {
        throw new Error("Source entity not found");
      }

      const targetEntity = await transaction.entity.findUnique({
        where: { slug: input.targetEntitySlug },
        select: { id: true, slug: true }
      });

      if (!targetEntity) {
        throw new Error("Target entity not found");
      }

      const existingRelationship = await transaction.relationship.findUnique({
        where: {
          sourceEntityId_targetEntityId_relationType: {
            sourceEntityId: sourceEntity.id,
            targetEntityId: targetEntity.id,
            relationType: input.relationType
          }
        },
        select: {
          id: true,
          revisions: {
            orderBy: { version: "desc" },
            take: 1,
            select: {
              version: true,
              state: true
            }
          }
        }
      });

      const relationship = existingRelationship
        ? { id: existingRelationship.id }
        : await transaction.relationship.create({
            data: {
              sourceEntityId: sourceEntity.id,
              targetEntityId: targetEntity.id,
              relationType: input.relationType
            },
            select: { id: true }
          });

      const latestRevision = existingRelationship?.revisions[0] ?? null;

      assertTransition(latestRevision?.state ?? null, input.state);

      const revision = await transaction.relationshipRevision.create({
        data: {
          relationshipId: relationship.id,
          createdById: input.actorId,
          version: (latestRevision?.version ?? 0) + 1,
          state: input.state,
          visibility: input.visibility,
          ...(input.metadata === undefined ? {} : { metadata: input.metadata })
        }
      });

      return {
        relationshipId: relationship.id,
        relationshipRevisionId: revision.id,
        sourceEntitySlug: sourceEntity.slug,
        targetEntitySlug: targetEntity.slug,
        relationType: input.relationType,
        version: revision.version,
        state: revision.state,
        visibility: revision.visibility
      };
    });
  },

  async includeRevisionInRelease(input: IncludeRelationshipRevisionInput): Promise<{
    releaseSlug: string;
    relationshipId: string;
    relationshipRevisionId: string;
  }> {
    return prismaClient.$transaction(async (transaction) => {
      const release = await transaction.release.findUnique({
        where: { slug: input.releaseSlug },
        select: { id: true, slug: true }
      });

      if (!release) {
        throw new Error("Release not found");
      }

      const relationshipRevision = await transaction.relationshipRevision.findUnique({
        where: { id: input.relationshipRevisionId },
        select: {
          id: true,
          relationshipId: true
        }
      });

      if (!relationshipRevision) {
        throw new Error("Relationship revision not found");
      }

      await transaction.releaseRelationshipEntry.upsert({
        where: {
          releaseId_relationshipId: {
            releaseId: release.id,
            relationshipId: relationshipRevision.relationshipId
          }
        },
        update: {
          relationshipRevisionId: relationshipRevision.id
        },
        create: {
          releaseId: release.id,
          relationshipId: relationshipRevision.relationshipId,
          relationshipRevisionId: relationshipRevision.id
        }
      });

      return {
        releaseSlug: release.slug,
        relationshipId: relationshipRevision.relationshipId,
        relationshipRevisionId: relationshipRevision.id
      };
    });
  },

  async findActivePublicRelationship(input: {
    sourceEntitySlug: string;
    targetEntitySlug: string;
    relationType: string;
  }): Promise<PublicRelationshipRecord | null> {
    const releaseEntry = await prismaClient.releaseRelationshipEntry.findFirst({
      where: {
        release: {
          status: "ACTIVE"
        },
        relationship: {
          relationType: input.relationType,
          sourceEntity: {
            slug: input.sourceEntitySlug
          },
          targetEntity: {
            slug: input.targetEntitySlug
          }
        },
        relationshipRevision: {
          visibility: "PUBLIC",
          state: {
            not: "DELETE"
          }
        }
      },
      orderBy: [
        { release: { activatedAt: "desc" } },
        { createdAt: "desc" }
      ],
      select: {
        release: {
          select: {
            slug: true
          }
        },
        relationship: {
          select: {
            id: true,
            relationType: true,
            sourceEntity: {
              select: {
                slug: true
              }
            },
            targetEntity: {
              select: {
                slug: true
              }
            }
          }
        },
        relationshipRevision: {
          select: {
            id: true,
            version: true,
            state: true,
            visibility: true
          }
        }
      }
    });

    if (!releaseEntry) {
      return null;
    }

    return {
      releaseSlug: releaseEntry.release.slug,
      relationshipId: releaseEntry.relationship.id,
      relationshipRevisionId: releaseEntry.relationshipRevision.id,
      sourceEntitySlug: releaseEntry.relationship.sourceEntity.slug,
      targetEntitySlug: releaseEntry.relationship.targetEntity.slug,
      relationType: releaseEntry.relationship.relationType,
      version: releaseEntry.relationshipRevision.version,
      state: releaseEntry.relationshipRevision.state,
      visibility: releaseEntry.relationshipRevision.visibility
    };
  },

  async findLatestRevisionByKey(input: {
    sourceEntitySlug: string;
    targetEntitySlug: string;
    relationType: string;
  }): Promise<RelationshipRevisionAdminRecord | null> {
    const revision = await prismaClient.relationshipRevision.findFirst({
      where: {
        relationship: {
          relationType: input.relationType,
          sourceEntity: { slug: input.sourceEntitySlug },
          targetEntity: { slug: input.targetEntitySlug }
        }
      },
      orderBy: { version: "desc" },
      select: {
        id: true,
        version: true,
        state: true,
        visibility: true,
        metadata: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true
          }
        },
        relationship: {
          select: {
            id: true,
            relationType: true,
            sourceEntity: { select: { slug: true } },
            targetEntity: { select: { slug: true } }
          }
        }
      }
    });

    if (!revision) {
      return null;
    }

    return {
      relationshipId: revision.relationship.id,
      relationshipRevisionId: revision.id,
      sourceEntitySlug: revision.relationship.sourceEntity.slug,
      targetEntitySlug: revision.relationship.targetEntity.slug,
      relationType: revision.relationship.relationType,
      version: revision.version,
      state: revision.state,
      visibility: revision.visibility,
      metadata: revision.metadata,
      createdAt: revision.createdAt,
      createdBy: {
        userId: revision.createdBy.id,
        email: revision.createdBy.email,
        displayName: revision.createdBy.displayName,
        role: revision.createdBy.role
      }
    };
  },

  async listRevisionHistoryByKey(input: {
    sourceEntitySlug: string;
    targetEntitySlug: string;
    relationType: string;
  }): Promise<RelationshipRevisionAdminRecord[]> {
    const revisions = await prismaClient.relationshipRevision.findMany({
      where: {
        relationship: {
          relationType: input.relationType,
          sourceEntity: { slug: input.sourceEntitySlug },
          targetEntity: { slug: input.targetEntitySlug }
        }
      },
      orderBy: { version: "desc" },
      select: {
        id: true,
        version: true,
        state: true,
        visibility: true,
        metadata: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true
          }
        },
        relationship: {
          select: {
            id: true,
            relationType: true,
            sourceEntity: { select: { slug: true } },
            targetEntity: { select: { slug: true } }
          }
        }
      }
    });

    return revisions.map((revision) => ({
      relationshipId: revision.relationship.id,
      relationshipRevisionId: revision.id,
      sourceEntitySlug: revision.relationship.sourceEntity.slug,
      targetEntitySlug: revision.relationship.targetEntity.slug,
      relationType: revision.relationship.relationType,
      version: revision.version,
      state: revision.state,
      visibility: revision.visibility,
      metadata: revision.metadata,
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