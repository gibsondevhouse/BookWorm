import { Router } from "express";

import { publicReleaseQuerySchema } from "./publicReleaseQuerySchema.js";
import { publicEventService } from "../services/publicEventService.js";

export const publicEventRouter = Router();

publicEventRouter.get("/:slug", async (request, response) => {
  const parsedQuery = publicReleaseQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: parsedQuery.error.flatten()
    });
    return;
  }

  const event = await publicEventService.getBySlug({
    slug: request.params.slug,
    ...(parsedQuery.data.releaseSlug === undefined ? {} : { releaseSlug: parsedQuery.data.releaseSlug })
  });

  if (!event) {
    response.status(404).json({
      error:
        parsedQuery.data.releaseSlug === undefined
          ? "Event not found in the active public release"
          : "Event not found in the selected public release"
    });
    return;
  }

  response.json(event);
});