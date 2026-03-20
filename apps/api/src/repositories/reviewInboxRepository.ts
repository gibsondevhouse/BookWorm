import { type Prisma, type ReviewRequestStatus } from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";

const inboxSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  proposalId: true,
  assignedApproverId: true,
  assignedAt: true,
  status: true,
  proposal: {
    select: {
      id: true,
      workflowState: true,
      entityId: true,
      manuscriptId: true
    }
  },
  approvalChain: {
    select: {
      id: true,
      status: true,
      currentStepOrder: true,
      steps: {
        select: {
          id: true,
          stepOrder: true,
          status: true,
          assignedReviewerId: true,
          escalationLevel: true,
          escalatedAt: true,
          decidedAt: true,
          createdAt: true
        }
      }
    }
  }
} as const;

export type ReviewInboxRecord = Prisma.ReviewRequestGetPayload<{
  select: typeof inboxSelect;
}>;

const buildInboxWhere = (input: {
  userId: string;
  status?: ReviewRequestStatus;
  escalated?: boolean;
  delegated?: boolean;
  overdue?: boolean;
  now: Date;
  overdueThresholdMs: number;
}): Prisma.ReviewRequestWhereInput => {
  const and: Prisma.ReviewRequestWhereInput[] = [
    {
      OR: [
        { assignedApproverId: input.userId },
        {
          approvalChain: {
            steps: {
              some: {
                assignedReviewerId: input.userId,
                status: { in: ["PENDING", "ACKNOWLEDGED"] }
              }
            }
          }
        }
      ]
    }
  ];

  if (input.status !== undefined) {
    and.push({ status: input.status });
  }

  if (input.escalated === true) {
    and.push({
      approvalChain: {
        steps: {
          some: {
            escalationLevel: { gt: 0 }
          }
        }
      }
    });
  }

  if (input.delegated === true) {
    and.push({
      approvalChain: {
        steps: {
          some: {
            events: {
              some: {
                eventType: "DELEGATED",
                toAssignedReviewerId: input.userId
              }
            }
          }
        }
      }
    });
  }

  if (input.overdue === true) {
    const overdueThreshold = new Date(input.now.getTime() - input.overdueThresholdMs);

    and.push({
      approvalChain: {
        steps: {
          some: {
            status: { in: ["PENDING", "ACKNOWLEDGED"] },
            createdAt: { lt: overdueThreshold },
            decidedAt: null
          }
        }
      }
    });
  }

  return { AND: and };
};

export const reviewInboxRepository = {
  async findForUser(input: {
    userId: string;
    status?: ReviewRequestStatus;
    escalated?: boolean;
    delegated?: boolean;
    overdue?: boolean;
    overdueThresholdMs: number;
    now: Date;
    limit: number;
    offset: number;
  }): Promise<{ items: ReviewInboxRecord[]; total: number }> {
    const where = buildInboxWhere(input);

    const [items, total] = await Promise.all([
      prismaClient.reviewRequest.findMany({
        where,
        select: inboxSelect,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: input.limit,
        skip: input.offset
      }),
      prismaClient.reviewRequest.count({ where })
    ]);

    return { items, total };
  }
};
