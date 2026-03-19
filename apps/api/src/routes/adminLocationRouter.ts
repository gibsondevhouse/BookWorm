import { Router } from "express";
import { type Prisma } from "@prisma/client";

import { entityMetadataContract } from "../lib/entityMetadataContract.js";
import { requireAuthenticatedActor } from "../middleware/requireAuthenticatedActor.js";
import { locationAdminService } from "../services/locationAdminService.js";
import { locationDraftService } from "../services/locationDraftService.js";

export const adminLocationRouter = Router();

adminLocationRouter.use(requireAuthenticatedActor(["EDITOR", "AUTHOR_ADMIN"]));

adminLocationRouter.get("/:slug/history", async (request, response) => {
  const history = await locationAdminService.getHistory({
    actor: response.locals.actor,
    slug: request.params.slug
  });

  if (history.length === 0) {
    response.status(404).json({
      error: "Location draft not found"
    });
    return;
  }

  response.json({
    locationSlug: request.params.slug,
    revisions: history.map((revision) => ({
      revisionId: revision.revisionId,
      version: revision.version,
      name: revision.name,
      summary: revision.summary,
      visibility: revision.visibility,
      metadata: revision.metadata,
      payload: revision.payload,
      createdAt: revision.createdAt.toISOString(),
      createdBy: revision.createdBy
    }))
  });
});

adminLocationRouter.get("/:slug", async (request, response) => {
  const location = await locationAdminService.getBySlug({
    actor: response.locals.actor,
    slug: request.params.slug
  });

  if (!location) {
    response.status(404).json({
      error: "Location draft not found"
    });
    return;
  }

  response.json({
    locationSlug: location.entitySlug,
    entityType: location.entityType,
    revisionId: location.revisionId,
    version: location.version,
    name: location.name,
    summary: location.summary,
    visibility: location.visibility,
    metadata: location.metadata,
    payload: location.payload,
    createdAt: location.createdAt.toISOString(),
    createdBy: location.createdBy
  });
});

adminLocationRouter.post("/drafts", async (request, response) => {
  const parsedBody = entityMetadataContract
    .buildCreateDraftSchema("LOCATION")
    .safeParse(request.body);

  if (!parsedBody.success) {
    response.status(400).json({
      error: parsedBody.error.flatten()
    });
    return;
  }

  try {
    const locationDraft = await locationDraftService.saveDraft({
      actor: response.locals.actor,
      slug: parsedBody.data.slug,
      name: parsedBody.data.name,
      summary: parsedBody.data.summary,
      visibility: parsedBody.data.visibility,
      ...(parsedBody.data.metadata === undefined ? {} : { metadata: parsedBody.data.metadata as Prisma.InputJsonValue }),
      ...(parsedBody.data.requiredDependencies === undefined
        ? {}
        : { requiredDependencies: parsedBody.data.requiredDependencies })
    });

    response.status(201).json(locationDraft);
  } catch (error) {
    response.status(403).json({
      error: error instanceof Error ? error.message : "Unable to save location draft"
    });
  }
});