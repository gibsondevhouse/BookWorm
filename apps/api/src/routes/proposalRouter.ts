import { EntityType } from "@prisma/client";
import { type Response, Router } from "express";
import { z } from "zod";

import { requireAuthenticatedActor } from "../middleware/requireAuthenticatedActor.js";
import { proposalService } from "../services/proposalService.js";

const proposalChangeTypeSchema = z.enum(["CREATE", "UPDATE", "DELETE"]);
const proposalStatusSchema = z.enum(["PENDING", "ACCEPTED", "REJECTED"]);
const proposalWorkflowStateSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "APPLIED",
  "ARCHIVED"
]);

const entityParamsSchema = z.object({
  type: z.nativeEnum(EntityType),
  slug: z.string().min(1)
});

const manuscriptParamsSchema = z.object({
  id: z.string().min(1)
});

const proposalIdParamsSchema = z.object({
  id: z.string().min(1)
});

const createProposalBodySchema = z.object({
  changeType: proposalChangeTypeSchema,
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().min(1).max(5000),
  payload: z.record(z.string(), z.unknown()).optional()
});

const rejectProposalBodySchema = z.object({
  decisionNote: z.string().trim().min(1).max(5000)
});

const acceptProposalBodySchema = z.object({
  decisionNote: z.string().trim().min(1).max(5000).optional()
});

const adminListQuerySchema = z.object({
  status: proposalStatusSchema.optional(),
  changeType: proposalChangeTypeSchema.optional()
});

const proposalListFilterQuerySchema = z.object({
  workflowState: proposalWorkflowStateSchema.optional(),
  changeType: proposalChangeTypeSchema.optional(),
  submitter: z.string().trim().min(1).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional()
});

const summaryQuerySchema = z
  .object({
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional()
  })
  .refine(
    (value) => {
      if (value.from === undefined || value.to === undefined) {
        return true;
      }

      return new Date(value.from).getTime() <= new Date(value.to).getTime();
    },
    {
      message: "Query parameter 'from' must be less than or equal to 'to'",
      path: ["from"]
    }
  );

const proposalMetadataBodySchema = z
  .object({
    reviewNotes: z.string().trim().min(1).max(5000).nullable().optional(),
    decisionNote: z.string().trim().min(1).max(5000).nullable().optional(),
    rationale: z.string().trim().min(1).max(5000).nullable().optional(),
    appliedNote: z.string().trim().min(1).max(5000).nullable().optional()
  })
  .refine(
    (value) =>
      value.reviewNotes !== undefined ||
      value.decisionNote !== undefined ||
      value.rationale !== undefined ||
      value.appliedNote !== undefined,
    {
      message: "At least one metadata field must be provided"
    }
  )
  .refine(
    (value) =>
      value.decisionNote === undefined ||
      value.rationale === undefined ||
      value.decisionNote === value.rationale,
    {
      message: "decisionNote and rationale must match when both are provided",
      path: ["decisionNote"]
    }
  );

const myProposalListFilterQuerySchema = proposalListFilterQuerySchema.omit({
  submitter: true
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
  decidedAt: string | null;
  proposedBy: {
    userId: string;
    email: string;
    displayName: string;
    role: "PUBLIC" | "EDITOR" | "AUTHOR_ADMIN";
  };
  decidedBy: {
    userId: string;
    email: string;
    displayName: string;
    role: "PUBLIC" | "EDITOR" | "AUTHOR_ADMIN";
  } | null;
  workflowState: "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "APPLIED" | "ARCHIVED";
  submittedAt: string | null;
  reviewStartedAt: string | null;
  approvedAt: string | null;
  archivedAt: string | null;
  reviewNotes: string | null;
  appliedById: string | null;
  appliedNote: string | null;
  appliedAt: string | null;
};

type SerializedProposalMetadata = {
  id: string;
  updatedAt: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  workflowState: "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "APPLIED" | "ARCHIVED";
  decisionNote: string | null;
  rationale: string | null;
  reviewNotes: string | null;
  appliedNote: string | null;
  decidedAt: string | null;
  reviewStartedAt: string | null;
  approvedAt: string | null;
  appliedAt: string | null;
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
  decidedAt: proposal.decidedAt?.toISOString() ?? null,
  proposedBy: proposal.proposedBy,
  decidedBy: proposal.decidedBy,
  workflowState: proposal.workflowState ?? "DRAFT",
  submittedAt: proposal.submittedAt?.toISOString() ?? null,
  reviewStartedAt: proposal.reviewStartedAt?.toISOString() ?? null,
  approvedAt: proposal.approvedAt?.toISOString() ?? null,
  archivedAt: proposal.archivedAt?.toISOString() ?? null,
  reviewNotes: proposal.reviewNotes ?? null,
  appliedById: proposal.appliedById,
  appliedNote: proposal.appliedNote ?? null,
  appliedAt: proposal.appliedAt?.toISOString() ?? null
});

const serializeProposalMetadata = (
  proposal: Awaited<ReturnType<typeof proposalService.getProposalMetadata>>
): SerializedProposalMetadata => ({
  id: proposal.id,
  updatedAt: proposal.updatedAt.toISOString(),
  status: proposal.status,
  workflowState: proposal.workflowState,
  decisionNote: proposal.decisionNote,
  rationale: proposal.rationale,
  reviewNotes: proposal.reviewNotes,
  appliedNote: proposal.appliedNote,
  decidedAt: proposal.decidedAt?.toISOString() ?? null,
  reviewStartedAt: proposal.reviewStartedAt?.toISOString() ?? null,
  approvedAt: proposal.approvedAt?.toISOString() ?? null,
  appliedAt: proposal.appliedAt?.toISOString() ?? null
});
const handleProposalError = (error: unknown, response: Response): void => {
  if (!(error instanceof Error)) {
    response.status(500).json({
      error: "Unexpected proposal error"
    });
    return;
  }

  if (
    error.message === "Entity not found" ||
    error.message === "Manuscript not found" ||
    error.name === "ProposalNotFoundError"
  ) {
    response.status(404).json({
      error: error.message
    });
    return;
  }

  if (error.name === "ProposalAlreadyDecidedError") {
    response.status(409).json({
      error: error.message
    });
    return;
  }

  if (error.name === "ProposalListUnauthorizedError") {
    response.status(403).json({
      error: error.message
    });
    return;
  }

  if (error.name === "ProposalMetadataUpdateUnauthorizedError") {
    response.status(403).json({
      error: error.message
    });
    return;
  }

  if (
    error.message.includes("Proposal title") ||
    error.message.includes("Proposal summary") ||
    error.message === "Decision note is required" ||
    error.message.includes("Review notes") ||
    error.message.includes("Applied note") ||
    error.message.includes("At least one metadata field") ||
    error.message.includes("must not be empty")
  ) {
    response.status(400).json({
      error: error.message
    });
    return;
  }

  response.status(500).json({
    error: error.message
  });
};

export const proposalRouter = Router();

const requireProposalActor = requireAuthenticatedActor(["EDITOR", "AUTHOR_ADMIN"]);
const requireProposalAdmin = requireAuthenticatedActor(["AUTHOR_ADMIN"]);

proposalRouter.get("/proposals/summary/workflow-states", requireProposalAdmin, async (request, response) => {
  const parsedQuery = summaryQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: parsedQuery.error.flatten()
    });
    return;
  }

  try {
    const summary = await proposalService.getWorkflowStateSummary({
      actor: {
        userId: response.locals.actor.userId,
        role: response.locals.actor.role
      },
      ...(parsedQuery.data.from === undefined ? {} : { from: parsedQuery.data.from }),
      ...(parsedQuery.data.to === undefined ? {} : { to: parsedQuery.data.to })
    });

    response.json({
      counts: summary.counts,
      total: summary.total,
      from: parsedQuery.data.from ?? null,
      to: parsedQuery.data.to ?? null
    });
  } catch (error) {
    handleProposalError(error, response);
  }
});

proposalRouter.get("/proposals/summary/change-types", requireProposalAdmin, async (request, response) => {
  const parsedQuery = summaryQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: parsedQuery.error.flatten()
    });
    return;
  }

  try {
    const summary = await proposalService.getChangeTypeSummary({
      actor: {
        userId: response.locals.actor.userId,
        role: response.locals.actor.role
      },
      ...(parsedQuery.data.from === undefined ? {} : { from: parsedQuery.data.from }),
      ...(parsedQuery.data.to === undefined ? {} : { to: parsedQuery.data.to })
    });

    response.json({
      counts: summary.counts,
      total: summary.total,
      from: parsedQuery.data.from ?? null,
      to: parsedQuery.data.to ?? null
    });
  } catch (error) {
    handleProposalError(error, response);
  }
});

proposalRouter.get("/proposals/:id/metadata", requireProposalActor, async (request, response) => {
  const parsedParams = proposalIdParamsSchema.safeParse(request.params);

  if (!parsedParams.success) {
    response.status(400).json({
      error: parsedParams.error.flatten()
    });
    return;
  }

  try {
    const proposal = await proposalService.getProposalMetadata({
      proposalId: parsedParams.data.id
    });

    response.json(serializeProposalMetadata(proposal));
  } catch (error) {
    handleProposalError(error, response);
  }
});

proposalRouter.patch("/proposals/:id/metadata", requireProposalAdmin, async (request, response) => {
  const parsedParams = proposalIdParamsSchema.safeParse(request.params);
  const parsedBody = proposalMetadataBodySchema.safeParse(request.body ?? {});

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
    const decisionNote = parsedBody.data.decisionNote ?? parsedBody.data.rationale;
    const proposal = await proposalService.updateProposalMetadata({
      proposalId: parsedParams.data.id,
      actor: {
        userId: response.locals.actor.userId,
        role: response.locals.actor.role
      },
      metadata: {
        ...(parsedBody.data.reviewNotes === undefined ? {} : { reviewNotes: parsedBody.data.reviewNotes }),
        ...(decisionNote === undefined ? {} : { decisionNote }),
        ...(parsedBody.data.appliedNote === undefined ? {} : { appliedNote: parsedBody.data.appliedNote })
      }
    });

    response.json(serializeProposalMetadata(proposal));
  } catch (error) {
    handleProposalError(error, response);
  }
});

proposalRouter.post("/entities/:type/:slug/proposals", requireProposalActor, async (request, response) => {
  const parsedParams = entityParamsSchema.safeParse(request.params);
  const parsedBody = createProposalBodySchema.safeParse(request.body);

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
    const proposal = await proposalService.createProposal({
      userId: response.locals.actor.userId,
      target: {
        entityType: parsedParams.data.type,
        entitySlug: parsedParams.data.slug
      },
      changeType: parsedBody.data.changeType,
      title: parsedBody.data.title,
      summary: parsedBody.data.summary,
      ...(parsedBody.data.payload === undefined ? {} : { payload: parsedBody.data.payload })
    });

    response.status(201).json(serializeProposal(proposal));
  } catch (error) {
    handleProposalError(error, response);
  }
});

proposalRouter.get("/entities/:type/:slug/proposals", requireProposalActor, async (request, response) => {
  const parsedParams = entityParamsSchema.safeParse(request.params);

  if (!parsedParams.success) {
    response.status(400).json({
      error: parsedParams.error.flatten()
    });
    return;
  }

  try {
    const proposals = await proposalService.listProposalsByTarget({
      target: {
        entityType: parsedParams.data.type,
        entitySlug: parsedParams.data.slug
      }
    });

    response.json({
      proposals: proposals.map((proposal) => serializeProposal(proposal))
    });
  } catch (error) {
    handleProposalError(error, response);
  }
});

proposalRouter.post("/manuscripts/:id/proposals", requireProposalActor, async (request, response) => {
  const parsedParams = manuscriptParamsSchema.safeParse(request.params);
  const parsedBody = createProposalBodySchema.safeParse(request.body);

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
    const proposal = await proposalService.createProposal({
      userId: response.locals.actor.userId,
      target: {
        manuscriptId: parsedParams.data.id
      },
      changeType: parsedBody.data.changeType,
      title: parsedBody.data.title,
      summary: parsedBody.data.summary,
      ...(parsedBody.data.payload === undefined ? {} : { payload: parsedBody.data.payload })
    });

    response.status(201).json(serializeProposal(proposal));
  } catch (error) {
    handleProposalError(error, response);
  }
});

proposalRouter.get("/manuscripts/:id/proposals", requireProposalActor, async (request, response) => {
  const parsedParams = manuscriptParamsSchema.safeParse(request.params);

  if (!parsedParams.success) {
    response.status(400).json({
      error: parsedParams.error.flatten()
    });
    return;
  }

  try {
    const proposals = await proposalService.listProposalsByTarget({
      target: {
        manuscriptId: parsedParams.data.id
      }
    });

    response.json({
      proposals: proposals.map((proposal) => serializeProposal(proposal))
    });
  } catch (error) {
    handleProposalError(error, response);
  }
});

proposalRouter.get("/proposals/my-proposals", requireProposalActor, async (request, response) => {
  const parsedQuery = myProposalListFilterQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: parsedQuery.error.flatten()
    });
    return;
  }

  try {
    const result = await proposalService.listMyProposals({
      actor: {
        userId: response.locals.actor.userId,
        role: response.locals.actor.role
      },
      filters: {
        ...(parsedQuery.data.workflowState === undefined
          ? {}
          : { workflowState: parsedQuery.data.workflowState }),
        ...(parsedQuery.data.changeType === undefined ? {} : { changeType: parsedQuery.data.changeType }),
        ...(parsedQuery.data.from === undefined ? {} : { createdAtFrom: parsedQuery.data.from }),
        ...(parsedQuery.data.to === undefined ? {} : { createdAtTo: parsedQuery.data.to }),
        ...(parsedQuery.data.limit === undefined ? {} : { limit: parsedQuery.data.limit }),
        ...(parsedQuery.data.offset === undefined ? {} : { offset: parsedQuery.data.offset })
      }
    });

    response.json({
      proposals: result.proposals.map((proposal) => serializeProposal(proposal)),
      total: result.total,
      limit: result.limit,
      offset: result.offset
    });
  } catch (error) {
    handleProposalError(error, response);
  }
});

proposalRouter.get("/proposals/pending-review", requireProposalAdmin, async (request, response) => {
  const parsedQuery = proposalListFilterQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: parsedQuery.error.flatten()
    });
    return;
  }

  try {
    const result = await proposalService.listPendingReviewProposals({
      actor: {
        userId: response.locals.actor.userId,
        role: response.locals.actor.role
      },
      filters: {
        ...(parsedQuery.data.workflowState === undefined
          ? {}
          : { workflowState: parsedQuery.data.workflowState }),
        ...(parsedQuery.data.changeType === undefined ? {} : { changeType: parsedQuery.data.changeType }),
        ...(parsedQuery.data.submitter === undefined ? {} : { submitterId: parsedQuery.data.submitter }),
        ...(parsedQuery.data.from === undefined ? {} : { createdAtFrom: parsedQuery.data.from }),
        ...(parsedQuery.data.to === undefined ? {} : { createdAtTo: parsedQuery.data.to }),
        ...(parsedQuery.data.limit === undefined ? {} : { limit: parsedQuery.data.limit }),
        ...(parsedQuery.data.offset === undefined ? {} : { offset: parsedQuery.data.offset })
      }
    });

    response.json({
      proposals: result.proposals.map((proposal) => serializeProposal(proposal)),
      total: result.total,
      limit: result.limit,
      offset: result.offset
    });
  } catch (error) {
    handleProposalError(error, response);
  }
});

proposalRouter.get("/proposals/applied-proposals", requireProposalAdmin, async (request, response) => {
  const parsedQuery = proposalListFilterQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: parsedQuery.error.flatten()
    });
    return;
  }

  try {
    const result = await proposalService.listAppliedProposals({
      actor: {
        userId: response.locals.actor.userId,
        role: response.locals.actor.role
      },
      filters: {
        ...(parsedQuery.data.workflowState === undefined
          ? {}
          : { workflowState: parsedQuery.data.workflowState }),
        ...(parsedQuery.data.changeType === undefined ? {} : { changeType: parsedQuery.data.changeType }),
        ...(parsedQuery.data.submitter === undefined ? {} : { submitterId: parsedQuery.data.submitter }),
        ...(parsedQuery.data.from === undefined ? {} : { createdAtFrom: parsedQuery.data.from }),
        ...(parsedQuery.data.to === undefined ? {} : { createdAtTo: parsedQuery.data.to }),
        ...(parsedQuery.data.limit === undefined ? {} : { limit: parsedQuery.data.limit }),
        ...(parsedQuery.data.offset === undefined ? {} : { offset: parsedQuery.data.offset })
      }
    });

    response.json({
      proposals: result.proposals.map((proposal) => serializeProposal(proposal)),
      total: result.total,
      limit: result.limit,
      offset: result.offset
    });
  } catch (error) {
    handleProposalError(error, response);
  }
});

proposalRouter.get("/proposals/:id", requireProposalActor, async (request, response) => {
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

    response.json(serializeProposal(proposal));
  } catch (error) {
    handleProposalError(error, response);
  }
});

proposalRouter.get("/admin/proposals", requireProposalAdmin, async (request, response) => {
  const parsedQuery = adminListQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: parsedQuery.error.flatten()
    });
    return;
  }

  try {
    const proposals = await proposalService.listAdminProposals({
      ...(parsedQuery.data.status === undefined ? {} : { status: parsedQuery.data.status }),
      ...(parsedQuery.data.changeType === undefined ? {} : { changeType: parsedQuery.data.changeType })
    });

    response.json({
      proposals: proposals.map((proposal) => serializeProposal(proposal))
    });
  } catch (error) {
    handleProposalError(error, response);
  }
});

proposalRouter.post("/proposals/:id/accept", requireProposalAdmin, async (request, response) => {
  const parsedParams = proposalIdParamsSchema.safeParse(request.params);
  const parsedBody = acceptProposalBodySchema.safeParse(request.body ?? {});

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
    const proposal = await proposalService.acceptProposal({
      proposalId: parsedParams.data.id,
      decidedById: response.locals.actor.userId,
      ...(parsedBody.data.decisionNote === undefined ? {} : { decisionNote: parsedBody.data.decisionNote })
    });

    response.json(serializeProposal(proposal));
  } catch (error) {
    handleProposalError(error, response);
  }
});

proposalRouter.post("/proposals/:id/reject", requireProposalAdmin, async (request, response) => {
  const parsedParams = proposalIdParamsSchema.safeParse(request.params);
  const parsedBody = rejectProposalBodySchema.safeParse(request.body);

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
    const proposal = await proposalService.rejectProposal({
      proposalId: parsedParams.data.id,
      decidedById: response.locals.actor.userId,
      decisionNote: parsedBody.data.decisionNote
    });

    response.json(serializeProposal(proposal));
  } catch (error) {
    handleProposalError(error, response);
  }
});
