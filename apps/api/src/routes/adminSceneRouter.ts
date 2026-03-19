import { Router } from "express";
import { z } from "zod";

import { requireAuthenticatedActor } from "../middleware/requireAuthenticatedActor.js";
import { sceneAdminService } from "../services/sceneAdminService.js";
import { sceneDraftService } from "../services/sceneDraftService.js";

const saveSceneDraftSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  visibility: z.enum(["PUBLIC", "RESTRICTED", "PRIVATE"]).default("PRIVATE"),
  payload: z.record(z.string(), z.unknown()).optional()
});

export const adminSceneRouter = Router();

adminSceneRouter.use(requireAuthenticatedActor(["EDITOR", "AUTHOR_ADMIN"]));

adminSceneRouter.get("/:slug/history", async (request, response) => {
  const history = await sceneAdminService.getHistory({
    actor: response.locals.actor,
    slug: request.params.slug
  });

  if (history.length === 0) {
    response.status(404).json({
      error: "Scene draft not found"
    });
    return;
  }

  response.json({
    sceneSlug: request.params.slug,
    revisions: history.map((revision) => ({
      manuscriptRevisionId: revision.manuscriptRevisionId,
      version: revision.version,
      title: revision.title,
      summary: revision.summary,
      visibility: revision.visibility,
      payload: revision.payload,
      createdAt: revision.createdAt.toISOString(),
      createdBy: revision.createdBy
    }))
  });
});

adminSceneRouter.get("/:slug", async (request, response) => {
  const scene = await sceneAdminService.getBySlug({
    actor: response.locals.actor,
    slug: request.params.slug
  });

  if (!scene) {
    response.status(404).json({
      error: "Scene draft not found"
    });
    return;
  }

  response.json({
    sceneSlug: scene.manuscriptSlug,
    manuscriptType: scene.manuscriptType,
    manuscriptRevisionId: scene.manuscriptRevisionId,
    version: scene.version,
    title: scene.title,
    summary: scene.summary,
    visibility: scene.visibility,
    payload: scene.payload,
    createdAt: scene.createdAt.toISOString(),
    createdBy: scene.createdBy
  });
});

adminSceneRouter.post("/drafts", async (request, response) => {
  const parsedBody = saveSceneDraftSchema.safeParse(request.body);

  if (!parsedBody.success) {
    response.status(400).json({
      error: parsedBody.error.flatten()
    });
    return;
  }

  try {
    const sceneDraft = await sceneDraftService.saveDraft({
      actor: response.locals.actor,
      slug: parsedBody.data.slug,
      title: parsedBody.data.title,
      summary: parsedBody.data.summary,
      visibility: parsedBody.data.visibility,
      ...(parsedBody.data.payload === undefined ? {} : { payload: parsedBody.data.payload })
    });

    response.status(201).json(sceneDraft);
  } catch (error) {
    response.status(403).json({
      error: error instanceof Error ? error.message : "Unable to save scene draft"
    });
  }
});