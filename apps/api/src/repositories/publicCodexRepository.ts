import type { EntityType, ReleaseStatus, Visibility } from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";
import { entityMetadataContract } from "../lib/entityMetadataContract.js";
import { releaseHistoryRepository } from "./releaseHistoryRepository.js";

type EntityMetadataRecord = ReturnType<(typeof entityMetadataContract)["readMetadata"]>;

type PublicCodexEntityType = "CHARACTER" | "FACTION" | "LOCATION" | "EVENT";

type PublicCodexListItem = {
  releaseSlug: string;
  entityType: PublicCodexEntityType;
  slug: string;
  name: string;
  summary: string;
  visibility: Visibility;
  metadata: EntityMetadataRecord;
  version: number;
  detailPath: string;
  detailHref: string;
};

type PublicCodexListResult =
  | {
      found: false;
      releaseSlug: string;
    }
  | {
      found: true;
      releaseSlug: string | null;
      items: PublicCodexListItem[];
    };

type PublicCodexRelatedItem = {
  releaseSlug: string;
  relationshipId: string;
  relationshipRevisionId: string;
  relationType: string;
  relationshipVersion: number;
  sourceEntitySlug: string;
  targetEntitySlug: string;
  neighborEntityType: PublicCodexEntityType;
  neighborSlug: string;
  neighborName: string;
  neighborSummary: string;
  neighborVisibility: Visibility;
  neighborVersion: number;
  detailPath: string;
  detailHref: string;
};

type PublicCodexRelatedResult =
  | {
      found: false;
      releaseSlug: string;
    }
  | {
      found: true;
      releaseSlug: string;
      entityType: PublicCodexEntityType;
      slug: string;
      sourceFound: boolean;
      items: PublicCodexRelatedItem[];
    };

type TimelineAnchorRecord = {
  timelineEraSlug: string | null;
  anchorLabel: string;
  sortKey: string;
};

type PublicCodexTimelineEventItem = {
  releaseSlug: string;
  entityType: "EVENT";
  slug: string;
  name: string;
  summary: string;
  visibility: Visibility;
  metadata: EntityMetadataRecord;
  timelineAnchor: TimelineAnchorRecord;
  version: number;
  detailPath: string;
  detailHref: string;
};

type PublicCodexTimelineEventResult =
  | {
      found: false;
      releaseSlug: string;
    }
  | {
      found: true;
      releaseSlug: string | null;
      items: PublicCodexTimelineEventItem[];
    };

const publicCodexEntityTypes: PublicCodexEntityType[] = ["CHARACTER", "FACTION", "LOCATION", "EVENT"];
const publicReleaseStatuses: ReleaseStatus[] = ["ACTIVE", "ARCHIVED"];

const buildDetailPath = (input: { entityType: PublicCodexEntityType; slug: string }): string => {
  switch (input.entityType) {
    case "CHARACTER": {
      return `/characters/${input.slug}`;
    }
    case "FACTION": {
      return `/factions/${input.slug}`;
    }
    case "LOCATION": {
      return `/locations/${input.slug}`;
    }
    case "EVENT": {
      return `/events/${input.slug}`;
    }
  }
};

const buildDetailHref = (input: {
  detailPath: string;
  releaseSlug: string;
  includeReleaseSlugInHref: boolean;
}): string => {
  if (!input.includeReleaseSlugInHref) {
    return input.detailPath;
  }

  const encodedReleaseSlug = encodeURIComponent(input.releaseSlug);
  return `${input.detailPath}?releaseSlug=${encodedReleaseSlug}`;
};

const findPublicRelease = async (releaseSlug?: string): Promise<{ found: boolean; releaseId: string | null; releaseSlug: string | null }> => {
  if (releaseSlug === undefined) {
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
        found: true,
        releaseId: null,
        releaseSlug: null
      };
    }

    return {
      found: true,
      releaseId: activeRelease.id,
      releaseSlug: activeRelease.slug
    };
  }

  const selectedRelease = await prismaClient.release.findFirst({
    where: {
      slug: releaseSlug,
      status: {
        in: publicReleaseStatuses
      }
    },
    select: {
      id: true,
      slug: true
    }
  });

  if (!selectedRelease) {
    return {
      found: false,
      releaseId: null,
      releaseSlug
    };
  }

  return {
    found: true,
    releaseId: selectedRelease.id,
    releaseSlug: selectedRelease.slug
  };
};

export const publicCodexRepository = {
  async listReleases(input: {
    limit: number;
    offset: number;
  }): Promise<{
    items: Array<{
      slug: string;
      name: string;
      status: "ACTIVE" | "ARCHIVED";
      activatedAt: string | null;
      createdAt: string;
      browseHref: string;
    }>;
    page: {
      limit: number;
      offset: number;
      total: number;
    };
  }> {
    const releaseArchive = await releaseHistoryRepository.listPublicArchiveReleases({
      limit: input.limit,
      offset: input.offset
    });

    return {
      items: releaseArchive.items.map((item) => ({
        slug: item.slug,
        name: item.name,
        status: item.status,
        activatedAt: item.activatedAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
        browseHref: `/codex?releaseSlug=${encodeURIComponent(item.slug)}`
      })),
      page: {
        limit: input.limit,
        offset: input.offset,
        total: releaseArchive.total
      }
    };
  },

  async listContent(input: {
    releaseSlug?: string;
    entityType?: EntityType;
    query?: string;
    limit: number;
  }): Promise<PublicCodexListResult> {
    const release = await findPublicRelease(input.releaseSlug);

    if (!release.found) {
      return {
        found: false,
        releaseSlug: release.releaseSlug ?? ""
      };
    }

    if (release.releaseId === null || release.releaseSlug === null) {
      return {
        found: true,
        releaseSlug: null,
        items: []
      };
    }

    const selectedReleaseSlug = release.releaseSlug;

    const trimmedQuery = input.query?.trim();

    const entries = await prismaClient.releaseEntry.findMany({
      where: {
        releaseId: release.releaseId,
        entity: {
          retiredAt: null,
          ...(input.entityType === undefined ? { type: { in: publicCodexEntityTypes } } : { type: input.entityType })
        },
        revision: {
          visibility: "PUBLIC"
        },
        ...(trimmedQuery === undefined || trimmedQuery.length === 0
          ? {}
          : {
              OR: [
                { revision: { name: { contains: trimmedQuery, mode: "insensitive" } } },
                { revision: { summary: { contains: trimmedQuery, mode: "insensitive" } } },
                { entity: { slug: { contains: trimmedQuery, mode: "insensitive" } } }
              ]
            })
      },
      orderBy: [{ entity: { type: "asc" } }, { revision: { name: "asc" } }, { entity: { slug: "asc" } }],
      take: input.limit,
      select: {
        entity: {
          select: {
            type: true,
            slug: true
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

    return {
      found: true,
      releaseSlug: selectedReleaseSlug,
      items: entries.map((entry) => {
        const detailPath = buildDetailPath({
          entityType: entry.entity.type as PublicCodexEntityType,
          slug: entry.entity.slug
        });

        return {
          releaseSlug: selectedReleaseSlug,
          entityType: entry.entity.type as PublicCodexEntityType,
          slug: entry.entity.slug,
          name: entry.revision.name,
          summary: entry.revision.summary,
          visibility: entry.revision.visibility,
          metadata: entityMetadataContract.readMetadata({
            entityType: entry.entity.type,
            payload: entry.revision.payload
          }),
          version: entry.revision.version,
          detailPath,
          detailHref: buildDetailHref({
            detailPath,
            releaseSlug: selectedReleaseSlug,
            includeReleaseSlugInHref: input.releaseSlug !== undefined
          })
        };
      })
    };
  },

  async listRelatedContent(input: {
    releaseSlug?: string;
    entityType: EntityType;
    slug: string;
    limit: number;
  }): Promise<PublicCodexRelatedResult> {
    if (!publicCodexEntityTypes.includes(input.entityType as PublicCodexEntityType)) {
      return {
        found: true,
        releaseSlug: input.releaseSlug ?? "",
        entityType: input.entityType as PublicCodexEntityType,
        slug: input.slug,
        sourceFound: false,
        items: []
      };
    }

    const release = await findPublicRelease(input.releaseSlug);

    if (!release.found) {
      return {
        found: false,
        releaseSlug: release.releaseSlug ?? ""
      };
    }

    if (release.releaseId === null || release.releaseSlug === null) {
      return {
        found: true,
        releaseSlug: input.releaseSlug ?? "",
        entityType: input.entityType as PublicCodexEntityType,
        slug: input.slug,
        sourceFound: false,
        items: []
      };
    }

    const selectedReleaseSlug = release.releaseSlug;

    const sourceReleaseEntry = await prismaClient.releaseEntry.findFirst({
      where: {
        releaseId: release.releaseId,
        entity: {
          slug: input.slug,
          type: input.entityType,
          retiredAt: null
        },
        revision: {
          visibility: "PUBLIC"
        }
      },
      select: {
        entityId: true
      }
    });

    if (!sourceReleaseEntry) {
      return {
        found: true,
        releaseSlug: release.releaseSlug,
        entityType: input.entityType as PublicCodexEntityType,
        slug: input.slug,
        sourceFound: false,
        items: []
      };
    }

    const relationshipEntries = await prismaClient.releaseRelationshipEntry.findMany({
      where: {
        releaseId: release.releaseId,
        relationshipRevision: {
          visibility: "PUBLIC",
          state: {
            not: "DELETE"
          }
        },
        OR: [
          {
            relationship: {
              sourceEntityId: sourceReleaseEntry.entityId,
              targetEntity: {
                retiredAt: null,
                type: {
                  in: publicCodexEntityTypes
                },
                releaseEntries: {
                  some: {
                    releaseId: release.releaseId,
                    revision: {
                      visibility: "PUBLIC"
                    }
                  }
                }
              }
            }
          },
          {
            relationship: {
              targetEntityId: sourceReleaseEntry.entityId,
              sourceEntity: {
                retiredAt: null,
                type: {
                  in: publicCodexEntityTypes
                },
                releaseEntries: {
                  some: {
                    releaseId: release.releaseId,
                    revision: {
                      visibility: "PUBLIC"
                    }
                  }
                }
              }
            }
          }
        ]
      },
      select: {
        relationship: {
          select: {
            id: true,
            relationType: true,
            sourceEntityId: true,
            sourceEntity: {
              select: {
                slug: true,
                type: true,
                releaseEntries: {
                  where: {
                    releaseId: release.releaseId,
                    revision: {
                      visibility: "PUBLIC"
                    }
                  },
                  take: 1,
                  select: {
                    revision: {
                      select: {
                        name: true,
                        summary: true,
                        visibility: true,
                        version: true
                      }
                    }
                  }
                }
              }
            },
            targetEntity: {
              select: {
                slug: true,
                type: true,
                releaseEntries: {
                  where: {
                    releaseId: release.releaseId,
                    revision: {
                      visibility: "PUBLIC"
                    }
                  },
                  take: 1,
                  select: {
                    revision: {
                      select: {
                        name: true,
                        summary: true,
                        visibility: true,
                        version: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        relationshipRevision: {
          select: {
            id: true,
            version: true
          }
        }
      }
    });

    const mappedItems = relationshipEntries
      .map((entry) => {
        const neighbor =
          entry.relationship.sourceEntityId === sourceReleaseEntry.entityId
            ? {
                entity: entry.relationship.targetEntity,
                sourceEntitySlug: entry.relationship.sourceEntity.slug,
                targetEntitySlug: entry.relationship.targetEntity.slug
              }
            : {
                entity: entry.relationship.sourceEntity,
                sourceEntitySlug: entry.relationship.sourceEntity.slug,
                targetEntitySlug: entry.relationship.targetEntity.slug
              };

        const neighborRevision = neighbor.entity.releaseEntries[0]?.revision;

        if (!neighborRevision) {
          return null;
        }

        const detailPath = buildDetailPath({
          entityType: neighbor.entity.type as PublicCodexEntityType,
          slug: neighbor.entity.slug
        });

        return {
          releaseSlug: selectedReleaseSlug,
          relationshipId: entry.relationship.id,
          relationshipRevisionId: entry.relationshipRevision.id,
          relationType: entry.relationship.relationType,
          relationshipVersion: entry.relationshipRevision.version,
          sourceEntitySlug: neighbor.sourceEntitySlug,
          targetEntitySlug: neighbor.targetEntitySlug,
          neighborEntityType: neighbor.entity.type as PublicCodexEntityType,
          neighborSlug: neighbor.entity.slug,
          neighborName: neighborRevision.name,
          neighborSummary: neighborRevision.summary,
          neighborVisibility: neighborRevision.visibility,
          neighborVersion: neighborRevision.version,
          detailPath,
          detailHref: buildDetailHref({
            detailPath,
            releaseSlug: selectedReleaseSlug,
            includeReleaseSlugInHref: input.releaseSlug !== undefined
          })
        };
      })
      .filter((item): item is PublicCodexRelatedItem => item !== null);

    mappedItems.sort((left, right) => {
      const relationCompare = left.relationType.localeCompare(right.relationType);

      if (relationCompare !== 0) {
        return relationCompare;
      }

      const neighborNameCompare = left.neighborName.localeCompare(right.neighborName);

      if (neighborNameCompare !== 0) {
        return neighborNameCompare;
      }

      const neighborSlugCompare = left.neighborSlug.localeCompare(right.neighborSlug);

      if (neighborSlugCompare !== 0) {
        return neighborSlugCompare;
      }

      return left.relationshipId.localeCompare(right.relationshipId);
    });

    return {
      found: true,
      releaseSlug: selectedReleaseSlug,
      entityType: input.entityType as PublicCodexEntityType,
      slug: input.slug,
      sourceFound: true,
      items: mappedItems.slice(0, input.limit)
    };
  },

  async listTimelineEvents(input: {
    releaseSlug?: string;
    limit: number;
  }): Promise<PublicCodexTimelineEventResult> {
    const release = await findPublicRelease(input.releaseSlug);

    if (!release.found) {
      return {
        found: false,
        releaseSlug: release.releaseSlug ?? ""
      };
    }

    if (release.releaseId === null || release.releaseSlug === null) {
      return {
        found: true,
        releaseSlug: null,
        items: []
      };
    }

    const selectedReleaseSlug = release.releaseSlug;

    const entries = await prismaClient.releaseEntry.findMany({
      where: {
        releaseId: release.releaseId,
        entity: {
          type: "EVENT",
          retiredAt: null
        },
        revision: {
          visibility: "PUBLIC"
        }
      },
      select: {
        entity: {
          select: {
            slug: true
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

    const mappedItems = entries
      .map((entry) => {
        const metadata = entityMetadataContract.readMetadata({
          entityType: "EVENT",
          payload: entry.revision.payload
        });

        if (metadata.timelineAnchor === null || metadata.timelineAnchor.sortKey === null) {
          return null;
        }

        const detailPath = buildDetailPath({
          entityType: "EVENT",
          slug: entry.entity.slug
        });

        return {
          releaseSlug: selectedReleaseSlug,
          entityType: "EVENT" as const,
          slug: entry.entity.slug,
          name: entry.revision.name,
          summary: entry.revision.summary,
          visibility: entry.revision.visibility,
          metadata,
          timelineAnchor: {
            timelineEraSlug: metadata.timelineAnchor.timelineEraSlug,
            anchorLabel: metadata.timelineAnchor.anchorLabel,
            sortKey: metadata.timelineAnchor.sortKey
          },
          version: entry.revision.version,
          detailPath,
          detailHref: buildDetailHref({
            detailPath,
            releaseSlug: selectedReleaseSlug,
            includeReleaseSlugInHref: input.releaseSlug !== undefined
          })
        };
      })
      .filter((item): item is PublicCodexTimelineEventItem => item !== null);

    mappedItems.sort((left, right) => {
      const sortKeyCompare = left.timelineAnchor.sortKey.localeCompare(right.timelineAnchor.sortKey);

      if (sortKeyCompare !== 0) {
        return sortKeyCompare;
      }

      const nameCompare = left.name.localeCompare(right.name);

      if (nameCompare !== 0) {
        return nameCompare;
      }

      return left.slug.localeCompare(right.slug);
    });

    return {
      found: true,
      releaseSlug: selectedReleaseSlug,
      items: mappedItems.slice(0, input.limit)
    };
  }
};
