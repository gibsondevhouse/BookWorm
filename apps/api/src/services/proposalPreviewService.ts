import { type Prisma, type Role, type Visibility } from "@prisma/client";

import {
  proposalPreviewRepository,
  type EntityDeletionImpactRecord,
  type EntityPreviewTargetRecord,
  type ManuscriptPreviewTargetRecord
} from "../repositories/proposalPreviewRepository.js";
import { revisionDiffService } from "./revisionDiffService.js";

type Actor = {
  userId: string;
  role: Role;
};

type PreviewSnapshot = {
  exists: boolean;
  kind: "ENTITY" | "MANUSCRIPT";
  targetId: string | null;
  targetSlug: string | null;
  targetType: string | null;
  revisionId: string | null;
  version: number | null;
  name: string | null;
  title: string | null;
  summary: string | null;
  visibility: Visibility | null;
  payload: Prisma.JsonValue | null;
};

export class ProposalPreviewNotFoundError extends Error {
  constructor() {
    super("Proposal not found");
    this.name = "ProposalPreviewNotFoundError";
  }
}

export class ProposalPreviewUnauthorizedError extends Error {
  constructor() {
    super("You do not have permission to preview this proposal");
    this.name = "ProposalPreviewUnauthorizedError";
  }
}

const isObjectRecord = (value: Prisma.JsonValue | null): value is Prisma.JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const emptySnapshot = (): Prisma.JsonObject => ({});

const buildEntitySnapshotValue = (input: {
  name: string;
  summary: string;
  visibility: Visibility;
  payload: Prisma.JsonValue | null;
}): Prisma.JsonObject => ({
  name: input.name,
  summary: input.summary,
  visibility: input.visibility,
  payload: input.payload ?? null
});

const buildManuscriptSnapshotValue = (input: {
  title: string;
  summary: string;
  visibility: Visibility;
  payload: Prisma.JsonValue | null;
}): Prisma.JsonObject => ({
  title: input.title,
  summary: input.summary,
  visibility: input.visibility,
  payload: input.payload ?? null
});

const buildEntityCurrentSnapshot = (target: EntityPreviewTargetRecord | null): PreviewSnapshot => {
  const revision = target?.currentRevision ?? null;

  return {
    exists: revision !== null,
    kind: "ENTITY",
    targetId: target?.targetId ?? null,
    targetSlug: target?.targetSlug ?? null,
    targetType: target?.targetType ?? null,
    revisionId: revision?.revisionId ?? null,
    version: revision?.version ?? null,
    name: revision?.name ?? null,
    title: null,
    summary: revision?.summary ?? null,
    visibility: revision?.visibility ?? null,
    payload: revision?.payload ?? null
  };
};

const buildEntityProposedSnapshot = (input: {
  target: EntityPreviewTargetRecord | null;
  changeType: "CREATE" | "UPDATE" | "DELETE";
  title: string;
  summary: string;
  payload: Prisma.JsonValue | null;
}): PreviewSnapshot => {
  if (input.changeType === "DELETE") {
    return {
      exists: false,
      kind: "ENTITY",
      targetId: input.target?.targetId ?? null,
      targetSlug: input.target?.targetSlug ?? null,
      targetType: input.target?.targetType ?? null,
      revisionId: null,
      version: null,
      name: null,
      title: null,
      summary: null,
      visibility: null,
      payload: null
    };
  }

  return {
    exists: true,
    kind: "ENTITY",
    targetId: input.target?.targetId ?? null,
    targetSlug: input.target?.targetSlug ?? null,
    targetType: input.target?.targetType ?? null,
    revisionId: null,
    version: (input.target?.currentRevision?.version ?? 0) + 1,
    name: input.title,
    title: null,
    summary: input.summary,
    visibility: "PRIVATE",
    payload: input.payload
  };
};

const buildManuscriptCurrentSnapshot = (target: ManuscriptPreviewTargetRecord | null): PreviewSnapshot => {
  const revision = target?.currentRevision ?? null;

  return {
    exists: revision !== null,
    kind: "MANUSCRIPT",
    targetId: target?.targetId ?? null,
    targetSlug: target?.targetSlug ?? null,
    targetType: target?.targetType ?? null,
    revisionId: revision?.revisionId ?? null,
    version: revision?.version ?? null,
    name: null,
    title: revision?.title ?? null,
    summary: revision?.summary ?? null,
    visibility: revision?.visibility ?? null,
    payload: revision?.payload ?? null
  };
};

const buildManuscriptProposedSnapshot = (input: {
  target: ManuscriptPreviewTargetRecord | null;
  changeType: "CREATE" | "UPDATE" | "DELETE";
  title: string;
  summary: string;
  payload: Prisma.JsonValue | null;
}): PreviewSnapshot => {
  if (input.changeType === "DELETE") {
    return {
      exists: false,
      kind: "MANUSCRIPT",
      targetId: input.target?.targetId ?? null,
      targetSlug: input.target?.targetSlug ?? null,
      targetType: input.target?.targetType ?? null,
      revisionId: null,
      version: null,
      name: null,
      title: null,
      summary: null,
      visibility: null,
      payload: null
    };
  }

  return {
    exists: true,
    kind: "MANUSCRIPT",
    targetId: input.target?.targetId ?? null,
    targetSlug: input.target?.targetSlug ?? null,
    targetType: input.target?.targetType ?? null,
    revisionId: null,
    version: (input.target?.currentRevision?.version ?? 0) + 1,
    name: null,
    title: input.title,
    summary: input.summary,
    visibility: "PRIVATE",
    payload: input.payload
  };
};

const buildEntityDependencyReferences = (input: { targetSlug: string; impact: EntityDeletionImpactRecord }) => {
  const latestCandidateByEntityId = new Map<string, { entitySlug: string; version: number; payload: Prisma.JsonValue | null }>();

  for (const candidate of input.impact.dependencyCandidates) {
    const existing = latestCandidateByEntityId.get(candidate.entityId);

    if (!existing || candidate.version > existing.version) {
      latestCandidateByEntityId.set(candidate.entityId, {
        entitySlug: candidate.entitySlug,
        version: candidate.version,
        payload: candidate.payload
      });
    }
  }

  return [...latestCandidateByEntityId.values()]
    .filter((candidate) => {
      if (!isObjectRecord(candidate.payload)) {
        return false;
      }

      const dependencies = candidate.payload.requiredDependencies;

      if (!Array.isArray(dependencies)) {
        return false;
      }

      return dependencies.some((dependency) => {
        const dependencyValue = (dependency as Prisma.JsonValue) ?? null;

        if (!isObjectRecord(dependencyValue)) {
          return false;
        }

        const kind = typeof dependencyValue.kind === "string" ? dependencyValue.kind : null;

        if (kind === "ENTITY") {
          return dependencyValue.entitySlug === input.targetSlug;
        }

        if (kind === "RELATIONSHIP") {
          return (
            dependencyValue.sourceEntitySlug === input.targetSlug ||
            dependencyValue.targetEntitySlug === input.targetSlug
          );
        }

        return false;
      });
    })
    .map((candidate) => candidate.entitySlug)
    .sort((left, right) => left.localeCompare(right));
};

const canPreviewProposal = (input: { actor: Actor; proposedById: string }): boolean =>
  input.actor.role === "AUTHOR_ADMIN" || input.actor.userId === input.proposedById;

export const proposalPreviewService = {
  async getProposalPreview(input: { proposalId: string; actor: Actor }) {
    const proposal = await proposalPreviewRepository.findProposalById(input.proposalId);

    if (!proposal) {
      throw new ProposalPreviewNotFoundError();
    }

    if (!canPreviewProposal({ actor: input.actor, proposedById: proposal.proposedById })) {
      throw new ProposalPreviewUnauthorizedError();
    }

    if (proposal.entityId !== null) {
      const target = await proposalPreviewRepository.findEntityTarget(proposal.entityId);
      const currentSnapshot = buildEntityCurrentSnapshot(target);
      const proposedSnapshot = buildEntityProposedSnapshot({
        target,
        changeType: proposal.changeType,
        title: proposal.title,
        summary: proposal.summary,
        payload: proposal.payload
      });
      const changes = revisionDiffService.compareSnapshots({
        kind: "ENTITY",
        fromSnapshot:
          currentSnapshot.exists && currentSnapshot.name !== null && currentSnapshot.summary !== null && currentSnapshot.visibility !== null
            ? buildEntitySnapshotValue({
                name: currentSnapshot.name,
                summary: currentSnapshot.summary,
                visibility: currentSnapshot.visibility,
                payload: currentSnapshot.payload
              })
            : emptySnapshot(),
        toSnapshot:
          proposedSnapshot.exists && proposedSnapshot.name !== null && proposedSnapshot.summary !== null && proposedSnapshot.visibility !== null
            ? buildEntitySnapshotValue({
                name: proposedSnapshot.name,
                summary: proposedSnapshot.summary,
                visibility: proposedSnapshot.visibility,
                payload: proposedSnapshot.payload
              })
            : emptySnapshot(),
        fromPayload: currentSnapshot.payload,
        toPayload: proposedSnapshot.payload
      });
      const impact = proposal.changeType === "DELETE" && proposal.entityId !== null
        ? await proposalPreviewRepository.getEntityDeletionImpact(proposal.entityId)
        : null;
      const affectedFields = [
        ...changes.addedFields.map((item) => item.path),
        ...changes.removedFields.map((item) => item.path),
        ...changes.modifiedFields.map((item) => item.path)
      ].sort((left, right) => left.localeCompare(right));
      const validationErrors: string[] = [];

      if (proposal.status !== "ACCEPTED") {
        validationErrors.push(`Proposal is not in ACCEPTED status (current: ${proposal.status})`);
      }

      if (proposal.appliedAt !== null) {
        validationErrors.push("Proposal has already been applied");
      }

      if (target === null || target.currentRevision === null) {
        validationErrors.push("Proposal target not found");
      }

      const referencingEntitySlugs = impact === null || currentSnapshot.targetSlug === null
        ? []
        : buildEntityDependencyReferences({ targetSlug: currentSnapshot.targetSlug, impact });

      return {
        proposal: {
          id: proposal.id,
          createdAt: proposal.createdAt,
          updatedAt: proposal.updatedAt,
          proposedById: proposal.proposedById,
          status: proposal.status,
          workflowState: proposal.workflowState,
          changeType: proposal.changeType,
          entityId: proposal.entityId,
          manuscriptId: proposal.manuscriptId,
          decidedAt: proposal.decidedAt,
          appliedAt: proposal.appliedAt,
          rejectionReason: proposal.status === "REJECTED" ? proposal.decisionNote ?? proposal.reviewNotes : null
        },
        validation: {
          canApply: validationErrors.length === 0,
          errors: validationErrors
        },
        currentSnapshot,
        proposedSnapshot,
        changeSummary: {
          addedFieldCount: changes.addedFields.length,
          removedFieldCount: changes.removedFields.length,
          modifiedFieldCount: changes.modifiedFields.length,
          relationshipChangeCount: changes.relationshipChanges.length,
          affectedFields,
          addedFields: changes.addedFields,
          removedFields: changes.removedFields,
          modifiedFields: changes.modifiedFields,
          relationshipChanges: changes.relationshipChanges.map((change) => ({
            key: change.key,
            changeType: change.changeType,
            before: change.before ?? null,
            after: change.after ?? null
          }))
        },
        impactSummary: {
          affectedFields,
          relationshipImpact: {
            added: changes.relationshipChanges.filter((change) => change.changeType === "ADDED").map((change) => change.key),
            removed: changes.relationshipChanges.filter((change) => change.changeType === "REMOVED").map((change) => change.key),
            modified: changes.relationshipChanges.filter((change) => change.changeType === "MODIFIED").map((change) => change.key)
          },
          deletionImpact:
            impact === null
              ? null
              : {
                  relationshipCount: impact.relationshipKeys.length,
                  relatedRelationshipKeys: impact.relationshipKeys,
                  dependencyReferenceCount: referencingEntitySlugs.length,
                  referencingEntitySlugs,
                  revisionCount: impact.revisionCount,
                  releaseEntryCount: impact.releaseEntryCount,
                  proposalCount: impact.proposalCount,
                  commentCount: impact.commentCount,
                  continuityIssueCount: impact.continuityIssueCount
                }
        }
      };
    }

    const target = proposal.manuscriptId === null ? null : await proposalPreviewRepository.findManuscriptTarget(proposal.manuscriptId);
    const currentSnapshot = buildManuscriptCurrentSnapshot(target);
    const proposedSnapshot = buildManuscriptProposedSnapshot({
      target,
      changeType: proposal.changeType,
      title: proposal.title,
      summary: proposal.summary,
      payload: proposal.payload
    });
    const changes = revisionDiffService.compareSnapshots({
      kind: "MANUSCRIPT",
      fromSnapshot:
        currentSnapshot.exists && currentSnapshot.title !== null && currentSnapshot.summary !== null && currentSnapshot.visibility !== null
          ? buildManuscriptSnapshotValue({
              title: currentSnapshot.title,
              summary: currentSnapshot.summary,
              visibility: currentSnapshot.visibility,
              payload: currentSnapshot.payload
            })
          : emptySnapshot(),
      toSnapshot:
        proposedSnapshot.exists && proposedSnapshot.title !== null && proposedSnapshot.summary !== null && proposedSnapshot.visibility !== null
          ? buildManuscriptSnapshotValue({
              title: proposedSnapshot.title,
              summary: proposedSnapshot.summary,
              visibility: proposedSnapshot.visibility,
              payload: proposedSnapshot.payload
            })
          : emptySnapshot(),
      fromPayload: currentSnapshot.payload,
      toPayload: proposedSnapshot.payload
    });
    const impact = proposal.manuscriptId === null || proposal.changeType !== "DELETE"
      ? null
      : await proposalPreviewRepository.getManuscriptDeletionImpact(proposal.manuscriptId);
    const affectedFields = [
      ...changes.addedFields.map((item) => item.path),
      ...changes.removedFields.map((item) => item.path),
      ...changes.modifiedFields.map((item) => item.path)
    ].sort((left, right) => left.localeCompare(right));
    const validationErrors: string[] = [];

    if (proposal.status !== "ACCEPTED") {
      validationErrors.push(`Proposal is not in ACCEPTED status (current: ${proposal.status})`);
    }

    if (proposal.appliedAt !== null) {
      validationErrors.push("Proposal has already been applied");
    }

    if (target === null || target.currentRevision === null) {
      validationErrors.push("Proposal target not found");
    }

    return {
      proposal: {
        id: proposal.id,
        createdAt: proposal.createdAt,
        updatedAt: proposal.updatedAt,
        proposedById: proposal.proposedById,
        status: proposal.status,
        workflowState: proposal.workflowState,
        changeType: proposal.changeType,
        entityId: proposal.entityId,
        manuscriptId: proposal.manuscriptId,
        decidedAt: proposal.decidedAt,
        appliedAt: proposal.appliedAt,
        rejectionReason: proposal.status === "REJECTED" ? proposal.decisionNote ?? proposal.reviewNotes : null
      },
      validation: {
        canApply: validationErrors.length === 0,
        errors: validationErrors
      },
      currentSnapshot,
      proposedSnapshot,
      changeSummary: {
        addedFieldCount: changes.addedFields.length,
        removedFieldCount: changes.removedFields.length,
        modifiedFieldCount: changes.modifiedFields.length,
        relationshipChangeCount: 0,
        affectedFields,
        addedFields: changes.addedFields,
        removedFields: changes.removedFields,
        modifiedFields: changes.modifiedFields,
        relationshipChanges: []
      },
      impactSummary: {
        affectedFields,
        relationshipImpact: {
          added: [],
          removed: [],
          modified: []
        },
        deletionImpact:
          impact === null
            ? null
            : {
                relationshipCount: 0,
                relatedRelationshipKeys: [],
                dependencyReferenceCount: 0,
                referencingEntitySlugs: [],
                revisionCount: impact.revisionCount,
                releaseEntryCount: impact.releaseEntryCount,
                proposalCount: impact.proposalCount,
                commentCount: impact.commentCount,
                continuityIssueCount: impact.continuityIssueCount
              }
      }
    };
  }
};