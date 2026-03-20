import { type ApprovalChainStatus, type ApprovalStepEventType, type ApprovalStepStatus, type Role } from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";

const approvalChainSelect = {
  id: true,
  reviewRequestId: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  currentStepOrder: true,
  finalizedAt: true,
  reviewRequest: {
    select: {
      id: true,
      assignedApproverId: true
    }
  },
  steps: {
    orderBy: [{ stepOrder: "asc" }],
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
  }
} as const;

const approvalStepEventSelect = {
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
} as const;

type ApprovalChainRecord = {
  id: string;
  reviewRequestId: string;
  createdAt: Date;
  updatedAt: Date;
  status: ApprovalChainStatus;
  currentStepOrder: number;
  finalizedAt: Date | null;
  reviewRequest: {
    id: string;
    assignedApproverId: string | null;
  };
  steps: {
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
  }[];
};

type ApprovalStepEventRecord = {
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

type EligibleActorRecord = {
  id: string;
  role: Role;
};

type ApprovalChainModel = {
  create: (args: {
    data: {
      reviewRequestId: string;
      status: ApprovalChainStatus;
      currentStepOrder: number;
      steps: {
        create: Array<{
          stepOrder: number;
          title: string;
          required: boolean;
          assignedRole: Role;
        }>;
      };
    };
    select: typeof approvalChainSelect;
  }) => Promise<ApprovalChainRecord>;
  findUnique: (args: {
    where: {
      reviewRequestId?: string;
      id?: string;
    };
    select: Record<string, unknown>;
  }) => Promise<ApprovalChainRecord | { id: string } | null>;
};

type ApprovalStepModel = {
  findMany: (args: {
    where: Record<string, unknown>;
    orderBy?: Record<string, unknown> | Array<Record<string, unknown>>;
    select: typeof approvalStepEventSelect;
  }) => Promise<ApprovalStepEventRecord[]>;
  updateMany: (args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }) => Promise<{ count: number }>;
};

type ApprovalStepEventModel = {
  findMany: (args: {
    where: {
      stepId: string;
    };
    orderBy: Array<{ createdAt: "asc" | "desc" }>;
    select: typeof approvalStepEventSelect;
  }) => Promise<ApprovalStepEventRecord[]>;
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
      role: true;
    };
  }) => Promise<EligibleActorRecord | null>;
};

const approvalChainModel = (prismaClient as unknown as { approvalChain: ApprovalChainModel }).approvalChain;
const approvalStepModel = (prismaClient as unknown as { approvalStep: ApprovalStepModel }).approvalStep;
const approvalStepEventModel = (prismaClient as unknown as { approvalStepEvent: ApprovalStepEventModel })
  .approvalStepEvent;
const userModel = (prismaClient as unknown as { user: UserModel }).user;

export const reviewRequestApprovalRepository = {
  async createDefaultApprovalChain(reviewRequestId: string): Promise<ApprovalChainRecord> {
    return approvalChainModel.create({
      data: {
        reviewRequestId,
        status: "ACTIVE",
        currentStepOrder: 1,
        steps: {
          create: [
            {
              stepOrder: 1,
              title: "Assigned reviewer decision",
              required: true,
              assignedRole: "EDITOR"
            },
            {
              stepOrder: 2,
              title: "Author admin final decision",
              required: true,
              assignedRole: "AUTHOR_ADMIN"
            }
          ]
        }
      },
      select: approvalChainSelect
    });
  },

  async findByReviewRequestId(reviewRequestId: string): Promise<ApprovalChainRecord | null> {
    return approvalChainModel.findUnique({
      where: {
        reviewRequestId
      },
      select: approvalChainSelect
    }) as Promise<ApprovalChainRecord | null>;
  },

  async findEligibleActorById(userId: string): Promise<EligibleActorRecord | null> {
    return userModel.findFirst({
      where: {
        id: userId,
        role: {
          in: ["EDITOR", "AUTHOR_ADMIN"]
        }
      },
      select: {
        id: true,
        role: true
      }
    });
  },

  async assignFirstStepReviewer(input: { reviewRequestId: string; assigneeUserId: string }): Promise<void> {
    const chain = (await approvalChainModel.findUnique({
      where: {
        reviewRequestId: input.reviewRequestId
      },
      select: {
        id: true
      }
    })) as { id: string } | null;

    if (chain === null) {
      return;
    }

    await approvalStepModel.updateMany({
      where: {
        chainId: chain.id,
        stepOrder: 1,
        status: "PENDING"
      },
      data: {
        assignedReviewerId: input.assigneeUserId
      }
    });
  },

  async acknowledgeStep(input: { stepId: string; actorUserId: string; acknowledgedAt: Date }): Promise<void> {
    await approvalStepModel.updateMany({
      where: {
        id: input.stepId,
        status: "PENDING"
      },
      data: {
        status: "ACKNOWLEDGED",
        acknowledgedAt: input.acknowledgedAt,
        acknowledgedById: input.actorUserId
      }
    });
  },

  async approveStep(input: {
    chainId: string;
    stepId: string;
    actorUserId: string;
    decidedAt: Date;
    decisionNote: string | null;
    nextStepOrder: number;
    chainComplete: boolean;
  }): Promise<void> {
    await prismaClient.$transaction(async (tx) => {
      await tx.approvalStep.updateMany({
        where: {
          id: input.stepId,
          status: {
            in: ["PENDING", "ACKNOWLEDGED"]
          }
        },
        data: {
          status: "APPROVED",
          decidedAt: input.decidedAt,
          decidedById: input.actorUserId,
          decisionNote: input.decisionNote
        }
      });

      await tx.approvalChain.update({
        where: {
          id: input.chainId
        },
        data: {
          currentStepOrder: input.nextStepOrder,
          ...(input.chainComplete
            ? {
                status: "APPROVED",
                finalizedAt: input.decidedAt
              }
            : {})
        }
      });
    });
  },

  async rejectStep(input: {
    chainId: string;
    stepId: string;
    stepOrder: number;
    actorUserId: string;
    decidedAt: Date;
    decisionNote: string | null;
  }): Promise<void> {
    await prismaClient.$transaction(async (tx) => {
      await tx.approvalStep.updateMany({
        where: {
          id: input.stepId,
          status: {
            in: ["PENDING", "ACKNOWLEDGED"]
          }
        },
        data: {
          status: "REJECTED",
          decidedAt: input.decidedAt,
          decidedById: input.actorUserId,
          decisionNote: input.decisionNote
        }
      });

      await tx.approvalStep.updateMany({
        where: {
          chainId: input.chainId,
          stepOrder: {
            gt: input.stepOrder
          },
          status: {
            in: ["PENDING", "ACKNOWLEDGED"]
          }
        },
        data: {
          status: "CANCELED"
        }
      });

      await tx.approvalChain.update({
        where: {
          id: input.chainId
        },
        data: {
          status: "REJECTED",
          finalizedAt: input.decidedAt
        }
      });
    });
  },

  async delegateStep(input: {
    stepId: string;
    actorUserId: string;
    delegatedAt: Date;
    delegateToUserId: string;
    fromAssignedReviewerId: string;
    fromAssignedRole: Role | null;
    toAssignedRole: Role | null;
    reasonCode: string;
    reasonNote: string | null;
    escalationLevel: number;
  }): Promise<boolean> {
    const updatedCount = await prismaClient.$transaction(async (tx) => {
      const updated = await tx.approvalStep.updateMany({
        where: {
          id: input.stepId,
          status: {
            in: ["PENDING", "ACKNOWLEDGED"]
          }
        },
        data: {
          assignedReviewerId: input.delegateToUserId,
          assignedRole: input.toAssignedRole,
          status: "PENDING",
          acknowledgedAt: null,
          acknowledgedById: null
        }
      });

      if (updated.count === 0) {
        return 0;
      }

      await tx.approvalStepEvent.create({
        data: {
          stepId: input.stepId,
          eventType: "DELEGATED",
          reasonCode: input.reasonCode,
          reasonNote: input.reasonNote,
          actorUserId: input.actorUserId,
          fromAssignedReviewerId: input.fromAssignedReviewerId,
          fromAssignedRole: input.fromAssignedRole,
          toAssignedReviewerId: input.delegateToUserId,
          toAssignedRole: input.toAssignedRole,
          escalationLevel: input.escalationLevel,
          createdAt: input.delegatedAt
        }
      });

      return updated.count;
    });

    return updatedCount > 0;
  },

  async escalateStep(input: {
    stepId: string;
    actorUserId: string;
    escalatedAt: Date;
    fromAssignedReviewerId: string | null;
    fromAssignedRole: Role | null;
    reasonCode: string;
    reasonNote: string | null;
    escalationLevel: number;
  }): Promise<boolean> {
    const updatedCount = await prismaClient.$transaction(async (tx) => {
      const updated = await tx.approvalStep.updateMany({
        where: {
          id: input.stepId,
          status: {
            in: ["PENDING", "ACKNOWLEDGED"]
          }
        },
        data: {
          assignedReviewerId: null,
          assignedRole: "AUTHOR_ADMIN",
          status: "PENDING",
          acknowledgedAt: null,
          acknowledgedById: null,
          escalationLevel: input.escalationLevel,
          escalatedAt: input.escalatedAt,
          escalatedById: input.actorUserId
        }
      });

      if (updated.count === 0) {
        return 0;
      }

      await tx.approvalStepEvent.create({
        data: {
          stepId: input.stepId,
          eventType: "ESCALATED",
          reasonCode: input.reasonCode,
          reasonNote: input.reasonNote,
          actorUserId: input.actorUserId,
          fromAssignedReviewerId: input.fromAssignedReviewerId,
          fromAssignedRole: input.fromAssignedRole,
          toAssignedReviewerId: null,
          toAssignedRole: "AUTHOR_ADMIN",
          escalationLevel: input.escalationLevel,
          createdAt: input.escalatedAt
        }
      });

      return updated.count;
    });

    return updatedCount > 0;
  },

  async listStepEvents(stepId: string): Promise<ApprovalStepEventRecord[]> {
    return approvalStepEventModel.findMany({
      where: {
        stepId
      },
      orderBy: [{ createdAt: "asc" }],
      select: approvalStepEventSelect
    });
  }
};
