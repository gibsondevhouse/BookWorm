import { EntityType } from "@prisma/client";
import { type Response, Router } from "express";
import { z } from "zod";

import { requireAuthenticatedActor } from "../middleware/requireAuthenticatedActor.js";
import { proposalApplicationService } from "../services/proposalApplicationService.js";

const proposalIdParamsSchema = z.object({
  id: z.string().min(1)
});

const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional()
});

const applyProposalBodySchema = z.object({
  appliedNote: z.string().trim().max(5000).optional(),
  override: z
    .object({
      reasonCode: z
        .enum(["EMERGENCY_HOTFIX", "INCIDENT_RESPONSE", "LEGAL_COMPLIANCE"]),
      reasonNote: z.string().trim().min(1).max(500)
    })
    .optional()
});

const entityParamsSchema = z.object({
  type: z.nativeEnum(EntityType),
  slug: z.string().min(1)
});

const manuscriptIdParamsSchema = z.object({
  id: z.string().min(1)
});

type SerializedProposalApplication = {
  id: string;
  createdAt: string;
  updatedAt: string;
  proposedById: string;
  decidedById: string | null;
  appliedById: string | null;
  entityId: string | null;
  manuscriptId: string | null;
  changeType: "CREATE" | "UPDATE" | "DELETE";
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  title: string;
  summary: string;
  payload: unknown | null;
  decisionNote: string | null;
  appliedNote: string | null;
  decidedAt: string | null;
  appliedAt: string | null;
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
  appliedBy: {
    userId: string;
    email: string;
    displayName: string;
    role: string;
  } | null;
};

const serializeProposalApplication = (
  proposal: Awaited<ReturnType<typeof proposalApplicationService.getApplicationStatus>>
): SerializedProposalApplication => ({
  id: proposal.id,
  createdAt: proposal.createdAt.toISOString(),
  updatedAt: proposal.updatedAt.toISOString(),
  proposedById: proposal.proposedById,
  decidedById: proposal.decidedById,
  appliedById: proposal.appliedById,
  entityId: proposal.entityId,
  manuscriptId: proposal.manuscriptId,
  changeType: proposal.changeType,
  status: proposal.status,
  title: proposal.title,
  summary: proposal.summary,
  payload: proposal.payload,
  decisionNote: proposal.decisionNote,
  appliedNote: proposal.appliedNote,
  decidedAt: proposal.decidedAt?.toISOString() ?? null,
  appliedAt: proposal.appliedAt?.toISOString() ?? null,
  proposedBy: proposal.proposedBy,
  decidedBy: proposal.decidedBy,
  appliedBy: proposal.appliedBy
});

const handleApplicationError = (error: unknown, response: Response): void => {
  if (!(error instanceof Error)) {
    response.status(500).json({
      error: "Unexpected error"
    });
    return;
  }

  if (error.name === "ProposalApplicationGateBlockedError") {
    const gateError = error as Error & {
      reasons: Array<{
        code: string;
        message: string;
        details: Record<string, unknown>;
      }>;
      readiness: {
        proposalId: string;
        ready: boolean;
        evaluatedAt: Date;
        reviewRequest: {
          id: string;
          status: string;
          hasApprovalChain: boolean;
          approvalChainStatus: string | null;
          requiredStepsTotal: number;
          requiredStepsApproved: number;
        } | null;
        unmetConditions: Array<{
          code: string;
          message: string;
          details: Record<string, unknown>;
        }>;
      };
    };

    response.status(409).json({
      error: gateError.message,
      code: "APPLICATION_GATE_BLOCKED",
      reasons: gateError.reasons,
      readiness: {
        proposalId: gateError.readiness.proposalId,
        ready: gateError.readiness.ready,
        evaluatedAt: gateError.readiness.evaluatedAt.toISOString(),
        reviewRequest: gateError.readiness.reviewRequest,
        unmetConditions: gateError.readiness.unmetConditions
      }
    });
    return;
  }

  if (error.name === "ProposalApplicationOverrideUnauthorizedError") {
    response.status(403).json({
      error: error.message,
      code: "APPLICATION_OVERRIDE_UNAUTHORIZED"
    });
    return;
  }

  if (error.name === "ProposalApplicationOverrideInvalidError") {
    response.status(400).json({
      error: error.message,
      code: "APPLICATION_OVERRIDE_INVALID"
    });
    return;
  }

  if (error.name === "ProposalNotFoundError") {
    response.status(404).json({
      error: error.message
    });
    return;
  }

  if (error.name === "ProposalNotAcceptedError") {
    response.status(409).json({
      error: error.message
    });
    return;
  }

  if (error.name === "ProposalAlreadyAppliedError") {
    response.status(409).json({
      error: error.message
    });
    return;
  }

  if (error.message.includes("Applied note")) {
    response.status(400).json({
      error: error.message
    });
    return;
  }

  response.status(500).json({
    error: error.message
  });
};

export const proposalApplicationRouter = Router();

const requireAdmin = requireAuthenticatedActor(["AUTHOR_ADMIN"]);

/**
 * GET /admin/proposals/pending-accepted
 * List ACCEPTED proposals awaiting application (paginated)
 */
proposalApplicationRouter.get(
  "/admin/proposals/pending-accepted",
  requireAdmin,
  async (request, response) => {
    const parsedQuery = paginationQuerySchema.safeParse(request.query);

    if (!parsedQuery.success) {
      response.status(400).json({
        error: parsedQuery.error.flatten()
      });
      return;
    }

    try {
      const result = await proposalApplicationService.listPendingAcceptedProposals({
        limit: parsedQuery.data.limit ?? 50,
        offset: parsedQuery.data.offset ?? 0
      });

      response.json({
        proposals: result.proposals.map((p) => serializeProposalApplication(p)),
        total: result.total,
        limit: result.limit,
        offset: result.offset
      });
    } catch (error) {
      handleApplicationError(error, response);
    }
  }
);

/**
 * GET /admin/proposals/applied-history
 * List already-applied proposals with application metadata (paginated)
 */
proposalApplicationRouter.get(
  "/admin/proposals/applied-history",
  requireAdmin,
  async (request, response) => {
    const parsedQuery = paginationQuerySchema.safeParse(request.query);

    if (!parsedQuery.success) {
      response.status(400).json({
        error: parsedQuery.error.flatten()
      });
      return;
    }

    try {
      const result = await proposalApplicationService.listAppliedProposals({
        limit: parsedQuery.data.limit ?? 50,
        offset: parsedQuery.data.offset ?? 0
      });

      response.json({
        proposals: result.proposals.map((p) => serializeProposalApplication(p)),
        total: result.total,
        limit: result.limit,
        offset: result.offset
      });
    } catch (error) {
      handleApplicationError(error, response);
    }
  }
);

/**
 * GET /admin/proposals/:id/application-status
 * Get detailed application status of a proposal
 */
proposalApplicationRouter.get(
  "/admin/proposals/:id/application-status",
  requireAdmin,
  async (request, response) => {
    const parsedParams = proposalIdParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      response.status(400).json({
        error: parsedParams.error.flatten()
      });
      return;
    }

    try {
      const proposal = await proposalApplicationService.getApplicationStatus({
        proposalId: parsedParams.data.id
      });

      response.json(serializeProposalApplication(proposal));
    } catch (error) {
      handleApplicationError(error, response);
    }
  }
);

/**
 * GET /admin/proposals/:id/application-readiness
 * Get policy-gate readiness details for proposal application.
 */
proposalApplicationRouter.get(
  "/admin/proposals/:id/application-readiness",
  requireAdmin,
  async (request, response) => {
    const parsedParams = proposalIdParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      response.status(400).json({
        error: parsedParams.error.flatten()
      });
      return;
    }

    try {
      const readiness = await proposalApplicationService.getApplicationReadiness({
        proposalId: parsedParams.data.id
      });

      response.json({
        proposalId: readiness.proposalId,
        ready: readiness.ready,
        evaluatedAt: readiness.evaluatedAt.toISOString(),
        reviewRequest: readiness.reviewRequest,
        unmetConditions: readiness.unmetConditions
      });
    } catch (error) {
      handleApplicationError(error, response);
    }
  }
);

/**
 * POST /admin/proposals/:id/apply
 * Apply an ACCEPTED proposal by creating a new revision
 */
proposalApplicationRouter.post(
  "/admin/proposals/:id/apply",
  requireAdmin,
  async (request, response) => {
    const parsedParams = proposalIdParamsSchema.safeParse(request.params);
    const parsedBody = applyProposalBodySchema.safeParse(request.body ?? {});

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
      const proposal = await proposalApplicationService.applyProposal({
        proposalId: parsedParams.data.id,
        appliedById: response.locals.actor.userId,
        appliedByRole: response.locals.actor.role,
        ...(parsedBody.data.appliedNote
          ? { appliedNote: parsedBody.data.appliedNote }
          : {}),
        ...(parsedBody.data.override
          ? {
              override: {
                reasonCode: parsedBody.data.override.reasonCode,
                reasonNote: parsedBody.data.override.reasonNote
              }
            }
          : {})
      });

      response.json(serializeProposalApplication(proposal));
    } catch (error) {
      handleApplicationError(error, response);
    }
  }
);

/**
 * POST /admin/proposals/:id/preview-application
 * Preview proposal application without committing
 */
proposalApplicationRouter.post(
  "/admin/proposals/:id/preview-application",
  requireAdmin,
  async (request, response) => {
    const parsedParams = proposalIdParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      response.status(400).json({
        error: parsedParams.error.flatten()
      });
      return;
    }

    try {
      const preview = await proposalApplicationService.previewProposalApplication({
        proposalId: parsedParams.data.id
      });

      response.json({
        canApply: preview.canApply,
        errors: preview.errors,
        previewRevision: {
          name: preview.previewRevision.name,
          summary: preview.previewRevision.summary,
          visibility: preview.previewRevision.visibility,
          ...(preview.previewRevision.payload
            ? { payload: preview.previewRevision.payload }
            : {})
        }
      });
    } catch (error) {
      handleApplicationError(error, response);
    }
  }
);

/**
 * GET /admin/entities/:type/:slug/revisions/applied-proposals
 * Get audit trail of entity revisions created from applied proposals
 */
proposalApplicationRouter.get(
  "/admin/entities/:type/:slug/revisions/applied-proposals",
  requireAdmin,
  async (request, response) => {
    const parsedParams = entityParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      response.status(400).json({
        error: parsedParams.error.flatten()
      });
      return;
    }

    try {
      const revisions = await proposalApplicationService.getEntityRevisionAuditTrail({
        entityType: parsedParams.data.type,
        slug: parsedParams.data.slug
      });

      response.json({
        revisions: revisions.map((r) => ({
          revisionId: r.revisionId,
          version: r.version,
          appliedFromProposal: r.appliedFromProposal
            ? {
                id: r.appliedFromProposal.id,
                title: r.appliedFromProposal.title,
                summary: r.appliedFromProposal.summary,
                appliedBy: r.appliedFromProposal.appliedBy,
                appliedAt: r.appliedFromProposal.appliedAt?.toISOString() ?? null,
                appliedNote: r.appliedFromProposal.appliedNote
              }
            : null
        }))
      });
    } catch (error) {
      handleApplicationError(error, response);
    }
  }
);

/**
 * GET /admin/manuscripts/:id/revisions/applied-proposals
 * Get audit trail of manuscript revisions created from applied proposals
 */
proposalApplicationRouter.get(
  "/admin/manuscripts/:id/revisions/applied-proposals",
  requireAdmin,
  async (request, response) => {
    const parsedParams = manuscriptIdParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      response.status(400).json({
        error: parsedParams.error.flatten()
      });
      return;
    }

    try {
      const revisions = await proposalApplicationService.getManuscriptRevisionAuditTrail({
        manuscriptId: parsedParams.data.id
      });

      response.json({
        revisions: revisions.map((r) => ({
          revisionId: r.revisionId,
          version: r.version,
          appliedFromProposal: r.appliedFromProposal
            ? {
                id: r.appliedFromProposal.id,
                title: r.appliedFromProposal.title,
                summary: r.appliedFromProposal.summary,
                appliedBy: r.appliedFromProposal.appliedBy,
                appliedAt: r.appliedFromProposal.appliedAt?.toISOString() ?? null,
                appliedNote: r.appliedFromProposal.appliedNote
              }
            : null
        }))
      });
    } catch (error) {
      handleApplicationError(error, response);
    }
  }
);

/**
 * GET /admin/proposals/workflow-stats
 * Get aggregate statistics about proposal workflow
 */
proposalApplicationRouter.get(
  "/admin/proposals/workflow-stats",
  requireAdmin,
  async (request, response) => {
    try {
      const stats = await proposalApplicationService.getWorkflowStats();

      response.json({
        pending: stats.pending,
        accepted: stats.accepted,
        applied: stats.applied,
        rejected: stats.rejected,
        totalByChangeType: stats.totalByChangeType
      });
    } catch (error) {
      handleApplicationError(error, response);
    }
  }
);

/**
 * GET /admin/proposals/recent-applications
 * Get 20 most recent applied proposals
 */
proposalApplicationRouter.get(
  "/admin/proposals/recent-applications",
  requireAdmin,
  async (request, response) => {
    try {
      const proposals = await proposalApplicationService.getRecentApplications();

      response.json({
        proposals: proposals.map((p) => serializeProposalApplication(p))
      });
    } catch (error) {
      handleApplicationError(error, response);
    }
  }
);
