import { Router } from "express";

import { publicReleaseQuerySchema } from "./publicReleaseQuerySchema.js";
import { publicFactionService } from "../services/publicFactionService.js";

export const publicFactionRouter = Router();

publicFactionRouter.get("/:slug", async (request, response) => {
  const parsedQuery = publicReleaseQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: parsedQuery.error.flatten()
    });
    return;
  }

  const faction = await publicFactionService.getBySlug({
    slug: request.params.slug,
    ...(parsedQuery.data.releaseSlug === undefined ? {} : { releaseSlug: parsedQuery.data.releaseSlug })
  });

  if (!faction) {
    response.status(404).json({
      error:
        parsedQuery.data.releaseSlug === undefined
          ? "Faction not found in the active public release"
          : "Faction not found in the selected public release"
    });
    return;
  }

  response.json(faction);
});