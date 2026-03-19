import { Router } from "express";
import { type Prisma } from "@prisma/client";

import { entityMetadataContract } from "../lib/entityMetadataContract.js";
import { requireAuthenticatedActor } from "../middleware/requireAuthenticatedActor.js";
import { characterDraftService } from "../services/characterDraftService.js";

export const adminCharacterRouter = Router();

adminCharacterRouter.use(requireAuthenticatedActor(["EDITOR", "AUTHOR_ADMIN"]));

adminCharacterRouter.post("/drafts", async (request, response) => {
  const parsedBody = entityMetadataContract
    .buildCreateDraftSchema("CHARACTER")
    .safeParse(request.body);

  if (!parsedBody.success) {
    response.status(400).json({
      error: parsedBody.error.flatten()
    });
    return;
  }

  try {
    const characterDraft = await characterDraftService.saveDraft({
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

    response.status(201).json(characterDraft);
  } catch (error) {
    response.status(403).json({
      error: error instanceof Error ? error.message : "Unable to save character draft"
    });
  }
});