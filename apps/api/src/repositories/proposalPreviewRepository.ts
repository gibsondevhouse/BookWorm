import { type Prisma, type Role, type Visibility } from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";

export type ProposalPreviewRecord = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  proposedById: string;
  entityId: string | null;
  manuscriptId: string | null;
  changeType: "CREATE" | "UPDATE" | "DELETE";
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  workflowState: "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "APPLIED" | "ARCHIVED";
  title: string;
  summary: string;
  payload: Prisma.JsonValue | null;
  decisionNote: string | null;
  reviewNotes: string | null;
  decidedAt: Date | null;
  appliedAt: Date | null;
  proposedBy: {
    id: string;
    email: string;
    displayName: string;
    role: Role;
  };
};

export type EntityPreviewTargetRecord = {
  kind: "ENTITY";
  targetId: string;
  targetSlug: string;
  targetType: string;
  currentRevision: {
    revisionId: string;
    version: number;
    name: string;
    summary: string;
    visibility: Visibility;
    payload: Prisma.JsonValue | null;
  } | null;
};

export type ManuscriptPreviewTargetRecord = {
  kind: "MANUSCRIPT";
  targetId: string;
  targetSlug: string;
  targetType: string;
  currentRevision: {
    revisionId: string;
    version: number;
    title: string;
    summary: string;
    visibility: Visibility;
    payload: Prisma.JsonValue | null;
  } | null;
};

export type EntityDeletionImpactRecord = {
  relationshipKeys: string[];
  revisionCount: number;
  releaseEntryCount: number;
  proposalCount: number;
  commentCount: number;
  continuityIssueCount: number;
  dependencyCandidates: Array<{
    entityId: string;
    entitySlug: string;
    version: number;
    payload: Prisma.JsonValue | null;
  }>;
};

export type ManuscriptDeletionImpactRecord = {
  revisionCount: number;
  releaseEntryCount: number;
  proposalCount: number;
  commentCount: number;
  continuityIssueCount: number;
};

export const proposalPreviewRepository = {
  async findProposalById(proposalId: string): Promise<ProposalPreviewRecord | null> {
    return prismaClient.proposal.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        proposedById: true,
        entityId: true,
        manuscriptId: true,
        changeType: true,
        status: true,
        workflowState: true,
        title: true,
        summary: true,
        payload: true,
        decisionNote: true,
        reviewNotes: true,
        decidedAt: true,
        appliedAt: true,
        proposedBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true
          }
        }
      }
    });
  },

  async findEntityTarget(entityId: string): Promise<EntityPreviewTargetRecord | null> {
    const record = await prismaClient.entity.findUnique({
      where: { id: entityId },
      select: {
        id: true,
        slug: true,
        type: true,
        revisions: {
          orderBy: [{ version: "desc" }, { createdAt: "desc" }],
          take: 1,
          select: {
            id: true,
            version: true,
            name: true,
            summary: true,
            visibility: true,
            payload: true
          }
        }
      }
    });

    if (!record) {
      return null;
    }

    const currentRevision = record.revisions[0] ?? null;

    return {
      kind: "ENTITY",
      targetId: record.id,
      targetSlug: record.slug,
      targetType: record.type,
      currentRevision:
        currentRevision === null
          ? null
          : {
              revisionId: currentRevision.id,
              version: currentRevision.version,
              name: currentRevision.name,
              summary: currentRevision.summary,
              visibility: currentRevision.visibility,
              payload: currentRevision.payload
            }
    };
  },

  async findManuscriptTarget(manuscriptId: string): Promise<ManuscriptPreviewTargetRecord | null> {
    const record = await prismaClient.manuscript.findUnique({
      where: { id: manuscriptId },
      select: {
        id: true,
        slug: true,
        type: true,
        revisions: {
          orderBy: [{ version: "desc" }, { createdAt: "desc" }],
          take: 1,
          select: {
            id: true,
            version: true,
            title: true,
            summary: true,
            visibility: true,
            payload: true
          }
        }
      }
    });

    if (!record) {
      return null;
    }

    const currentRevision = record.revisions[0] ?? null;

    return {
      kind: "MANUSCRIPT",
      targetId: record.id,
      targetSlug: record.slug,
      targetType: record.type,
      currentRevision:
        currentRevision === null
          ? null
          : {
              revisionId: currentRevision.id,
              version: currentRevision.version,
              title: currentRevision.title,
              summary: currentRevision.summary,
              visibility: currentRevision.visibility,
              payload: currentRevision.payload
            }
    };
  },

  async getEntityDeletionImpact(entityId: string): Promise<EntityDeletionImpactRecord> {
    const [relationships, revisionCount, releaseEntryCount, proposalCount, commentCount, continuityIssueCount, dependencyCandidates] =
      await Promise.all([
        prismaClient.relationship.findMany({
          where: {
            OR: [{ sourceEntityId: entityId }, { targetEntityId: entityId }]
          },
          select: {
            relationType: true,
            sourceEntity: { select: { slug: true } },
            targetEntity: { select: { slug: true } }
          }
        }),
        prismaClient.entityRevision.count({ where: { entityId } }),
        prismaClient.releaseEntry.count({ where: { entityId } }),
        prismaClient.proposal.count({ where: { entityId } }),
        prismaClient.comment.count({ where: { entityId } }),
        prismaClient.continuityIssue.count({ where: { entityId } }),
        prismaClient.entityRevision.findMany({
          where: { entityId: { not: entityId } },
          select: {
            version: true,
            payload: true,
            entity: {
              select: {
                id: true,
                slug: true
              }
            }
          }
        })
      ]);

    return {
      relationshipKeys: relationships
        .map(
          (relationship) =>
            `${relationship.sourceEntity.slug}|${relationship.relationType}|${relationship.targetEntity.slug}`
        )
        .sort((left, right) => left.localeCompare(right)),
      revisionCount,
      releaseEntryCount,
      proposalCount,
      commentCount,
      continuityIssueCount,
      dependencyCandidates: dependencyCandidates.map((candidate) => ({
        entityId: candidate.entity.id,
        entitySlug: candidate.entity.slug,
        version: candidate.version,
        payload: candidate.payload
      }))
    };
  },

  async getManuscriptDeletionImpact(manuscriptId: string): Promise<ManuscriptDeletionImpactRecord> {
    const [revisionCount, releaseEntryCount, proposalCount, commentCount, continuityIssueCount] = await Promise.all([
      prismaClient.manuscriptRevision.count({ where: { manuscriptId } }),
      prismaClient.releaseManuscriptEntry.count({ where: { manuscriptId } }),
      prismaClient.proposal.count({ where: { manuscriptId } }),
      prismaClient.comment.count({ where: { manuscriptId } }),
      prismaClient.continuityIssue.count({ where: { manuscriptId } })
    ]);

    return {
      revisionCount,
      releaseEntryCount,
      proposalCount,
      commentCount,
      continuityIssueCount
    };
  }
};