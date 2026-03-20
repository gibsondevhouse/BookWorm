import { type Response, Router } from "express";
import { z } from "zod";

import { requireAuthenticatedActor } from "../middleware/requireAuthenticatedActor.js";
import { reviewRequestApprovalService } from "../services/reviewRequestApprovalService.js";
import { reviewRequestService } from "../services/reviewRequestService.js";

const createReviewRequestBodySchema = z.object({
  proposalId: z.string().trim().min(1)
});

const reviewRequestIdParamsSchema = z.object({
  id: z.string().min(1)
});

const approvalStepParamsSchema = z.object({
  id: z.string().min(1),
  stepOrder: z.coerce.number().int().positive()
});

const assignReviewRequestBodySchema = z.object({
  assigneeUserId: z.string().trim().min(1)
});

const reviewRequestStatusSchema = z.enum(["OPEN", "ACKNOWLEDGED", "IN_REVIEW", "RESOLVED", "CANCELED"]);
const transitionReviewRequestBodySchema = z.object({
  status: reviewRequestStatusSchema
});

const approvalDecisionSchema = z.enum(["APPROVE", "REJECT"]);
const decideApprovalStepBodySchema = z.object({
  decision: approvalDecisionSchema,
  decisionNote: z.string().trim().max(1_000).optional()
});
const delegationReasonCodeSchema = z.enum([
  "UNAVAILABLE",
  "WORKLOAD_BALANCING",
  "CONFLICT_OF_INTEREST",
  "OTHER"
]);
const escalateReasonCodeSchema = z.enum([
  "TIME_THRESHOLD_EXCEEDED",
  "UNAVAILABLE_REVIEWER",
  "CONFLICT_OF_INTEREST"
]);
const delegateApprovalStepBodySchema = z.object({
  delegateToUserId: z.string().trim().min(1),
  reasonCode: delegationReasonCodeSchema,
  reasonNote: z.string().trim().max(1_000).optional()
});
const escalateApprovalStepBodySchema = z.object({
  reasonCode: escalateReasonCodeSchema,
  reasonNote: z.string().trim().max(1_000).optional()
});
const proposalWorkflowStateSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "APPLIED",
  "ARCHIVED"
]);

const listReviewRequestQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional()
});

const reviewerQueueQuerySchema = z.object({
  assigneeUserId: z.string().trim().min(1).optional(),
  status: reviewRequestStatusSchema.optional(),
  workflowState: proposalWorkflowStateSchema.optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional()
});

const adminQueueQuerySchema = z.object({
  assigneeUserId: z.string().trim().min(1).optional(),
  status: reviewRequestStatusSchema.optional(),
  workflowState: proposalWorkflowStateSchema.optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional()
});

type SerializedReviewRequest = {
  id: string;
  createdAt: string;
  updatedAt: string;
  proposalId: string;
  createdById: string;
  assignedApproverId: string | null;
  assignedAt: string | null;
  assignmentHistory: {
    assignedAt: string;
    assignedById: string;
    assignedApproverId: string;
    previousAssignedApproverId: string | null;
  }[];
  lifecycleHistory: {
    transitionedAt: string;
    fromStatus: "OPEN" | "ACKNOWLEDGED" | "IN_REVIEW" | "RESOLVED" | "CANCELED";
    toStatus: "OPEN" | "ACKNOWLEDGED" | "IN_REVIEW" | "RESOLVED" | "CANCELED";
    transitionedById: string;
    transitionedByRole: "PUBLIC" | "EDITOR" | "AUTHOR_ADMIN";
  }[];
  status: "OPEN" | "ACKNOWLEDGED" | "IN_REVIEW" | "RESOLVED" | "CANCELED";
  proposal: {
    id: string;
    entityId: string | null;
    manuscriptId: string | null;
    status: "PENDING" | "ACCEPTED" | "REJECTED";
    workflowState: "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "APPLIED" | "ARCHIVED";
  };
  createdBy: {
    userId: string;
    email: string;
    displayName: string;
    role: "PUBLIC" | "EDITOR" | "AUTHOR_ADMIN";
  };
  assignedApprover: {
    userId: string;
    email: string;
    displayName: string;
    role: "PUBLIC" | "EDITOR" | "AUTHOR_ADMIN";
  } | null;
};

type SerializedApprovalChain = {
  id: string;
  reviewRequestId: string;
  status: "ACTIVE" | "APPROVED" | "REJECTED";
  currentStepOrder: number;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
  steps: {
    id: string;
    stepOrder: number;
    title: string;
    required: boolean;
    status: "PENDING" | "ACKNOWLEDGED" | "APPROVED" | "REJECTED" | "CANCELED";
    assignedReviewerId: string | null;
    assignedRole: "PUBLIC" | "EDITOR" | "AUTHOR_ADMIN" | null;
    acknowledgedAt: string | null;
    acknowledgedById: string | null;
    decidedAt: string | null;
    decidedById: string | null;
    decisionNote: string | null;
    escalationLevel: number;
    escalatedAt: string | null;
    escalatedById: string | null;
    createdAt: string;
    updatedAt: string;
  }[];
};

const serializeReviewRequest = (
  reviewRequest: Awaited<ReturnType<typeof reviewRequestService.getReviewRequestById>>
): SerializedReviewRequest => ({
  id: reviewRequest.id,
  createdAt: reviewRequest.createdAt.toISOString(),
  updatedAt: reviewRequest.updatedAt.toISOString(),
  proposalId: reviewRequest.proposalId,
  createdById: reviewRequest.createdById,
  assignedApproverId: reviewRequest.assignedApproverId,
  assignedAt: reviewRequest.assignedAt?.toISOString() ?? null,
  assignmentHistory: reviewRequest.assignmentHistory.map((entry) => ({
    assignedAt: entry.assignedAt.toISOString(),
    assignedById: entry.assignedById,
    assignedApproverId: entry.assignedApproverId,
    previousAssignedApproverId: entry.previousAssignedApproverId
  })),
  lifecycleHistory: reviewRequest.lifecycleHistory.map((entry) => ({
    transitionedAt: entry.transitionedAt.toISOString(),
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    transitionedById: entry.transitionedById,
    transitionedByRole: entry.transitionedByRole
  })),
  status: reviewRequest.status,
  proposal: reviewRequest.proposal,
  createdBy: reviewRequest.createdBy,
  assignedApprover: reviewRequest.assignedApprover
});

const serializeApprovalChain = (
  chain: Awaited<ReturnType<typeof reviewRequestApprovalService.acknowledgeStep>>
): SerializedApprovalChain => ({
  id: chain.id,
  reviewRequestId: chain.reviewRequestId,
  status: chain.status,
  currentStepOrder: chain.currentStepOrder,
  finalizedAt: chain.finalizedAt?.toISOString() ?? null,
  createdAt: chain.createdAt.toISOString(),
  updatedAt: chain.updatedAt.toISOString(),
  steps: chain.steps.map((step) => ({
    id: step.id,
    stepOrder: step.stepOrder,
    title: step.title,
    required: step.required,
    status: step.status,
    assignedReviewerId: step.assignedReviewerId,
    assignedRole: step.assignedRole,
    acknowledgedAt: step.acknowledgedAt?.toISOString() ?? null,
    acknowledgedById: step.acknowledgedById,
    decidedAt: step.decidedAt?.toISOString() ?? null,
    decidedById: step.decidedById,
    decisionNote: step.decisionNote,
    escalationLevel: step.escalationLevel,
    escalatedAt: step.escalatedAt?.toISOString() ?? null,
    escalatedById: step.escalatedById,
    createdAt: step.createdAt.toISOString(),
    updatedAt: step.updatedAt.toISOString()
  }))
});

const handleReviewRequestError = (error: unknown, response: Response): void => {
  if (!(error instanceof Error)) {
    response.status(500).json({
      error: "Unexpected review request error"
    });
    return;
  }

  if (
    error.name === "ReviewRequestCreateUnauthorizedError" ||
    error.name === "ReviewRequestReadUnauthorizedError" ||
    error.name === "ReviewRequestListUnauthorizedError" ||
    error.name === "ReviewRequestAssignUnauthorizedError" ||
    error.name === "ReviewRequestQueueUnauthorizedError" ||
    error.name === "ReviewRequestTransitionUnauthorizedError" ||
    error.name === "ReviewRequestApprovalUnauthorizedError"
  ) {
    response.status(403).json({
      error: error.message
    });
    return;
  }

  if (error.name === "ReviewRequestApprovalDelegateNotFoundError") {
    response.status(404).json({
      error: error.message
    });
    return;
  }

  if (error.name === "ReviewRequestProposalReferenceMissingError") {
    response.status(400).json({
      error: error.message
    });
    return;
  }

  if (error.name === "ReviewRequestAssigneeReferenceMissingError") {
    response.status(400).json({
      error: error.message
    });
    return;
  }

  if (
    error.name === "ReviewRequestProposalNotFoundError" ||
    error.name === "ReviewRequestNotFoundError" ||
    error.name === "ReviewRequestApprovalChainNotFoundError" ||
    error.name === "ReviewRequestApprovalStepNotFoundError"
  ) {
    response.status(404).json({
      error: error.message
    });
    return;
  }

  if (
    error.name === "ReviewRequestProposalIneligibleError" ||
    error.name === "ReviewRequestAssignmentStateInvalidError" ||
    error.name === "ReviewRequestLifecycleTransitionInvalidError" ||
    error.name === "ReviewRequestLifecycleProposalConflictError" ||
    error.name === "ReviewRequestLifecycleTransitionRaceError" ||
    error.name === "ReviewRequestApprovalStepOrderError" ||
    error.name === "ReviewRequestApprovalTransitionInvalidError" ||
    error.name === "ReviewRequestApprovalChainFinalizedError" ||
    error.name === "ReviewRequestApprovalPolicyViolationError"
  ) {
    response.status(409).json({
      error: error.message
    });
    return;
  }

  if (error.name === "ReviewRequestAssigneeInvalidError") {
    response.status(404).json({
      error: error.message
    });
    return;
  }

  response.status(500).json({
    error: error.message
  });
};

export const reviewRequestRouter = Router();

const requireReviewRequestActor = requireAuthenticatedActor(["EDITOR", "AUTHOR_ADMIN"]);

reviewRequestRouter.post("/review-requests", requireReviewRequestActor, async (request, response) => {
  const parsedBody = createReviewRequestBodySchema.safeParse(request.body);

  if (!parsedBody.success) {
    response.status(400).json({
      error: {
        body: parsedBody.error.flatten()
      }
    });
    return;
  }

  try {
    const reviewRequest = await reviewRequestService.createReviewRequest({
      actor: {
        userId: response.locals.actor.userId,
        role: response.locals.actor.role
      },
      proposalId: parsedBody.data.proposalId
    });

    response.status(201).json(serializeReviewRequest(reviewRequest));
  } catch (error) {
    handleReviewRequestError(error, response);
  }
});

reviewRequestRouter.get("/review-requests/:id", requireReviewRequestActor, async (request, response) => {
  const parsedParams = reviewRequestIdParamsSchema.safeParse(request.params);

  if (!parsedParams.success) {
    response.status(400).json({
      error: {
        params: parsedParams.error.flatten()
      }
    });
    return;
  }

  try {
    const reviewRequest = await reviewRequestService.getReviewRequestById({
      actor: {
        userId: response.locals.actor.userId,
        role: response.locals.actor.role
      },
      reviewRequestId: parsedParams.data.id
    });

    response.json(serializeReviewRequest(reviewRequest));
  } catch (error) {
    handleReviewRequestError(error, response);
  }
});

reviewRequestRouter.get("/review-requests", requireReviewRequestActor, async (request, response) => {
  const parsedQuery = listReviewRequestQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: {
        query: parsedQuery.error.flatten()
      }
    });
    return;
  }

  try {
    const result = await reviewRequestService.listReviewRequests({
      actor: {
        userId: response.locals.actor.userId,
        role: response.locals.actor.role
      },
      ...(parsedQuery.data.limit === undefined ? {} : { limit: parsedQuery.data.limit }),
      ...(parsedQuery.data.offset === undefined ? {} : { offset: parsedQuery.data.offset })
    });

    response.json({
      reviewRequests: result.reviewRequests.map((reviewRequest) => serializeReviewRequest(reviewRequest)),
      total: result.total,
      limit: result.limit,
      offset: result.offset
    });
  } catch (error) {
    handleReviewRequestError(error, response);
  }
});

reviewRequestRouter.patch(
  "/review-requests/:id/assign",
  requireReviewRequestActor,
  async (request, response) => {
    const parsedParams = reviewRequestIdParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      response.status(400).json({
        error: {
          params: parsedParams.error.flatten()
        }
      });
      return;
    }

    const parsedBody = assignReviewRequestBodySchema.safeParse(request.body);

    if (!parsedBody.success) {
      response.status(400).json({
        error: {
          body: parsedBody.error.flatten()
        }
      });
      return;
    }

    try {
      const reviewRequest = await reviewRequestService.assignApprover({
        actor: {
          userId: response.locals.actor.userId,
          role: response.locals.actor.role
        },
        reviewRequestId: parsedParams.data.id,
        assigneeUserId: parsedBody.data.assigneeUserId
      });

      response.json(serializeReviewRequest(reviewRequest));
    } catch (error) {
      handleReviewRequestError(error, response);
    }
  }
);

reviewRequestRouter.patch(
  "/review-requests/:id/approval-steps/:stepOrder/acknowledge",
  requireReviewRequestActor,
  async (request, response) => {
    const parsedParams = approvalStepParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      response.status(400).json({
        error: {
          params: parsedParams.error.flatten()
        }
      });
      return;
    }

    try {
      const chain = await reviewRequestApprovalService.acknowledgeStep({
        actor: {
          userId: response.locals.actor.userId,
          role: response.locals.actor.role
        },
        reviewRequestId: parsedParams.data.id,
        stepOrder: parsedParams.data.stepOrder
      });

      response.json(serializeApprovalChain(chain));
    } catch (error) {
      handleReviewRequestError(error, response);
    }
  }
);

reviewRequestRouter.patch(
  "/review-requests/:id/approval-steps/:stepOrder/decision",
  requireReviewRequestActor,
  async (request, response) => {
    const parsedParams = approvalStepParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      response.status(400).json({
        error: {
          params: parsedParams.error.flatten()
        }
      });
      return;
    }

    const parsedBody = decideApprovalStepBodySchema.safeParse(request.body);

    if (!parsedBody.success) {
      response.status(400).json({
        error: {
          body: parsedBody.error.flatten()
        }
      });
      return;
    }

    try {
      const chain = await reviewRequestApprovalService.decideStep({
        actor: {
          userId: response.locals.actor.userId,
          role: response.locals.actor.role
        },
        reviewRequestId: parsedParams.data.id,
        stepOrder: parsedParams.data.stepOrder,
        decision: parsedBody.data.decision,
        ...(parsedBody.data.decisionNote === undefined ? {} : { decisionNote: parsedBody.data.decisionNote })
      });

      response.json(serializeApprovalChain(chain));
    } catch (error) {
      handleReviewRequestError(error, response);
    }
  }
);

reviewRequestRouter.patch(
  "/review-requests/:id/approval-steps/:stepOrder/delegate",
  requireReviewRequestActor,
  async (request, response) => {
    const parsedParams = approvalStepParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      response.status(400).json({
        error: {
          params: parsedParams.error.flatten()
        }
      });
      return;
    }

    const parsedBody = delegateApprovalStepBodySchema.safeParse(request.body);

    if (!parsedBody.success) {
      response.status(400).json({
        error: {
          body: parsedBody.error.flatten()
        }
      });
      return;
    }

    try {
      const chain = await reviewRequestApprovalService.delegateStep({
        actor: {
          userId: response.locals.actor.userId,
          role: response.locals.actor.role
        },
        reviewRequestId: parsedParams.data.id,
        stepOrder: parsedParams.data.stepOrder,
        delegateToUserId: parsedBody.data.delegateToUserId,
        reasonCode: parsedBody.data.reasonCode,
        ...(parsedBody.data.reasonNote === undefined ? {} : { reasonNote: parsedBody.data.reasonNote })
      });

      response.json(serializeApprovalChain(chain));
    } catch (error) {
      handleReviewRequestError(error, response);
    }
  }
);

reviewRequestRouter.patch(
  "/review-requests/:id/approval-steps/:stepOrder/escalate",
  requireReviewRequestActor,
  async (request, response) => {
    const parsedParams = approvalStepParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      response.status(400).json({
        error: {
          params: parsedParams.error.flatten()
        }
      });
      return;
    }

    const parsedBody = escalateApprovalStepBodySchema.safeParse(request.body);

    if (!parsedBody.success) {
      response.status(400).json({
        error: {
          body: parsedBody.error.flatten()
        }
      });
      return;
    }

    try {
      const chain = await reviewRequestApprovalService.escalateStep({
        actor: {
          userId: response.locals.actor.userId,
          role: response.locals.actor.role
        },
        reviewRequestId: parsedParams.data.id,
        stepOrder: parsedParams.data.stepOrder,
        reasonCode: parsedBody.data.reasonCode,
        ...(parsedBody.data.reasonNote === undefined ? {} : { reasonNote: parsedBody.data.reasonNote })
      });

      response.json(serializeApprovalChain(chain));
    } catch (error) {
      handleReviewRequestError(error, response);
    }
  }
);

reviewRequestRouter.get(
  "/review-requests/:id/approval-steps/:stepOrder/escalation-state",
  requireReviewRequestActor,
  async (request, response) => {
    const parsedParams = approvalStepParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      response.status(400).json({
        error: {
          params: parsedParams.error.flatten()
        }
      });
      return;
    }

    try {
      const state = await reviewRequestApprovalService.getEscalationState({
        actor: {
          userId: response.locals.actor.userId,
          role: response.locals.actor.role
        },
        reviewRequestId: parsedParams.data.id,
        stepOrder: parsedParams.data.stepOrder
      });

      response.json({
        reviewRequestId: state.reviewRequestId,
        stepOrder: state.stepOrder,
        stepId: state.stepId,
        status: state.status,
        isEscalated: state.isEscalated,
        escalationLevel: state.escalationLevel,
        escalatedAt: state.escalatedAt?.toISOString() ?? null,
        escalatedById: state.escalatedById,
        assignedReviewerId: state.assignedReviewerId,
        assignedRole: state.assignedRole
      });
    } catch (error) {
      handleReviewRequestError(error, response);
    }
  }
);

reviewRequestRouter.get(
  "/review-requests/:id/approval-steps/:stepOrder/lineage",
  requireReviewRequestActor,
  async (request, response) => {
    const parsedParams = approvalStepParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      response.status(400).json({
        error: {
          params: parsedParams.error.flatten()
        }
      });
      return;
    }

    try {
      const lineage = await reviewRequestApprovalService.getStepLineage({
        actor: {
          userId: response.locals.actor.userId,
          role: response.locals.actor.role
        },
        reviewRequestId: parsedParams.data.id,
        stepOrder: parsedParams.data.stepOrder
      });

      response.json({
        reviewRequestId: lineage.reviewRequestId,
        stepOrder: lineage.stepOrder,
        stepId: lineage.stepId,
        currentStatus: lineage.currentStatus,
        currentAssignedReviewerId: lineage.currentAssignedReviewerId,
        currentAssignedRole: lineage.currentAssignedRole,
        escalationLevel: lineage.escalationLevel,
        events: lineage.events.map((event) => ({
          id: event.id,
          stepId: event.stepId,
          eventType: event.eventType,
          reasonCode: event.reasonCode,
          reasonNote: event.reasonNote,
          actorUserId: event.actorUserId,
          fromAssignedReviewerId: event.fromAssignedReviewerId,
          fromAssignedRole: event.fromAssignedRole,
          toAssignedReviewerId: event.toAssignedReviewerId,
          toAssignedRole: event.toAssignedRole,
          escalationLevel: event.escalationLevel,
          createdAt: event.createdAt.toISOString()
        }))
      });
    } catch (error) {
      handleReviewRequestError(error, response);
    }
  }
);

reviewRequestRouter.patch(
  "/review-requests/:id/lifecycle",
  requireReviewRequestActor,
  async (request, response) => {
    const parsedParams = reviewRequestIdParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      response.status(400).json({
        error: {
          params: parsedParams.error.flatten()
        }
      });
      return;
    }

    const parsedBody = transitionReviewRequestBodySchema.safeParse(request.body);

    if (!parsedBody.success) {
      response.status(400).json({
        error: {
          body: parsedBody.error.flatten()
        }
      });
      return;
    }

    try {
      const reviewRequest = await reviewRequestService.transitionLifecycle({
        actor: {
          userId: response.locals.actor.userId,
          role: response.locals.actor.role
        },
        reviewRequestId: parsedParams.data.id,
        toStatus: parsedBody.data.status
      });

      response.json(serializeReviewRequest(reviewRequest));
    } catch (error) {
      handleReviewRequestError(error, response);
    }
  }
);

reviewRequestRouter.get(
  "/review-requests/:id/lifecycle-history",
  requireReviewRequestActor,
  async (request, response) => {
    const parsedParams = reviewRequestIdParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      response.status(400).json({
        error: {
          params: parsedParams.error.flatten()
        }
      });
      return;
    }

    try {
      const history = await reviewRequestService.listLifecycleHistory({
        actor: {
          userId: response.locals.actor.userId,
          role: response.locals.actor.role
        },
        reviewRequestId: parsedParams.data.id
      });

      response.json({
        reviewRequestId: history.reviewRequestId,
        currentStatus: history.currentStatus,
        lifecycleHistory: history.lifecycleHistory.map((entry) => ({
          transitionedAt: entry.transitionedAt.toISOString(),
          fromStatus: entry.fromStatus,
          toStatus: entry.toStatus,
          transitionedById: entry.transitionedById,
          transitionedByRole: entry.transitionedByRole
        }))
      });
    } catch (error) {
      handleReviewRequestError(error, response);
    }
  }
);

reviewRequestRouter.get("/review-requests/queue/reviewer", requireReviewRequestActor, async (request, response) => {
  const parsedQuery = reviewerQueueQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: {
        query: parsedQuery.error.flatten()
      }
    });
    return;
  }

  try {
    const result = await reviewRequestService.listReviewerQueue({
      actor: {
        userId: response.locals.actor.userId,
        role: response.locals.actor.role
      },
      ...(parsedQuery.data.assigneeUserId === undefined
        ? {}
        : { assigneeUserId: parsedQuery.data.assigneeUserId }),
      ...(parsedQuery.data.status === undefined ? {} : { status: parsedQuery.data.status }),
      ...(parsedQuery.data.workflowState === undefined
        ? {}
        : { workflowState: parsedQuery.data.workflowState }),
      ...(parsedQuery.data.limit === undefined ? {} : { limit: parsedQuery.data.limit }),
      ...(parsedQuery.data.offset === undefined ? {} : { offset: parsedQuery.data.offset })
    });

    response.json({
      reviewRequests: result.reviewRequests.map((reviewRequest) => serializeReviewRequest(reviewRequest)),
      total: result.total,
      assigneeUserId: result.assigneeUserId,
      status: result.status,
      limit: result.limit,
      offset: result.offset
    });
  } catch (error) {
    handleReviewRequestError(error, response);
  }
});

reviewRequestRouter.get("/review-requests/queue/admin", requireReviewRequestActor, async (request, response) => {
  const parsedQuery = adminQueueQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: {
        query: parsedQuery.error.flatten()
      }
    });
    return;
  }

  try {
    const result = await reviewRequestService.listAdminQueue({
      actor: {
        userId: response.locals.actor.userId,
        role: response.locals.actor.role
      },
      ...(parsedQuery.data.assigneeUserId === undefined
        ? {}
        : { assigneeUserId: parsedQuery.data.assigneeUserId }),
      ...(parsedQuery.data.status === undefined ? {} : { status: parsedQuery.data.status }),
      ...(parsedQuery.data.workflowState === undefined
        ? {}
        : { workflowState: parsedQuery.data.workflowState }),
      ...(parsedQuery.data.limit === undefined ? {} : { limit: parsedQuery.data.limit }),
      ...(parsedQuery.data.offset === undefined ? {} : { offset: parsedQuery.data.offset })
    });

    response.json({
      reviewRequests: result.reviewRequests.map((reviewRequest) => serializeReviewRequest(reviewRequest)),
      total: result.total,
      assigneeUserId: result.assigneeUserId,
      status: result.status,
      limit: result.limit,
      offset: result.offset
    });
  } catch (error) {
    handleReviewRequestError(error, response);
  }
});
