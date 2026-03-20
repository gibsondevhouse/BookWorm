import { type Prisma, type ProposalStatus, type ProposalWorkflowState, type ReviewRequestStatus, type Role } from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";

const reviewRequestSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  proposalId: true,
  createdById: true,
  assignedApproverId: true,
  assignedAt: true,
  assignmentHistory: true,
  lifecycleHistory: true,
  status: true,
  proposal: {
    select: {
      id: true,
      entityId: true,
      manuscriptId: true,
      status: true,
      workflowState: true
    }
  },
  createdBy: {
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true
    }
  },
  assignedApprover: {
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true
    }
  }
} as const;

type AssignmentHistoryValue = Prisma.JsonValue;

type ReviewRequestRecord = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  proposalId: string;
  createdById: string;
  assignedApproverId: string | null;
  assignedAt: Date | null;
  assignmentHistory: AssignmentHistoryValue | null;
  lifecycleHistory: AssignmentHistoryValue | null;
  status: ReviewRequestStatus;
  proposal: {
    id: string;
    entityId: string | null;
    manuscriptId: string | null;
    status: ProposalStatus;
    workflowState: ProposalWorkflowState;
  };
  createdBy: {
    id: string;
    email: string;
    displayName: string;
    role: Role;
  };
  assignedApprover: {
    id: string;
    email: string;
    displayName: string;
    role: Role;
  } | null;
};

type AssignableApproverRecord = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
};

type ReviewRequestWhereInput = {
  assignedApproverId?: string;
  status?: ReviewRequestStatus;
  proposal?: {
    workflowState: ProposalWorkflowState;
  };
};

type ProposalLinkRecord = {
  id: string;
  entityId: string | null;
  manuscriptId: string | null;
  status: ProposalStatus;
  workflowState: ProposalWorkflowState;
};

type ReviewRequestModel = {
  create: (args: {
    data: {
      proposalId: string;
      createdById: string;
      status: ReviewRequestStatus;
    };
    select: typeof reviewRequestSelect;
  }) => Promise<ReviewRequestRecord>;
  findUnique: (args: {
    where: {
      id: string;
    };
    select: typeof reviewRequestSelect;
  }) => Promise<ReviewRequestRecord | null>;
  findMany: (args: {
    where?: ReviewRequestWhereInput;
    orderBy: Array<{ createdAt: "asc" | "desc" } | { id: "asc" | "desc" }>;
    select: typeof reviewRequestSelect;
    take: number;
    skip: number;
  }) => Promise<ReviewRequestRecord[]>;
  update: (args: {
    where: {
      id: string;
    };
    data: {
      assignedApproverId: string;
      assignedAt: Date;
      assignmentHistory: AssignmentHistoryValue;
    };
    select: typeof reviewRequestSelect;
  }) => Promise<ReviewRequestRecord>;
  updateMany: (args: {
    where: {
      id: string;
      status: ReviewRequestStatus;
    };
    data: {
      status: ReviewRequestStatus;
      lifecycleHistory: AssignmentHistoryValue;
    };
  }) => Promise<{ count: number }>;
  count: (args?: {
    where?: ReviewRequestWhereInput;
  }) => Promise<number>;
};

type UserModel = {
  findFirst: (args: {
    where: {
      id: string;
      role: {
        in: Role[];
      };
    };
    select: {
      id: true;
      email: true;
      displayName: true;
      role: true;
    };
  }) => Promise<AssignableApproverRecord | null>;
};

const reviewRequestModel = (prismaClient as unknown as { reviewRequest: ReviewRequestModel }).reviewRequest;
const userModel = (prismaClient as unknown as { user: UserModel }).user;

const buildQueueWhere = (input: {
  assigneeUserId?: string;
  status?: ReviewRequestStatus;
  proposalWorkflowState?: ProposalWorkflowState;
}): ReviewRequestWhereInput => {
  const where: ReviewRequestWhereInput = {};

  if (input.assigneeUserId !== undefined) {
    where.assignedApproverId = input.assigneeUserId;
  }

  if (input.status !== undefined) {
    where.status = input.status;
  }

  if (input.proposalWorkflowState !== undefined) {
    where.proposal = {
      workflowState: input.proposalWorkflowState
    };
  }

  return where;
};

export const reviewRequestRepository = {
  async findProposalLinkById(proposalId: string): Promise<ProposalLinkRecord | null> {
    return prismaClient.proposal.findUnique({
      where: {
        id: proposalId
      },
      select: {
        id: true,
        entityId: true,
        manuscriptId: true,
        status: true,
        workflowState: true
      }
    });
  },

  async createReviewRequest(input: {
    proposalId: string;
    createdById: string;
    status: ReviewRequestStatus;
  }): Promise<ReviewRequestRecord> {
    return reviewRequestModel.create({
      data: {
        proposalId: input.proposalId,
        createdById: input.createdById,
        status: input.status
      },
      select: reviewRequestSelect
    });
  },

  async findReviewRequestById(reviewRequestId: string): Promise<ReviewRequestRecord | null> {
    return reviewRequestModel.findUnique({
      where: {
        id: reviewRequestId
      },
      select: reviewRequestSelect
    });
  },

  async findAssignableApproverById(userId: string): Promise<AssignableApproverRecord | null> {
    return userModel.findFirst({
      where: {
        id: userId,
        role: {
          in: ["EDITOR", "AUTHOR_ADMIN"]
        }
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true
      }
    });
  },

  async assignReviewRequest(input: {
    reviewRequestId: string;
    assignedApproverId: string;
    assignedAt: Date;
    assignmentHistory: AssignmentHistoryValue;
  }): Promise<ReviewRequestRecord> {
    return reviewRequestModel.update({
      where: {
        id: input.reviewRequestId
      },
      data: {
        assignedApproverId: input.assignedApproverId,
        assignedAt: input.assignedAt,
        assignmentHistory: input.assignmentHistory
      },
      select: reviewRequestSelect
    });
  },

  async transitionReviewRequestStatus(input: {
    reviewRequestId: string;
    fromStatus: ReviewRequestStatus;
    toStatus: ReviewRequestStatus;
    lifecycleHistory: AssignmentHistoryValue;
  }): Promise<ReviewRequestRecord | null> {
    const updateResult = await reviewRequestModel.updateMany({
      where: {
        id: input.reviewRequestId,
        status: input.fromStatus
      },
      data: {
        status: input.toStatus,
        lifecycleHistory: input.lifecycleHistory
      }
    });

    if (updateResult.count === 0) {
      return null;
    }

    return reviewRequestModel.findUnique({
      where: {
        id: input.reviewRequestId
      },
      select: reviewRequestSelect
    });
  },

  async listReviewRequests(input: { limit: number; offset: number }): Promise<{
    reviewRequests: ReviewRequestRecord[];
    total: number;
  }> {
    const [reviewRequests, total] = await Promise.all([
      reviewRequestModel.findMany({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: reviewRequestSelect,
        take: input.limit,
        skip: input.offset
      }),
      reviewRequestModel.count()
    ]);

    return {
      reviewRequests,
      total
    };
  },

  async listReviewerQueue(input: {
    assigneeUserId: string;
    status: ReviewRequestStatus;
    proposalWorkflowState?: ProposalWorkflowState;
    limit: number;
    offset: number;
  }): Promise<{
    reviewRequests: ReviewRequestRecord[];
    total: number;
  }> {
    const where = buildQueueWhere({
      assigneeUserId: input.assigneeUserId,
      status: input.status,
      ...(input.proposalWorkflowState === undefined
        ? {}
        : { proposalWorkflowState: input.proposalWorkflowState })
    });

    const [reviewRequests, total] = await Promise.all([
      reviewRequestModel.findMany({
        where,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: reviewRequestSelect,
        take: input.limit,
        skip: input.offset
      }),
      reviewRequestModel.count({ where })
    ]);

    return {
      reviewRequests,
      total
    };
  },

  async listAdminQueue(input: {
    assigneeUserId?: string;
    status: ReviewRequestStatus;
    proposalWorkflowState?: ProposalWorkflowState;
    limit: number;
    offset: number;
  }): Promise<{
    reviewRequests: ReviewRequestRecord[];
    total: number;
  }> {
    const where = buildQueueWhere({
      ...(input.assigneeUserId === undefined ? {} : { assigneeUserId: input.assigneeUserId }),
      status: input.status,
      ...(input.proposalWorkflowState === undefined
        ? {}
        : { proposalWorkflowState: input.proposalWorkflowState })
    });

    const [reviewRequests, total] = await Promise.all([
      reviewRequestModel.findMany({
        where,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: reviewRequestSelect,
        take: input.limit,
        skip: input.offset
      }),
      reviewRequestModel.count({ where })
    ]);

    return {
      reviewRequests,
      total
    };
  }
};
