import { Router } from "express";
import { z } from "zod";

import { requireAuthenticatedActor } from "../middleware/requireAuthenticatedActor.js";
import { notificationEventService } from "../services/notificationEventService.js";

const listNotificationEventQuerySchema = z.object({
  eventType: z
    .enum([
      "REVIEW_REQUEST_CREATED",
      "REVIEW_REQUEST_STATUS_CHANGED",
      "REVIEW_REQUEST_ASSIGNED",
      "APPROVAL_STEP_DECISION_RECORDED",
      "APPROVAL_STEP_DELEGATED",
      "APPROVAL_STEP_ESCALATED"
    ])
    .optional(),
  status: z.enum(["PENDING", "PROCESSING", "DELIVERED", "FAILED"]).optional(),
  reviewRequestId: z.string().trim().min(1).optional(),
  actorUserId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional()
});

const processOutboxBodySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional()
});

const requireAdminActor = requireAuthenticatedActor(["AUTHOR_ADMIN"]);
const requireAnyActor = requireAuthenticatedActor(["EDITOR", "AUTHOR_ADMIN"]);

const handleNotificationEventError = (error: unknown): { statusCode: number; message: string } => {
  if (error instanceof Error && error.name === "NotificationEventUnauthorizedError") {
    return {
      statusCode: 403,
      message: error.message
    };
  }

  return {
    statusCode: 500,
    message: error instanceof Error ? error.message : "Unexpected notification event error"
  };
};

export const notificationEventRouter = Router();

notificationEventRouter.get("/admin/notification-events", requireAdminActor, async (request, response) => {
  const parsedQuery = listNotificationEventQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: {
        query: parsedQuery.error.flatten()
      }
    });
    return;
  }

  try {
    const result = await notificationEventService.listNotificationEventsForAdmin({
      actor: {
        userId: response.locals.actor.userId,
        role: response.locals.actor.role
      },
      ...(parsedQuery.data.eventType === undefined ? {} : { eventType: parsedQuery.data.eventType }),
      ...(parsedQuery.data.status === undefined ? {} : { status: parsedQuery.data.status }),
      ...(parsedQuery.data.reviewRequestId === undefined
        ? {}
        : { reviewRequestId: parsedQuery.data.reviewRequestId }),
      ...(parsedQuery.data.actorUserId === undefined ? {} : { actorUserId: parsedQuery.data.actorUserId }),
      ...(parsedQuery.data.limit === undefined ? {} : { limit: parsedQuery.data.limit }),
      ...(parsedQuery.data.offset === undefined ? {} : { offset: parsedQuery.data.offset })
    });

    response.json({
      events: result.events.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        eventKey: event.eventKey,
        status: event.status,
        reviewRequestId: event.reviewRequestId,
        approvalChainId: event.approvalChainId,
        approvalStepId: event.approvalStepId,
        actorUserId: event.actorUserId,
        payload: event.payload,
        attemptCount: event.attemptCount,
        nextAttemptAt: event.nextAttemptAt.toISOString(),
        lastAttemptAt: event.lastAttemptAt?.toISOString() ?? null,
        deliveredAt: event.deliveredAt?.toISOString() ?? null,
        lastError: event.lastError,
        processingToken: event.processingToken,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString()
      })),
      total: result.total,
      limit: result.limit,
      offset: result.offset
    });
  } catch (error) {
    const handled = handleNotificationEventError(error);
    response.status(handled.statusCode).json({
      error: handled.message
    });
  }
});

notificationEventRouter.post("/admin/notification-events/process", requireAdminActor, async (request, response) => {
  const parsedBody = processOutboxBodySchema.safeParse(request.body ?? {});

  if (!parsedBody.success) {
    response.status(400).json({
      error: {
        body: parsedBody.error.flatten()
      }
    });
    return;
  }

  try {
    const result = await notificationEventService.processNotificationOutbox({
      actor: {
        userId: response.locals.actor.userId,
        role: response.locals.actor.role
      },
      ...(parsedBody.data.limit === undefined ? {} : { limit: parsedBody.data.limit })
    });

    response.json({
      fetched: result.fetched,
      delivered: result.delivered,
      failed: result.failed,
      processedAt: result.processedAt.toISOString(),
      limit: result.limit
    });
  } catch (error) {
    const handled = handleNotificationEventError(error);
    response.status(handled.statusCode).json({
      error: handled.message
    });
  }
});

const myNotificationEventsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional()
});

notificationEventRouter.get(
  "/notification-events/my",
  requireAnyActor,
  async (request, response) => {
    const parsedQuery = myNotificationEventsQuerySchema.safeParse(request.query);

    if (!parsedQuery.success) {
      response.status(400).json({
        error: { query: parsedQuery.error.flatten() }
      });
      return;
    }

    try {
      const result = await notificationEventService.listNotificationEventsForUser({
        actor: {
          userId: response.locals.actor.userId,
          role: response.locals.actor.role
        },
        ...(parsedQuery.data.limit === undefined ? {} : { limit: parsedQuery.data.limit }),
        ...(parsedQuery.data.offset === undefined ? {} : { offset: parsedQuery.data.offset })
      });

      response.json({
        events: result.events.map((event) => ({
          id: event.id,
          eventType: event.eventType,
          eventKey: event.eventKey,
          status: event.status,
          reviewRequestId: event.reviewRequestId,
          approvalChainId: event.approvalChainId,
          approvalStepId: event.approvalStepId,
          actorUserId: event.actorUserId,
          payload: event.payload,
          deliveredAt: event.deliveredAt?.toISOString() ?? null,
          createdAt: event.createdAt.toISOString(),
          updatedAt: event.updatedAt.toISOString()
        })),
        total: result.total,
        limit: result.limit,
        offset: result.offset
      });
    } catch (error) {
      const handled = handleNotificationEventError(error);
      response.status(handled.statusCode).json({
        error: handled.message
      });
    }
  }
);
