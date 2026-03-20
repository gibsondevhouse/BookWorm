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

import { entityMetadataContract } from "../entityMetadataContract.js";

type ExportFile = {
  path: string;
  content: string;
};

type ExportPackage = {
  manifest: {
    schemaVersion: 1;
    format: "markdown";
    scope: "current" | "release";
    exportedAt: string;
    release?: {
      id: string;
      slug: string;
      name: string;
      status: ReleaseStatus;
      createdAt: string;
      activatedAt: string | null;
    };
    counts: {
      entities: number;
      manuscripts: number;
      relationships: number;
      releases: number;
      reviewRequests: number;
      approvalChains: number;
      approvalSteps: number;
      approvalStepEvents: number;
      notificationEvents: number;
      notificationPreferences: number;
    };
  };
  files: ExportFile[];
};

const normalizeSegment = (value: string): string => value.toLowerCase().replaceAll("_", "-");

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => stableValue(item));
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = stableValue((value as Record<string, unknown>)[key]);
        return accumulator;
      }, {});
  }

  return value;
};

const stringifyDocument = (value: unknown): string => `${JSON.stringify(stableValue(value), null, 2)}\n`;

const yamlScalar = (value: unknown): string => {
  if (value === null) return "null";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") return JSON.stringify(stableValue(value));
  return JSON.stringify(value);
};

const stringifyFrontMatter = (frontMatter: Record<string, unknown>): string => {
  const lines = Object.entries(frontMatter).map(([key, value]) => `${key}: ${yamlScalar(value)}`);
  return `---\n${lines.join("\n")}\n---\n`;
};

const toEntityBody = (name: string, summary: string): string => `# ${name}\n\n${summary}\n`;

const toManuscriptBody = (title: string, body: string): string => `# ${title}\n\n${body}\n`;

const getManuscriptMarkdownPath = (type: ManuscriptType, slug: string): string => {
  switch (type) {
    case "CHAPTER":
      return `chapters/${slug}.md`;
    case "SCENE":
      return `scenes/${slug}.md`;
  }
};

const getPayloadText = (payload: Prisma.JsonValue | null, key: "body" | "content"): string | null => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const value = (payload as Record<string, unknown>)[key];

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const getManuscriptNarrativeBody = (payload: Prisma.JsonValue | null, summary: string): string =>
  getPayloadText(payload, "body") ?? getPayloadText(payload, "content") ?? summary;

const getPayloadMetadata = (payload: Prisma.JsonValue | null): unknown => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  const metadata = (payload as Record<string, unknown>)["metadata"];

  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  return metadata;
};

export const markdownPortabilitySerializer = {
  serialize(input: {
    scope: "current" | "release";
    exportedAt: Date;
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
    release?: {
      id: string;
      slug: string;
      name: string;
      status: ReleaseStatus;
      createdById: string;
      createdAt: Date;
      activatedAt: Date | null;
    };
  }): ExportPackage {
    const files: ExportFile[] = [];
    const releaseInfo = input.release
      ? {
          id: input.release.id,
          slug: input.release.slug,
          name: input.release.name,
          status: input.release.status,
          createdAt: input.release.createdAt.toISOString(),
          activatedAt: input.release.activatedAt?.toISOString() ?? null
        }
      : undefined;

    for (const entity of input.entities) {
      const metadata = entityMetadataContract.readMetadata({
        entityType: entity.type,
        payload: entity.revision.payload
      });

      files.push({
        path: `entities/${normalizeSegment(entity.type)}/${entity.slug}.md`,
        content:
          stringifyFrontMatter({
            id: entity.id,
            slug: entity.slug,
            type: entity.type,
            visibility: entity.revision.visibility,
            version: entity.revision.version,
            revisionId: entity.revision.id,
            metadata,
            retiredAt: entity.retiredAt?.toISOString() ?? null
          }) + toEntityBody(entity.revision.name, entity.revision.summary)
      });
    }

    for (const manuscript of input.manuscripts) {
      const narrativeBody = getManuscriptNarrativeBody(
        manuscript.revision.payload,
        manuscript.revision.summary
      );

      files.push({
        path: getManuscriptMarkdownPath(manuscript.type, manuscript.slug),
        content:
          stringifyFrontMatter({
            id: manuscript.id,
            slug: manuscript.slug,
            manuscriptType: manuscript.type,
            visibility: manuscript.revision.visibility,
            summary: manuscript.revision.summary,
            version: manuscript.revision.version,
            revisionId: manuscript.revision.id,
            metadata: getPayloadMetadata(manuscript.revision.payload),
            retiredAt: null
          }) + toManuscriptBody(manuscript.revision.title, narrativeBody)
      });
    }

    for (const relationship of input.relationships) {
      files.push({
        path: `relationships/${relationship.sourceEntity.slug}--${relationship.relationType}--${relationship.targetEntity.slug}.json`,
        content: stringifyDocument({
          scope: input.scope,
          ...(releaseInfo ? { release: releaseInfo } : {}),
          relationship: {
            id: relationship.id,
            relationType: relationship.relationType,
            sourceEntity: relationship.sourceEntity,
            targetEntity: relationship.targetEntity,
            createdAt: relationship.createdAt.toISOString(),
            updatedAt: relationship.updatedAt.toISOString()
          },
          revision: {
            id: relationship.revision.id,
            version: relationship.revision.version,
            state: relationship.revision.state,
            visibility: relationship.revision.visibility,
            metadata: relationship.revision.metadata,
            createdAt: relationship.revision.createdAt.toISOString()
          }
        })
      });
    }

    for (const reviewRequest of input.governance.reviewRequests) {
      files.push({
        path: `governance/review-requests/${reviewRequest.id}.json`,
        content: stringifyDocument({
          reviewRequest: {
            id: reviewRequest.id,
            proposalId: reviewRequest.proposalId,
            createdById: reviewRequest.createdById,
            assignedApproverId: reviewRequest.assignedApproverId,
            assignedAt: reviewRequest.assignedAt?.toISOString() ?? null,
            assignmentHistory: reviewRequest.assignmentHistory,
            lifecycleHistory: reviewRequest.lifecycleHistory,
            status: reviewRequest.status,
            createdAt: reviewRequest.createdAt.toISOString(),
            updatedAt: reviewRequest.updatedAt.toISOString()
          }
        })
      });
    }

    for (const approvalChain of input.governance.approvalChains) {
      files.push({
        path: `governance/approval-chains/${approvalChain.id}.json`,
        content: stringifyDocument({
          approvalChain: {
            id: approvalChain.id,
            reviewRequestId: approvalChain.reviewRequestId,
            status: approvalChain.status,
            currentStepOrder: approvalChain.currentStepOrder,
            finalizedAt: approvalChain.finalizedAt?.toISOString() ?? null,
            createdAt: approvalChain.createdAt.toISOString(),
            updatedAt: approvalChain.updatedAt.toISOString()
          }
        })
      });
    }

    for (const approvalStep of input.governance.approvalSteps) {
      files.push({
        path: `governance/approval-steps/${approvalStep.id}.json`,
        content: stringifyDocument({
          approvalStep: {
            id: approvalStep.id,
            chainId: approvalStep.chainId,
            stepOrder: approvalStep.stepOrder,
            title: approvalStep.title,
            required: approvalStep.required,
            status: approvalStep.status,
            assignedReviewerId: approvalStep.assignedReviewerId,
            assignedRole: approvalStep.assignedRole,
            acknowledgedAt: approvalStep.acknowledgedAt?.toISOString() ?? null,
            acknowledgedById: approvalStep.acknowledgedById,
            decidedAt: approvalStep.decidedAt?.toISOString() ?? null,
            decidedById: approvalStep.decidedById,
            decisionNote: approvalStep.decisionNote,
            escalationLevel: approvalStep.escalationLevel,
            escalatedAt: approvalStep.escalatedAt?.toISOString() ?? null,
            escalatedById: approvalStep.escalatedById,
            createdAt: approvalStep.createdAt.toISOString(),
            updatedAt: approvalStep.updatedAt.toISOString()
          }
        })
      });
    }

    for (const approvalStepEvent of input.governance.approvalStepEvents) {
      files.push({
        path: `governance/approval-step-events/${approvalStepEvent.id}.json`,
        content: stringifyDocument({
          approvalStepEvent: {
            id: approvalStepEvent.id,
            stepId: approvalStepEvent.stepId,
            eventType: approvalStepEvent.eventType,
            reasonCode: approvalStepEvent.reasonCode,
            reasonNote: approvalStepEvent.reasonNote,
            actorUserId: approvalStepEvent.actorUserId,
            fromAssignedReviewerId: approvalStepEvent.fromAssignedReviewerId,
            fromAssignedRole: approvalStepEvent.fromAssignedRole,
            toAssignedReviewerId: approvalStepEvent.toAssignedReviewerId,
            toAssignedRole: approvalStepEvent.toAssignedRole,
            escalationLevel: approvalStepEvent.escalationLevel,
            createdAt: approvalStepEvent.createdAt.toISOString()
          }
        })
      });
    }

    for (const notificationEvent of input.governance.notificationEvents) {
      files.push({
        path: `governance/notification-events/${notificationEvent.id}.json`,
        content: stringifyDocument({
          notificationEvent: {
            id: notificationEvent.id,
            eventType: notificationEvent.eventType,
            eventKey: notificationEvent.eventKey,
            status: notificationEvent.status,
            reviewRequestId: notificationEvent.reviewRequestId,
            approvalChainId: notificationEvent.approvalChainId,
            approvalStepId: notificationEvent.approvalStepId,
            actorUserId: notificationEvent.actorUserId,
            payload: notificationEvent.payload,
            attemptCount: notificationEvent.attemptCount,
            nextAttemptAt: notificationEvent.nextAttemptAt.toISOString(),
            lastAttemptAt: notificationEvent.lastAttemptAt?.toISOString() ?? null,
            deliveredAt: notificationEvent.deliveredAt?.toISOString() ?? null,
            lastError: notificationEvent.lastError,
            processingToken: notificationEvent.processingToken,
            createdAt: notificationEvent.createdAt.toISOString(),
            updatedAt: notificationEvent.updatedAt.toISOString()
          }
        })
      });
    }

    for (const notificationPreference of input.governance.notificationPreferences) {
      files.push({
        path: `governance/notification-preferences/${notificationPreference.id}.json`,
        content: stringifyDocument({
          notificationPreference: {
            id: notificationPreference.id,
            userId: notificationPreference.userId,
            eventType: notificationPreference.eventType,
            enabled: notificationPreference.enabled,
            createdAt: notificationPreference.createdAt.toISOString(),
            updatedAt: notificationPreference.updatedAt.toISOString()
          }
        })
      });
    }

    if (input.release) {
      files.push({
        path: `releases/${input.release.slug}.json`,
        content: stringifyDocument({
          scope: input.scope,
          release: {
            id: input.release.id,
            slug: input.release.slug,
            name: input.release.name,
            status: input.release.status,
            createdById: input.release.createdById,
            createdAt: input.release.createdAt.toISOString(),
            activatedAt: input.release.activatedAt?.toISOString() ?? null
          },
          composition: {
            entities: input.entities.map((entity) => ({
              entityId: entity.id,
              entitySlug: entity.slug,
              revisionId: entity.revision.id,
              version: entity.revision.version,
              visibility: entity.revision.visibility
            })),
            manuscripts: input.manuscripts.map((manuscript) => ({
              manuscriptId: manuscript.id,
              manuscriptSlug: manuscript.slug,
              manuscriptRevisionId: manuscript.revision.id,
              version: manuscript.revision.version,
              visibility: manuscript.revision.visibility
            })),
            relationships: input.relationships.map((relationship) => ({
              relationshipId: relationship.id,
              sourceEntitySlug: relationship.sourceEntity.slug,
              targetEntitySlug: relationship.targetEntity.slug,
              relationType: relationship.relationType,
              relationshipRevisionId: relationship.revision.id,
              version: relationship.revision.version,
              visibility: relationship.revision.visibility
            }))
          }
        })
      });
    }

    files.sort((left, right) => left.path.localeCompare(right.path));

    const manifest = {
      schemaVersion: 1 as const,
      format: "markdown" as const,
      scope: input.scope,
      exportedAt: input.exportedAt.toISOString(),
      ...(releaseInfo ? { release: releaseInfo } : {}),
      counts: {
        entities: input.entities.length,
        manuscripts: input.manuscripts.length,
        relationships: input.relationships.length,
        releases: input.release ? 1 : 0,
        reviewRequests: input.governance.reviewRequests.length,
        approvalChains: input.governance.approvalChains.length,
        approvalSteps: input.governance.approvalSteps.length,
        approvalStepEvents: input.governance.approvalStepEvents.length,
        notificationEvents: input.governance.notificationEvents.length,
        notificationPreferences: input.governance.notificationPreferences.length
      }
    };

    files.unshift({
      path: "manifests/export-manifest.json",
      content: stringifyDocument(manifest)
    });

    return {
      manifest,
      files
    };
  }
};