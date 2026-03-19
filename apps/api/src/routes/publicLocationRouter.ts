import { Router } from "express";

import { publicReleaseQuerySchema } from "./publicReleaseQuerySchema.js";
import { publicLocationService } from "../services/publicLocationService.js";

export const publicLocationRouter = Router();

publicLocationRouter.get("/:slug", async (request, response) => {
  const parsedQuery = publicReleaseQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: parsedQuery.error.flatten()
    });
    return;
  }

  const location = await publicLocationService.getBySlug({
    slug: request.params.slug,
    ...(parsedQuery.data.releaseSlug === undefined ? {} : { releaseSlug: parsedQuery.data.releaseSlug })
  });

  if (!location) {
    response.status(404).json({
      error:
        parsedQuery.data.releaseSlug === undefined
          ? "Location not found in the active public release"
          : "Location not found in the selected public release"
    });
    return;
  }

  response.json(location);
});