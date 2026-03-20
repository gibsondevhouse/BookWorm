import { Prisma, type NotificationEventStatus, type NotificationEventType } from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";

type NotificationEventWhereFilters = {
  eventType?: NotificationEventType;
  status?: NotificationEventStatus;
  reviewRequestId?: string;
  actorUserId?: string;
};

const buildWhere = (filters: NotificationEventWhereFilters): Prisma.NotificationEventWhereInput => {
  const where: Prisma.NotificationEventWhereInput = {};

  if (filters.eventType !== undefined) {
    where.eventType = filters.eventType;
  }

  if (filters.status !== undefined) {
    where.status = filters.status;
  }

  if (filters.reviewRequestId !== undefined) {
    where.reviewRequestId = filters.reviewRequestId;
  }

  if (filters.actorUserId !== undefined) {
    where.actorUserId = filters.actorUserId;
  }

  return where;
};

const isUniqueConstraintError = (error: unknown): boolean => {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
};

export const notificationEventRepository = {
  async enqueue(input: {
    eventType: NotificationEventType;
    eventKey: string;
    reviewRequestId?: string;
    approvalChainId?: string;
    approvalStepId?: string;
    actorUserId?: string;
    payload?: Prisma.InputJsonValue;
    occurredAt: Date;
  }): Promise<{ created: boolean }> {
    try {
      await prismaClient.notificationEvent.create({
        data: {
          eventType: input.eventType,
          eventKey: input.eventKey,
          ...(input.reviewRequestId === undefined ? {} : { reviewRequestId: input.reviewRequestId }),
          ...(input.approvalChainId === undefined ? {} : { approvalChainId: input.approvalChainId }),
          ...(input.approvalStepId === undefined ? {} : { approvalStepId: input.approvalStepId }),
          ...(input.actorUserId === undefined ? {} : { actorUserId: input.actorUserId }),
          ...(input.payload === undefined ? {} : { payload: input.payload }),
          nextAttemptAt: input.occurredAt
        }
      });

      return { created: true };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return { created: false };
      }

      throw error;
    }
  },

  async listForAdmin(input: NotificationEventWhereFilters & { limit: number; offset: number }) {
    const where = buildWhere(input);

    const [events, total] = await Promise.all([
      prismaClient.notificationEvent.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: input.limit,
        skip: input.offset
      }),
      prismaClient.notificationEvent.count({ where })
    ]);

    return { events, total };
  },

  async findProcessable(now: Date, limit: number) {
    return prismaClient.notificationEvent.findMany({
      where: {
        status: {
          in: ["PENDING", "FAILED"]
        },
        nextAttemptAt: {
          lte: now
        }
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: limit
    });
  },

  async claimForProcessing(input: { id: string; now: Date; processingToken: string }): Promise<boolean> {
    const result = await prismaClient.notificationEvent.updateMany({
      where: {
        id: input.id,
        status: {
          in: ["PENDING", "FAILED"]
        },
        nextAttemptAt: {
          lte: input.now
        }
      },
      data: {
        status: "PROCESSING",
        processingToken: input.processingToken,
        lastAttemptAt: input.now,
        attemptCount: {
          increment: 1
        }
      }
    });

    return result.count > 0;
  },

  async markDelivered(input: { id: string; processingToken: string; deliveredAt: Date }): Promise<boolean> {
    const result = await prismaClient.notificationEvent.updateMany({
      where: {
        id: input.id,
        status: "PROCESSING",
        processingToken: input.processingToken
      },
      data: {
        status: "DELIVERED",
        deliveredAt: input.deliveredAt,
        processingToken: null,
        lastError: null
      }
    });

    return result.count > 0;
  },

  async markFailed(input: {
    id: string;
    processingToken: string;
    errorMessage: string;
    nextAttemptAt: Date;
  }): Promise<boolean> {
    const result = await prismaClient.notificationEvent.updateMany({
      where: {
        id: input.id,
        status: "PROCESSING",
        processingToken: input.processingToken
      },
      data: {
        status: "FAILED",
        processingToken: null,
        lastError: input.errorMessage,
        nextAttemptAt: input.nextAttemptAt
      }
    });

    return result.count > 0;
  },

  async listForUser(input: {
    userId: string;
    enabledEventTypes: NotificationEventType[];
    limit: number;
    offset: number;
  }): Promise<{ events: Awaited<ReturnType<typeof prismaClient.notificationEvent.findMany>>; total: number }> {
    const where: Prisma.NotificationEventWhereInput = {
      status: "DELIVERED",
      eventType: { in: input.enabledEventTypes },
      OR: [
        { reviewRequest: { assignedApproverId: input.userId } },
        { approvalStep: { assignedReviewerId: input.userId } }
      ]
    };

    const [events, total] = await Promise.all([
      prismaClient.notificationEvent.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: input.limit,
        skip: input.offset
      }),
      prismaClient.notificationEvent.count({ where })
    ]);

    return { events, total };
  }
};
