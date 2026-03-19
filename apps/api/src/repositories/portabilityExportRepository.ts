import type {
  EntityType,
  ManuscriptType,
  Prisma,
  ReleaseStatus,
  RelationshipRevisionState,
  Visibility
} from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";

const compareRelationships = (
  left: { sourceEntity: { slug: string }; relationType: string; targetEntity: { slug: string } },
  right: { sourceEntity: { slug: string }; relationType: string; targetEntity: { slug: string } }
): number => {
  const sourceDiff = left.sourceEntity.slug.localeCompare(right.sourceEntity.slug);

  if (sourceDiff !== 0) {
    return sourceDiff;
  }

  const relationDiff = left.relationType.localeCompare(right.relationType);

  if (relationDiff !== 0) {
    return relationDiff;
  }

  return left.targetEntity.slug.localeCompare(right.targetEntity.slug);
};

export const portabilityExportRepository = {
  async getCurrentSnapshot(): Promise<{
    entities: Array<{
      id: string;
      slug: string;
      type: EntityType;
      retiredAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      revision: {
        id: string;
        version: number;
        name: string;
        summary: string;
        visibility: Visibility;
        payload: Prisma.JsonValue | null;
        createdAt: Date;
      };
    }>;
    manuscripts: Array<{
      id: string;
      slug: string;
      type: ManuscriptType;
      createdAt: Date;
      updatedAt: Date;
      revision: {
        id: string;
        version: number;
        title: string;
        summary: string;
        visibility: Visibility;
        payload: Prisma.JsonValue | null;
        createdAt: Date;
      };
    }>;
    relationships: Array<{
      id: string;
      relationType: string;
      createdAt: Date;
      updatedAt: Date;
      sourceEntity: {
        id: string;
        slug: string;
      };
      targetEntity: {
        id: string;
        slug: string;
      };
      revision: {
        id: string;
        version: number;
        state: RelationshipRevisionState;
        visibility: Visibility;
        metadata: Prisma.JsonValue | null;
        createdAt: Date;
      };
    }>;
  }> {
    const [entities, manuscripts, relationships] = await prismaClient.$transaction([
      prismaClient.entity.findMany({
        where: {
          revisions: {
            some: {}
          }
        },
        orderBy: [{ type: "asc" }, { slug: "asc" }],
        select: {
          id: true,
          slug: true,
          type: true,
          retiredAt: true,
          createdAt: true,
          updatedAt: true,
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
              createdAt: true
            }
          }
        }
      }),
      prismaClient.manuscript.findMany({
        where: {
          revisions: {
            some: {}
          }
        },
        orderBy: [{ type: "asc" }, { slug: "asc" }],
        select: {
          id: true,
          slug: true,
          type: true,
          createdAt: true,
          updatedAt: true,
          revisions: {
            orderBy: [{ version: "desc" }, { createdAt: "desc" }],
            take: 1,
            select: {
              id: true,
              version: true,
              title: true,
              summary: true,
              visibility: true,
              payload: true,
              createdAt: true
            }
          }
        }
      }),
      prismaClient.relationship.findMany({
        where: {
          revisions: {
            some: {}
          }
        },
        select: {
          id: true,
          relationType: true,
          createdAt: true,
          updatedAt: true,
          sourceEntity: {
            select: {
              id: true,
              slug: true
            }
          },
          targetEntity: {
            select: {
              id: true,
              slug: true
            }
          },
          revisions: {
            orderBy: [{ version: "desc" }, { createdAt: "desc" }],
            take: 1,
            select: {
              id: true,
              version: true,
              state: true,
              visibility: true,
              metadata: true,
              createdAt: true
            }
          }
        }
      })
    ]);

    return {
      entities: entities.flatMap((entity) => {
        const revision = entity.revisions[0];

        return revision
          ? [
              {
                id: entity.id,
                slug: entity.slug,
                type: entity.type,
                retiredAt: entity.retiredAt,
                createdAt: entity.createdAt,
                updatedAt: entity.updatedAt,
                revision
              }
            ]
          : [];
      }),
      manuscripts: manuscripts.flatMap((manuscript) => {
        const revision = manuscript.revisions[0];

        return revision
          ? [
              {
                id: manuscript.id,
                slug: manuscript.slug,
                type: manuscript.type,
                createdAt: manuscript.createdAt,
                updatedAt: manuscript.updatedAt,
                revision
              }
            ]
          : [];
      }),
      relationships: relationships
        .flatMap((relationship) => {
          const revision = relationship.revisions[0];

          return revision
            ? [
                {
                  id: relationship.id,
                  relationType: relationship.relationType,
                  createdAt: relationship.createdAt,
                  updatedAt: relationship.updatedAt,
                  sourceEntity: relationship.sourceEntity,
                  targetEntity: relationship.targetEntity,
                  revision
                }
              ]
            : [];
        })
        .sort(compareRelationships)
    };
  },

  async getReleaseSnapshot(releaseSlug: string): Promise<{
    release: {
      id: string;
      slug: string;
      name: string;
      status: ReleaseStatus;
      createdById: string;
      createdAt: Date;
      activatedAt: Date | null;
    };
    entities: Array<{
      id: string;
      slug: string;
      type: EntityType;
      retiredAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      revision: {
        id: string;
        version: number;
        name: string;
        summary: string;
        visibility: Visibility;
        payload: Prisma.JsonValue | null;
        createdAt: Date;
      };
    }>;
    manuscripts: Array<{
      id: string;
      slug: string;
      type: ManuscriptType;
      createdAt: Date;
      updatedAt: Date;
      revision: {
        id: string;
        version: number;
        title: string;
        summary: string;
        visibility: Visibility;
        payload: Prisma.JsonValue | null;
        createdAt: Date;
      };
    }>;
    relationships: Array<{
      id: string;
      relationType: string;
      createdAt: Date;
      updatedAt: Date;
      sourceEntity: {
        id: string;
        slug: string;
      };
      targetEntity: {
        id: string;
        slug: string;
      };
      revision: {
        id: string;
        version: number;
        state: RelationshipRevisionState;
        visibility: Visibility;
        metadata: Prisma.JsonValue | null;
        createdAt: Date;
      };
    }>;
  } | null> {
    const release = await prismaClient.release.findUnique({
      where: {
        slug: releaseSlug
      },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        createdById: true,
        createdAt: true,
        activatedAt: true,
        entries: {
          orderBy: [{ entity: { type: "asc" } }, { entity: { slug: "asc" } }],
          select: {
            entity: {
              select: {
                id: true,
                slug: true,
                type: true,
                retiredAt: true,
                createdAt: true,
                updatedAt: true
              }
            },
            revision: {
              select: {
                id: true,
                version: true,
                name: true,
                summary: true,
                visibility: true,
                payload: true,
                createdAt: true
              }
            }
          }
        },
        manuscriptEntries: {
          orderBy: [{ manuscript: { type: "asc" } }, { manuscript: { slug: "asc" } }],
          select: {
            manuscript: {
              select: {
                id: true,
                slug: true,
                type: true,
                createdAt: true,
                updatedAt: true
              }
            },
            manuscriptRevision: {
              select: {
                id: true,
                version: true,
                title: true,
                summary: true,
                visibility: true,
                payload: true,
                createdAt: true
              }
            }
          }
        },
        relationshipEntries: {
          select: {
            relationship: {
              select: {
                id: true,
                relationType: true,
                createdAt: true,
                updatedAt: true,
                sourceEntity: {
                  select: {
                    id: true,
                    slug: true
                  }
                },
                targetEntity: {
                  select: {
                    id: true,
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
                visibility: true,
                metadata: true,
                createdAt: true
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
      release: {
        id: release.id,
        slug: release.slug,
        name: release.name,
        status: release.status,
        createdById: release.createdById,
        createdAt: release.createdAt,
        activatedAt: release.activatedAt
      },
      entities: release.entries.map((entry) => ({
        id: entry.entity.id,
        slug: entry.entity.slug,
        type: entry.entity.type,
        retiredAt: entry.entity.retiredAt,
        createdAt: entry.entity.createdAt,
        updatedAt: entry.entity.updatedAt,
        revision: entry.revision
      })),
      manuscripts: release.manuscriptEntries.map((entry) => ({
        id: entry.manuscript.id,
        slug: entry.manuscript.slug,
        type: entry.manuscript.type,
        createdAt: entry.manuscript.createdAt,
        updatedAt: entry.manuscript.updatedAt,
        revision: entry.manuscriptRevision
      })),
      relationships: release.relationshipEntries
        .map((entry) => ({
          id: entry.relationship.id,
          relationType: entry.relationship.relationType,
          createdAt: entry.relationship.createdAt,
          updatedAt: entry.relationship.updatedAt,
          sourceEntity: entry.relationship.sourceEntity,
          targetEntity: entry.relationship.targetEntity,
          revision: entry.relationshipRevision
        }))
        .sort(compareRelationships)
    };
  }
};