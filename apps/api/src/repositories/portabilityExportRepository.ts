import type {
  ApprovalChainStatus,
  ApprovalStepEventType,
  ApprovalStepStatus,
  EntityType,
  ManuscriptType,
  NotificationEventStatus,
  NotificationEventType,
  Prisma,
  ReleaseStatus,
  ReviewRequestStatus,
  Role,
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
    governance: {
      reviewRequests: Array<{
        id: string;
        proposalId: string;
        createdById: string;
        assignedApproverId: string | null;
        assignedAt: Date | null;
        assignmentHistory: Prisma.JsonValue | null;
        lifecycleHistory: Prisma.JsonValue | null;
        status: ReviewRequestStatus;
        createdAt: Date;
        updatedAt: Date;
      }>;
      approvalChains: Array<{
        id: string;
        reviewRequestId: string;
        status: ApprovalChainStatus;
        currentStepOrder: number;
        finalizedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
      }>;
      approvalSteps: Array<{
        id: string;
        chainId: string;
        stepOrder: number;
        title: string;
        required: boolean;
        status: ApprovalStepStatus;
        assignedReviewerId: string | null;
        assignedRole: Role | null;
        acknowledgedAt: Date | null;
        acknowledgedById: string | null;
        decidedAt: Date | null;
        decidedById: string | null;
        decisionNote: string | null;
        escalationLevel: number;
        escalatedAt: Date | null;
        escalatedById: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>;
      approvalStepEvents: Array<{
        id: string;
        stepId: string;
        eventType: ApprovalStepEventType;
        reasonCode: string;
        reasonNote: string | null;
        actorUserId: string;
        fromAssignedReviewerId: string | null;
        fromAssignedRole: Role | null;
        toAssignedReviewerId: string | null;
        toAssignedRole: Role | null;
        escalationLevel: number;
        createdAt: Date;
      }>;
      notificationEvents: Array<{
        id: string;
        eventType: NotificationEventType;
        eventKey: string;
        status: NotificationEventStatus;
        reviewRequestId: string | null;
        approvalChainId: string | null;
        approvalStepId: string | null;
        actorUserId: string | null;
        payload: Prisma.JsonValue | null;
        attemptCount: number;
        nextAttemptAt: Date;
        lastAttemptAt: Date | null;
        deliveredAt: Date | null;
        lastError: string | null;
        processingToken: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>;
      notificationPreferences: Array<{
        id: string;
        userId: string;
        eventType: NotificationEventType;
        enabled: boolean;
        createdAt: Date;
        updatedAt: Date;
      }>;
    };
  }> {
    const [
      entities,
      manuscripts,
      relationships,
      reviewRequests,
      approvalChains,
      approvalSteps,
      approvalStepEvents,
      notificationEvents,
      notificationPreferences
    ] = await prismaClient.$transaction([
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
      }),
      prismaClient.reviewRequest.findMany({
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          proposalId: true,
          createdById: true,
          assignedApproverId: true,
          assignedAt: true,
          assignmentHistory: true,
          lifecycleHistory: true,
          status: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prismaClient.approvalChain.findMany({
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          reviewRequestId: true,
          status: true,
          currentStepOrder: true,
          finalizedAt: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prismaClient.approvalStep.findMany({
        orderBy: [{ chainId: "asc" }, { stepOrder: "asc" }, { id: "asc" }],
        select: {
          id: true,
          chainId: true,
          stepOrder: true,
          title: true,
          required: true,
          status: true,
          assignedReviewerId: true,
          assignedRole: true,
          acknowledgedAt: true,
          acknowledgedById: true,
          decidedAt: true,
          decidedById: true,
          decisionNote: true,
          escalationLevel: true,
          escalatedAt: true,
          escalatedById: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prismaClient.approvalStepEvent.findMany({
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          stepId: true,
          eventType: true,
          reasonCode: true,
          reasonNote: true,
          actorUserId: true,
          fromAssignedReviewerId: true,
          fromAssignedRole: true,
          toAssignedReviewerId: true,
          toAssignedRole: true,
          escalationLevel: true,
          createdAt: true
        }
      }),
      prismaClient.notificationEvent.findMany({
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          eventType: true,
          eventKey: true,
          status: true,
          reviewRequestId: true,
          approvalChainId: true,
          approvalStepId: true,
          actorUserId: true,
          payload: true,
          attemptCount: true,
          nextAttemptAt: true,
          lastAttemptAt: true,
          deliveredAt: true,
          lastError: true,
          processingToken: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prismaClient.notificationPreference.findMany({
        orderBy: [{ userId: "asc" }, { eventType: "asc" }],
        select: {
          id: true,
          userId: true,
          eventType: true,
          enabled: true,
          createdAt: true,
          updatedAt: true
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
        .sort(compareRelationships),
      governance: {
        reviewRequests,
        approvalChains,
        approvalSteps,
        approvalStepEvents,
        notificationEvents,
        notificationPreferences
      }
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
    governance: {
      reviewRequests: Array<{
        id: string;
        proposalId: string;
        createdById: string;
        assignedApproverId: string | null;
        assignedAt: Date | null;
        assignmentHistory: Prisma.JsonValue | null;
        lifecycleHistory: Prisma.JsonValue | null;
        status: ReviewRequestStatus;
        createdAt: Date;
        updatedAt: Date;
      }>;
      approvalChains: Array<{
        id: string;
        reviewRequestId: string;
        status: ApprovalChainStatus;
        currentStepOrder: number;
        finalizedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
      }>;
      approvalSteps: Array<{
        id: string;
        chainId: string;
        stepOrder: number;
        title: string;
        required: boolean;
        status: ApprovalStepStatus;
        assignedReviewerId: string | null;
        assignedRole: Role | null;
        acknowledgedAt: Date | null;
        acknowledgedById: string | null;
        decidedAt: Date | null;
        decidedById: string | null;
        decisionNote: string | null;
        escalationLevel: number;
        escalatedAt: Date | null;
        escalatedById: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>;
      approvalStepEvents: Array<{
        id: string;
        stepId: string;
        eventType: ApprovalStepEventType;
        reasonCode: string;
        reasonNote: string | null;
        actorUserId: string;
        fromAssignedReviewerId: string | null;
        fromAssignedRole: Role | null;
        toAssignedReviewerId: string | null;
        toAssignedRole: Role | null;
        escalationLevel: number;
        createdAt: Date;
      }>;
      notificationEvents: Array<{
        id: string;
        eventType: NotificationEventType;
        eventKey: string;
        status: NotificationEventStatus;
        reviewRequestId: string | null;
        approvalChainId: string | null;
        approvalStepId: string | null;
        actorUserId: string | null;
        payload: Prisma.JsonValue | null;
        attemptCount: number;
        nextAttemptAt: Date;
        lastAttemptAt: Date | null;
        deliveredAt: Date | null;
        lastError: string | null;
        processingToken: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>;
      notificationPreferences: Array<{
        id: string;
        userId: string;
        eventType: NotificationEventType;
        enabled: boolean;
        createdAt: Date;
        updatedAt: Date;
      }>;
    };
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
        .sort(compareRelationships),
      governance: {
        reviewRequests: await prismaClient.reviewRequest.findMany({
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            proposalId: true,
            createdById: true,
            assignedApproverId: true,
            assignedAt: true,
            assignmentHistory: true,
            lifecycleHistory: true,
            status: true,
            createdAt: true,
            updatedAt: true
          }
        }),
        approvalChains: await prismaClient.approvalChain.findMany({
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            reviewRequestId: true,
            status: true,
            currentStepOrder: true,
            finalizedAt: true,
            createdAt: true,
            updatedAt: true
          }
        }),
        approvalSteps: await prismaClient.approvalStep.findMany({
          orderBy: [{ chainId: "asc" }, { stepOrder: "asc" }, { id: "asc" }],
          select: {
            id: true,
            chainId: true,
            stepOrder: true,
            title: true,
            required: true,
            status: true,
            assignedReviewerId: true,
            assignedRole: true,
            acknowledgedAt: true,
            acknowledgedById: true,
            decidedAt: true,
            decidedById: true,
            decisionNote: true,
            escalationLevel: true,
            escalatedAt: true,
            escalatedById: true,
            createdAt: true,
            updatedAt: true
          }
        }),
        approvalStepEvents: await prismaClient.approvalStepEvent.findMany({
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            stepId: true,
            eventType: true,
            reasonCode: true,
            reasonNote: true,
            actorUserId: true,
            fromAssignedReviewerId: true,
            fromAssignedRole: true,
            toAssignedReviewerId: true,
            toAssignedRole: true,
            escalationLevel: true,
            createdAt: true
          }
        }),
        notificationEvents: await prismaClient.notificationEvent.findMany({
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            eventType: true,
            eventKey: true,
            status: true,
            reviewRequestId: true,
            approvalChainId: true,
            approvalStepId: true,
            actorUserId: true,
            payload: true,
            attemptCount: true,
            nextAttemptAt: true,
            lastAttemptAt: true,
            deliveredAt: true,
            lastError: true,
            processingToken: true,
            createdAt: true,
            updatedAt: true
          }
        }),
        notificationPreferences: await prismaClient.notificationPreference.findMany({
          orderBy: [{ userId: "asc" }, { eventType: "asc" }],
          select: {
            id: true,
            userId: true,
            eventType: true,
            enabled: true,
            createdAt: true,
            updatedAt: true
          }
        })
      }
    };
  }
};