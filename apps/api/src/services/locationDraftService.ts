import { type Prisma, type Role, type Visibility } from "@prisma/client";

import { type SessionActor } from "../auth/sessionActor.js";
import { locationRepository } from "../repositories/locationRepository.js";

type SaveLocationDraftInput = {
  actor: SessionActor;
  slug: string;
  name: string;
  summary: string;
  visibility: Visibility;
  metadata?: Prisma.InputJsonValue;
  requiredDependencies?: Prisma.InputJsonValue;
};

const allowedDraftRoles: Role[] = ["EDITOR", "AUTHOR_ADMIN"];

export const locationDraftService = {
  async saveDraft(input: SaveLocationDraftInput) {
    if (!allowedDraftRoles.includes(input.actor.role)) {
      throw new Error("Draft writes require editor or author-admin role");
    }

    return locationRepository.saveDraft({
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