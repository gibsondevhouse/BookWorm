import { type EntityType, type ManuscriptType, type Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { requireAuthenticatedActor } from "../middleware/requireAuthenticatedActor.js";
import { RevisionDiffTargetMismatchError, RevisionNotFoundError } from "../services/revisionDiffService.js";
import { revisionTimelineService } from "../services/revisionTimelineService.js";

const adminEntityTypeValues = [
  "CHARACTER",
  "FACTION",
  "LOCATION",
  "EVENT",
  "ARTIFACT",
  "CREATURE",
  "BELIEF_SYSTEM",
  "POLITICAL_BODY",
  "LANGUAGE",
  "SECRET",
  "REVEAL",
  "TAG",
  "TIMELINE_ERA"
] as const;

const manuscriptTypeValues = ["CHAPTER", "SCENE"] as const;

const timelineFiltersSchema = z
  .object({
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
    appliedFromProposalId: z.string().min(1).optional(),
    modifiedById: z.string().min(1).optional()
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

const entityTimelineParamsSchema = z.object({
  entityType: z.enum(adminEntityTypeValues),
  slug: z.string().min(1)
});

const manuscriptTimelineParamsSchema = z.object({
  manuscriptType: z.enum(manuscriptTypeValues),
  slug: z.string().min(1)
});

const compareQuerySchema = z.object({
  kind: z.enum(["ENTITY", "MANUSCRIPT"]),
  fromRevisionId: z.string().min(1),
  toRevisionId: z.string().min(1)
});

const serializeActor = (actor: {
  userId: string;
  email: string;
  displayName: string;
  role: Role;
}) => ({
  userId: actor.userId,
  email: actor.email,
  displayName: actor.displayName,
  role: actor.role
});

const serializeProposal = (proposal: {
  id: string;
  title: string;
  summary: string;
  appliedAt: Date | null;
  appliedBy: {
    userId: string;
    email: string;
    displayName: string;
    role: Role;
  } | null;
} | null) => {
  if (proposal === null) {
    return null;
  }

  return {
    id: proposal.id,
    title: proposal.title,
    summary: proposal.summary,
    appliedAt: proposal.appliedAt?.toISOString() ?? null,
    appliedBy: proposal.appliedBy === null ? null : serializeActor(proposal.appliedBy)
  };
};

const buildFilterPayload = (query: z.infer<typeof timelineFiltersSchema>) => ({
  ...(query.from === undefined ? {} : { from: new Date(query.from) }),
  ...(query.to === undefined ? {} : { to: new Date(query.to) }),
  ...(query.appliedFromProposalId === undefined ? {} : { appliedFromProposalId: query.appliedFromProposalId }),
  ...(query.modifiedById === undefined ? {} : { modifiedById: query.modifiedById })
});

export const adminRevisionTimelineRouter = Router();

adminRevisionTimelineRouter.use(requireAuthenticatedActor(["EDITOR", "AUTHOR_ADMIN"]));

adminRevisionTimelineRouter.get("/entities/:entityType/:slug/timeline", async (request, response) => {
  const parsedParams = entityTimelineParamsSchema.safeParse(request.params);
  const parsedQuery = timelineFiltersSchema.safeParse(request.query);

  if (!parsedParams.success || !parsedQuery.success) {
    response.status(400).json({
      error: {
        params: parsedParams.success ? null : parsedParams.error.flatten(),
        query: parsedQuery.success ? null : parsedQuery.error.flatten()
      }
    });
    return;
  }

  const timeline = await revisionTimelineService.getEntityTimeline({
    entityType: parsedParams.data.entityType as EntityType,
    slug: parsedParams.data.slug,
    filters: buildFilterPayload(parsedQuery.data)
  });

  response.json({
    kind: "ENTITY",
    entityType: parsedParams.data.entityType,
    entitySlug: parsedParams.data.slug,
    filters: {
      from: parsedQuery.data.from ?? null,
      to: parsedQuery.data.to ?? null,
      appliedFromProposalId: parsedQuery.data.appliedFromProposalId ?? null,
      modifiedById: parsedQuery.data.modifiedById ?? null
    },
    revisions: timeline.map((revision) => ({
      revisionId: revision.revisionId,
      version: revision.version,
      createdAt: revision.createdAt.toISOString(),
      modifiedAt: revision.modifiedAt.toISOString(),
      modifiedBy: serializeActor(revision.modifiedBy),
      appliedFromProposalId: revision.appliedFromProposalId,
      appliedFromProposal: serializeProposal(revision.appliedFromProposal)
    }))
  });
});

adminRevisionTimelineRouter.get("/manuscripts/:manuscriptType/:slug/timeline", async (request, response) => {
  const parsedParams = manuscriptTimelineParamsSchema.safeParse(request.params);
  const parsedQuery = timelineFiltersSchema.safeParse(request.query);

  if (!parsedParams.success || !parsedQuery.success) {
    response.status(400).json({
      error: {
        params: parsedParams.success ? null : parsedParams.error.flatten(),
        query: parsedQuery.success ? null : parsedQuery.error.flatten()
      }
    });
    return;
  }

  const timeline = await revisionTimelineService.getManuscriptTimeline({
    manuscriptType: parsedParams.data.manuscriptType as ManuscriptType,
    slug: parsedParams.data.slug,
    filters: buildFilterPayload(parsedQuery.data)
  });

  response.json({
    kind: "MANUSCRIPT",
    manuscriptType: parsedParams.data.manuscriptType,
    manuscriptSlug: parsedParams.data.slug,
    filters: {
      from: parsedQuery.data.from ?? null,
      to: parsedQuery.data.to ?? null,
      appliedFromProposalId: parsedQuery.data.appliedFromProposalId ?? null,
      modifiedById: parsedQuery.data.modifiedById ?? null
    },
    revisions: timeline.map((revision) => ({
      manuscriptRevisionId: revision.manuscriptRevisionId,
      version: revision.version,
      createdAt: revision.createdAt.toISOString(),
      modifiedAt: revision.modifiedAt.toISOString(),
      modifiedBy: serializeActor(revision.modifiedBy),
      appliedFromProposalId: revision.appliedFromProposalId,
      appliedFromProposal: serializeProposal(revision.appliedFromProposal)
    }))
  });
});

adminRevisionTimelineRouter.get("/compare", async (request, response) => {
  const parsedQuery = compareQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: parsedQuery.error.flatten()
    });
    return;
  }

  try {
    const diff = await revisionTimelineService.compareRevisions(parsedQuery.data);

    response.json({
      source: "computed",
      diff
    });
  } catch (error) {
    if (error instanceof RevisionNotFoundError) {
      response.status(404).json({
        error: error.message
      });
      return;
    }

    if (error instanceof RevisionDiffTargetMismatchError) {
      response.status(400).json({
        error: error.message
      });
      return;
    }

    response.status(500).json({
      error: error instanceof Error ? error.message : "Unable to compare revisions"
    });
  }
});