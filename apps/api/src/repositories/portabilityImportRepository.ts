import {
  Prisma,
  type ApprovalChainStatus,
  type ApprovalStepEventType,
  type ApprovalStepStatus,
  type EntityType,
  type ManuscriptType,
  type NotificationEventStatus,
  type NotificationEventType,
  type RelationshipRevisionState,
  type ReviewRequestStatus,
  type Role,
  type Visibility
} from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";

export type ActorRecord = {
  id: string;
  email: string;
  role: string;
};

export type EntityRecord = {
  id: string;
  slug: string;
  type: EntityType;
  retiredAt: Date | null;
  latestRevision: {
    id: string;
    version: number;
    name: string;
    summary: string;
    visibility: Visibility;
    payload: Prisma.JsonValue | null;
  } | null;
};

export type ManuscriptRecord = {
  id: string;
  slug: string;
  type: ManuscriptType;
  latestRevision: {
    id: string;
    version: number;
    title: string;
    summary: string;
    visibility: Visibility;
    payload: Prisma.JsonValue | null;
  } | null;
};

export type RelationshipRecord = {
  id: string;
  relationType: string;
  sourceEntityId: string;
  targetEntityId: string;
  latestRevision: {
    id: string;
    version: number;
    state: RelationshipRevisionState;
    visibility: Visibility;
    metadata: Prisma.JsonValue | null;
  } | null;
};

export type ReleaseSlugRecord = {
  id: string;
  slug: string;
  status: string;
};

const toNullableJsonInput = (
  value: unknown
): Prisma.InputJsonValue | Prisma.NullTypes.JsonNull =>
  value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);

type EntityRevisionData = {
  name: string;
  summary: string;
  visibility: string;
  payload: unknown;
};

type ManuscriptRevisionData = {
  title: string;
  summary: string;
  visibility: string;
  payload: unknown;
};

type RelationshipRevisionData = {
  state: string;
  visibility: string;
  metadata: unknown;
};

export type EntityApplyOp =
  | {
      action: "NO_CHANGE";
      slug: string;
      entityId: string;
      revisionId: string;
      newRetiredAt?: Date | null;
    }
  | {
      action: "CREATE";
      slug: string;
      type: string;
      retiredAt: Date | null;
      nextVersion: 1;
      revision: EntityRevisionData;
    }
  | {
      action: "CREATE_REVISION";
      slug: string;
      entityId: string;
      nextVersion: number;
      retiredAt?: Date | null;
      revision: EntityRevisionData;
    };

export type ManuscriptApplyOp =
  | {
      action: "NO_CHANGE";
      slug: string;
      manuscriptId: string;
      revisionId: string;
    }
  | {
      action: "CREATE";
      slug: string;
      type: string;
      nextVersion: 1;
      revision: ManuscriptRevisionData;
    }
  | {
      action: "CREATE_REVISION";
      slug: string;
      manuscriptId: string;
      nextVersion: number;
      revision: ManuscriptRevisionData;
    };

export type RelationshipApplyOp =
  | {
      action: "NO_CHANGE";
      key: string;
      relationshipId: string;
      revisionId: string;
    }
  | {
      action: "CREATE";
      key: string;
      sourceEntitySlug: string;
      targetEntitySlug: string;
      relationType: string;
      nextVersion: 1;
      revision: RelationshipRevisionData;
    }
  | {
      action: "CREATE_REVISION";
      key: string;
      relationshipId: string;
      nextVersion: number;
      revision: RelationshipRevisionData;
    };

export type ReleaseCreateOp = {
  action: "CREATE";
  slug: string;
  name: string;
  compositionEntitySlugs: string[];
  compositionManuscriptSlugs: string[];
  compositionRelationshipKeys: string[];
};

export type ImportApplyPlan = {
  entities: EntityApplyOp[];
  manuscripts: ManuscriptApplyOp[];
  relationships: RelationshipApplyOp[];
  releases: ReleaseCreateOp[];
  governance: {
    reviewRequests: ReviewRequestApplyOp[];
    approvalChains: ApprovalChainApplyOp[];
    approvalSteps: ApprovalStepApplyOp[];
    approvalStepEvents: ApprovalStepEventApplyOp[];
    notificationEvents: NotificationEventApplyOp[];
    notificationPreferences: NotificationPreferenceApplyOp[];
  };
};

export type ReviewRequestApplyOp =
  | {
      action: "NO_CHANGE";
      id: string;
    }
  | {
      action: "CREATE";
      id: string;
      proposalId: string;
      createdById: string;
      assignedApproverId: string | null;
      assignedAt: Date | null;
      assignmentHistory: unknown;
      lifecycleHistory: unknown;
      status: ReviewRequestStatus;
      createdAt: Date;
      updatedAt: Date;
    };

export type ApprovalChainApplyOp =
  | {
      action: "NO_CHANGE";
      id: string;
    }
  | {
      action: "CREATE";
      id: string;
      reviewRequestId: string;
      status: ApprovalChainStatus;
      currentStepOrder: number;
      finalizedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    };

export type ApprovalStepApplyOp =
  | {
      action: "NO_CHANGE";
      id: string;
    }
  | {
      action: "CREATE";
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
    };

export type ApprovalStepEventApplyOp =
  | {
      action: "NO_CHANGE";
      id: string;
    }
  | {
      action: "CREATE";
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
    };

export type NotificationEventApplyOp =
  | {
      action: "NO_CHANGE";
      id: string;
      eventKey: string;
    }
  | {
      action: "CREATE";
      id: string;
      eventType: NotificationEventType;
      eventKey: string;
      status: NotificationEventStatus;
      reviewRequestId: string | null;
      approvalChainId: string | null;
      approvalStepId: string | null;
      actorUserId: string | null;
      payload: unknown;
      attemptCount: number;
      nextAttemptAt: Date;
      lastAttemptAt: Date | null;
      deliveredAt: Date | null;
      lastError: string | null;
      processingToken: string | null;
      createdAt: Date;
      updatedAt: Date;
    };

export type NotificationPreferenceApplyOp =
  | {
      action: "NO_CHANGE";
      id: string;
      userId: string;
      eventType: NotificationEventType;
    }
  | {
      action: "UPSERT";
      id: string;
      userId: string;
      eventType: NotificationEventType;
      enabled: boolean;
      createdAt: Date;
      updatedAt: Date;
    };

export const portabilityImportRepository = {
  async findActorByEmail(email: string): Promise<ActorRecord | null> {
    return prismaClient.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true }
    });
  },

  async findEntityBySlug(slug: string): Promise<EntityRecord | null> {
    const entity = await prismaClient.entity.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        type: true,
        retiredAt: true,
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

    if (!entity) return null;

    return {
      id: entity.id,
      slug: entity.slug,
      type: entity.type,
      retiredAt: entity.retiredAt,
      latestRevision: entity.revisions[0] ?? null
    };
  },

  async findEntityById(id: string): Promise<{ id: string; slug: string; type: EntityType } | null> {
    return prismaClient.entity.findUnique({
      where: { id },
      select: { id: true, slug: true, type: true }
    });
  },

  async findManuscriptBySlug(slug: string): Promise<ManuscriptRecord | null> {
    const manuscript = await prismaClient.manuscript.findUnique({
      where: { slug },
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

    if (!manuscript) return null;

    return {
      id: manuscript.id,
      slug: manuscript.slug,
      type: manuscript.type,
      latestRevision: manuscript.revisions[0] ?? null
    };
  },

  async findManuscriptById(id: string): Promise<{ id: string; slug: string } | null> {
    return prismaClient.manuscript.findUnique({
      where: { id },
      select: { id: true, slug: true }
    });
  },

  async findRelationshipByIdentity(
    sourceSlug: string,
    targetSlug: string,
    relationType: string
  ): Promise<RelationshipRecord | null> {
    const relationship = await prismaClient.relationship.findFirst({
      where: {
        sourceEntity: { slug: sourceSlug },
        targetEntity: { slug: targetSlug },
        relationType
      },
      select: {
        id: true,
        relationType: true,
        sourceEntityId: true,
        targetEntityId: true,
        revisions: {
          orderBy: [{ version: "desc" }, { createdAt: "desc" }],
          take: 1,
          select: {
            id: true,
            version: true,
            state: true,
            visibility: true,
            metadata: true
          }
        }
      }
    });

    if (!relationship) return null;

    return {
      id: relationship.id,
      relationType: relationship.relationType,
      sourceEntityId: relationship.sourceEntityId,
      targetEntityId: relationship.targetEntityId,
      latestRevision: relationship.revisions[0] ?? null
    };
  },

  async findReleaseBySlug(slug: string): Promise<ReleaseSlugRecord | null> {
    return prismaClient.release.findUnique({
      where: { slug },
      select: { id: true, slug: true, status: true }
    });
  },

  async findUserById(id: string): Promise<{ id: string } | null> {
    return prismaClient.user.findUnique({
      where: { id },
      select: { id: true }
    });
  },

  async findProposalById(id: string): Promise<{ id: string } | null> {
    return prismaClient.proposal.findUnique({
      where: { id },
      select: { id: true }
    });
  },

  async findReviewRequestById(id: string): Promise<{ id: string } | null> {
    return prismaClient.reviewRequest.findUnique({
      where: { id },
      select: { id: true }
    });
  },

  async findApprovalChainById(id: string): Promise<{ id: string } | null> {
    return prismaClient.approvalChain.findUnique({
      where: { id },
      select: { id: true }
    });
  },

  async findApprovalStepById(id: string): Promise<{ id: string } | null> {
    return prismaClient.approvalStep.findUnique({
      where: { id },
      select: { id: true }
    });
  },

  async findApprovalStepEventById(id: string): Promise<{ id: string } | null> {
    return prismaClient.approvalStepEvent.findUnique({
      where: { id },
      select: { id: true }
    });
  },

  async findNotificationEventById(id: string): Promise<{ id: string; eventKey: string } | null> {
    return prismaClient.notificationEvent.findUnique({
      where: { id },
      select: { id: true, eventKey: true }
    });
  },

  async findNotificationEventByEventKey(eventKey: string): Promise<{ id: string; eventKey: string } | null> {
    return prismaClient.notificationEvent.findUnique({
      where: { eventKey },
      select: { id: true, eventKey: true }
    });
  },

  async findNotificationPreferenceByUnique(input: {
    userId: string;
    eventType: NotificationEventType;
  }): Promise<{ id: string } | null> {
    return prismaClient.notificationPreference.findUnique({
      where: {
        userId_eventType: {
          userId: input.userId,
          eventType: input.eventType
        }
      },
      select: { id: true }
    });
  },

  async applyImport(plan: ImportApplyPlan, actorId: string): Promise<void> {
    await prismaClient.$transaction(async (tx) => {
      const slugToEntityId = new Map<string, string>();
      const slugToEntityRevisionId = new Map<string, string>();

      for (const op of plan.entities) {
        if (op.action === "NO_CHANGE") {
          slugToEntityId.set(op.slug, op.entityId);
          slugToEntityRevisionId.set(op.slug, op.revisionId);

          if (op.newRetiredAt !== undefined) {
            await tx.entity.update({
              where: { id: op.entityId },
              data: { retiredAt: op.newRetiredAt }
            });
          }

          continue;
        }

        let entityId: string;

        if (op.action === "CREATE") {
          const created = await tx.entity.create({
            data: {
              slug: op.slug,
              type: op.type as EntityType,
              retiredAt: op.retiredAt
            },
            select: { id: true }
          });
          entityId = created.id;
        } else {
          entityId = op.entityId;

          if (op.retiredAt !== undefined) {
            await tx.entity.update({
              where: { id: entityId },
              data: { retiredAt: op.retiredAt }
            });
          }
        }

        const revision = await tx.entityRevision.create({
          data: {
            entityId,
            createdById: actorId,
            version: op.nextVersion,
            name: op.revision.name,
            summary: op.revision.summary,
            visibility: op.revision.visibility as Visibility,
            ...(op.revision.payload !== undefined
              ? { payload: toNullableJsonInput(op.revision.payload) }
              : {})
          },
          select: { id: true }
        });

        slugToEntityId.set(op.slug, entityId);
        slugToEntityRevisionId.set(op.slug, revision.id);
      }

      const slugToManuscriptId = new Map<string, string>();
      const slugToManuscriptRevisionId = new Map<string, string>();

      for (const op of plan.manuscripts) {
        if (op.action === "NO_CHANGE") {
          slugToManuscriptId.set(op.slug, op.manuscriptId);
          slugToManuscriptRevisionId.set(op.slug, op.revisionId);
          continue;
        }

        let manuscriptId: string;

        if (op.action === "CREATE") {
          const created = await tx.manuscript.create({
            data: {
              slug: op.slug,
              type: op.type as ManuscriptType
            },
            select: { id: true }
          });
          manuscriptId = created.id;
        } else {
          manuscriptId = op.manuscriptId;
        }

        const revision = await tx.manuscriptRevision.create({
          data: {
            manuscriptId,
            createdById: actorId,
            version: op.nextVersion,
            title: op.revision.title,
            summary: op.revision.summary,
            visibility: op.revision.visibility as Visibility,
            ...(op.revision.payload !== undefined
              ? { payload: toNullableJsonInput(op.revision.payload) }
              : {})
          },
          select: { id: true }
        });

        slugToManuscriptId.set(op.slug, manuscriptId);
        slugToManuscriptRevisionId.set(op.slug, revision.id);
      }

      const keyToRelationshipId = new Map<string, string>();
      const keyToRelationshipRevisionId = new Map<string, string>();

      for (const op of plan.relationships) {
        if (op.action === "NO_CHANGE") {
          keyToRelationshipId.set(op.key, op.relationshipId);
          keyToRelationshipRevisionId.set(op.key, op.revisionId);
          continue;
        }

        let relationshipId: string;

        if (op.action === "CREATE") {
          const sourceEntityId = slugToEntityId.get(op.sourceEntitySlug);
          const targetEntityId = slugToEntityId.get(op.targetEntitySlug);

          if (!sourceEntityId || !targetEntityId) {
            throw new Error(
              `Cannot create relationship: missing entity IDs for ${op.sourceEntitySlug} or ${op.targetEntitySlug}`
            );
          }

          const created = await tx.relationship.create({
            data: {
              sourceEntityId,
              targetEntityId,
              relationType: op.relationType
            },
            select: { id: true }
          });
          relationshipId = created.id;
        } else {
          relationshipId = op.relationshipId;
        }

        const revision = await tx.relationshipRevision.create({
          data: {
            relationshipId,
            createdById: actorId,
            version: op.nextVersion,
            state: op.revision.state as RelationshipRevisionState,
            visibility: op.revision.visibility as Visibility,
            ...(op.revision.metadata !== undefined
              ? { metadata: toNullableJsonInput(op.revision.metadata) }
              : {})
          },
          select: { id: true }
        });

        keyToRelationshipId.set(op.key, relationshipId);
        keyToRelationshipRevisionId.set(op.key, revision.id);
      }

      for (const op of plan.releases) {
        const release = await tx.release.create({
          data: {
            slug: op.slug,
            name: op.name,
            status: "DRAFT",
            createdById: actorId
          },
          select: { id: true }
        });

        for (const entitySlug of op.compositionEntitySlugs) {
          const entityId = slugToEntityId.get(entitySlug);
          const revisionId = slugToEntityRevisionId.get(entitySlug);

          if (!entityId || !revisionId) continue;

          await tx.releaseEntry.create({
            data: {
              releaseId: release.id,
              entityId,
              revisionId
            }
          });
        }

        for (const manuscriptSlug of op.compositionManuscriptSlugs) {
          const manuscriptId = slugToManuscriptId.get(manuscriptSlug);
          const manuscriptRevisionId = slugToManuscriptRevisionId.get(manuscriptSlug);

          if (!manuscriptId || !manuscriptRevisionId) continue;

          await tx.releaseManuscriptEntry.create({
            data: {
              releaseId: release.id,
              manuscriptId,
              manuscriptRevisionId
            }
          });
        }

        for (const key of op.compositionRelationshipKeys) {
          const relationshipId = keyToRelationshipId.get(key);
          const relationshipRevisionId = keyToRelationshipRevisionId.get(key);

          if (!relationshipId || !relationshipRevisionId) continue;

          await tx.releaseRelationshipEntry.create({
            data: {
              releaseId: release.id,
              relationshipId,
              relationshipRevisionId
            }
          });
        }
      }

      const sourceToTargetReviewRequestId = new Map<string, string>();

      for (const op of plan.governance.reviewRequests) {
        if (op.action === "NO_CHANGE") {
          sourceToTargetReviewRequestId.set(op.id, op.id);
          continue;
        }

        await tx.reviewRequest.create({
          data: {
            id: op.id,
            proposalId: op.proposalId,
            createdById: op.createdById,
            assignedApproverId: op.assignedApproverId,
            assignedAt: op.assignedAt,
            assignmentHistory: toNullableJsonInput(op.assignmentHistory),
            lifecycleHistory: toNullableJsonInput(op.lifecycleHistory),
            status: op.status,
            createdAt: op.createdAt,
            updatedAt: op.updatedAt
          }
        });

        sourceToTargetReviewRequestId.set(op.id, op.id);
      }

      const sourceToTargetApprovalChainId = new Map<string, string>();

      for (const op of plan.governance.approvalChains) {
        if (op.action === "NO_CHANGE") {
          sourceToTargetApprovalChainId.set(op.id, op.id);
          continue;
        }

        const reviewRequestId = sourceToTargetReviewRequestId.get(op.reviewRequestId) ?? op.reviewRequestId;

        await tx.approvalChain.create({
          data: {
            id: op.id,
            reviewRequestId,
            status: op.status,
            currentStepOrder: op.currentStepOrder,
            finalizedAt: op.finalizedAt,
            createdAt: op.createdAt,
            updatedAt: op.updatedAt
          }
        });

        sourceToTargetApprovalChainId.set(op.id, op.id);
      }

      const sourceToTargetApprovalStepId = new Map<string, string>();

      for (const op of plan.governance.approvalSteps) {
        if (op.action === "NO_CHANGE") {
          sourceToTargetApprovalStepId.set(op.id, op.id);
          continue;
        }

        const chainId = sourceToTargetApprovalChainId.get(op.chainId) ?? op.chainId;

        await tx.approvalStep.create({
          data: {
            id: op.id,
            chainId,
            stepOrder: op.stepOrder,
            title: op.title,
            required: op.required,
            status: op.status,
            assignedReviewerId: op.assignedReviewerId,
            assignedRole: op.assignedRole,
            acknowledgedAt: op.acknowledgedAt,
            acknowledgedById: op.acknowledgedById,
            decidedAt: op.decidedAt,
            decidedById: op.decidedById,
            decisionNote: op.decisionNote,
            escalationLevel: op.escalationLevel,
            escalatedAt: op.escalatedAt,
            escalatedById: op.escalatedById,
            createdAt: op.createdAt,
            updatedAt: op.updatedAt
          }
        });

        sourceToTargetApprovalStepId.set(op.id, op.id);
      }

      for (const op of plan.governance.approvalStepEvents) {
        if (op.action === "NO_CHANGE") {
          continue;
        }

        const stepId = sourceToTargetApprovalStepId.get(op.stepId) ?? op.stepId;

        await tx.approvalStepEvent.create({
          data: {
            id: op.id,
            stepId,
            eventType: op.eventType,
            reasonCode: op.reasonCode,
            reasonNote: op.reasonNote,
            actorUserId: op.actorUserId,
            fromAssignedReviewerId: op.fromAssignedReviewerId,
            fromAssignedRole: op.fromAssignedRole,
            toAssignedReviewerId: op.toAssignedReviewerId,
            toAssignedRole: op.toAssignedRole,
            escalationLevel: op.escalationLevel,
            createdAt: op.createdAt
          }
        });
      }

      for (const op of plan.governance.notificationEvents) {
        if (op.action === "NO_CHANGE") {
          continue;
        }

        await tx.notificationEvent.create({
          data: {
            id: op.id,
            eventType: op.eventType,
            eventKey: op.eventKey,
            status: op.status,
            reviewRequestId:
              op.reviewRequestId === null
                ? null
                : (sourceToTargetReviewRequestId.get(op.reviewRequestId) ?? op.reviewRequestId),
            approvalChainId:
              op.approvalChainId === null
                ? null
                : (sourceToTargetApprovalChainId.get(op.approvalChainId) ?? op.approvalChainId),
            approvalStepId:
              op.approvalStepId === null
                ? null
                : (sourceToTargetApprovalStepId.get(op.approvalStepId) ?? op.approvalStepId),
            actorUserId: op.actorUserId,
            payload: toNullableJsonInput(op.payload),
            attemptCount: op.attemptCount,
            nextAttemptAt: op.nextAttemptAt,
            lastAttemptAt: op.lastAttemptAt,
            deliveredAt: op.deliveredAt,
            lastError: op.lastError,
            processingToken: op.processingToken,
            createdAt: op.createdAt,
            updatedAt: op.updatedAt
          }
        });
      }

      for (const op of plan.governance.notificationPreferences) {
        if (op.action === "NO_CHANGE") {
          continue;
        }

        await tx.notificationPreference.upsert({
          where: {
            userId_eventType: {
              userId: op.userId,
              eventType: op.eventType
            }
          },
          create: {
            id: op.id,
            userId: op.userId,
            eventType: op.eventType,
            enabled: op.enabled,
            createdAt: op.createdAt,
            updatedAt: op.updatedAt
          },
          update: {
            enabled: op.enabled,
            updatedAt: op.updatedAt
          }
        });
      }
    });
  }
};
