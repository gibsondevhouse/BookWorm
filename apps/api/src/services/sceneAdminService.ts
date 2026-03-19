import { type Role } from "@prisma/client";

import { type SessionActor } from "../auth/sessionActor.js";
import { manuscriptRevisionRepository } from "../repositories/manuscriptRevisionRepository.js";

const allowedReadRoles: Role[] = ["EDITOR", "AUTHOR_ADMIN"];

const assertReadRole = (role: Role): void => {
  if (!allowedReadRoles.includes(role)) {
    throw new Error("Draft reads require editor or author-admin role");
  }
};

export const sceneAdminService = {
  async getBySlug(input: { actor: SessionActor; slug: string }) {
    assertReadRole(input.actor.role);
    return manuscriptRevisionRepository.findLatestBySlug({
      manuscriptType: "SCENE",
      slug: input.slug
    });
  },

  async getHistory(input: { actor: SessionActor; slug: string }) {
    assertReadRole(input.actor.role);
    return manuscriptRevisionRepository.listHistoryBySlug({
      manuscriptType: "SCENE",
      slug: input.slug
    });
  }
};