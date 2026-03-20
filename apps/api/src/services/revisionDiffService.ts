import { createHash } from "node:crypto";

import { type Prisma, type RevisionDiffKind } from "@prisma/client";
import { z } from "zod";

import { entityRevisionRepository } from "../repositories/entityRevisionRepository.js";
import { manuscriptRevisionRepository } from "../repositories/manuscriptRevisionRepository.js";
import { revisionDiffRepository } from "../repositories/revisionDiffRepository.js";

export class RevisionDiffNotFoundError extends Error {
  constructor() {
    super("Revision diff not found");
    this.name = "RevisionDiffNotFoundError";
  }
}

export class RevisionNotFoundError extends Error {
  constructor() {
    super("Revision not found");
    this.name = "RevisionNotFoundError";
  }
}

export class RevisionDiffTargetMismatchError extends Error {
  constructor() {
    super("Revisions must belong to the same target");
    this.name = "RevisionDiffTargetMismatchError";
  }
}

const relationshipDependencySchema = z.object({
  kind: z.literal("RELATIONSHIP"),
  sourceEntitySlug: z.string().min(1),
  targetEntitySlug: z.string().min(1),
  relationType: z.string().min(1)
});

const fieldValueSchema: z.ZodType<Prisma.JsonValue> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(fieldValueSchema), z.record(z.string(), fieldValueSchema)])
);

const revisionDiffSchema = z.object({
  kind: z.enum(["ENTITY", "MANUSCRIPT"]),
  fromRevision: z.object({
    revisionId: z.string().min(1),
    targetId: z.string().min(1),
    targetSlug: z.string().min(1),
    targetType: z.string().min(1),
    version: z.number().int().nonnegative()
  }),
  toRevision: z.object({
    revisionId: z.string().min(1),
    targetId: z.string().min(1),
    targetSlug: z.string().min(1),
    targetType: z.string().min(1),
    version: z.number().int().nonnegative()
  }),
  identities: z.object({
    fromContentIdentity: z.string().min(1),
    toContentIdentity: z.string().min(1),
    pairContentIdentity: z.string().min(1)
  }),
  changes: z.object({
    addedFields: z.array(
      z.object({
        path: z.string().min(1),
        value: fieldValueSchema
      })
    ),
    removedFields: z.array(
      z.object({
        path: z.string().min(1),
        value: fieldValueSchema
      })
    ),
    modifiedFields: z.array(
      z.object({
        path: z.string().min(1),
        before: fieldValueSchema,
        after: fieldValueSchema
      })
    ),
    relationshipChanges: z.array(
      z.object({
        key: z.string().min(1),
        changeType: z.enum(["ADDED", "REMOVED", "MODIFIED"]),
        before: relationshipDependencySchema.optional(),
        after: relationshipDependencySchema.optional()
      })
    )
  })
});

export type RevisionDiffResult = z.infer<typeof revisionDiffSchema>;

const isObjectRecord = (value: Prisma.JsonValue | undefined | null): value is Prisma.JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeJsonValue = (value: Prisma.JsonValue): Prisma.JsonValue => {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeJsonValue(entry));
  }

  if (isObjectRecord(value)) {
    const keys = Object.keys(value).sort((left, right) => left.localeCompare(right));
    const normalizedEntries = keys.map((key) => [key, normalizeJsonValue(value[key] as Prisma.JsonValue)] as const);

    return Object.fromEntries(normalizedEntries);
  }

  return value;
};

const stableStringify = (value: Prisma.JsonValue): string => JSON.stringify(normalizeJsonValue(value));

const hashValue = (value: Prisma.JsonValue): string => createHash("sha256").update(stableStringify(value)).digest("hex");

const normalizeDependencies = (payload: Prisma.JsonValue | null): Prisma.JsonValue | null => {
  if (!isObjectRecord(payload)) {
    return payload;
  }

  const dependencies = payload.requiredDependencies;

  if (!Array.isArray(dependencies)) {
    return payload;
  }

  const sortedDependencies = [...dependencies]
    .map((entry) => normalizeJsonValue((entry as Prisma.JsonValue) ?? null))
    .sort((left, right) => stableStringify(left).localeCompare(stableStringify(right)));

  return {
    ...payload,
    requiredDependencies: sortedDependencies
  };
};

const flattenJson = (input: { value: Prisma.JsonValue; prefix?: string }, output: Map<string, Prisma.JsonValue>): void => {
  if (Array.isArray(input.value)) {
    if (!input.prefix) {
      return;
    }

    output.set(input.prefix, normalizeJsonValue(input.value));
    return;
  }

  if (isObjectRecord(input.value)) {
    const keys = Object.keys(input.value).sort((left, right) => left.localeCompare(right));

    if (keys.length === 0 && input.prefix) {
      output.set(input.prefix, {});
      return;
    }

    for (const key of keys) {
      const nextPrefix = input.prefix ? `${input.prefix}.${key}` : key;
      flattenJson({ value: (input.value[key] as Prisma.JsonValue) ?? null, prefix: nextPrefix }, output);
    }

    return;
  }

  if (input.prefix) {
    output.set(input.prefix, input.value);
  }
};

const compareFieldChanges = (input: { fromSnapshot: Prisma.JsonObject; toSnapshot: Prisma.JsonObject }) => {
  const fromFields = new Map<string, Prisma.JsonValue>();
  const toFields = new Map<string, Prisma.JsonValue>();

  flattenJson({ value: input.fromSnapshot }, fromFields);
  flattenJson({ value: input.toSnapshot }, toFields);

  const addedFields: RevisionDiffResult["changes"]["addedFields"] = [];
  const removedFields: RevisionDiffResult["changes"]["removedFields"] = [];
  const modifiedFields: RevisionDiffResult["changes"]["modifiedFields"] = [];

  for (const [path, value] of fromFields) {
    if (!toFields.has(path)) {
      removedFields.push({ path, value: normalizeJsonValue(value) });
      continue;
    }

    const toValue = toFields.get(path);

    if (toValue === undefined) {
      continue;
    }

    if (stableStringify(value) !== stableStringify(toValue)) {
      modifiedFields.push({
        path,
        before: normalizeJsonValue(value),
        after: normalizeJsonValue(toValue)
      });
    }
  }

  for (const [path, value] of toFields) {
    if (!fromFields.has(path)) {
      addedFields.push({ path, value: normalizeJsonValue(value) });
    }
  }

  addedFields.sort((left, right) => left.path.localeCompare(right.path));
  removedFields.sort((left, right) => left.path.localeCompare(right.path));
  modifiedFields.sort((left, right) => left.path.localeCompare(right.path));

  return {
    addedFields,
    removedFields,
    modifiedFields
  };
};

const extractRelationshipDependencies = (payload: Prisma.JsonValue | null) => {
  const dependenciesByKey = new Map<string, z.infer<typeof relationshipDependencySchema>>();

  if (!isObjectRecord(payload)) {
    return dependenciesByKey;
  }

  const dependencies = payload.requiredDependencies;

  if (!Array.isArray(dependencies)) {
    return dependenciesByKey;
  }

  for (const dependency of dependencies) {
    const parsedDependency = relationshipDependencySchema.safeParse(dependency);

    if (!parsedDependency.success) {
      continue;
    }

    const key = `${parsedDependency.data.sourceEntitySlug}|${parsedDependency.data.relationType}|${parsedDependency.data.targetEntitySlug}`;
    dependenciesByKey.set(key, parsedDependency.data);
  }

  return dependenciesByKey;
};

const compareRelationshipChanges = (input: { fromPayload: Prisma.JsonValue | null; toPayload: Prisma.JsonValue | null }) => {
  const fromDependencies = extractRelationshipDependencies(input.fromPayload);
  const toDependencies = extractRelationshipDependencies(input.toPayload);

  const relationshipChanges: RevisionDiffResult["changes"]["relationshipChanges"] = [];

  for (const [key, value] of fromDependencies) {
    if (!toDependencies.has(key)) {
      relationshipChanges.push({
        key,
        changeType: "REMOVED",
        before: value
      });
      continue;
    }

    const toValue = toDependencies.get(key);

    if (!toValue) {
      continue;
    }

    if (stableStringify(value) !== stableStringify(toValue)) {
      relationshipChanges.push({
        key,
        changeType: "MODIFIED",
        before: value,
        after: toValue
      });
    }
  }

  for (const [key, value] of toDependencies) {
    if (!fromDependencies.has(key)) {
      relationshipChanges.push({
        key,
        changeType: "ADDED",
        after: value
      });
    }
  }

  relationshipChanges.sort((left, right) => left.key.localeCompare(right.key));

  return relationshipChanges;
};

const buildEntitySnapshot = (input: {
  name: string;
  summary: string;
  visibility: string;
  payload: Prisma.JsonValue | null;
}): Prisma.JsonObject => ({
  name: input.name,
  summary: input.summary,
  visibility: input.visibility,
  payload: normalizeDependencies(input.payload)
});

const buildManuscriptSnapshot = (input: {
  title: string;
  summary: string;
  visibility: string;
  payload: Prisma.JsonValue | null;
}): Prisma.JsonObject => ({
  title: input.title,
  summary: input.summary,
  visibility: input.visibility,
  payload: normalizeJsonValue(input.payload ?? null)
});

const parseStoredDiff = (value: Prisma.JsonValue): RevisionDiffResult => revisionDiffSchema.parse(value);

const persistDeterministicDiff = async (input: {
  kind: RevisionDiffKind;
  fromRevisionId: string;
  toRevisionId: string;
  fromContentIdentity: string;
  toContentIdentity: string;
  pairContentIdentity: string;
  diff: RevisionDiffResult;
}) => {
  const existing = await revisionDiffRepository.findByPair({
    kind: input.kind,
    fromRevisionId: input.fromRevisionId,
    toRevisionId: input.toRevisionId,
    pairContentIdentity: input.pairContentIdentity
  });

  if (existing) {
    return {
      fromCache: true,
      diff: parseStoredDiff(existing.diff)
    };
  }

  const created = await revisionDiffRepository.create({
    kind: input.kind,
    fromRevisionId: input.fromRevisionId,
    toRevisionId: input.toRevisionId,
    fromContentIdentity: input.fromContentIdentity,
    toContentIdentity: input.toContentIdentity,
    pairContentIdentity: input.pairContentIdentity,
    diff: input.diff as Prisma.InputJsonValue
  });

  return {
    fromCache: false,
    diff: parseStoredDiff(created.diff)
  };
};

export const revisionDiffService = {
  compareSnapshots(input: {
    kind: RevisionDiffKind;
    fromSnapshot: Prisma.JsonObject;
    toSnapshot: Prisma.JsonObject;
    fromPayload: Prisma.JsonValue | null;
    toPayload: Prisma.JsonValue | null;
  }) {
    return {
      ...compareFieldChanges({
        fromSnapshot: input.fromSnapshot,
        toSnapshot: input.toSnapshot
      }),
      relationshipChanges:
        input.kind === "ENTITY"
          ? compareRelationshipChanges({
              fromPayload: input.fromPayload,
              toPayload: input.toPayload
            })
          : []
    };
  },

  async getCachedDiff(input: { kind: RevisionDiffKind; fromRevisionId: string; toRevisionId: string }) {
    const computed = await revisionDiffService.computeDiff(input);
    const cached = await revisionDiffRepository.findByPair({
      kind: input.kind,
      fromRevisionId: input.fromRevisionId,
      toRevisionId: input.toRevisionId,
      pairContentIdentity: computed.identities.pairContentIdentity
    });

    if (!cached) {
      throw new RevisionDiffNotFoundError();
    }

    return parseStoredDiff(cached.diff);
  },

  async computeDiff(input: { kind: RevisionDiffKind; fromRevisionId: string; toRevisionId: string }): Promise<RevisionDiffResult> {
    if (input.kind === "ENTITY") {
      const fromRevision = await entityRevisionRepository.findByRevisionId(input.fromRevisionId);
      const toRevision = await entityRevisionRepository.findByRevisionId(input.toRevisionId);

      if (!fromRevision || !toRevision) {
        throw new RevisionNotFoundError();
      }

      if (fromRevision.entityId !== toRevision.entityId) {
        throw new RevisionDiffTargetMismatchError();
      }

      const fromSnapshot = buildEntitySnapshot({
        name: fromRevision.name,
        summary: fromRevision.summary,
        visibility: fromRevision.visibility,
        payload: fromRevision.payload
      });
      const toSnapshot = buildEntitySnapshot({
        name: toRevision.name,
        summary: toRevision.summary,
        visibility: toRevision.visibility,
        payload: toRevision.payload
      });

      const fromContentIdentity = hashValue(fromSnapshot);
      const toContentIdentity = hashValue(toSnapshot);
      const pairContentIdentity = hashValue({
        kind: input.kind,
        fromContentIdentity,
        toContentIdentity
      });

      const changes = revisionDiffService.compareSnapshots({
        kind: input.kind,
        fromSnapshot,
        toSnapshot,
        fromPayload: fromRevision.payload,
        toPayload: toRevision.payload
      });

      return revisionDiffSchema.parse({
        kind: input.kind,
        fromRevision: {
          revisionId: fromRevision.revisionId,
          targetId: fromRevision.entityId,
          targetSlug: fromRevision.entitySlug,
          targetType: fromRevision.entityType,
          version: fromRevision.version
        },
        toRevision: {
          revisionId: toRevision.revisionId,
          targetId: toRevision.entityId,
          targetSlug: toRevision.entitySlug,
          targetType: toRevision.entityType,
          version: toRevision.version
        },
        identities: {
          fromContentIdentity,
          toContentIdentity,
          pairContentIdentity
        },
        changes
      });
    }

    const fromRevision = await manuscriptRevisionRepository.findByRevisionId(input.fromRevisionId);
    const toRevision = await manuscriptRevisionRepository.findByRevisionId(input.toRevisionId);

    if (!fromRevision || !toRevision) {
      throw new RevisionNotFoundError();
    }

    if (fromRevision.manuscriptId !== toRevision.manuscriptId) {
      throw new RevisionDiffTargetMismatchError();
    }

    const fromSnapshot = buildManuscriptSnapshot({
      title: fromRevision.title,
      summary: fromRevision.summary,
      visibility: fromRevision.visibility,
      payload: fromRevision.payload
    });
    const toSnapshot = buildManuscriptSnapshot({
      title: toRevision.title,
      summary: toRevision.summary,
      visibility: toRevision.visibility,
      payload: toRevision.payload
    });

    const fromContentIdentity = hashValue(fromSnapshot);
    const toContentIdentity = hashValue(toSnapshot);
    const pairContentIdentity = hashValue({
      kind: input.kind,
      fromContentIdentity,
      toContentIdentity
    });

    const changes = revisionDiffService.compareSnapshots({
      kind: input.kind,
      fromSnapshot,
      toSnapshot,
      fromPayload: fromRevision.payload,
      toPayload: toRevision.payload
    });

    return revisionDiffSchema.parse({
      kind: input.kind,
      fromRevision: {
        revisionId: fromRevision.manuscriptRevisionId,
        targetId: fromRevision.manuscriptId,
        targetSlug: fromRevision.manuscriptSlug,
        targetType: fromRevision.manuscriptType,
        version: fromRevision.version
      },
      toRevision: {
        revisionId: toRevision.manuscriptRevisionId,
        targetId: toRevision.manuscriptId,
        targetSlug: toRevision.manuscriptSlug,
        targetType: toRevision.manuscriptType,
        version: toRevision.version
      },
      identities: {
        fromContentIdentity,
        toContentIdentity,
        pairContentIdentity
      },
      changes
    });
  },

  async getOrCreateDiff(input: { kind: RevisionDiffKind; fromRevisionId: string; toRevisionId: string }) {
    const computedDiff = await revisionDiffService.computeDiff(input);

    return persistDeterministicDiff({
      kind: input.kind,
      fromRevisionId: input.fromRevisionId,
      toRevisionId: input.toRevisionId,
      fromContentIdentity: computedDiff.identities.fromContentIdentity,
      toContentIdentity: computedDiff.identities.toContentIdentity,
      pairContentIdentity: computedDiff.identities.pairContentIdentity,
      diff: computedDiff
    });
  }
};
