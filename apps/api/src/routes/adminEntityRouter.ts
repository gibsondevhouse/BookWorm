import { type EntityType, type Prisma, type Role, type Visibility } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { entityMetadataContract } from "../lib/entityMetadataContract.js";
import { requireAuthenticatedActor } from "../middleware/requireAuthenticatedActor.js";
import { entityAdminService } from "../services/entityAdminService.js";

const adminEntityTypeValues = [
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
] as const;

const entityTypeSchema = z.enum(adminEntityTypeValues);

const listEntitiesQuerySchema = z.object({
  type: z.preprocess(
    (value) => {
      if (value === undefined) {
        return undefined;
      }

      return Array.isArray(value) ? value : [value];
    },
    z.array(entityTypeSchema).optional()
  )
});

const entityTypeOnlyParamsSchema = z.object({
  entityType: entityTypeSchema
});

const entityParamsSchema = z.object({
  entityType: entityTypeSchema,
  slug: z.string().min(1)
});

const serializeCreatedBy = (createdBy: {
  userId: string;
  email: string;
  displayName: string;
  role: Role;
}) => ({
  userId: createdBy.userId,
  email: createdBy.email,
  displayName: createdBy.displayName,
  role: createdBy.role
});

const serializeReleaseRecord = (releaseRecord: {
  releaseSlug: string;
  releaseName: string;
  releaseStatus: string;
  activatedAt: Date | null;
  revisionId: string;
  version: number;
  name: string;
  summary: string;
  visibility: Visibility;
  metadata: ReturnType<(typeof entityMetadataContract)["readMetadata"]>;
} | null) => {
  if (!releaseRecord) {
    return null;
  }

  return {
    releaseSlug: releaseRecord.releaseSlug,
    releaseName: releaseRecord.releaseName,
    releaseStatus: releaseRecord.releaseStatus,
    activatedAt: releaseRecord.activatedAt?.toISOString() ?? null,
    revisionId: releaseRecord.revisionId,
    version: releaseRecord.version,
    name: releaseRecord.name,
    summary: releaseRecord.summary,
    visibility: releaseRecord.visibility,
    metadata: releaseRecord.metadata
  };
};

const serializeReleaseSummary = (releaseSummary: {
  activeRelease: Parameters<typeof serializeReleaseRecord>[0];
  latestRelease: Parameters<typeof serializeReleaseRecord>[0];
  includedInReleaseCount: number;
  draftMatchesActiveRelease: boolean;
}) => ({
  activeRelease: serializeReleaseRecord(releaseSummary.activeRelease),
  latestRelease: serializeReleaseRecord(releaseSummary.latestRelease),
  includedInReleaseCount: releaseSummary.includedInReleaseCount,
  draftMatchesActiveRelease: releaseSummary.draftMatchesActiveRelease
});

export const adminEntityRouter = Router();

adminEntityRouter.use(requireAuthenticatedActor(["EDITOR", "AUTHOR_ADMIN"]));

adminEntityRouter.get("/", async (request, response) => {
  const parsedQuery = listEntitiesQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: parsedQuery.error.flatten()
    });
    return;
  }

  const entities = await entityAdminService.listEntities({
    actor: response.locals.actor,
    ...(parsedQuery.data.type === undefined ? {} : { entityTypes: parsedQuery.data.type })
  });

  response.json({
    entities: entities.map((entity) => ({
      entitySlug: entity.entitySlug,
      entityType: entity.entityType,
      latestDraft: {
        revisionId: entity.latestDraft.revisionId,
        version: entity.latestDraft.version,
        name: entity.latestDraft.name,
        summary: entity.latestDraft.summary,
        visibility: entity.latestDraft.visibility,
        metadata: entity.latestDraft.metadata,
        createdAt: entity.latestDraft.createdAt.toISOString(),
        createdBy: serializeCreatedBy(entity.latestDraft.createdBy)
      },
      releaseSummary: serializeReleaseSummary(entity.releaseSummary)
    }))
  });
});

adminEntityRouter.get("/:entityType/:slug/history", async (request, response) => {
  const parsedParams = entityParamsSchema.safeParse(request.params);

  if (!parsedParams.success) {
    response.status(400).json({
      error: parsedParams.error.flatten()
    });
    return;
  }

  const history = await entityAdminService.getHistory({
    actor: response.locals.actor,
    entityType: parsedParams.data.entityType as EntityType,
    slug: parsedParams.data.slug
  });

  if (!history) {
    response.status(404).json({
      error: "Entity draft not found"
    });
    return;
  }

  response.json({
    entitySlug: history.entitySlug,
    entityType: history.entityType,
    latestDraftRevisionId: history.latestDraftRevisionId,
    activeReleaseRevisionId: history.activeReleaseRevisionId,
    revisionSummaries: history.revisionSummaries.map((revision) => ({
      revisionId: revision.revisionId,
      version: revision.version,
      name: revision.name,
      summary: revision.summary,
      visibility: revision.visibility,
      metadata: revision.metadata,
      createdAt: revision.createdAt.toISOString(),
      createdBy: serializeCreatedBy(revision.createdBy),
      releaseSummary: {
        includedInReleaseCount: revision.releaseSummary.includedInReleaseCount,
        includedInActiveRelease: revision.releaseSummary.includedInActiveRelease,
        latestRelease: serializeReleaseRecord(revision.releaseSummary.latestRelease)
      }
    }))
  });
});

adminEntityRouter.get("/:entityType/:slug", async (request, response) => {
  const parsedParams = entityParamsSchema.safeParse(request.params);

  if (!parsedParams.success) {
    response.status(400).json({
      error: parsedParams.error.flatten()
    });
    return;
  }

  const entity = await entityAdminService.getBySlug({
    actor: response.locals.actor,
    entityType: parsedParams.data.entityType as EntityType,
    slug: parsedParams.data.slug
  });

  if (!entity) {
    response.status(404).json({
      error: "Entity draft not found"
    });
    return;
  }

  response.json({
    entitySlug: entity.entitySlug,
    entityType: entity.entityType,
    latestDraft: {
      revisionId: entity.latestDraft.revisionId,
      version: entity.latestDraft.version,
      name: entity.latestDraft.name,
      summary: entity.latestDraft.summary,
      visibility: entity.latestDraft.visibility,
      metadata: entity.latestDraft.metadata,
      payload: entity.latestDraft.payload,
      createdAt: entity.latestDraft.createdAt.toISOString(),
      createdBy: serializeCreatedBy(entity.latestDraft.createdBy)
    },
    releaseSummary: serializeReleaseSummary(entity.releaseSummary)
  });
});

adminEntityRouter.post("/:entityType/drafts", async (request, response) => {
  const parsedParams = entityTypeOnlyParamsSchema.safeParse(request.params);

  if (!parsedParams.success) {
    response.status(400).json({
      error: parsedParams.error.flatten()
    });
    return;
  }

  const parsedBody = entityMetadataContract
    .buildCreateDraftSchema(parsedParams.data.entityType as EntityType)
    .safeParse(request.body);

  if (!parsedBody.success) {
    response.status(400).json({
      error: parsedBody.error.flatten()
    });
    return;
  }

  try {
    const draft = await entityAdminService.saveDraft({
      actor: response.locals.actor,
      entityType: parsedParams.data.entityType as EntityType,
      slug: parsedBody.data.slug,
      name: parsedBody.data.name,
      summary: parsedBody.data.summary,
      visibility: parsedBody.data.visibility as Visibility,
      ...(parsedBody.data.metadata === undefined ? {} : { metadata: parsedBody.data.metadata as Prisma.InputJsonValue }),
      ...(parsedBody.data.requiredDependencies === undefined
        ? {}
        : { requiredDependencies: parsedBody.data.requiredDependencies as Prisma.InputJsonValue })
    });

    response.status(201).json({
      entityType: draft.entityType,
      entitySlug: draft.slug,
      revisionId: draft.revisionId,
      version: draft.version,
      name: draft.name,
      summary: draft.summary,
      visibility: draft.visibility,
      metadata: draft.metadata
    });
  } catch (error) {
    response.status(403).json({
      error: error instanceof Error ? error.message : "Unable to save entity draft"
    });
  }
});

adminEntityRouter.patch("/:entityType/:slug/drafts", async (request, response) => {
  const parsedParams = entityParamsSchema.safeParse(request.params);

  if (!parsedParams.success) {
    response.status(400).json({
      error: parsedParams.error.flatten()
    });
    return;
  }

  const parsedBody = entityMetadataContract
    .buildUpdateDraftSchema(parsedParams.data.entityType as EntityType)
    .safeParse(request.body);

  if (!parsedBody.success) {
    response.status(400).json({
      error: parsedBody.error.flatten()
    });
    return;
  }

  try {
    const draft = await entityAdminService.updateDraft({
      actor: response.locals.actor,
      entityType: parsedParams.data.entityType as EntityType,
      slug: parsedParams.data.slug,
      name: parsedBody.data.name,
      summary: parsedBody.data.summary,
      visibility: parsedBody.data.visibility as Visibility,
      ...(parsedBody.data.metadata === undefined ? {} : { metadata: parsedBody.data.metadata as Prisma.InputJsonValue }),
      ...(parsedBody.data.requiredDependencies === undefined
        ? {}
        : { requiredDependencies: parsedBody.data.requiredDependencies as Prisma.InputJsonValue })
    });

    if (!draft) {
      response.status(404).json({
        error: "Entity draft not found"
      });
      return;
    }

    response.status(200).json({
      entityType: draft.entityType,
      entitySlug: draft.slug,
      revisionId: draft.revisionId,
      version: draft.version,
      name: draft.name,
      summary: draft.summary,
      visibility: draft.visibility,
      metadata: draft.metadata
    });
  } catch (error) {
    response.status(403).json({
      error: error instanceof Error ? error.message : "Unable to update entity draft"
    });
  }
});

adminEntityRouter.delete("/:entityType/:slug", async (request, response) => {
  const parsedParams = entityParamsSchema.safeParse(request.params);

  if (!parsedParams.success) {
    response.status(400).json({
      error: parsedParams.error.flatten()
    });
    return;
  }

  try {
    const result = await entityAdminService.retireEntity({
      actor: response.locals.actor,
      entityType: parsedParams.data.entityType as EntityType,
      slug: parsedParams.data.slug
    });

    if (!result) {
      response.status(404).json({
        error: "Entity not found"
      });
      return;
    }

    response.status(200).json({
      outcome: result.outcome
    });
  } catch (error) {
    response.status(403).json({
      error: error instanceof Error ? error.message : "Unable to retire entity"
    });
  }
});