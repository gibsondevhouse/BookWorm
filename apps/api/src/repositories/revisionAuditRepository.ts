import { type EntityType, type Role } from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";

type AuditedEntityRevisionRecord = {
  id: string;
  version: number;
  createdAt: Date;
  appliedFromProposalId: string | null;
  appliedFromProposal: {
    id: string;
    title: string;
    summary: string;
    appliedBy: {
      id: string;
      email: string;
      displayName: string;
      role: Role;
    } | null;
    appliedAt: Date | null;
    appliedNote: string | null;
  } | null;
};

type AuditedManuscriptRevisionRecord = {
  id: string;
  version: number;
  createdAt: Date;
  appliedFromProposalId: string | null;
  appliedFromProposal: {
    id: string;
    title: string;
    summary: string;
    appliedBy: {
      id: string;
      email: string;
      displayName: string;
      role: Role;
    } | null;
    appliedAt: Date | null;
    appliedNote: string | null;
  } | null;
};

type AuditedRelationshipRevisionRecord = {
  id: string;
  version: number;
  createdAt: Date;
  appliedFromProposalId: string | null;
  appliedFromProposal: {
    id: string;
    title: string;
    summary: string;
    appliedBy: {
      id: string;
      email: string;
      displayName: string;
      role: Role;
    } | null;
    appliedAt: Date | null;
    appliedNote: string | null;
  } | null;
};

const entityRevisionAuditSelect = {
  id: true,
  version: true,
  createdAt: true,
  appliedFromProposalId: true,
  appliedFromProposal: {
    select: {
      id: true,
      title: true,
      summary: true,
      appliedBy: {
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true
        }
      },
      appliedAt: true,
      appliedNote: true
    }
  }
} as const;

const manuscriptRevisionAuditSelect = {
  id: true,
  version: true,
  createdAt: true,
  appliedFromProposalId: true,
  appliedFromProposal: {
    select: {
      id: true,
      title: true,
      summary: true,
      appliedBy: {
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true
        }
      },
      appliedAt: true,
      appliedNote: true
    }
  }
} as const;

const relationshipRevisionAuditSelect = {
  id: true,
  version: true,
  createdAt: true,
  appliedFromProposalId: true,
  appliedFromProposal: {
    select: {
      id: true,
      title: true,
      summary: true,
      appliedBy: {
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true
        }
      },
      appliedAt: true,
      appliedNote: true
    }
  }
} as const;

/**
 * Repository for querying revision audit trails linked to applied proposals.
 * Handles traversing the relationship between revisions and the proposals that generated them.
 */
export const revisionAuditRepository = {
  /**
   * Find all EntityRevisions created by applying proposals for a specific entity.
   * @param input - Entity type and slug
   * @returns Array of revisions with applied proposal metadata
   */
  async findEntityRevisionsByAppliedProposals(input: {
    entityType: EntityType;
    slug: string;
  }): Promise<AuditedEntityRevisionRecord[]> {
    const entity = await prismaClient.entity.findFirst({
      where: {
        type: input.entityType,
        slug: input.slug,
        retiredAt: null
      },
      select: { id: true }
    });

    if (!entity) {
      return [];
    }

    return prismaClient.entityRevision.findMany({
      where: {
        entityId: entity.id,
        appliedFromProposalId: { not: null }
      },
      orderBy: [{ createdAt: "desc" }],
      select: entityRevisionAuditSelect
    });
  },

  /**
   * Find all ManuscriptRevisions created by applying proposals for a specific manuscript.
   * @param input - Manuscript ID
   * @returns Array of revisions with applied proposal metadata
   */
  async findManuscriptRevisionsByAppliedProposals(input: {
    manuscriptId: string;
  }): Promise<AuditedManuscriptRevisionRecord[]> {
    const manuscript = await prismaClient.manuscript.findUnique({
      where: { id: input.manuscriptId },
      select: { id: true }
    });

    if (!manuscript) {
      return [];
    }

    return prismaClient.manuscriptRevision.findMany({
      where: {
        manuscriptId: manuscript.id,
        appliedFromProposalId: { not: null }
      },
      orderBy: [{ createdAt: "desc" }],
      select: manuscriptRevisionAuditSelect
    });
  },

  /**
   * Find all RelationshipRevisions created by applying proposals for a specific relationship.
   * @param input - Relationship ID
   * @returns Array of revisions with applied proposal metadata
   */
  async findRelationshipRevisionsByAppliedProposals(input: {
    relationshipId: string;
  }): Promise<AuditedRelationshipRevisionRecord[]> {
    const relationship = await prismaClient.relationship.findUnique({
      where: { id: input.relationshipId },
      select: { id: true }
    });

    if (!relationship) {
      return [];
    }

    return prismaClient.relationshipRevision.findMany({
      where: {
        relationshipId: relationship.id,
        appliedFromProposalId: { not: null }
      },
      orderBy: [{ createdAt: "desc" }],
      select: relationshipRevisionAuditSelect
    });
  }
};
