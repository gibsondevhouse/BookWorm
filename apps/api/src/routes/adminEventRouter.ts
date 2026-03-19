import { Router } from "express";
import { type Prisma } from "@prisma/client";

import { entityMetadataContract } from "../lib/entityMetadataContract.js";
import { requireAuthenticatedActor } from "../middleware/requireAuthenticatedActor.js";
import { eventAdminService } from "../services/eventAdminService.js";
import { eventDraftService } from "../services/eventDraftService.js";

export const adminEventRouter = Router();

adminEventRouter.use(requireAuthenticatedActor(["EDITOR", "AUTHOR_ADMIN"]));

adminEventRouter.get("/:slug/history", async (request, response) => {
  const history = await eventAdminService.getHistory({
    actor: response.locals.actor,
    slug: request.params.slug
  });

  if (history.length === 0) {
    response.status(404).json({
      error: "Event draft not found"
    });
    return;
  }

  response.json({
    eventSlug: request.params.slug,
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

adminEventRouter.get("/:slug", async (request, response) => {
  const event = await eventAdminService.getBySlug({
    actor: response.locals.actor,
    slug: request.params.slug
  });

  if (!event) {
    response.status(404).json({
      error: "Event draft not found"
    });
    return;
  }

  response.json({
    eventSlug: event.entitySlug,
    entityType: event.entityType,
    revisionId: event.revisionId,
    version: event.version,
    name: event.name,
    summary: event.summary,
    visibility: event.visibility,
    metadata: event.metadata,
    payload: event.payload,
    createdAt: event.createdAt.toISOString(),
    createdBy: event.createdBy
  });
});

adminEventRouter.post("/drafts", async (request, response) => {
  const parsedBody = entityMetadataContract
    .buildCreateDraftSchema("EVENT")
    .safeParse(request.body);

  if (!parsedBody.success) {
    response.status(400).json({
      error: parsedBody.error.flatten()
    });
    return;
  }

  try {
    const eventDraft = await eventDraftService.saveDraft({
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

    response.status(201).json(eventDraft);
  } catch (error) {
    response.status(403).json({
      error: error instanceof Error ? error.message : "Unable to save event draft"
    });
  }
});