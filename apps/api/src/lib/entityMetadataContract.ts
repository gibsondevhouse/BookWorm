import type { EntityType, Prisma, Visibility } from "@prisma/client";
import { z } from "zod";

const spoilerTierValues = ["NONE", "MINOR", "MAJOR"] as const;
const chronologySensitiveEntityTypes = new Set<EntityType>(["EVENT", "REVEAL", "TIMELINE_ERA"]);

const requiredDependencySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("ENTITY"),
    entitySlug: z.string().trim().min(1)
  }),
  z.object({
    kind: z.literal("RELATIONSHIP"),
    sourceEntitySlug: z.string().trim().min(1),
    targetEntitySlug: z.string().trim().min(1),
    relationType: z.string().trim().min(1)
  })
]);

const timelineAnchorInputSchema = z
  .object({
    timelineEraSlug: z.string().trim().min(1).nullable().optional(),
    anchorLabel: z.string().trim().min(1),
    sortKey: z.string().trim().min(1).nullable().optional()
  })
  .strict();

const metadataInputSchema = z
  .object({
    spoilerTier: z.enum(spoilerTierValues).optional(),
    tags: z.array(z.string().trim().min(1)).optional(),
    timelineAnchor: timelineAnchorInputSchema.nullable().optional()
  })
  .strict();

type EntityMetadataRecord = {
  spoilerTier: (typeof spoilerTierValues)[number];
  tags: string[];
  timelineAnchor: {
    timelineEraSlug: string | null;
    anchorLabel: string;
    sortKey: string | null;
  } | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const defaultMetadata = (): EntityMetadataRecord => ({
  spoilerTier: "NONE",
  tags: [],
  timelineAnchor: null
});

const normalizeTags = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const entry of value) {
    if (typeof entry !== "string") {
      continue;
    }

    const normalized = entry.trim().toLowerCase();

    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    tags.push(normalized);
  }

  return tags;
};

const normalizeTimelineAnchor = (input: {
  entityType: EntityType;
  value: unknown;
}): EntityMetadataRecord["timelineAnchor"] => {
  if (!chronologySensitiveEntityTypes.has(input.entityType)) {
    return null;
  }

  if (input.value === null || input.value === undefined) {
    return null;
  }

  const parsedAnchor = timelineAnchorInputSchema.safeParse(input.value);

  if (!parsedAnchor.success) {
    return null;
  }

  return {
    timelineEraSlug: parsedAnchor.data.timelineEraSlug ?? null,
    anchorLabel: parsedAnchor.data.anchorLabel,
    sortKey: parsedAnchor.data.sortKey ?? null
  };
};

const normalizeMetadata = (input: {
  entityType: EntityType;
  value: unknown;
}): EntityMetadataRecord => {
  const metadata = isRecord(input.value) ? input.value : undefined;
  const spoilerTier = metadata?.spoilerTier;

  return {
    spoilerTier:
      spoilerTier === "NONE" || spoilerTier === "MINOR" || spoilerTier === "MAJOR" ? spoilerTier : "NONE",
    tags: normalizeTags(metadata?.tags),
    timelineAnchor: normalizeTimelineAnchor({
      entityType: input.entityType,
      value: metadata?.timelineAnchor
    })
  };
};

const readMetadataFromPayload = (input: {
  entityType: EntityType;
  payload: Prisma.JsonValue | null;
}): EntityMetadataRecord => {
  if (!isRecord(input.payload)) {
    return defaultMetadata();
  }

  return normalizeMetadata({
    entityType: input.entityType,
    value: input.payload.metadata
  });
};

const mergeMetadata = (input: {
  entityType: EntityType;
  previousPayload?: Prisma.JsonValue | null;
  metadata?: Prisma.InputJsonValue;
}): EntityMetadataRecord => {
  const previousMetadata = readMetadataFromPayload({
    entityType: input.entityType,
    payload: input.previousPayload ?? null
  });

  if (input.metadata === undefined) {
    return previousMetadata;
  }

  const rawMetadata: Record<string, unknown> = isRecord(input.metadata) ? input.metadata : {};
  const normalizedMetadata = normalizeMetadata({
    entityType: input.entityType,
    value: rawMetadata
  });

  return {
    spoilerTier: rawMetadata.spoilerTier === undefined ? previousMetadata.spoilerTier : normalizedMetadata.spoilerTier,
    tags: rawMetadata.tags === undefined ? previousMetadata.tags : normalizedMetadata.tags,
    timelineAnchor:
      rawMetadata.timelineAnchor === undefined ? previousMetadata.timelineAnchor : normalizedMetadata.timelineAnchor
  };
};

const draftShape = {
  name: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  visibility: z.enum(["PUBLIC", "RESTRICTED", "PRIVATE"]).default("PRIVATE"),
  requiredDependencies: z.array(requiredDependencySchema).optional(),
  metadata: metadataInputSchema.optional()
};

const validateTimelineAnchor = (input: {
  entityType: EntityType;
  value: { metadata?: Record<string, unknown> | undefined };
  context: z.RefinementCtx;
}): void => {
  if (
    isRecord(input.value.metadata) &&
    input.value.metadata.timelineAnchor !== undefined &&
    !chronologySensitiveEntityTypes.has(input.entityType)
  ) {
    input.context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${input.entityType} metadata does not support timelineAnchor`,
      path: ["metadata", "timelineAnchor"]
    });
  }
};

export const entityMetadataContract = {
  metadataInputSchema,

  buildCreateDraftSchema(entityType: EntityType) {
    return z
      .object({
        slug: z.string().trim().min(1),
        ...draftShape
      })
      .superRefine((value, context) => {
        validateTimelineAnchor({
          entityType,
          value,
          context
        });
      });
  },

  buildUpdateDraftSchema(entityType: EntityType) {
    return z.object(draftShape).superRefine((value, context) => {
      validateTimelineAnchor({
        entityType,
        value,
        context
      });
    });
  },

  supportsTimelineAnchor(entityType: EntityType): boolean {
    return chronologySensitiveEntityTypes.has(entityType);
  },

  readMetadata(input: { entityType: EntityType; payload: Prisma.JsonValue | null }): EntityMetadataRecord {
    // Visibility remains the authoritative access gate; spoiler metadata is advisory only.
    // This precedence is stable so later search, continuity, and public shaping stay aligned.
    return readMetadataFromPayload(input);
  },

  buildPayload(input: {
    entityType: EntityType;
    name: string;
    summary: string;
    visibility: Visibility;
    metadata?: Prisma.InputJsonValue;
    requiredDependencies?: Prisma.InputJsonValue;
    previousPayload?: Prisma.JsonValue | null;
  }): Prisma.InputJsonObject {
    const metadata = mergeMetadata({
      entityType: input.entityType,
      previousPayload: input.previousPayload ?? null,
      ...(input.metadata === undefined ? {} : { metadata: input.metadata })
    });

    return {
      name: input.name,
      summary: input.summary,
      visibility: input.visibility,
      metadata,
      ...(input.requiredDependencies === undefined ? {} : { requiredDependencies: input.requiredDependencies })
    };
  }
};