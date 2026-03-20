import { type ApprovalChainStatus, type ApprovalStepStatus, type Role, type ReviewRequestStatus } from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";

type ProposalStatusValue = "PENDING" | "ACCEPTED" | "REJECTED";

type ProposalApplicationRecord = {
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
  workflowState: "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "APPLIED" | "ARCHIVED";
  reviewNotes: string | null;
  proposedBy: {
    id: string;
    email: string;
    displayName: string;
    role: Role;
  };
  decidedBy: {
    id: string;
    email: string;
    displayName: string;
    role: Role;
  } | null;
  appliedBy: {
    id: string;
    email: string;
    displayName: string;
    role: Role;
  } | null;
  reviewRequests: {
    id: string;
    status: ReviewRequestStatus;
    createdAt: Date;
    approvalChain: {
      id: string;
      status: ApprovalChainStatus;
      currentStepOrder: number;
      finalizedAt: Date | null;
      steps: {
        id: string;
        stepOrder: number;
        required: boolean;
        status: ApprovalStepStatus;
      }[];
    } | null;
  }[];
};

type ProposalApplicationModel = {
  findMany: (args: {
    where?: Record<string, unknown>;
    orderBy?: Array<Record<string, unknown>>;
    skip?: number;
    take?: number;
    select: typeof proposalApplicationSelect;
  }) => Promise<ProposalApplicationRecord[]>;
  count: (args: {
    where?: Record<string, unknown>;
  }) => Promise<number>;
  findUnique: (args: {
    where: { id: string };
    select: typeof proposalApplicationSelect;
  }) => Promise<ProposalApplicationRecord | null>;
  update: (args: {
    where: { id: string };
    data: {
      status?: ProposalStatusValue;
      workflowState?: "APPLIED";
      appliedById?: string;
      appliedAt?: Date;
      appliedNote?: string;
      reviewNotes?: string;
    };
    select: typeof proposalApplicationSelect;
  }) => Promise<ProposalApplicationRecord>;
};

const proposalApplicationSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  proposedById: true,
  decidedById: true,
  appliedById: true,
  entityId: true,
  manuscriptId: true,
  changeType: true,
  status: true,
  title: true,
  summary: true,
  payload: true,
  decisionNote: true,
  appliedNote: true,
  decidedAt: true,
  appliedAt: true,
  workflowState: true,
  reviewNotes: true,
  proposedBy: {
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true
    }
  },
  decidedBy: {
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true
    }
  },
  appliedBy: {
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true
    }
  },
  reviewRequests: {
    orderBy: [{ createdAt: "desc" }],
    take: 1,
    select: {
      id: true,
      status: true,
      createdAt: true,
      approvalChain: {
        select: {
          id: true,
          status: true,
          currentStepOrder: true,
          finalizedAt: true,
          steps: {
            orderBy: [{ stepOrder: "asc" }],
            select: {
              id: true,
              stepOrder: true,
              required: true,
              status: true
            }
          }
        }
      }
    }
  }
} as const;

const proposalModel = (prismaClient as unknown as { proposal: ProposalApplicationModel }).proposal;

/**
 * Repository for querying proposals in the context of application workflow.
 * Handles finding accepted proposals awaiting application and already-applied proposals.
 */
export const proposalApplicationRepository = {
  /**
   * Find all ACCEPTED proposals awaiting application with pagination.
   * @param input - Pagination and optional filter parameters
   * @returns Array of ACCEPTED proposals ordered by creation date descending
   */
  async findPendingAcceptedProposals(input: {
    limit: number;
    offset: number;
    entityType?: string;
  }) {
    const where: Record<string, unknown> = {
      status: "ACCEPTED",
      appliedAt: null
    };

    if (input.entityType) {
      // This would require a more complex query joining entities, 
      // but for now accept any ACCEPTED proposal
    }

    const proposals = await proposalModel.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: input.offset,
      take: input.limit,
      select: proposalApplicationSelect
    });

    return proposals;
  },

  /**
   * Count total pending-accepted proposals.
   */
  async countPendingAcceptedProposals(): Promise<number> {
    return proposalModel.count({
      where: {
        status: "ACCEPTED",
        appliedAt: null
      }
    });
  },

  /**
   * Find all APPLIED proposals (those with appliedAt set) with pagination.
   * @param input - Pagination parameters
   * @returns Array of applied proposals ordered by application date descending
   */
  async findAppliedProposals(input: { limit: number; offset: number }) {
    const proposals = await proposalModel.findMany({
      where: {
        appliedAt: { not: null }
      },
      orderBy: [{ appliedAt: "desc" }, { id: "desc" }],
      skip: input.offset,
      take: input.limit,
      select: proposalApplicationSelect
    });

    return proposals;
  },

  /**
   * Count total applied proposals.
   */
  async countAppliedProposals(): Promise<number> {
    return proposalModel.count({
      where: {
        appliedAt: { not: null }
      }
    });
  },

  /**
   * Find proposal by ID for application context.
   */
  async findProposalById(proposalId: string): Promise<ProposalApplicationRecord | null> {
    return proposalModel.findUnique({
      where: { id: proposalId },
      select: proposalApplicationSelect
    });
  },

  /**
   * Apply a proposal by setting appliedAt, appliedById, and optional appliedNote.
   * @param input - Application data
   * @returns Updated proposal record
   */
  async applyProposal(input: {
    proposalId: string;
    appliedById: string;
    appliedNote?: string;
  }): Promise<ProposalApplicationRecord> {
    return proposalModel.update({
      where: { id: input.proposalId },
      data: {
        status: "ACCEPTED", // Keep status as ACCEPTED, appliedAt marks actual application
        workflowState: "APPLIED",
        appliedById: input.appliedById,
        appliedAt: new Date(),
        ...(input.appliedNote === undefined ? {} : { appliedNote: input.appliedNote })
      },
      select: proposalApplicationSelect
    });
  },

  async appendPolicyAuditEntry(input: {
    proposalId: string;
    entry: {
      eventType: "APPLICATION_OVERRIDE";
      actorUserId: string;
      actorRole: Role;
      reasonCode: string;
      reasonNote: string | null;
      gateFailureCodes: string[];
      occurredAt: string;
    };
  }): Promise<void> {
    const proposal = await this.findProposalById(input.proposalId);

    if (proposal === null) {
      return;
    }

    const serializedEntry = `[policy-gate] ${JSON.stringify(input.entry)}`;
    const nextReviewNotes =
      proposal.reviewNotes === null || proposal.reviewNotes.trim().length === 0
        ? serializedEntry
        : `${proposal.reviewNotes}\n${serializedEntry}`;

    await proposalModel.update({
      where: { id: input.proposalId },
      data: {
        reviewNotes: nextReviewNotes
      },
      select: proposalApplicationSelect
    });
  },

  /**
   * Get aggregate statistics about proposal workflow.
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
    const [pending, accepted, applied, rejected, createdCount, updatedCount, deletedCount] =
      await Promise.all([
        proposalModel.count({ where: { status: "PENDING" } }),
        proposalModel.count({ where: { status: "ACCEPTED", appliedAt: null } }),
        proposalModel.count({ where: { appliedAt: { not: null } } }),
        proposalModel.count({ where: { status: "REJECTED" } }),
        proposalModel.count({ where: { changeType: "CREATE" } }),
        proposalModel.count({ where: { changeType: "UPDATE" } }),
        proposalModel.count({ where: { changeType: "DELETE" } })
      ]);

    return {
      pending,
      accepted,
      applied,
      rejected,
      totalByChangeType: {
        CREATE: createdCount,
        UPDATE: updatedCount,
        DELETE: deletedCount
      }
    };
  },

  /**
   * Get 20 most recent applied proposals.
   */
  async getRecentApplications(): Promise<ProposalApplicationRecord[]> {
    return proposalModel.findMany({
      where: {
        appliedAt: { not: null }
      },
      orderBy: [{ appliedAt: "desc" }, { id: "desc" }],
      take: 20,
      select: proposalApplicationSelect
    });
  }
};
