import { type EntityType, type Prisma, type Role, type Visibility } from "@prisma/client";

import { type SessionActor } from "../auth/sessionActor.js";
import { entityAdminRepository } from "../repositories/entityAdminRepository.js";

const allowedEntityReadRoles: Role[] = ["EDITOR", "AUTHOR_ADMIN"];
const supportedEntityTypes: EntityType[] = [
  "CHARACTER",
  "FACTION",
  "LOCATION",
  "EVENT",
  "ARTIFACT",
  "CREATURE",
  "BELIEF_SYSTEM",
  "POLITICAL_BODY",
  "LANGUAGE",
  "SECRET",
  "REVEAL",
  "TAG",
  "TIMELINE_ERA"
];

const assertReadRole = (role: Role): void => {
  if (!allowedEntityReadRoles.includes(role)) {
    throw new Error("Draft reads require editor or author-admin role");
  }
};

const assertSupportedEntityType = (entityType: EntityType): void => {
  if (!supportedEntityTypes.includes(entityType)) {
    throw new Error("Unsupported admin entity type");
  }
};

export const entityAdminService = {
  async listEntities(input: { actor: SessionActor; entityTypes?: EntityType[] }) {
    assertReadRole(input.actor.role);

    const entityTypes = input.entityTypes ?? supportedEntityTypes;

    entityTypes.forEach(assertSupportedEntityType);

    return entityAdminRepository.listEntities({
      entityTypes
    });
  },

  async getBySlug(input: { actor: SessionActor; entityType: EntityType; slug: string }) {
    assertReadRole(input.actor.role);
    assertSupportedEntityType(input.entityType);

    return entityAdminRepository.findEntityBySlug({
      entityType: input.entityType,
      slug: input.slug
    });
  },

  async getHistory(input: { actor: SessionActor; entityType: EntityType; slug: string }) {
    assertReadRole(input.actor.role);
    assertSupportedEntityType(input.entityType);

    return entityAdminRepository.getEntityHistory({
      entityType: input.entityType,
      slug: input.slug
    });
  },

  async saveDraft(input: {
    actor: SessionActor;
    entityType: EntityType;
    slug: string;
    name: string;
    summary: string;
    visibility: Visibility;
    metadata?: Prisma.InputJsonValue;
    requiredDependencies?: Prisma.InputJsonValue;
  }) {
    if (!allowedEntityReadRoles.includes(input.actor.role)) {
      throw new Error("Draft writes require editor or author-admin role");
    }

    assertSupportedEntityType(input.entityType);

    return entityAdminRepository.saveDraft({
      entityType: input.entityType,
      actorId: input.actor.userId,
      actorRole: input.actor.role,
      slug: input.slug,
      name: input.name,
      summary: input.summary,
      visibility: input.visibility,
      ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
      ...(input.requiredDependencies === undefined ? {} : { requiredDependencies: input.requiredDependencies })
    });
  },

  async updateDraft(input: {
    actor: SessionActor;
    entityType: EntityType;
    slug: string;
    name: string;
    summary: string;
    visibility: Visibility;
    metadata?: Prisma.InputJsonValue;
    requiredDependencies?: Prisma.InputJsonValue;
  }) {
    if (!allowedEntityReadRoles.includes(input.actor.role)) {
      throw new Error("Draft writes require editor or author-admin role");
    }

    assertSupportedEntityType(input.entityType);

    const existing = await entityAdminRepository.findEntityBySlug({
      entityType: input.entityType,
      slug: input.slug
    });

    if (!existing) {
      return null;
    }

    return entityAdminRepository.saveDraft({
      entityType: input.entityType,
      actorId: input.actor.userId,
      actorRole: input.actor.role,
      slug: input.slug,
      name: input.name,
      summary: input.summary,
      visibility: input.visibility,
      ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
      ...(input.requiredDependencies === undefined ? {} : { requiredDependencies: input.requiredDependencies })
    });
  },

  async retireEntity(input: { actor: SessionActor; entityType: EntityType; slug: string }) {
    if (!allowedEntityReadRoles.includes(input.actor.role)) {
      throw new Error("Draft mutations require editor or author-admin role");
    }

    assertSupportedEntityType(input.entityType);

    return entityAdminRepository.retireEntity({
      entityType: input.entityType,
      slug: input.slug
    });
  }
};