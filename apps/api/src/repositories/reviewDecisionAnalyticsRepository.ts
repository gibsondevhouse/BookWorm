import {
  type ApprovalChainStatus,
  Prisma,
  type ReviewRequestStatus
} from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";

const reviewDecisionHistorySelect = Prisma.validator<Prisma.ReviewRequestSelect>()({
  id: true,
  createdAt: true,
  updatedAt: true,
  proposalId: true,
  assignedApproverId: true,
  status: true,
  assignmentHistory: true,
  lifecycleHistory: true,
  approvalChain: {
    select: {
      id: true,
      status: true,
      finalizedAt: true,
      steps: {
        orderBy: [{ stepOrder: "asc" }],
        select: {
          id: true,
          stepOrder: true,
          status: true,
          acknowledgedAt: true,
          acknowledgedById: true,
          decidedAt: true,
          decidedById: true,
          escalationLevel: true,
          assignedReviewerId: true,
          assignedRole: true,
          events: {
            orderBy: [{ createdAt: "asc" }],
            select: {
              id: true,
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
            }
          }
        }
      }
    }
  }
});

type ReviewDecisionHistoryRecord = Prisma.ReviewRequestGetPayload<{
  select: typeof reviewDecisionHistorySelect;
}>;

const reviewDecisionSummarySelect = Prisma.validator<Prisma.ReviewRequestSelect>()({
  createdAt: true,
  status: true,
  approvalChain: {
    select: {
      status: true,
      finalizedAt: true
    }
  }
});

type ReviewDecisionSummaryRecord = Prisma.ReviewRequestGetPayload<{
  select: typeof reviewDecisionSummarySelect;
}>;

const buildHistoryWhere = (input: {
  status?: ReviewRequestStatus;
  outcome?: ApprovalChainStatus;
}): Prisma.ReviewRequestWhereInput => {
  const where: Prisma.ReviewRequestWhereInput = {};

  if (input.status !== undefined) {
    where.status = input.status;
  }

  if (input.outcome !== undefined) {
    where.approvalChain = {
      is: {
        status: input.outcome
      }
    };
  }

  return where;
};

export const reviewDecisionAnalyticsRepository = {
  async listSummaryForWindow(input: {
    windowStart: Date;
    windowEnd: Date;
  }): Promise<ReviewDecisionSummaryRecord[]> {
    return prismaClient.reviewRequest.findMany({
      where: {
        createdAt: {
          gte: input.windowStart,
          lte: input.windowEnd
        }
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: reviewDecisionSummarySelect
    });
  },

  async listHistoryPage(input: {
    status?: ReviewRequestStatus;
    outcome?: ApprovalChainStatus;
    limit: number;
    offset: number;
  }): Promise<{ items: ReviewDecisionHistoryRecord[]; total: number }> {
    const where = buildHistoryWhere({
      ...(input.status === undefined ? {} : { status: input.status }),
      ...(input.outcome === undefined ? {} : { outcome: input.outcome })
    });

    const [items, total] = await Promise.all([
      prismaClient.reviewRequest.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: input.limit,
        skip: input.offset,
        select: reviewDecisionHistorySelect
      }),
      prismaClient.reviewRequest.count({ where })
    ]);

    return {
      items,
      total
    };
  }
};

export type {
  ReviewDecisionHistoryRecord,
  ReviewDecisionSummaryRecord
};
