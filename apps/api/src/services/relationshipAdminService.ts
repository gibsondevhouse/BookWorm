import { type Role } from "@prisma/client";

import { type SessionActor } from "../auth/sessionActor.js";
import { relationshipRepository } from "../repositories/relationshipRepository.js";

const allowedReadRoles: Role[] = ["EDITOR", "AUTHOR_ADMIN"];

const assertReadRole = (role: Role): void => {
  if (!allowedReadRoles.includes(role)) {
    throw new Error("Draft reads require editor or author-admin role");
  }
};

export const relationshipAdminService = {
  async getLatestByKey(input: {
    actor: SessionActor;
    sourceEntitySlug: string;
    targetEntitySlug: string;
    relationType: string;
  }) {
    assertReadRole(input.actor.role);
    return relationshipRepository.findLatestRevisionByKey({
      sourceEntitySlug: input.sourceEntitySlug,
      targetEntitySlug: input.targetEntitySlug,
      relationType: input.relationType
    });
  },

  async getHistory(input: {
    actor: SessionActor;
    sourceEntitySlug: string;
    targetEntitySlug: string;
    relationType: string;
  }) {
    assertReadRole(input.actor.role);
    return relationshipRepository.listRevisionHistoryByKey({
      sourceEntitySlug: input.sourceEntitySlug,
      targetEntitySlug: input.targetEntitySlug,
      relationType: input.relationType
    });
  }
};
