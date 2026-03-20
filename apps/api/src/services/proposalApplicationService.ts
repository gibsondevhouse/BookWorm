import { type EntityType } from "@prisma/client";
import { type Prisma } from "@prisma/client";
import { type Role } from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";
import { proposalApplicationRepository } from "../repositories/proposalApplicationRepository.js";
import { revisionAuditRepository } from "../repositories/revisionAuditRepository.js";

type ProposalStatusValue = "PENDING" | "ACCEPTED" | "REJECTED";

type ProposalApplicationItem = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  proposedById: string;
  decidedById: string | null;
  appliedById: string | null;
  entityId: string | null;
  manuscriptId: string | null;
  changeType: "CREATE" | "UPDATE" | "DELETE";
  status: ProposalStatusValue;
  title: string;
  summary: string;
  payload: unknown | null;
  decisionNote: string | null;
  appliedNote: string | null;
  decidedAt: Date | null;
  appliedAt: Date | null;
  proposedBy: {
    userId: string;
    email: string;
    displayName: string;
    role: string;
  };
  decidedBy: {
    userId: string;
    email: string;
    displayName: string;
    role: string;
  } | null;
  appliedBy: {
    userId: string;
    email: string;
    displayName: string;
    role: string;
  } | null;
};

type ApplicationGateFailureCode =
  | "PROPOSAL_NOT_ACCEPTED"
  | "PROPOSAL_ALREADY_APPLIED"
  | "REVIEW_REQUEST_REQUIRED"
  | "REVIEW_REQUEST_NOT_RESOLVED"
  | "APPROVAL_CHAIN_REQUIRED"
  | "APPROVAL_CHAIN_NOT_APPROVED"
  | "REQUIRED_STEP_INCOMPLETE";

type ApplicationGateFailureReason = {
  code: ApplicationGateFailureCode;
  message: string;
  details: Record<string, string | number | boolean | null>;
};

type ProposalApplicationReadiness = {
  proposalId: string;
  ready: boolean;
  evaluatedAt: Date;
  reviewRequest: {
    id: string;
    status: string;
    hasApprovalChain: boolean;
    approvalChainStatus: string | null;
    requiredStepsTotal: number;
    requiredStepsApproved: number;
  } | null;
  unmetConditions: ApplicationGateFailureReason[];
};

type ApplyOverrideReasonCode = "EMERGENCY_HOTFIX" | "INCIDENT_RESPONSE" | "LEGAL_COMPLIANCE";

class ProposalNotFoundError extends Error {
  constructor() {
    super("Proposal not found");
    this.name = "ProposalNotFoundError";
  }
}

class ProposalApplicationGateBlockedError extends Error {
  readonly reasons: ApplicationGateFailureReason[];
  readonly readiness: ProposalApplicationReadiness;

  constructor(reasons: ApplicationGateFailureReason[], readiness: ProposalApplicationReadiness) {
    super("Proposal application blocked by policy gates");
    this.name = "ProposalApplicationGateBlockedError";
    this.reasons = reasons;
    this.readiness = readiness;
  }
}

class ProposalApplicationOverrideUnauthorizedError extends Error {
  constructor() {
    super("You do not have permission to override proposal application gates");
    this.name = "ProposalApplicationOverrideUnauthorizedError";
  }
}

class ProposalApplicationOverrideInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProposalApplicationOverrideInvalidError";
  }
}

const maxAppliedNoteLength = 5000;
const maxOverrideReasonNoteLength = 500;

const allowedOverrideReasonCodes: ApplyOverrideReasonCode[] = [
  "EMERGENCY_HOTFIX",
  "INCIDENT_RESPONSE",
  "LEGAL_COMPLIANCE"
];

const assertAppliedNote = (note: string): string => {
  const trimmedNote = note.trim();

  if (trimmedNote.length > maxAppliedNoteLength) {
    throw new Error("Applied note must be at most 5000 characters");
  }

  return trimmedNote;
};

const assertOverrideReasonCode = (reasonCode: string): ApplyOverrideReasonCode => {
  if (
    reasonCode !== "EMERGENCY_HOTFIX" &&
    reasonCode !== "INCIDENT_RESPONSE" &&
    reasonCode !== "LEGAL_COMPLIANCE"
  ) {
    throw new ProposalApplicationOverrideInvalidError(
      `Override reason code must be one of: ${allowedOverrideReasonCodes.join(", ")}`
    );
  }

  return reasonCode;
};

const assertOverrideReasonNote = (reasonNote: string): string => {
  const trimmed = reasonNote.trim();

  if (trimmed.length === 0) {
    throw new ProposalApplicationOverrideInvalidError("Override reason note is required");
  }

  if (trimmed.length > maxOverrideReasonNoteLength) {
    throw new ProposalApplicationOverrideInvalidError("Override reason note must be at most 500 characters");
  }

  return trimmed;
};

const evaluateApplicationReadiness = (
  proposal: NonNullable<Awaited<ReturnType<typeof proposalApplicationRepository.findProposalById>>>
): ProposalApplicationReadiness => {
  const unmetConditions: ApplicationGateFailureReason[] = [];

  if (proposal.status !== "ACCEPTED") {
    unmetConditions.push({
      code: "PROPOSAL_NOT_ACCEPTED",
      message: "Proposal must be ACCEPTED before application",
      details: {
        currentStatus: proposal.status
      }
    });
  }

  if (proposal.appliedAt !== null) {
    unmetConditions.push({
      code: "PROPOSAL_ALREADY_APPLIED",
      message: "Proposal has already been applied",
      details: {
        appliedAt: proposal.appliedAt.toISOString()
      }
    });
  }

  const reviewRequest = proposal.reviewRequests[0] ?? null;

  if (reviewRequest === null) {
    unmetConditions.push({
      code: "REVIEW_REQUEST_REQUIRED",
      message: "Proposal application requires a linked review request",
      details: {
        proposalId: proposal.id
      }
    });

    return {
      proposalId: proposal.id,
      ready: unmetConditions.length === 0,
      evaluatedAt: new Date(),
      reviewRequest: null,
      unmetConditions
    };
  }

  if (reviewRequest.status !== "RESOLVED") {
    unmetConditions.push({
      code: "REVIEW_REQUEST_NOT_RESOLVED",
      message: "Review request must be RESOLVED before proposal application",
      details: {
        reviewRequestId: reviewRequest.id,
        currentStatus: reviewRequest.status
      }
    });
  }

  const chain = reviewRequest.approvalChain;

  if (chain === null) {
    unmetConditions.push({
      code: "APPROVAL_CHAIN_REQUIRED",
      message: "Review request approval chain is required before proposal application",
      details: {
        reviewRequestId: reviewRequest.id
      }
    });
  } else {
    if (chain.status !== "APPROVED") {
      unmetConditions.push({
        code: "APPROVAL_CHAIN_NOT_APPROVED",
        message: "Approval chain must be APPROVED before proposal application",
        details: {
          reviewRequestId: reviewRequest.id,
          approvalChainId: chain.id,
          currentStatus: chain.status
        }
      });
    }

    for (const step of chain.steps) {
      if (step.required && step.status !== "APPROVED") {
        unmetConditions.push({
          code: "REQUIRED_STEP_INCOMPLETE",
          message: "All required approval steps must be APPROVED before proposal application",
          details: {
            reviewRequestId: reviewRequest.id,
            approvalChainId: chain.id,
            stepId: step.id,
            stepOrder: step.stepOrder,
            stepStatus: step.status,
            required: step.required
          }
        });
      }
    }
  }

  const requiredSteps = chain?.steps.filter((step) => step.required) ?? [];
  const approvedRequiredSteps = requiredSteps.filter((step) => step.status === "APPROVED");

  return {
    proposalId: proposal.id,
    ready: unmetConditions.length === 0,
    evaluatedAt: new Date(),
    reviewRequest: {
      id: reviewRequest.id,
      status: reviewRequest.status,
      hasApprovalChain: chain !== null,
      approvalChainStatus: chain?.status ?? null,
      requiredStepsTotal: requiredSteps.length,
      requiredStepsApproved: approvedRequiredSteps.length
    },
    unmetConditions
  };
};

const mapProposal = (
  proposal: Awaited<ReturnType<typeof proposalApplicationRepository.findProposalById>>
): ProposalApplicationItem | null => {
  if (!proposal) {
    return null;
  }

  return {
    id: proposal.id,
    createdAt: proposal.createdAt,
    updatedAt: proposal.updatedAt,
    proposedById: proposal.proposedById,
    decidedById: proposal.decidedById,
    appliedById: proposal.appliedById,
    entityId: proposal.entityId,
    manuscriptId: proposal.manuscriptId,
    changeType: proposal.changeType,
    status: proposal.status,
    title: proposal.title,
    summary: proposal.summary,
    payload: proposal.payload,
    decisionNote: proposal.decisionNote,
    appliedNote: proposal.appliedNote,
    decidedAt: proposal.decidedAt,
    appliedAt: proposal.appliedAt,
    proposedBy: {
      userId: proposal.proposedBy.id,
      email: proposal.proposedBy.email,
      displayName: proposal.proposedBy.displayName,
      role: proposal.proposedBy.role
    },
    decidedBy:
      proposal.decidedBy === null
        ? null
        : {
            userId: proposal.decidedBy.id,
            email: proposal.decidedBy.email,
            displayName: proposal.decidedBy.displayName,
            role: proposal.decidedBy.role
          },
    appliedBy:
      proposal.appliedBy === null
        ? null
        : {
            userId: proposal.appliedBy.id,
            email: proposal.appliedBy.email,
            displayName: proposal.appliedBy.displayName,
            role: proposal.appliedBy.role
          }
  };
};

/**
 * Service for managing proposal application workflow.
 * Handles applying accepted proposals, creating revisions, and linking audit trails.
 */
export const proposalApplicationService = {
  /**
   * List pending-accepted proposals awaiting application.
   * @param input - Pagination and optional filter parameters
   * @returns Object containing proposals array, total count, and pagination info
   */
  async listPendingAcceptedProposals(input: {
    limit?: number;
    offset?: number;
    entityType?: string;
  }): Promise<{
    proposals: ProposalApplicationItem[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const limit = Math.min(input.limit || 50, 100);
    const offset = input.offset || 0;

    const [proposals, total] = await Promise.all([
      proposalApplicationRepository.findPendingAcceptedProposals({
        limit,
        offset,
        ...(input.entityType ? { entityType: input.entityType } : {})
      }),
      proposalApplicationRepository.countPendingAcceptedProposals()
    ]);

    return {
      proposals: proposals.map((p) => mapProposal(p)!),
      total,
      limit,
      offset
    };
  },

  /**
   * List already-applied proposals with application metadata.
   * @param input - Pagination parameters
   * @returns Object containing proposals array, total count, and pagination info
   */
  async listAppliedProposals(input: {
    limit?: number;
    offset?: number;
  }): Promise<{
    proposals: ProposalApplicationItem[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const limit = Math.min(input.limit || 50, 100);
    const offset = input.offset || 0;

    const [proposals, total] = await Promise.all([
      proposalApplicationRepository.findAppliedProposals({ limit, offset }),
      proposalApplicationRepository.countAppliedProposals()
    ]);

    return {
      proposals: proposals.map((p) => mapProposal(p)!),
      total,
      limit,
      offset
    };
  },

  /**
   * Get detailed application status of a proposal.
   * @param input - Proposal ID
   * @returns Proposal item with application state
   */
  async getApplicationStatus(input: {
    proposalId: string;
  }): Promise<ProposalApplicationItem> {
    const proposal = await proposalApplicationRepository.findProposalById(input.proposalId);

    if (!proposal) {
      throw new ProposalNotFoundError();
    }

    return mapProposal(proposal)!;
  },

  /**
   * Preview proposal application without committing.
   * Validates that the proposal can be applied and returns what the revision would look like.
   * @param input - Proposal ID
   * @returns Preview data with canApply flag and preview revision
   */
  async previewProposalApplication(input: {
    proposalId: string;
  }): Promise<{
    canApply: boolean;
    errors: string[];
    previewRevision: {
      name?: string;
      summary?: string;
      visibility: string;
      payload?: unknown;
    };
  }> {
    const proposal = await proposalApplicationRepository.findProposalById(input.proposalId);

    if (!proposal) {
      return {
        canApply: false,
        errors: ["Proposal not found"],
        previewRevision: { visibility: "PRIVATE" }
      };
    }

    const errors: string[] = [];

    if (proposal.status !== "ACCEPTED") {
      errors.push(`Proposal is not in ACCEPTED status (current: ${proposal.status})`);
    }

    if (proposal.appliedAt !== null) {
      errors.push("Proposal has already been applied");
    }

    // Validate that target exists
    if (proposal.entityId) {
      const entity = await prismaClient.entity.findUnique({
        where: { id: proposal.entityId }
      });
      if (!entity) {
        errors.push("Entity target not found");
      }
    }

    if (proposal.manuscriptId) {
      const manuscript = await prismaClient.manuscript.findUnique({
        where: { id: proposal.manuscriptId }
      });
      if (!manuscript) {
        errors.push("Manuscript target not found");
      }
    }

    return {
      canApply: errors.length === 0,
      errors,
      previewRevision: {
        name: proposal.title,
        summary: proposal.summary,
        visibility: "PRIVATE",
        ...(proposal.payload ? { payload: proposal.payload } : {})
      }
    };
  },

  /**
   * Apply an accepted proposal by creating a new revision and linking it to the proposal.
   * Atomically updates proposal with appliedAt, appliedById, and optional appliedNote.
   * @param input - Proposal ID, applier user ID, and optional applied note
   * @returns Updated proposal item with application metadata
   */
  async applyProposal(input: {
    proposalId: string;
    appliedById: string;
    appliedByRole: Role;
    appliedNote?: string;
    override?: {
      reasonCode: string;
      reasonNote: string;
    };
  }): Promise<ProposalApplicationItem> {
    // Validate proposal exists and gate-readiness status.
    const proposal = await proposalApplicationRepository.findProposalById(input.proposalId);

    if (!proposal) {
      throw new ProposalNotFoundError();
    }

    const readiness = evaluateApplicationReadiness(proposal);

    if (!readiness.ready) {
      if (input.override === undefined) {
        throw new ProposalApplicationGateBlockedError(readiness.unmetConditions, readiness);
      }

      if (input.appliedByRole !== "AUTHOR_ADMIN") {
        throw new ProposalApplicationOverrideUnauthorizedError();
      }

      const overrideReasonCode = assertOverrideReasonCode(input.override.reasonCode);
      const overrideReasonNote = assertOverrideReasonNote(input.override.reasonNote);

      await proposalApplicationRepository.appendPolicyAuditEntry({
        proposalId: proposal.id,
        entry: {
          eventType: "APPLICATION_OVERRIDE",
          actorUserId: input.appliedById,
          actorRole: input.appliedByRole,
          reasonCode: overrideReasonCode,
          reasonNote: overrideReasonNote,
          gateFailureCodes: readiness.unmetConditions.map((reason) => reason.code),
          occurredAt: new Date().toISOString()
        }
      });
    }

    const appliedNote = input.appliedNote
      ? assertAppliedNote(input.appliedNote)
      : undefined;

    // Determine target and create appropriate revision
    if (proposal.entityId) {
      const nextVersion =
        (await prismaClient.entityRevision.findFirst({
          where: { entityId: proposal.entityId },
          orderBy: { version: "desc" },
          select: { version: true }
        })) || { version: 0 };

      await prismaClient.entityRevision.create({
        data: {
          entityId: proposal.entityId,
          createdById: input.appliedById,
          version: nextVersion.version + 1,
          name: proposal.title,
          summary: proposal.summary,
          visibility: "PRIVATE",
          appliedFromProposalId: proposal.id,
          ...(proposal.payload ? { payload: proposal.payload as Prisma.InputJsonValue } : {})
        }
      });
    } else if (proposal.manuscriptId) {
      const nextVersion =
        (await prismaClient.manuscriptRevision.findFirst({
          where: { manuscriptId: proposal.manuscriptId },
          orderBy: { version: "desc" },
          select: { version: true }
        })) || { version: 0 };

      await prismaClient.manuscriptRevision.create({
        data: {
          manuscriptId: proposal.manuscriptId,
          createdById: input.appliedById,
          version: nextVersion.version + 1,
          title: proposal.title,
          summary: proposal.summary,
          visibility: "PRIVATE",
          appliedFromProposalId: proposal.id,
          ...(proposal.payload ? { payload: proposal.payload as Prisma.InputJsonValue } : {})
        }
      });
    }

    // Update proposal with application metadata
    const updatedProposal = await proposalApplicationRepository.applyProposal({
      proposalId: proposal.id,
      appliedById: input.appliedById,
      ...(appliedNote ? { appliedNote } : {})
    });

    return mapProposal(updatedProposal)!;
  },

  async getApplicationReadiness(input: {
    proposalId: string;
  }): Promise<ProposalApplicationReadiness> {
    const proposal = await proposalApplicationRepository.findProposalById(input.proposalId);

    if (!proposal) {
      throw new ProposalNotFoundError();
    }

    return evaluateApplicationReadiness(proposal);
  },

  /**
   * Get proposal application statistics for dashboard.
   * @returns Aggregate counts for editorial workflow
   */
  async getWorkflowStats(): Promise<{
    pending: number;
    accepted: number;
    applied: number;
    rejected: number;
    totalByChangeType: {
      CREATE: number;
      UPDATE: number;
      DELETE: number;
    };
  }> {
    return proposalApplicationRepository.getWorkflowStats();
  },

  /**
   * Get 20 most recent applied proposals for dashboard overview.
   * @returns Array of recently applied proposals ordered by appliedAt descending
   */
  async getRecentApplications(): Promise<ProposalApplicationItem[]> {
    const proposals = await proposalApplicationRepository.getRecentApplications();
    return proposals.map((p) => mapProposal(p)!);
  },

  /**
   * Get entity revisions created by applying proposals (audit trail).
   * @param input - Entity type and slug
   * @returns Array of revisions with applied proposal metadata
   */
  async getEntityRevisionAuditTrail(input: {
    entityType: EntityType;
    slug: string;
  }): Promise<
    Array<{
      revisionId: string;
      version: number;
      appliedFromProposal: {
        id: string;
        title: string;
        summary: string;
        appliedBy: {
          userId: string;
          email: string;
          displayName: string;
          role: string;
        } | null;
        appliedAt: Date | null;
        appliedNote: string | null;
      } | null;
    }>
  > {
    const revisions = await revisionAuditRepository.findEntityRevisionsByAppliedProposals(
      input
    );

    return revisions.map((r) => ({
      revisionId: r.id,
      version: r.version,
      appliedFromProposal: r.appliedFromProposal
        ? {
            id: r.appliedFromProposal.id,
            title: r.appliedFromProposal.title,
            summary: r.appliedFromProposal.summary,
            appliedBy: r.appliedFromProposal.appliedBy
              ? {
                  userId: r.appliedFromProposal.appliedBy.id,
                  email: r.appliedFromProposal.appliedBy.email,
                  displayName: r.appliedFromProposal.appliedBy.displayName,
                  role: r.appliedFromProposal.appliedBy.role
                }
              : null,
            appliedAt: r.appliedFromProposal.appliedAt,
            appliedNote: r.appliedFromProposal.appliedNote
          }
        : null
    }));
  },

  /**
   * Get manuscript revisions created by applying proposals (audit trail).
   * @param input - Manuscript ID
   * @returns Array of revisions with applied proposal metadata
   */
  async getManuscriptRevisionAuditTrail(input: {
    manuscriptId: string;
  }): Promise<
    Array<{
      revisionId: string;
      version: number;
      appliedFromProposal: {
        id: string;
        title: string;
        summary: string;
        appliedBy: {
          userId: string;
          email: string;
          displayName: string;
          role: string;
        } | null;
        appliedAt: Date | null;
        appliedNote: string | null;
      } | null;
    }>
  > {
    const revisions = await revisionAuditRepository.findManuscriptRevisionsByAppliedProposals(
      input
    );

    return revisions.map((r) => ({
      revisionId: r.id,
      version: r.version,
      appliedFromProposal: r.appliedFromProposal
        ? {
            id: r.appliedFromProposal.id,
            title: r.appliedFromProposal.title,
            summary: r.appliedFromProposal.summary,
            appliedBy: r.appliedFromProposal.appliedBy
              ? {
                  userId: r.appliedFromProposal.appliedBy.id,
                  email: r.appliedFromProposal.appliedBy.email,
                  displayName: r.appliedFromProposal.appliedBy.displayName,
                  role: r.appliedFromProposal.appliedBy.role
                }
              : null,
            appliedAt: r.appliedFromProposal.appliedAt,
            appliedNote: r.appliedFromProposal.appliedNote
          }
        : null
    }));
  }
};
