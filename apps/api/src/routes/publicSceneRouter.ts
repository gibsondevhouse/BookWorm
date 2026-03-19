import { Router } from "express";
import { z } from "zod";

import { publicSceneService } from "../services/publicSceneService.js";

const publicSceneQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(20)
});

export const publicSceneRouter = Router();

publicSceneRouter.get("/", async (request, response) => {
  const parsedQuery = publicSceneQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: parsedQuery.error.flatten()
    });
    return;
  }

  response.json(await publicSceneService.list(parsedQuery.data.limit));
});

publicSceneRouter.get("/:slug", async (request, response) => {
  const scene = await publicSceneService.getBySlug(request.params.slug);

  if (!scene) {
    response.status(404).json({
      error: "Scene not found in the active public release"
    });
    return;
  }

  response.json(scene);
});