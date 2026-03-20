import { Router, type Response } from "express";
import { type ProposalWorkflowState } from "@prisma/client";
import { z } from "zod";

import { requireAuthenticatedActor } from "../middleware/requireAuthenticatedActor.js";
import { proposalService } from "../services/proposalService.js";
import {
  ProposalInvalidStateTransitionError,
  ProposalStateTransitionUnauthorizedError
} from "../services/proposalStateService.js";

const proposalIdParamsSchema = z.object({
  id: z.string().min(1)
});

const workflowStateParamsSchema = z.object({
  state: z.enum(["DRAFT", "SUBMITTED", "IN_REVIEW", "APPROVED", "REJECTED", "APPLIED", "ARCHIVED"])
});

const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional()
});

const reviewNotesBodySchema = z.object({
  reviewNotes: z.string().trim().max(5000).optional()
});

type SerializedProposal = {
  id: string;
  createdAt: string;
  updatedAt: string;
  proposedById: string;
  decidedById: string | null;
  entityId: string | null;
  manuscriptId: string | null;
  changeType: "CREATE" | "UPDATE" | "DELETE";
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  title: string;
  summary: string;
  payload: unknown | null;
  decisionNote: string | null;
  workflowState: ProposalWorkflowState;
  submittedAt: string | null;
  reviewStartedAt: string | null;
  approvedAt: string | null;
  archivedAt: string | null;
  reviewNotes: string | null;
  proposedBy: {
    userId: string;
    email: string;
    displayName: string;
    role: string;
  };
  decidedBy: {
    userId: string;
    email: string;
    displayName: string;
    role: string;
  } | null;
};

const serializeProposal = (
  proposal: Awaited<ReturnType<typeof proposalService.getProposalById>>
): SerializedProposal => ({
  id: proposal.id,
  createdAt: proposal.createdAt.toISOString(),
  updatedAt: proposal.updatedAt.toISOString(),
  proposedById: proposal.proposedById,
  decidedById: proposal.decidedById,
  entityId: proposal.entityId,
  manuscriptId: proposal.manuscriptId,
  changeType: proposal.changeType,
  status: proposal.status,
  title: proposal.title,
  summary: proposal.summary,
  payload: proposal.payload,
  decisionNote: proposal.decisionNote,
  workflowState: proposal.workflowState ?? "DRAFT",
  submittedAt: proposal.submittedAt?.toISOString() ?? null,
  reviewStartedAt: proposal.reviewStartedAt?.toISOString() ?? null,
  approvedAt: proposal.approvedAt?.toISOString() ?? null,
  archivedAt: proposal.archivedAt?.toISOString() ?? null,
  reviewNotes: proposal.reviewNotes ?? null,
  proposedBy: proposal.proposedBy,
  decidedBy: proposal.decidedBy
});

const handleWorkflowError = (error: unknown, response: Response): void => {
  if (!(error instanceof Error)) {
    response.status(500).json({
      error: "Unexpected error"
    });
    return;
  }

  if (error.name === "ProposalNotFoundError") {
    response.status(404).json({
      error: error.message
    });
    return;
  }

  if (error instanceof ProposalInvalidStateTransitionError) {
    response.status(409).json({
      error: error.message
    });
    return;
  }

  if (error instanceof ProposalStateTransitionUnauthorizedError) {
    response.status(403).json({
      error: error.message
    });
    return;
  }

  if (error.message.includes("Review notes")) {
    response.status(400).json({
      error: error.message
    });
    return;
  }

  response.status(500).json({
    error: error.message
  });
};

export const proposalWorkflowRouter = Router();

const requireAuthenticatedUser = requireAuthenticatedActor(["EDITOR", "AUTHOR_ADMIN"]);
const requireAdminUser = requireAuthenticatedActor(["AUTHOR_ADMIN"]);

/**
 * POST /proposals/:id/submit
 * Author submits proposal: DRAFT → SUBMITTED
 */
proposalWorkflowRouter.post(
  "/proposals/:id/submit",
  requireAuthenticatedUser,
  async (request, response) => {
    const parsedParams = proposalIdParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      response.status(400).json({
        error: parsedParams.error.flatten()
      });
      return;
    }

    try {
      const proposal = await proposalService.submitProposal(parsedParams.data.id, {
        userId: response.locals.actor.userId,
        role: response.locals.actor.role
      });

      response.json(serializeProposal(proposal));
    } catch (error) {
      handleWorkflowError(error, response);
    }
  }
);

/**
 * POST /proposals/:id/start-review
 * Admin starts review: SUBMITTED → IN_REVIEW
 */
proposalWorkflowRouter.post(
  "/proposals/:id/start-review",
  requireAdminUser,
  async (request, response) => {
    const parsedParams = proposalIdParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      response.status(400).json({
        error: parsedParams.error.flatten()
      });
      return;
    }

    try {
      const proposal = await proposalService.startProposalReview(parsedParams.data.id, {
        userId: response.locals.actor.userId,
        role: response.locals.actor.role
      });

      response.json(serializeProposal(proposal));
    } catch (error) {
      handleWorkflowError(error, response);
    }
  }
);

/**
 * POST /proposals/:id/approve
 * Admin approves proposal: IN_REVIEW → APPROVED
 */
proposalWorkflowRouter.post(
  "/proposals/:id/approve",
  requireAdminUser,
  async (request, response) => {
    const parsedParams = proposalIdParamsSchema.safeParse(request.params);
    const parsedBody = reviewNotesBodySchema.safeParse(request.body);

    if (!parsedParams.success || !parsedBody.success) {
      response.status(400).json({
        error: {
          params: parsedParams.success ? null : parsedParams.error.flatten(),
          body: parsedBody.success ? null : parsedBody.error.flatten()
        }
      });
      return;
    }

    try {
      const proposal = await proposalService.approveProposalForDecision(
        parsedParams.data.id,
        {
          userId: response.locals.actor.userId,
          role: response.locals.actor.role
        },
        parsedBody.data.reviewNotes
      );

      response.json(serializeProposal(proposal));
    } catch (error) {
      handleWorkflowError(error, response);
    }
  }
);

/**
 * POST /proposals/:id/reject
 * Admin rejects proposal: IN_REVIEW → REJECTED
 */
proposalWorkflowRouter.post(
  "/proposals/:id/reject",
  requireAdminUser,
  async (request, response) => {
    const parsedParams = proposalIdParamsSchema.safeParse(request.params);
    const parsedBody = reviewNotesBodySchema.safeParse(request.body);

    if (!parsedParams.success || !parsedBody.success) {
      response.status(400).json({
        error: {
          params: parsedParams.success ? null : parsedParams.error.flatten(),
          body: parsedBody.success ? null : parsedBody.error.flatten()
        }
      });
      return;
    }

    try {
      const proposal = await proposalService.rejectProposalForDecision(
        parsedParams.data.id,
        {
          userId: response.locals.actor.userId,
          role: response.locals.actor.role
        },
        parsedBody.data.reviewNotes
      );

      response.json(serializeProposal(proposal));
    } catch (error) {
      handleWorkflowError(error, response);
    }
  }
);

/**
 * POST /proposals/:id/archive
 * Admin archives proposal: terminal states → ARCHIVED
 */
proposalWorkflowRouter.post(
  "/proposals/:id/archive",
  requireAdminUser,
  async (request, response) => {
    const parsedParams = proposalIdParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      response.status(400).json({
        error: parsedParams.error.flatten()
      });
      return;
    }

    try {
      const proposal = await proposalService.archiveProposal(parsedParams.data.id, {
        userId: response.locals.actor.userId,
        role: response.locals.actor.role
      });

      response.json(serializeProposal(proposal));
    } catch (error) {
      handleWorkflowError(error, response);
    }
  }
);

/**
 * GET /proposals/:id/state
 * Get current proposal state and workflow metadata
 */
proposalWorkflowRouter.get(
  "/proposals/:id/state",
  requireAuthenticatedUser,
  async (request, response) => {
    const parsedParams = proposalIdParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      response.status(400).json({
        error: parsedParams.error.flatten()
      });
      return;
    }

    try {
      const proposal = await proposalService.getProposalById({
        proposalId: parsedParams.data.id
      });

      response.json({
        id: proposal.id,
        workflowState: proposal.workflowState ?? "DRAFT",
        submittedAt: proposal.submittedAt?.toISOString() ?? null,
        reviewStartedAt: proposal.reviewStartedAt?.toISOString() ?? null,
        approvedAt: proposal.approvedAt?.toISOString() ?? null,
        archivedAt: proposal.archivedAt?.toISOString() ?? null,
        reviewNotes: proposal.reviewNotes ?? null,
        status: proposal.status,
        decidedAt: proposal.decidedAt?.toISOString() ?? null
      });
    } catch (error) {
      handleWorkflowError(error, response);
    }
  }
);

/**
 * GET /proposals/state/:state
 * Get proposals filtered by workflow state (paginated)
 */
proposalWorkflowRouter.get(
  "/proposals/state/:state",
  requireAuthenticatedUser,
  async (request, response) => {
    const parsedParams = workflowStateParamsSchema.safeParse(request.params);
    const parsedQuery = paginationQuerySchema.safeParse(request.query);

    if (!parsedParams.success || !parsedQuery.success) {
      response.status(400).json({
        error: {
          params: parsedParams.success ? null : parsedParams.error.flatten(),
          query: parsedQuery.success ? null : parsedQuery.error.flatten()
        }
      });
      return;
    }

    try {
      const result = await proposalService.listProposalsByWorkflowState(
        parsedParams.data.state as ProposalWorkflowState,
        {
          limit: parsedQuery.data.limit ?? 50,
          offset: parsedQuery.data.offset ?? 0
        }
      );

      response.json({
        proposals: result.proposals.map((p) => serializeProposal(p)),
        total: result.total,
        limit: parsedQuery.data.limit ?? 50,
        offset: parsedQuery.data.offset ?? 0
      });
    } catch (error) {
      handleWorkflowError(error, response);
    }
  }
);
