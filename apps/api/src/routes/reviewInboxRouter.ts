import { Router } from "express";
import { z } from "zod";

import { requireAuthenticatedActor } from "../middleware/requireAuthenticatedActor.js";
import { reviewInboxService, type ReviewInboxItem } from "../services/reviewInboxService.js";

const reviewRequestStatusSchema = z.enum(["OPEN", "ACKNOWLEDGED", "IN_REVIEW", "RESOLVED", "CANCELED"]);

const reviewInboxQuerySchema = z.object({
  reviewerUserId: z.string().trim().min(1).optional(),
  status: reviewRequestStatusSchema.optional(),
  escalated: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  delegated: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  overdue: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional()
});

const serializeInboxItem = (item: ReviewInboxItem) => ({
  id: item.id,
  createdAt: item.createdAt.toISOString(),
  updatedAt: item.updatedAt.toISOString(),
  proposalId: item.proposalId,
  assignedApproverId: item.assignedApproverId,
  assignedAt: item.assignedAt?.toISOString() ?? null,
  status: item.status,
  proposal: item.proposal,
  approvalChain: item.approvalChain
    ? {
        id: item.approvalChain.id,
        status: item.approvalChain.status,
        currentStepOrder: item.approvalChain.currentStepOrder,
        steps: item.approvalChain.steps.map((step) => ({
          id: step.id,
          stepOrder: step.stepOrder,
          status: step.status,
          assignedReviewerId: step.assignedReviewerId,
          escalationLevel: step.escalationLevel,
          escalatedAt: step.escalatedAt?.toISOString() ?? null,
          decidedAt: step.decidedAt?.toISOString() ?? null,
          createdAt: step.createdAt.toISOString()
        }))
      }
    : null,
  hasEscalatedSteps: item.hasEscalatedSteps,
  hasOverdueSteps: item.hasOverdueSteps
});

const handleInboxError = (error: unknown): { statusCode: number; message: string } => {
  if (error instanceof Error && error.name === "ReviewInboxUnauthorizedError") {
    return { statusCode: 403, message: error.message };
  }

  return {
    statusCode: 500,
    message: error instanceof Error ? error.message : "Unexpected review inbox error"
  };
};

const requireActor = requireAuthenticatedActor(["EDITOR", "AUTHOR_ADMIN"]);

export const reviewInboxRouter = Router();

reviewInboxRouter.get("/review-inbox", requireActor, async (request, response) => {
  const parsedQuery = reviewInboxQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({ error: { query: parsedQuery.error.flatten() } });
    return;
  }

  try {
    const result = await reviewInboxService.getReviewerInbox({
      actor: {
        userId: response.locals.actor.userId,
        role: response.locals.actor.role
      },
      ...(parsedQuery.data.reviewerUserId === undefined
        ? {}
        : { reviewerUserId: parsedQuery.data.reviewerUserId }),
      ...(parsedQuery.data.status === undefined ? {} : { status: parsedQuery.data.status }),
      ...(parsedQuery.data.escalated === undefined ? {} : { escalated: parsedQuery.data.escalated }),
      ...(parsedQuery.data.delegated === undefined ? {} : { delegated: parsedQuery.data.delegated }),
      ...(parsedQuery.data.overdue === undefined ? {} : { overdue: parsedQuery.data.overdue }),
      ...(parsedQuery.data.limit === undefined ? {} : { limit: parsedQuery.data.limit }),
      ...(parsedQuery.data.offset === undefined ? {} : { offset: parsedQuery.data.offset })
    });

    response.json({
      items: result.items.map(serializeInboxItem),
      total: result.total,
      reviewerUserId: result.reviewerUserId,
      limit: result.limit,
      offset: result.offset
    });
  } catch (error) {
    const handled = handleInboxError(error);
    response.status(handled.statusCode).json({ error: handled.message });
  }
});
