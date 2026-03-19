import type { Prisma, EntityType, Role, Visibility } from "@prisma/client";

import { entityMetadataContract } from "../lib/entityMetadataContract.js";
import { entityRevisionRepository } from "./entityRevisionRepository.js";

type EntityMetadataRecord = ReturnType<(typeof entityMetadataContract)["readMetadata"]>;

export type FactionDraftInput = {
  actorId: string;
  actorRole: Role;
  slug: string;
  name: string;
  summary: string;
  visibility: Visibility;
  metadata?: Prisma.InputJsonValue;
  requiredDependencies?: Prisma.InputJsonValue;
};

export type FactionDraftRecord = {
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

type ReleaseFactionRecord = {
  releaseSlug: string;
  factionSlug: string;
  name: string;
  summary: string;
  visibility: Visibility;
  metadata: EntityMetadataRecord;
  version: number;
};

const factionEntityType: EntityType = "FACTION";

export const factionRepository = {
  async saveDraft(input: FactionDraftInput): Promise<FactionDraftRecord> {
    const existingDraft = await entityRevisionRepository.findLatestBySlug({
      entityType: factionEntityType,
      slug: input.slug
    });

    const draft = await entityRevisionRepository.saveDraft({
      entityType: factionEntityType,
      actorId: input.actorId,
      actorRole: input.actorRole,
      slug: input.slug,
      name: input.name,
      summary: input.summary,
      visibility: input.visibility,
      payload: entityMetadataContract.buildPayload({
        entityType: factionEntityType,
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

  async findPublicFactionBySlug(input: { slug: string; releaseSlug?: string }): Promise<ReleaseFactionRecord | null> {
    const entity = await entityRevisionRepository.findPublicBySlug({
      entityType: factionEntityType,
      slug: input.slug,
      ...(input.releaseSlug === undefined ? {} : { releaseSlug: input.releaseSlug })
    });

    if (!entity) {
      return null;
    }

    return {
      releaseSlug: entity.releaseSlug,
      factionSlug: entity.slug,
      name: entity.name,
      summary: entity.summary,
      visibility: entity.visibility,
      metadata: entity.metadata,
      version: entity.version
    };
  }
};