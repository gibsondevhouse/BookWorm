import { type Response, Router } from "express";
import { z } from "zod";

import { requireAuthenticatedActor } from "../middleware/requireAuthenticatedActor.js";
import {
  ProposalPreviewNotFoundError,
  ProposalPreviewUnauthorizedError,
  proposalPreviewService
} from "../services/proposalPreviewService.js";

const proposalIdParamsSchema = z.object({
  id: z.string().min(1)
});

const handlePreviewError = (error: unknown, response: Response): void => {
  if (!(error instanceof Error)) {
    response.status(500).json({
      error: "Unexpected proposal preview error"
    });
    return;
  }

  if (error instanceof ProposalPreviewNotFoundError) {
    response.status(404).json({
      error: error.message
    });
    return;
  }

  if (error instanceof ProposalPreviewUnauthorizedError) {
    response.status(403).json({
      error: error.message
    });
    return;
  }

  response.status(500).json({
    error: error.message
  });
};

export const proposalPreviewRouter = Router();

proposalPreviewRouter.get(
  "/proposals/:id/preview",
  requireAuthenticatedActor(["EDITOR", "AUTHOR_ADMIN"]),
  async (request, response) => {
    const parsedParams = proposalIdParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      response.status(400).json({
        error: parsedParams.error.flatten()
      });
      return;
    }

    try {
      const preview = await proposalPreviewService.getProposalPreview({
        proposalId: parsedParams.data.id,
        actor: {
          userId: response.locals.actor.userId,
          role: response.locals.actor.role
        }
      });

      response.json({
        proposal: {
          ...preview.proposal,
          createdAt: preview.proposal.createdAt.toISOString(),
          updatedAt: preview.proposal.updatedAt.toISOString(),
          decidedAt: preview.proposal.decidedAt?.toISOString() ?? null,
          appliedAt: preview.proposal.appliedAt?.toISOString() ?? null
        },
        validation: preview.validation,
        currentSnapshot: preview.currentSnapshot,
        proposedSnapshot: preview.proposedSnapshot,
        changeSummary: preview.changeSummary,
        impactSummary: preview.impactSummary
      });
    } catch (error) {
      handlePreviewError(error, response);
    }
  }
);