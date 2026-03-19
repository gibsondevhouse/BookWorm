import { Router } from "express";
import { z } from "zod";

import { publicChapterService } from "../services/publicChapterService.js";

const publicChapterQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(20)
});

export const publicChapterRouter = Router();

publicChapterRouter.get("/", async (request, response) => {
  const parsedQuery = publicChapterQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: parsedQuery.error.flatten()
    });
    return;
  }

  response.json(await publicChapterService.list(parsedQuery.data.limit));
});

publicChapterRouter.get("/:slug", async (request, response) => {
  const chapter = await publicChapterService.getBySlug(request.params.slug);

  if (!chapter) {
    response.status(404).json({
      error: "Chapter not found in the active public release"
    });
    return;
  }

  response.json(chapter);
});