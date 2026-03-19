import type { EntityType, Prisma, Role, Visibility } from "@prisma/client";

import { entityMetadataContract } from "../lib/entityMetadataContract.js";
import { entityRevisionRepository } from "./entityRevisionRepository.js";

type EntityMetadataRecord = ReturnType<(typeof entityMetadataContract)["readMetadata"]>;

export type EventDraftInput = {
  actorId: string;
  actorRole: Role;
  slug: string;
  name: string;
  summary: string;
  visibility: Visibility;
  metadata?: Prisma.InputJsonValue;
  requiredDependencies?: Prisma.InputJsonValue;
};

export type EventDraftRecord = {
  entityId: string;
  revisionId: string;
  version: number;
  slug: string;
  name: string;
  summary: string;
  visibility: Visibility;
  metadata: EntityMetadataRecord;
  actorRole: Role;
};

type ReleaseEventRecord = {
  releaseSlug: string;
  eventSlug: string;
  name: string;
  summary: string;
  visibility: Visibility;
  metadata: EntityMetadataRecord;
  version: number;
};

const eventEntityType: EntityType = "EVENT";

export const eventRepository = {
  async saveDraft(input: EventDraftInput): Promise<EventDraftRecord> {
    const existingDraft = await entityRevisionRepository.findLatestBySlug({
      entityType: eventEntityType,
      slug: input.slug
    });

    const draft = await entityRevisionRepository.saveDraft({
      entityType: eventEntityType,
      actorId: input.actorId,
      actorRole: input.actorRole,
      slug: input.slug,
      name: input.name,
      summary: input.summary,
      visibility: input.visibility,
      payload: entityMetadataContract.buildPayload({
        entityType: eventEntityType,
        name: input.name,
        summary: input.summary,
        visibility: input.visibility,
        ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
        ...(input.requiredDependencies === undefined ? {} : { requiredDependencies: input.requiredDependencies }),
        previousPayload: existingDraft?.payload ?? null
      })
    });

    return {
      entityId: draft.entityId,
      revisionId: draft.revisionId,
      version: draft.version,
      slug: draft.slug,
      name: draft.name,
      summary: draft.summary,
      visibility: draft.visibility,
      metadata: draft.metadata,
      actorRole: draft.actorRole
    };
  },

  async findLatestDraftBySlug(slug: string) {
    return entityRevisionRepository.findLatestBySlug({
      entityType: eventEntityType,
      slug
    });
  },

  async listDraftHistoryBySlug(slug: string) {
    return entityRevisionRepository.listHistoryBySlug({
      entityType: eventEntityType,
      slug
    });
  },

  async findPublicEventBySlug(input: { slug: string; releaseSlug?: string }): Promise<ReleaseEventRecord | null> {
    const entity = await entityRevisionRepository.findPublicBySlug({
      entityType: eventEntityType,
      slug: input.slug,
      ...(input.releaseSlug === undefined ? {} : { releaseSlug: input.releaseSlug })
    });

    if (!entity) {
      return null;
    }

    return {
      releaseSlug: entity.releaseSlug,
      eventSlug: entity.slug,
      name: entity.name,
      summary: entity.summary,
      visibility: entity.visibility,
      metadata: entity.metadata,
      version: entity.version
    };
  }
};