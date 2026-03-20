import { type NotificationEventStatus, type NotificationEventType, type Prisma, type Role } from "@prisma/client";

import { notificationEventRepository } from "../repositories/notificationEventRepository.js";

type Actor = {
  userId: string;
  role: Role;
};

const defaultLimit = 20;
const maxLimit = 100;
const maxProcessingLimit = 200;
const retryBaseDelayMs = 5_000;
const retryMaxDelayMs = 300_000;

class NotificationEventUnauthorizedError extends Error {
  constructor() {
    super("You do not have permission to access notification events");
    this.name = "NotificationEventUnauthorizedError";
  }
}

const assertAdminActor = (actor: Actor): void => {
  if (actor.role !== "AUTHOR_ADMIN") {
    throw new NotificationEventUnauthorizedError();
  }
};

const normalizeLimit = (limit: number | undefined): number => {
  if (limit === undefined) {
    return defaultLimit;
  }

  if (limit < 1) {
    return 1;
  }

  if (limit > maxLimit) {
    return maxLimit;
  }

  return limit;
};

const normalizeProcessingLimit = (limit: number | undefined): number => {
  if (limit === undefined) {
    return defaultLimit;
  }

  if (limit < 1) {
    return 1;
  }

  if (limit > maxProcessingLimit) {
    return maxProcessingLimit;
  }

  return limit;
};

const normalizeOffset = (offset: number | undefined): number => {
  if (offset === undefined || offset < 0) {
    return 0;
  }

  return offset;
};

const toJsonPayload = (value: Prisma.JsonObject): Prisma.InputJsonValue => {
  return value;
};

const computeRetryDelayMs = (attemptCount: number): number => {
  const exponent = Math.max(0, attemptCount - 1);
  const delay = retryBaseDelayMs * 2 ** exponent;

  return Math.min(delay, retryMaxDelayMs);
};

export const notificationEventService = {
  async emitNotificationEvent(input: {
    eventType: NotificationEventType;
    eventKey: string;
    occurredAt: Date;
    reviewRequestId?: string;
    approvalChainId?: string;
    approvalStepId?: string;
    actorUserId?: string;
    payload?: Prisma.JsonObject;
  }): Promise<{ created: boolean }> {
    return notificationEventRepository.enqueue({
      eventType: input.eventType,
      eventKey: input.eventKey,
      occurredAt: input.occurredAt,
      ...(input.reviewRequestId === undefined ? {} : { reviewRequestId: input.reviewRequestId }),
      ...(input.approvalChainId === undefined ? {} : { approvalChainId: input.approvalChainId }),
      ...(input.approvalStepId === undefined ? {} : { approvalStepId: input.approvalStepId }),
      ...(input.actorUserId === undefined ? {} : { actorUserId: input.actorUserId }),
      ...(input.payload === undefined ? {} : { payload: toJsonPayload(input.payload) })
    });
  },

  async listNotificationEventsForAdmin(input: {
    actor: Actor;
    eventType?: NotificationEventType;
    status?: NotificationEventStatus;
    reviewRequestId?: string;
    actorUserId?: string;
    limit?: number;
    offset?: number;
  }) {
    assertAdminActor(input.actor);

    const limit = normalizeLimit(input.limit);
    const offset = normalizeOffset(input.offset);

    const result = await notificationEventRepository.listForAdmin({
      ...(input.eventType === undefined ? {} : { eventType: input.eventType }),
      ...(input.status === undefined ? {} : { status: input.status }),
      ...(input.reviewRequestId === undefined ? {} : { reviewRequestId: input.reviewRequestId }),
      ...(input.actorUserId === undefined ? {} : { actorUserId: input.actorUserId }),
      limit,
      offset
    });

    return {
      events: result.events,
      total: result.total,
      limit,
      offset
    };
  },

  async processNotificationOutbox(input: { actor: Actor; limit?: number; now?: Date }) {
    assertAdminActor(input.actor);

    const now = input.now ?? new Date();
    const limit = normalizeProcessingLimit(input.limit);
    const processable = await notificationEventRepository.findProcessable(now, limit);

    let deliveredCount = 0;
    let failedCount = 0;

    for (const event of processable) {
      const processingToken = `${event.id}:${Date.now()}`;
      const claimed = await notificationEventRepository.claimForProcessing({
        id: event.id,
        processingToken,
        now
      });

      if (!claimed) {
        continue;
      }

      try {
        const marked = await notificationEventRepository.markDelivered({
          id: event.id,
          processingToken,
          deliveredAt: new Date()
        });

        if (marked) {
          deliveredCount += 1;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message.slice(0, 1000)
            : "Unknown notification outbox processing error";

        const retryDelayMs = computeRetryDelayMs(event.attemptCount + 1);
        const nextAttemptAt = new Date(Date.now() + retryDelayMs);

        const marked = await notificationEventRepository.markFailed({
          id: event.id,
          processingToken,
          errorMessage,
          nextAttemptAt
        });

        if (marked) {
          failedCount += 1;
        }
      }
    }

    return {
      fetched: processable.length,
      delivered: deliveredCount,
      failed: failedCount,
      processedAt: now,
      limit
    };
  }
};
