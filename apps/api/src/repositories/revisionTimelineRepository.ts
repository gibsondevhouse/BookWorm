import { type EntityType, type ManuscriptType, type Role } from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";

export type RevisionTimelineFilters = {
  from?: Date;
  to?: Date;
  appliedFromProposalId?: string;
  modifiedById?: string;
};

type TimelineProposalMetadata = {
  id: string;
  title: string;
  summary: string;
  appliedAt: Date | null;
  appliedBy: {
    userId: string;
    email: string;
    displayName: string;
    role: Role;
  } | null;
};

type TimelineModifierMetadata = {
  userId: string;
  email: string;
  displayName: string;
  role: Role;
};

export type EntityRevisionTimelineRecord = {
  revisionId: string;
  version: number;
  createdAt: Date;
  modifiedAt: Date;
  modifiedBy: TimelineModifierMetadata;
  appliedFromProposalId: string | null;
  appliedFromProposal: TimelineProposalMetadata | null;
};

export type ManuscriptRevisionTimelineRecord = {
  manuscriptRevisionId: string;
  version: number;
  createdAt: Date;
  modifiedAt: Date;
  modifiedBy: TimelineModifierMetadata;
  appliedFromProposalId: string | null;
  appliedFromProposal: TimelineProposalMetadata | null;
};

const buildCreatedAtFilter = (filters: RevisionTimelineFilters) => {
  if (filters.from === undefined && filters.to === undefined) {
    return undefined;
  }

  return {
    ...(filters.from === undefined ? {} : { gte: filters.from }),
    ...(filters.to === undefined ? {} : { lte: filters.to })
  };
};

const mapModifier = (value: {
  id: string;
  email: string;
  displayName: string;
  role: Role;
}): TimelineModifierMetadata => ({
  userId: value.id,
  email: value.email,
  displayName: value.displayName,
  role: value.role
});

const mapProposal = (value: {
  id: string;
  title: string;
  summary: string;
  appliedAt: Date | null;
  appliedBy: {
    id: string;
    email: string;
    displayName: string;
    role: Role;
  } | null;
} | null): TimelineProposalMetadata | null => {
  if (value === null) {
    return null;
  }

  return {
    id: value.id,
    title: value.title,
    summary: value.summary,
    appliedAt: value.appliedAt,
    appliedBy:
      value.appliedBy === null
        ? null
        : {
            userId: value.appliedBy.id,
            email: value.appliedBy.email,
            displayName: value.appliedBy.displayName,
            role: value.appliedBy.role
          }
  };
};

export const revisionTimelineRepository = {
  async listEntityRevisionTimeline(input: {
    entityType: EntityType;
    slug: string;
    filters: RevisionTimelineFilters;
  }): Promise<EntityRevisionTimelineRecord[]> {
    const createdAtFilter = buildCreatedAtFilter(input.filters);

    const revisions = await prismaClient.entityRevision.findMany({
      where: {
        entity: {
          type: input.entityType,
          slug: input.slug
        },
        ...(createdAtFilter === undefined ? {} : { createdAt: createdAtFilter }),
        ...(input.filters.appliedFromProposalId === undefined
          ? {}
          : {
              appliedFromProposalId: input.filters.appliedFromProposalId
            }),
        ...(input.filters.modifiedById === undefined
          ? {}
          : {
              createdById: input.filters.modifiedById
            })
      },
      orderBy: [{ version: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        version: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true
          }
        },
        appliedFromProposalId: true,
        appliedFromProposal: {
          select: {
            id: true,
            title: true,
            summary: true,
            appliedAt: true,
            appliedBy: {
              select: {
                id: true,
                email: true,
                displayName: true,
                role: true
              }
            }
          }
        }
      }
    });

    return revisions.map((revision) => ({
      revisionId: revision.id,
      version: revision.version,
      createdAt: revision.createdAt,
      modifiedAt: revision.createdAt,
      modifiedBy: mapModifier(revision.createdBy),
      appliedFromProposalId: revision.appliedFromProposalId,
      appliedFromProposal: mapProposal(revision.appliedFromProposal)
    }));
  },

  async listManuscriptRevisionTimeline(input: {
    manuscriptType: ManuscriptType;
    slug: string;
    filters: RevisionTimelineFilters;
  }): Promise<ManuscriptRevisionTimelineRecord[]> {
    const createdAtFilter = buildCreatedAtFilter(input.filters);

    const revisions = await prismaClient.manuscriptRevision.findMany({
      where: {
        manuscript: {
          type: input.manuscriptType,
          slug: input.slug
        },
        ...(createdAtFilter === undefined ? {} : { createdAt: createdAtFilter }),
        ...(input.filters.appliedFromProposalId === undefined
          ? {}
          : {
              appliedFromProposalId: input.filters.appliedFromProposalId
            }),
        ...(input.filters.modifiedById === undefined
          ? {}
          : {
              createdById: input.filters.modifiedById
            })
      },
      orderBy: [{ version: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        version: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true
          }
        },
        appliedFromProposalId: true,
        appliedFromProposal: {
          select: {
            id: true,
            title: true,
            summary: true,
            appliedAt: true,
            appliedBy: {
              select: {
                id: true,
                email: true,
                displayName: true,
                role: true
              }
            }
          }
        }
      }
    });

    return revisions.map((revision) => ({
      manuscriptRevisionId: revision.id,
      version: revision.version,
      createdAt: revision.createdAt,
      modifiedAt: revision.createdAt,
      modifiedBy: mapModifier(revision.createdBy),
      appliedFromProposalId: revision.appliedFromProposalId,
      appliedFromProposal: mapProposal(revision.appliedFromProposal)
    }));
  }
};