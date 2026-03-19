import type { EntityType, ManuscriptType, ReleaseStatus, RelationshipRevisionState, Visibility } from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";

export type ReleaseReviewEntityEntry = {
  entitySlug: string;
  entityType: EntityType;
  revisionId: string;
  version: number;
  name: string;
  summary: string;
  visibility: Visibility;
};

export type ReleaseReviewRelationshipEntry = {
  relationshipId: string;
  relationshipRevisionId: string;
  relationType: string;
  sourceEntitySlug: string;
  targetEntitySlug: string;
  version: number;
  state: RelationshipRevisionState;
  visibility: Visibility;
};

export type ReleaseReviewManuscriptEntry = {
  manuscriptSlug: string;
  manuscriptType: ManuscriptType;
  manuscriptRevisionId: string;
  version: number;
  title: string;
  summary: string;
  visibility: Visibility;
};

export type ReleaseReviewRecord = {
  slug: string;
  name: string;
  status: ReleaseStatus;
  activatedAt: Date | null;
  entityEntries: ReleaseReviewEntityEntry[];
  manuscriptEntries: ReleaseReviewManuscriptEntry[];
  relationshipEntries: ReleaseReviewRelationshipEntry[];
};

export const releaseReviewRepository = {
  async getReleaseReview(releaseSlug: string): Promise<ReleaseReviewRecord> {
    const release = await prismaClient.release.findUnique({
      where: { slug: releaseSlug },
      select: {
        slug: true,
        name: true,
        status: true,
        activatedAt: true,
        entries: {
          orderBy: {
            entity: {
              slug: "asc"
            }
          },
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
                name: true,
                summary: true,
                visibility: true
              }
            }
          }
        },
        manuscriptEntries: {
          orderBy: {
            manuscript: {
              slug: "asc"
            }
          },
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
                title: true,
                summary: true,
                visibility: true
              }
            }
          }
        },
        relationshipEntries: {
          orderBy: {
            relationship: {
              relationType: "asc"
            }
          },
          select: {
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
        }
      }
    });

    if (!release) {
      throw new Error("Release not found");
    }

    return {
      slug: release.slug,
      name: release.name,
      status: release.status,
      activatedAt: release.activatedAt,
      entityEntries: release.entries.map((entry) => ({
        entitySlug: entry.entity.slug,
        entityType: entry.entity.type,
        revisionId: entry.revision.id,
        version: entry.revision.version,
        name: entry.revision.name,
        summary: entry.revision.summary,
        visibility: entry.revision.visibility
      })),
      manuscriptEntries: release.manuscriptEntries.map((entry) => ({
        manuscriptSlug: entry.manuscript.slug,
        manuscriptType: entry.manuscript.type,
        manuscriptRevisionId: entry.manuscriptRevision.id,
        version: entry.manuscriptRevision.version,
        title: entry.manuscriptRevision.title,
        summary: entry.manuscriptRevision.summary,
        visibility: entry.manuscriptRevision.visibility
      })),
      relationshipEntries: release.relationshipEntries.map((entry) => ({
        relationshipId: entry.relationship.id,
        relationshipRevisionId: entry.relationshipRevision.id,
        relationType: entry.relationship.relationType,
        sourceEntitySlug: entry.relationship.sourceEntity.slug,
        targetEntitySlug: entry.relationship.targetEntity.slug,
        version: entry.relationshipRevision.version,
        state: entry.relationshipRevision.state,
        visibility: entry.relationshipRevision.visibility
      }))
    };
  }
};