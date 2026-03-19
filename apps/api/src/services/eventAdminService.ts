import { type Role } from "@prisma/client";

import { type SessionActor } from "../auth/sessionActor.js";
import { eventRepository } from "../repositories/eventRepository.js";

const allowedReadRoles: Role[] = ["EDITOR", "AUTHOR_ADMIN"];

const assertReadRole = (role: Role): void => {
  if (!allowedReadRoles.includes(role)) {
    throw new Error("Draft reads require editor or author-admin role");
  }
};

export const eventAdminService = {
  async getBySlug(input: { actor: SessionActor; slug: string }) {
    assertReadRole(input.actor.role);
    return eventRepository.findLatestDraftBySlug(input.slug);
  },

  async getHistory(input: { actor: SessionActor; slug: string }) {
    assertReadRole(input.actor.role);
    return eventRepository.listDraftHistoryBySlug(input.slug);
  }
};