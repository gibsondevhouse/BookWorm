import { Router } from "express";

import { publicReleaseQuerySchema } from "./publicReleaseQuerySchema.js";
import { publicCharacterService } from "../services/publicCharacterService.js";

export const publicCharacterRouter = Router();

publicCharacterRouter.get("/:slug", async (request, response) => {
  const parsedQuery = publicReleaseQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: parsedQuery.error.flatten()
    });
    return;
  }

  const character = await publicCharacterService.getBySlug({
    slug: request.params.slug,
    ...(parsedQuery.data.releaseSlug === undefined ? {} : { releaseSlug: parsedQuery.data.releaseSlug })
  });

  if (!character) {
    response.status(404).json({
      error:
        parsedQuery.data.releaseSlug === undefined
          ? "Character not found in the active public release"
          : "Character not found in the selected public release"
    });
    return;
  }

  response.json(character);
});