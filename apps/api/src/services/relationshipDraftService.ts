import { type Prisma, type RelationshipRevisionState, type Role, type Visibility } from "@prisma/client";

import { type SessionActor } from "../auth/sessionActor.js";
import { relationshipRepository } from "../repositories/relationshipRepository.js";

type SaveRelationshipDraftInput = {
  actor: SessionActor;
  sourceEntitySlug: string;
  targetEntitySlug: string;
  relationType: string;
  visibility: Visibility;
  state: RelationshipRevisionState;
  metadata?: Prisma.InputJsonValue;
};

const allowedDraftRoles: Role[] = ["EDITOR", "AUTHOR_ADMIN"];

export const relationshipDraftService = {
  async saveRevision(input: SaveRelationshipDraftInput) {
    if (!allowedDraftRoles.includes(input.actor.role)) {
      throw new Error("Draft writes require editor or author-admin role");
    }

    return relationshipRepository.saveRevision({
      actorId: input.actor.userId,
      sourceEntitySlug: input.sourceEntitySlug,
      targetEntitySlug: input.targetEntitySlug,
      relationType: input.relationType,
      visibility: input.visibility,
      state: input.state,
      ...(input.metadata === undefined ? {} : { metadata: input.metadata })
    });
  }
};
