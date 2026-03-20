import { type EntityType, type Role, type ProposalWorkflowState } from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";

type ProposalChangeTypeValue = "CREATE" | "UPDATE" | "DELETE";
type ProposalStatusValue = "PENDING" | "ACCEPTED" | "REJECTED";

type ProposalTargetRecord =
  | {
      entityId: string;
      manuscriptId?: never;
    }
  | {
      manuscriptId: string;
      entityId?: never;
    };

type ProposalWhereInput = {
  entityId?: string | null;
  manuscriptId?: string | null;
  status?: ProposalStatusValue;
  changeType?: ProposalChangeTypeValue;
  workflowState?:
    | ProposalWorkflowState
    | {
        in: ProposalWorkflowState[];
      };
  proposedById?: string;
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
  appliedAt?:
    | null
    | {
        not: null;
      };
};

type ProposalRecord = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  proposedById: string;
  decidedById: string | null;
  appliedById: string | null;
  entityId: string | null;
  manuscriptId: string | null;
  changeType: ProposalChangeTypeValue;
  status: ProposalStatusValue;
  title: string;
  summary: string;
  payload: unknown | null;
  decisionNote: string | null;
  appliedNote: string | null;
  decidedAt: Date | null;
  appliedAt: Date | null;
  workflowState: ProposalWorkflowState;
  submittedAt: Date | null;
  reviewStartedAt: Date | null;
  approvedAt: Date | null;
  archivedAt: Date | null;
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
};

type ProposalModel = {
  create: (args: {
    data: {
      proposedById: string;
      entityId?: string;
      manuscriptId?: string;
      changeType: ProposalChangeTypeValue;
      title: string;
      summary: string;
      payload?: unknown;
    };
    select: typeof proposalSelect;
  }) => Promise<ProposalRecord>;
  findUnique: (args: {
    where: { id: string };
    select: typeof proposalSelect;
  }) => Promise<ProposalRecord | null>;
  findMany: (args: {
    where?: ProposalWhereInput;
    orderBy: Array<
      { workflowState?: "asc" | "desc" } | { createdAt?: "asc" | "desc" } | { id?: "asc" | "desc" }
    >;
    select: typeof proposalSelect;
    take?: number;
    skip?: number;
  }) => Promise<ProposalRecord[]>;
  count: (args: {
    where?: ProposalWhereInput;
  }) => Promise<number>;
  update: (args: {
    where: { id: string };
    data: {
      status?: ProposalStatusValue;
      decidedById?: string;
      decisionNote?: string | null;
      appliedNote?: string | null;
      decidedAt?: Date;
      workflowState?: ProposalWorkflowState;
      submittedAt?: Date;
      reviewStartedAt?: Date;
      approvedAt?: Date;
      archivedAt?: Date;
      reviewNotes?: string | null;
    };
    select: typeof proposalSelect;
  }) => Promise<ProposalRecord>;
};

const proposalSelect = {
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
  submittedAt: true,
  reviewStartedAt: true,
  approvedAt: true,
  archivedAt: true,
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
  }
} as const;

const proposalModel = (prismaClient as unknown as { proposal: ProposalModel }).proposal;

const buildProposalTargetWhere = (target: ProposalTargetRecord): ProposalWhereInput => {
  if ("entityId" in target) {
    return {
      entityId: target.entityId,
      manuscriptId: null
    };
  }

  return {
    manuscriptId: target.manuscriptId,
    entityId: null
  };
};

export const proposalRepository = {
  async findEntityByTypeAndSlug(input: { entityType: EntityType; slug: string }) {
    return prismaClient.entity.findFirst({
      where: {
        slug: input.slug,
        type: input.entityType,
        retiredAt: null
      },
      select: {
        id: true,
        slug: true,
        type: true
      }
    });
  },

  async findManuscriptById(manuscriptId: string) {
    return prismaClient.manuscript.findUnique({
      where: {
        id: manuscriptId
      },
      select: {
        id: true,
        slug: true,
        type: true
      }
    });
  },

  async createProposal(input: {
    proposedById: string;
    target: ProposalTargetRecord;
    changeType: ProposalChangeTypeValue;
    title: string;
    summary: string;
    payload?: unknown;
  }) {
    return proposalModel.create({
      data: {
        proposedById: input.proposedById,
        changeType: input.changeType,
        title: input.title,
        summary: input.summary,
        ...(input.payload === undefined ? {} : { payload: input.payload }),
        ...input.target
      },
      select: proposalSelect
    });
  },

  async listProposalsByTarget(target: ProposalTargetRecord) {
    return proposalModel.findMany({
      where: buildProposalTargetWhere(target),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: proposalSelect
    });
  },

  async findProposalById(proposalId: string) {
    return proposalModel.findUnique({
      where: {
        id: proposalId
      },
      select: proposalSelect
    });
  },

  async listAdminProposals(input?: {
    status?: ProposalStatusValue;
    changeType?: ProposalChangeTypeValue;
  }) {
    return proposalModel.findMany({
      where: {
        ...(input?.status === undefined ? {} : { status: input.status }),
        ...(input?.changeType === undefined ? {} : { changeType: input.changeType })
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: proposalSelect
    });
  },

  async listFilteredProposals(input: {
    workflowState?: ProposalWorkflowState;
    workflowStates?: ProposalWorkflowState[];
    changeType?: ProposalChangeTypeValue;
    proposedById?: string;
    createdAtFrom?: Date;
    createdAtTo?: Date;
    appliedOnly?: boolean;
    limit: number;
    offset: number;
  }) {
    const where: ProposalWhereInput = {
      ...(input.changeType === undefined ? {} : { changeType: input.changeType }),
      ...(input.proposedById === undefined ? {} : { proposedById: input.proposedById }),
      ...(input.appliedOnly === true ? { appliedAt: { not: null } } : {}),
      ...(input.workflowStates === undefined
        ? {}
        : {
            workflowState: {
              in: input.workflowStates
            }
          }),
      ...(input.workflowStates !== undefined || input.workflowState === undefined
        ? {}
        : { workflowState: input.workflowState }),
      ...(input.createdAtFrom === undefined && input.createdAtTo === undefined
        ? {}
        : {
            createdAt: {
              ...(input.createdAtFrom === undefined ? {} : { gte: input.createdAtFrom }),
              ...(input.createdAtTo === undefined ? {} : { lte: input.createdAtTo })
            }
          })
    };

    const [proposals, total] = await Promise.all([
      proposalModel.findMany({
        where,
        orderBy: [{ workflowState: "asc" }, { createdAt: "desc" }, { id: "desc" }],
        select: proposalSelect,
        take: input.limit,
        skip: input.offset
      }),
      proposalModel.count({ where })
    ]);

    return { proposals, total };
  },

  async decideProposal(input: {
    proposalId: string;
    status: Exclude<ProposalStatusValue, "PENDING">;
    decidedById: string;
    decisionNote?: string;
  }) {
    return proposalModel.update({
      where: {
        id: input.proposalId
      },
      data: {
        status: input.status,
        decidedById: input.decidedById,
        ...(input.decisionNote === undefined ? {} : { decisionNote: input.decisionNote }),
        decidedAt: new Date()
      },
      select: proposalSelect
    });
  },

  async findProposalsByWorkflowState(
    workflowState: ProposalWorkflowState,
    options: { limit: number; offset: number }
  ) {
    return this.listFilteredProposals({
      workflowState,
      limit: options.limit,
      offset: options.offset
    });
  },

  async updateProposalWorkflowState(
    proposalId: string,
    workflowState: ProposalWorkflowState,
    updates: {
      submittedAt?: Date;
      reviewStartedAt?: Date;
      approvedAt?: Date;
      archivedAt?: Date;
      reviewNotes?: string;
      actor: string; // For audit trail
    }
  ) {
    return proposalModel.update({
      where: { id: proposalId },
      data: {
        workflowState,
        ...(updates.submittedAt ? { submittedAt: updates.submittedAt } : {}),
        ...(updates.reviewStartedAt ? { reviewStartedAt: updates.reviewStartedAt } : {}),
        ...(updates.approvedAt ? { approvedAt: updates.approvedAt } : {}),
        ...(updates.archivedAt ? { archivedAt: updates.archivedAt } : {}),
        ...(updates.reviewNotes !== undefined ? { reviewNotes: updates.reviewNotes } : {})
      },
      select: proposalSelect
    });
  },

  async updateProposalMetadata(input: {
    proposalId: string;
    decisionNote?: string | null;
    reviewNotes?: string | null;
    appliedNote?: string | null;
  }) {
    return proposalModel.update({
      where: {
        id: input.proposalId
      },
      data: {
        ...(Object.hasOwn(input, "decisionNote") ? { decisionNote: input.decisionNote ?? null } : {}),
        ...(Object.hasOwn(input, "reviewNotes") ? { reviewNotes: input.reviewNotes ?? null } : {}),
        ...(Object.hasOwn(input, "appliedNote") ? { appliedNote: input.appliedNote ?? null } : {})
      },
      select: proposalSelect
    });
  },

  async countByWorkflowState(input?: { createdAtFrom?: Date; createdAtTo?: Date }): Promise<{
    DRAFT: number;
    SUBMITTED: number;
    IN_REVIEW: number;
    APPROVED: number;
    REJECTED: number;
    APPLIED: number;
    ARCHIVED: number;
  }> {
    const createdAtWhere =
      input?.createdAtFrom === undefined && input?.createdAtTo === undefined
        ? {}
        : {
            createdAt: {
              ...(input?.createdAtFrom === undefined ? {} : { gte: input.createdAtFrom }),
              ...(input?.createdAtTo === undefined ? {} : { lte: input.createdAtTo })
            }
          };

    const [draft, submitted, inReview, approved, rejected, applied, archived] = await Promise.all([
      proposalModel.count({ where: { workflowState: "DRAFT", ...createdAtWhere } }),
      proposalModel.count({ where: { workflowState: "SUBMITTED", ...createdAtWhere } }),
      proposalModel.count({ where: { workflowState: "IN_REVIEW", ...createdAtWhere } }),
      proposalModel.count({ where: { workflowState: "APPROVED", ...createdAtWhere } }),
      proposalModel.count({ where: { workflowState: "REJECTED", ...createdAtWhere } }),
      proposalModel.count({ where: { workflowState: "APPLIED", ...createdAtWhere } }),
      proposalModel.count({ where: { workflowState: "ARCHIVED", ...createdAtWhere } })
    ]);

    return {
      DRAFT: draft,
      SUBMITTED: submitted,
      IN_REVIEW: inReview,
      APPROVED: approved,
      REJECTED: rejected,
      APPLIED: applied,
      ARCHIVED: archived
    };
  },

  async countByChangeType(input?: { createdAtFrom?: Date; createdAtTo?: Date }): Promise<{
    CREATE: number;
    UPDATE: number;
    DELETE: number;
  }> {
    const createdAtWhere =
      input?.createdAtFrom === undefined && input?.createdAtTo === undefined
        ? {}
        : {
            createdAt: {
              ...(input?.createdAtFrom === undefined ? {} : { gte: input.createdAtFrom }),
              ...(input?.createdAtTo === undefined ? {} : { lte: input.createdAtTo })
            }
          };

    const [create, update, del] = await Promise.all([
      proposalModel.count({ where: { changeType: "CREATE", ...createdAtWhere } }),
      proposalModel.count({ where: { changeType: "UPDATE", ...createdAtWhere } }),
      proposalModel.count({ where: { changeType: "DELETE", ...createdAtWhere } })
    ]);

    return {
      CREATE: create,
      UPDATE: update,
      DELETE: del
    };
  }
};
