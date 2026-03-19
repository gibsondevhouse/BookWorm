import { Router } from "express";
import { type Prisma } from "@prisma/client";
import { z } from "zod";

import { requireAuthenticatedActor } from "../middleware/requireAuthenticatedActor.js";
import { relationshipAdminService } from "../services/relationshipAdminService.js";
import { relationshipDraftService } from "../services/relationshipDraftService.js";

const saveRelationshipRevisionSchema = z.object({
  sourceEntitySlug: z.string().min(1),
  targetEntitySlug: z.string().min(1),
  relationType: z.string().min(1),
  visibility: z.enum(["PUBLIC", "RESTRICTED", "PRIVATE"]).default("PRIVATE"),
  state: z.enum(["CREATE", "UPDATE", "DELETE"]),
  metadata: z.record(z.unknown()).optional()
});

export const adminRelationshipRouter = Router();

adminRelationshipRouter.use(requireAuthenticatedActor(["EDITOR", "AUTHOR_ADMIN"]));

adminRelationshipRouter.get("/:sourceSlug/:relationType/:targetSlug/history", async (request, response) => {
  const history = await relationshipAdminService.getHistory({
    actor: response.locals.actor,
    sourceEntitySlug: request.params.sourceSlug,
    targetEntitySlug: request.params.targetSlug,
    relationType: request.params.relationType
  });

  if (history.length === 0) {
    response.status(404).json({
      error: "Relationship revisions not found"
    });
    return;
  }

  response.json({
    sourceEntitySlug: request.params.sourceSlug,
    targetEntitySlug: request.params.targetSlug,
    relationType: request.params.relationType,
    revisions: history.map((revision) => ({
      revisionId: revision.relationshipRevisionId,
      version: revision.version,
      state: revision.state,
      visibility: revision.visibility,
      metadata: revision.metadata,
      createdAt: revision.createdAt.toISOString(),
      createdBy: revision.createdBy
    }))
  });
});

adminRelationshipRouter.get("/:sourceSlug/:relationType/:targetSlug", async (request, response) => {
  const revision = await relationshipAdminService.getLatestByKey({
    actor: response.locals.actor,
    sourceEntitySlug: request.params.sourceSlug,
    targetEntitySlug: request.params.targetSlug,
    relationType: request.params.relationType
  });

  if (!revision) {
    response.status(404).json({
      error: "Relationship not found"
    });
    return;
  }

  response.json({
    relationshipId: revision.relationshipId,
    sourceEntitySlug: revision.sourceEntitySlug,
    targetEntitySlug: revision.targetEntitySlug,
    relationType: revision.relationType,
    latestRevision: {
      revisionId: revision.relationshipRevisionId,
      version: revision.version,
      state: revision.state,
      visibility: revision.visibility,
      metadata: revision.metadata,
      createdAt: revision.createdAt.toISOString(),
      createdBy: revision.createdBy
    }
  });
});

adminRelationshipRouter.post("/revisions", async (request, response) => {
  const parsedBody = saveRelationshipRevisionSchema.safeParse(request.body);

  if (!parsedBody.success) {
    response.status(400).json({
      error: parsedBody.error.flatten()
    });
    return;
  }

  try {
    const revision = await relationshipDraftService.saveRevision({
      actor: response.locals.actor,
      sourceEntitySlug: parsedBody.data.sourceEntitySlug,
      targetEntitySlug: parsedBody.data.targetEntitySlug,
      relationType: parsedBody.data.relationType,
      visibility: parsedBody.data.visibility,
      state: parsedBody.data.state,
      ...(parsedBody.data.metadata === undefined ? {} : { metadata: parsedBody.data.metadata as Prisma.InputJsonValue })
    });

    response.status(201).json(revision);
  } catch (error) {
    response.status(403).json({
      error: error instanceof Error ? error.message : "Unable to save relationship revision"
    });
  }
});
