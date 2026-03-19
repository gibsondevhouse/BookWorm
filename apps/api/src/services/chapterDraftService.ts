import { type Prisma, type Role, type Visibility } from "@prisma/client";

import { type SessionActor } from "../auth/sessionActor.js";
import { manuscriptRevisionRepository } from "../repositories/manuscriptRevisionRepository.js";

type SaveChapterDraftInput = {
  actor: SessionActor;
  slug: string;
  title: string;
  summary: string;
  visibility: Visibility;
  payload?: Record<string, unknown>;
};

const allowedDraftRoles: Role[] = ["EDITOR", "AUTHOR_ADMIN"];

export const chapterDraftService = {
  async saveDraft(input: SaveChapterDraftInput) {
    if (!allowedDraftRoles.includes(input.actor.role)) {
      throw new Error("Draft writes require editor or author-admin role");
    }

    return manuscriptRevisionRepository.saveRevision({
      manuscriptType: "CHAPTER",
      actorId: input.actor.userId,
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      visibility: input.visibility,
      ...(input.payload === undefined ? {} : { payload: input.payload as Prisma.InputJsonValue })
    });
  }
};