import { type Prisma, type Role, type Visibility } from "@prisma/client";

import { type SessionActor } from "../auth/sessionActor.js";
import { characterRepository } from "../repositories/characterRepository.js";

type SaveCharacterDraftInput = {
  actor: SessionActor;
  slug: string;
  name: string;
  summary: string;
  visibility: Visibility;
  metadata?: Prisma.InputJsonValue;
  requiredDependencies?: Prisma.InputJsonValue;
};

const allowedDraftRoles: Role[] = ["EDITOR", "AUTHOR_ADMIN"];

export const characterDraftService = {
  async saveDraft(input: SaveCharacterDraftInput) {
    if (!allowedDraftRoles.includes(input.actor.role)) {
      throw new Error("Draft writes require editor or author-admin role");
    }

    return characterRepository.saveDraft({
      actorId: input.actor.userId,
      actorRole: input.actor.role,
      slug: input.slug,
      name: input.name,
      summary: input.summary,
      visibility: input.visibility,
      ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
      ...(input.requiredDependencies === undefined ? {} : { requiredDependencies: input.requiredDependencies })
    });
  }
};