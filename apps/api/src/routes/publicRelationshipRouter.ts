import { Router } from "express";

import { publicRelationshipService } from "../services/publicRelationshipService.js";

export const publicRelationshipRouter = Router();

publicRelationshipRouter.get("/:sourceEntitySlug/:relationType/:targetEntitySlug", async (request, response) => {
  const relationship = await publicRelationshipService.getByKey({
    sourceEntitySlug: request.params.sourceEntitySlug,
    relationType: request.params.relationType,
    targetEntitySlug: request.params.targetEntitySlug
  });

  if (!relationship) {
    response.status(404).json({
      error: "Relationship not found in the active public release"
    });
    return;
  }

  response.json(relationship);
});