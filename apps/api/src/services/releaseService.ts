import { type EntityType, type ManuscriptType, type Role } from "@prisma/client";

import { type SessionActor } from "../auth/sessionActor.js";
import { releaseDependencyRepository } from "../repositories/releaseDependencyRepository.js";
import { releaseReviewRepository } from "../repositories/releaseReviewRepository.js";
import { releaseRepository } from "../repositories/releaseRepository.js";
import { continuityIssueService } from "./continuityIssueService.js";
import { ReleaseActivationContinuityError } from "./releaseActivationContinuityError.js";
import { ReleaseActivationDependencyError } from "./releaseActivationDependencyError.js";
import { ReleaseActivationGuardError } from "./releaseActivationGuardError.js";
import { ReleaseMutationGuardError } from "./releaseMutationGuardError.js";

type CreateReleaseInput = {
  actor: SessionActor;
  slug: string;
  name: string;
};

type IncludeRevisionInput = {
  actor: SessionActor;
  releaseSlug: string;
  entitySlug: string;
  revisionId: string;
};

type IncludeManuscriptRevisionInput = {
  actor: SessionActor;
  releaseSlug: string;
  manuscriptSlug: string;
  manuscriptRevisionId: string;
};

type ActivateReleaseInput = {
  actor: SessionActor;
  releaseSlug: string;
};

export type ReleaseValidationStatus = {
  releaseSlug: string;
  isReady: boolean;
  summary: {
    dependencyCheckCount: number;
    blockingFailureCount: number;
    entityEntryCount: number;
    manuscriptEntryCount: number;
    relationshipEntryCount: number;
  };
  failures: Array<{
    code: "MISSING_DEPENDENCY";
    sourceRevisionId: string;
    sourceType: "ENTITY_REVISION" | "MANUSCRIPT_REVISION" | "RELATIONSHIP_REVISION";
    sourceKey: string;
    dependencyType: "ENTITY" | "MANUSCRIPT" | "RELATIONSHIP" | "INVALID";
    dependencyKey: string;
    validationError?: string;
  }>;
  includedEntries: {
    entityEntries: Array<{
      entitySlug: string;
      entityType: EntityType;
      revisionId: string;
      version: number;
    }>;
    manuscriptEntries: Array<{
      manuscriptSlug: string;
      manuscriptType: ManuscriptType;
      manuscriptRevisionId: string;
      version: number;
    }>;
    relationshipEntries: Array<{
      relationshipId: string;
      relationshipRevisionId: string;
      relationType: string;
      sourceEntitySlug: string;
      targetEntitySlug: string;
      version: number;
    }>;
  };
};

export type ReleaseReviewStatus = {
  release: {
    slug: string;
    name: string;
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
    activatedAt: string | null;
  };
  validation: ReleaseValidationStatus;
  entityEntries: Array<{
    entitySlug: string;
    entityType: EntityType;
    revisionId: string;
    version: number;
    name: string;
    summary: string;
    visibility: "PUBLIC" | "RESTRICTED" | "PRIVATE";
    inclusionStatus: "INCLUDED";
    dependencyState: "READY" | "MISSING_DEPENDENCIES";
    blockingDependencies: ReleaseValidationStatus["failures"];
  }>;
  manuscriptEntries: Array<{
    manuscriptSlug: string;
    manuscriptType: ManuscriptType;
    manuscriptRevisionId: string;
    version: number;
    title: string;
    summary: string;
    visibility: "PUBLIC" | "RESTRICTED" | "PRIVATE";
    inclusionStatus: "INCLUDED";
    dependencyState: "READY" | "MISSING_DEPENDENCIES";
    blockingDependencies: ReleaseValidationStatus["failures"];
  }>;
  relationshipEntries: Array<{
    relationshipId: string;
    relationshipRevisionId: string;
    relationType: string;
    sourceEntitySlug: string;
    targetEntitySlug: string;
    version: number;
    state: "CREATE" | "UPDATE" | "DELETE";
    visibility: "PUBLIC" | "RESTRICTED" | "PRIVATE";
    inclusionStatus: "INCLUDED";
    dependencyState: "READY" | "MISSING_DEPENDENCIES";
    blockingDependencies: ReleaseValidationStatus["failures"];
  }>;
};

const allowedReleaseRoles: Role[] = ["AUTHOR_ADMIN"];

const assertReleaseRole = (actorRole: Role): void => {
  if (!allowedReleaseRoles.includes(actorRole)) {
    throw new Error("Release management requires author-admin role");
  }
};

const getBlockingDependencies = (
  failures: ReleaseValidationStatus["failures"],
  sourceRevisionId: string
): ReleaseValidationStatus["failures"] => failures.filter((failure) => failure.sourceRevisionId === sourceRevisionId);

const assertDraftReleaseState = async (releaseSlug: string): Promise<void> => {
  const releaseState = await releaseRepository.getReleaseCompositionState(releaseSlug);

  if (releaseState.status !== "DRAFT") {
    throw new ReleaseMutationGuardError({
      releaseSlug,
      releaseStatus: releaseState.status
    });
  }
};

export const releaseService = {
  async getReviewStatus(input: ActivateReleaseInput): Promise<ReleaseReviewStatus> {
    assertReleaseRole(input.actor.role);

    const [reviewRecord, validationStatus] = await Promise.all([
      releaseReviewRepository.getReleaseReview(input.releaseSlug),
      releaseService.getValidationStatus(input)
    ]);

    return {
      release: {
        slug: reviewRecord.slug,
        name: reviewRecord.name,
        status: reviewRecord.status,
        activatedAt: reviewRecord.activatedAt?.toISOString() ?? null
      },
      validation: validationStatus,
      entityEntries: reviewRecord.entityEntries.map((entry) => {
        const blockingDependencies = getBlockingDependencies(validationStatus.failures, entry.revisionId);

        return {
          entitySlug: entry.entitySlug,
          entityType: entry.entityType,
          revisionId: entry.revisionId,
          version: entry.version,
          name: entry.name,
          summary: entry.summary,
          visibility: entry.visibility,
          inclusionStatus: "INCLUDED" as const,
          dependencyState: blockingDependencies.length === 0 ? ("READY" as const) : ("MISSING_DEPENDENCIES" as const),
          blockingDependencies
        };
      }),
      manuscriptEntries: reviewRecord.manuscriptEntries.map((entry) => {
        const blockingDependencies = getBlockingDependencies(validationStatus.failures, entry.manuscriptRevisionId);

        return {
          manuscriptSlug: entry.manuscriptSlug,
          manuscriptType: entry.manuscriptType,
          manuscriptRevisionId: entry.manuscriptRevisionId,
          version: entry.version,
          title: entry.title,
          summary: entry.summary,
          visibility: entry.visibility,
          inclusionStatus: "INCLUDED" as const,
          dependencyState: blockingDependencies.length === 0 ? ("READY" as const) : ("MISSING_DEPENDENCIES" as const),
          blockingDependencies
        };
      }),
      relationshipEntries: reviewRecord.relationshipEntries.map((entry) => {
        const blockingDependencies = getBlockingDependencies(validationStatus.failures, entry.relationshipRevisionId);

        return {
          relationshipId: entry.relationshipId,
          relationshipRevisionId: entry.relationshipRevisionId,
          relationType: entry.relationType,
          sourceEntitySlug: entry.sourceEntitySlug,
          targetEntitySlug: entry.targetEntitySlug,
          version: entry.version,
          state: entry.state,
          visibility: entry.visibility,
          inclusionStatus: "INCLUDED" as const,
          dependencyState: blockingDependencies.length === 0 ? ("READY" as const) : ("MISSING_DEPENDENCIES" as const),
          blockingDependencies
        };
      })
    };
  },

  async getValidationStatus(input: ActivateReleaseInput): Promise<ReleaseValidationStatus> {
    assertReleaseRole(input.actor.role);

    const [dependencyStatus, reviewRecord] = await Promise.all([
      releaseDependencyRepository.getDependencyStatus(input.releaseSlug),
      releaseReviewRepository.getReleaseReview(input.releaseSlug)
    ]);

    return {
      releaseSlug: dependencyStatus.releaseSlug,
      isReady: dependencyStatus.isComplete,
      summary: {
        dependencyCheckCount: dependencyStatus.dependencies.length,
        blockingFailureCount: dependencyStatus.missingDependencies.length,
        entityEntryCount: reviewRecord.entityEntries.length,
        manuscriptEntryCount: reviewRecord.manuscriptEntries.length,
        relationshipEntryCount: reviewRecord.relationshipEntries.length
      },
      failures: dependencyStatus.missingDependencies.map((dependency) => ({
        code: "MISSING_DEPENDENCY",
        sourceRevisionId: dependency.sourceRevisionId,
        sourceType: dependency.sourceType,
        sourceKey: dependency.sourceKey,
        dependencyType: dependency.dependencyType,
        dependencyKey: dependency.dependencyKey,
        ...(dependency.validationError === undefined ? {} : { validationError: dependency.validationError })
      })),
      includedEntries: {
        entityEntries: reviewRecord.entityEntries.map((entry) => ({
          entitySlug: entry.entitySlug,
          entityType: entry.entityType,
          revisionId: entry.revisionId,
          version: entry.version
        })),
        manuscriptEntries: reviewRecord.manuscriptEntries.map((entry) => ({
          manuscriptSlug: entry.manuscriptSlug,
          manuscriptType: entry.manuscriptType,
          manuscriptRevisionId: entry.manuscriptRevisionId,
          version: entry.version
        })),
        relationshipEntries: reviewRecord.relationshipEntries.map((entry) => ({
          relationshipId: entry.relationshipId,
          relationshipRevisionId: entry.relationshipRevisionId,
          relationType: entry.relationType,
          sourceEntitySlug: entry.sourceEntitySlug,
          targetEntitySlug: entry.targetEntitySlug,
          version: entry.version
        }))
      }
    };
  },

  async createRelease(input: CreateReleaseInput) {
    assertReleaseRole(input.actor.role);

    return releaseRepository.createRelease({
      actorId: input.actor.userId,
      slug: input.slug,
      name: input.name
    });
  },

  async includeRevision(input: IncludeRevisionInput) {
    assertReleaseRole(input.actor.role);
    await assertDraftReleaseState(input.releaseSlug);

    return releaseRepository.includeRevision({
      releaseSlug: input.releaseSlug,
      entitySlug: input.entitySlug,
      revisionId: input.revisionId
    });
  },

  async includeManuscriptRevision(input: IncludeManuscriptRevisionInput) {
    assertReleaseRole(input.actor.role);
    await assertDraftReleaseState(input.releaseSlug);

    return releaseRepository.includeManuscriptRevision({
      releaseSlug: input.releaseSlug,
      manuscriptSlug: input.manuscriptSlug,
      manuscriptRevisionId: input.manuscriptRevisionId
    });
  },

  async getDependencyStatus(input: ActivateReleaseInput) {
    assertReleaseRole(input.actor.role);

    return releaseDependencyRepository.getDependencyStatus(input.releaseSlug);
  },

  async activateRelease(input: ActivateReleaseInput) {
    assertReleaseRole(input.actor.role);

    const releaseState = await releaseRepository.getReleaseCompositionState(input.releaseSlug);

    if (releaseState.status !== "DRAFT") {
      throw new ReleaseActivationGuardError({
        code: "RELEASE_NOT_DRAFT",
        releaseSlug: input.releaseSlug,
        releaseStatus: releaseState.status,
        message: "Only draft releases can be activated"
      });
    }

    if (releaseState.entityEntryCount + releaseState.manuscriptEntryCount + releaseState.relationshipEntryCount === 0) {
      throw new ReleaseActivationGuardError({
        code: "RELEASE_EMPTY",
        releaseSlug: input.releaseSlug,
        message: "Releases must include at least one entity, manuscript, or relationship revision before activation"
      });
    }

    const dependencyStatus = await releaseDependencyRepository.getDependencyStatus(input.releaseSlug);

    if (!dependencyStatus.isComplete) {
      throw new ReleaseActivationDependencyError(dependencyStatus);
    }

    const continuityStatus = await continuityIssueService.runBaseline({
      actor: input.actor,
      releaseSlug: input.releaseSlug,
      source: "ACTIVATION"
    });

    if (continuityStatus.summary.blockingOpenCount > 0) {
      throw new ReleaseActivationContinuityError({
        releaseSlug: continuityStatus.releaseSlug,
        blockingIssueCount: continuityStatus.summary.blockingOpenCount,
        issues: continuityStatus.issues.map((issue) => ({
          id: issue.id,
          ruleCode: issue.ruleCode,
          status: issue.status,
          severity: issue.severity,
          title: issue.title
        }))
      });
    }

    return releaseRepository.activateRelease(input.releaseSlug);
  }
};