import { type Prisma, type Role, type Visibility } from "@prisma/client";

import { type SessionActor } from "../auth/sessionActor.js";
import { eventRepository } from "../repositories/eventRepository.js";

type SaveEventDraftInput = {
  actor: SessionActor;
  slug: string;
  name: string;
  summary: string;
  visibility: Visibility;
  metadata?: Prisma.InputJsonValue;
  requiredDependencies?: Prisma.InputJsonValue;
};

const allowedDraftRoles: Role[] = ["EDITOR", "AUTHOR_ADMIN"];

export const eventDraftService = {
  async saveDraft(input: SaveEventDraftInput) {
    if (!allowedDraftRoles.includes(input.actor.role)) {
      throw new Error("Draft writes require editor or author-admin role");
    }

    return eventRepository.saveDraft({
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