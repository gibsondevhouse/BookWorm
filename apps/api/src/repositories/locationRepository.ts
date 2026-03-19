import type { EntityType, Prisma, Role, Visibility } from "@prisma/client";

import { entityMetadataContract } from "../lib/entityMetadataContract.js";
import { entityRevisionRepository } from "./entityRevisionRepository.js";

type EntityMetadataRecord = ReturnType<(typeof entityMetadataContract)["readMetadata"]>;

export type LocationDraftInput = {
  actorId: string;
  actorRole: Role;
  slug: string;
  name: string;
  summary: string;
  visibility: Visibility;
  metadata?: Prisma.InputJsonValue;
  requiredDependencies?: Prisma.InputJsonValue;
};

export type LocationDraftRecord = {
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

type ReleaseLocationRecord = {
  releaseSlug: string;
  locationSlug: string;
  name: string;
  summary: string;
  visibility: Visibility;
  metadata: EntityMetadataRecord;
  version: number;
};

const locationEntityType: EntityType = "LOCATION";

export const locationRepository = {
  async saveDraft(input: LocationDraftInput): Promise<LocationDraftRecord> {
    const existingDraft = await entityRevisionRepository.findLatestBySlug({
      entityType: locationEntityType,
      slug: input.slug
    });

    const draft = await entityRevisionRepository.saveDraft({
      entityType: locationEntityType,
      actorId: input.actorId,
      actorRole: input.actorRole,
      slug: input.slug,
      name: input.name,
      summary: input.summary,
      visibility: input.visibility,
      payload: entityMetadataContract.buildPayload({
        entityType: locationEntityType,
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
      entityType: locationEntityType,
      slug
    });
  },

  async listDraftHistoryBySlug(slug: string) {
    return entityRevisionRepository.listHistoryBySlug({
      entityType: locationEntityType,
      slug
    });
  },

  async findPublicLocationBySlug(input: { slug: string; releaseSlug?: string }): Promise<ReleaseLocationRecord | null> {
    const entity = await entityRevisionRepository.findPublicBySlug({
      entityType: locationEntityType,
      slug: input.slug,
      ...(input.releaseSlug === undefined ? {} : { releaseSlug: input.releaseSlug })
    });

    if (!entity) {
      return null;
    }

    return {
      releaseSlug: entity.releaseSlug,
      locationSlug: entity.slug,
      name: entity.name,
      summary: entity.summary,
      visibility: entity.visibility,
      metadata: entity.metadata,
      version: entity.version
    };
  }
};