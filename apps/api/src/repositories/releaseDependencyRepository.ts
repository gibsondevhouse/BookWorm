import type { ManuscriptType, Prisma, RelationshipRevisionState } from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";

type DependencySourceType = "ENTITY_REVISION" | "MANUSCRIPT_REVISION" | "RELATIONSHIP_REVISION";
type DependencyType = "ENTITY" | "MANUSCRIPT" | "RELATIONSHIP" | "INVALID";

type ParsedDependency =
  | {
      dependencyType: "ENTITY";
      dependencyKey: string;
      entitySlug: string;
    }
  | {
      dependencyType: "MANUSCRIPT";
      dependencyKey: string;
      manuscriptSlug: string;
    }
  | {
      dependencyType: "RELATIONSHIP";
      dependencyKey: string;
      relationType: string;
      sourceEntitySlug: string;
      targetEntitySlug: string;
    }
  | {
      dependencyType: "INVALID";
      dependencyKey: string;
      validationError: string;
    };

export type ReleaseDependencyRecord = {
  sourceRevisionId: string;
  sourceType: DependencySourceType;
  sourceKey: string;
  dependencyType: DependencyType;
  dependencyKey: string;
  isSatisfied: boolean;
  validationError?: string;
};

export type ReleaseDependencyStatus = {
  releaseSlug: string;
  isComplete: boolean;
  dependencies: ReleaseDependencyRecord[];
  missingDependencies: ReleaseDependencyRecord[];
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const buildRelationshipKey = (input: {
  relationType: string;
  sourceEntitySlug: string;
  targetEntitySlug: string;
}): string => `${input.sourceEntitySlug}:${input.relationType}:${input.targetEntitySlug}`;

const parseDependency = (value: unknown, dependencyKey: string): ParsedDependency => {
  if (!isRecord(value)) {
    return {
      dependencyType: "INVALID",
      dependencyKey,
      validationError: "Dependency entries must be objects"
    };
  }

  const kind = value.kind;

  if (kind === "ENTITY") {
    const entitySlug = value.entitySlug;

    if (typeof entitySlug !== "string" || entitySlug.length === 0) {
      return {
        dependencyType: "INVALID",
        dependencyKey,
        validationError: "Entity dependencies require a non-empty entitySlug"
      };
    }

    return {
      dependencyType: "ENTITY",
      dependencyKey: entitySlug,
      entitySlug
    };
  }

  if (kind === "RELATIONSHIP") {
    const sourceEntitySlug = value.sourceEntitySlug;
    const targetEntitySlug = value.targetEntitySlug;
    const relationType = value.relationType;

    if (
      typeof sourceEntitySlug !== "string" ||
      sourceEntitySlug.length === 0 ||
      typeof targetEntitySlug !== "string" ||
      targetEntitySlug.length === 0 ||
      typeof relationType !== "string" ||
      relationType.length === 0
    ) {
      return {
        dependencyType: "INVALID",
        dependencyKey,
        validationError: "Relationship dependencies require sourceEntitySlug, targetEntitySlug, and relationType"
      };
    }

    return {
      dependencyType: "RELATIONSHIP",
      dependencyKey: buildRelationshipKey({
        relationType,
        sourceEntitySlug,
        targetEntitySlug
      }),
      relationType,
      sourceEntitySlug,
      targetEntitySlug
    };
  }

  if (kind === "MANUSCRIPT") {
    const manuscriptSlug = value.manuscriptSlug;

    if (typeof manuscriptSlug !== "string" || manuscriptSlug.length === 0) {
      return {
        dependencyType: "INVALID",
        dependencyKey,
        validationError: "Manuscript dependencies require a non-empty manuscriptSlug"
      };
    }

    return {
      dependencyType: "MANUSCRIPT",
      dependencyKey: manuscriptSlug,
      manuscriptSlug
    };
  }

  return {
    dependencyType: "INVALID",
    dependencyKey,
    validationError: "Dependencies must declare kind ENTITY, MANUSCRIPT, or RELATIONSHIP"
  };
};

const readExplicitDependencies = (value: Prisma.JsonValue | null): ParsedDependency[] => {
  if (value === null || !isRecord(value)) {
    return [];
  }

  const requiredDependencies = value.requiredDependencies;

  if (requiredDependencies === undefined) {
    return [];
  }

  if (!Array.isArray(requiredDependencies)) {
    return [
      {
        dependencyType: "INVALID",
        dependencyKey: "requiredDependencies",
        validationError: "requiredDependencies must be an array"
      }
    ];
  }

  return requiredDependencies.map((dependency, index) => parseDependency(dependency, `requiredDependencies[${index}]`));
};

const readImplicitManuscriptDependencies = (input: {
  manuscriptType: ManuscriptType;
  payload: Prisma.JsonValue | null;
}): ParsedDependency[] => {
  if (input.manuscriptType !== "SCENE") {
    return [];
  }

  if (!isRecord(input.payload)) {
    return [
      {
        dependencyType: "INVALID",
        dependencyKey: "chapterSlug",
        validationError: "Scene manuscript revisions require a non-empty chapterSlug"
      }
    ];
  }

  const chapterSlug = input.payload.chapterSlug;

  if (typeof chapterSlug !== "string" || chapterSlug.length === 0) {
    return [
      {
        dependencyType: "INVALID",
        dependencyKey: "chapterSlug",
        validationError: "Scene manuscript revisions require a non-empty chapterSlug"
      }
    ];
  }

  return [
    {
      dependencyType: "MANUSCRIPT",
      dependencyKey: chapterSlug,
      manuscriptSlug: chapterSlug
    }
  ];
};

const buildDependencyRecord = (input: {
  dependency: ParsedDependency;
  includedEntitySlugs: Set<string>;
  includedManuscriptSlugs: Set<string>;
  includedRelationshipStates: Map<string, RelationshipRevisionState>;
  sourceKey: string;
  sourceRevisionId: string;
  sourceType: DependencySourceType;
}): ReleaseDependencyRecord => {
  if (input.dependency.dependencyType === "INVALID") {
    return {
      sourceRevisionId: input.sourceRevisionId,
      sourceType: input.sourceType,
      sourceKey: input.sourceKey,
      dependencyType: input.dependency.dependencyType,
      dependencyKey: input.dependency.dependencyKey,
      isSatisfied: false,
      validationError: input.dependency.validationError
    };
  }

  if (input.dependency.dependencyType === "ENTITY") {
    return {
      sourceRevisionId: input.sourceRevisionId,
      sourceType: input.sourceType,
      sourceKey: input.sourceKey,
      dependencyType: input.dependency.dependencyType,
      dependencyKey: input.dependency.dependencyKey,
      isSatisfied: input.includedEntitySlugs.has(input.dependency.entitySlug)
    };
  }

  if (input.dependency.dependencyType === "MANUSCRIPT") {
    return {
      sourceRevisionId: input.sourceRevisionId,
      sourceType: input.sourceType,
      sourceKey: input.sourceKey,
      dependencyType: input.dependency.dependencyType,
      dependencyKey: input.dependency.dependencyKey,
      isSatisfied: input.includedManuscriptSlugs.has(input.dependency.manuscriptSlug)
    };
  }

  const relationshipState = input.includedRelationshipStates.get(input.dependency.dependencyKey);

  return {
    sourceRevisionId: input.sourceRevisionId,
    sourceType: input.sourceType,
    sourceKey: input.sourceKey,
    dependencyType: input.dependency.dependencyType,
    dependencyKey: input.dependency.dependencyKey,
    isSatisfied: relationshipState !== undefined && relationshipState !== "DELETE"
  };
};

export const releaseDependencyRepository = {
  async getDependencyStatus(releaseSlug: string): Promise<ReleaseDependencyStatus> {
    const release = await prismaClient.release.findUnique({
      where: { slug: releaseSlug },
      select: {
        slug: true,
        entries: {
          select: {
            entity: {
              select: {
                slug: true
              }
            },
            revision: {
              select: {
                id: true,
                payload: true
              }
            }
          }
        },
        manuscriptEntries: {
          select: {
            manuscript: {
              select: {
                slug: true,
                type: true
              }
            },
            manuscriptRevision: {
              select: {
                id: true,
                payload: true
              }
            }
          }
        },
        relationshipEntries: {
          select: {
            relationship: {
              select: {
                relationType: true,
                sourceEntity: {
                  select: {
                    slug: true
                  }
                },
                targetEntity: {
                  select: {
                    slug: true
                  }
                }
              }
            },
            relationshipRevision: {
              select: {
                id: true,
                state: true,
                metadata: true
              }
            }
          }
        }
      }
    });

    if (!release) {
      throw new Error("Release not found");
    }

    const includedEntitySlugs = new Set(release.entries.map((entry) => entry.entity.slug));
    const includedManuscriptSlugs = new Set(release.manuscriptEntries.map((entry) => entry.manuscript.slug));
    const includedRelationshipStates = new Map(
      release.relationshipEntries.map((entry) => [
        buildRelationshipKey({
          relationType: entry.relationship.relationType,
          sourceEntitySlug: entry.relationship.sourceEntity.slug,
          targetEntitySlug: entry.relationship.targetEntity.slug
        }),
        entry.relationshipRevision.state
      ])
    );

    const dependencyRecords: ReleaseDependencyRecord[] = [];
    const seenDependencies = new Set<string>();

    for (const entry of release.entries) {
      const sourceKey = entry.entity.slug;
      const explicitDependencies = readExplicitDependencies(entry.revision.payload);

      for (const dependency of explicitDependencies) {
        const dedupeKey = `${entry.revision.id}:${dependency.dependencyType}:${dependency.dependencyKey}`;

        if (seenDependencies.has(dedupeKey)) {
          continue;
        }

        seenDependencies.add(dedupeKey);
        dependencyRecords.push(
          buildDependencyRecord({
            dependency,
            includedEntitySlugs,
            includedManuscriptSlugs,
            includedRelationshipStates,
            sourceKey,
            sourceRevisionId: entry.revision.id,
            sourceType: "ENTITY_REVISION"
          })
        );
      }
    }

    for (const entry of release.manuscriptEntries) {
      const sourceKey = entry.manuscript.slug;
      const implicitDependencies = readImplicitManuscriptDependencies({
        manuscriptType: entry.manuscript.type,
        payload: entry.manuscriptRevision.payload
      });
      const explicitDependencies = readExplicitDependencies(entry.manuscriptRevision.payload);

      for (const dependency of [...implicitDependencies, ...explicitDependencies]) {
        const dedupeKey = `${entry.manuscriptRevision.id}:${dependency.dependencyType}:${dependency.dependencyKey}`;

        if (seenDependencies.has(dedupeKey)) {
          continue;
        }

        seenDependencies.add(dedupeKey);
        dependencyRecords.push(
          buildDependencyRecord({
            dependency,
            includedEntitySlugs,
            includedManuscriptSlugs,
            includedRelationshipStates,
            sourceKey,
            sourceRevisionId: entry.manuscriptRevision.id,
            sourceType: "MANUSCRIPT_REVISION"
          })
        );
      }
    }

    for (const entry of release.relationshipEntries) {
      const sourceKey = buildRelationshipKey({
        relationType: entry.relationship.relationType,
        sourceEntitySlug: entry.relationship.sourceEntity.slug,
        targetEntitySlug: entry.relationship.targetEntity.slug
      });
      const implicitDependencies: ParsedDependency[] = [
        {
          dependencyType: "ENTITY",
          dependencyKey: entry.relationship.sourceEntity.slug,
          entitySlug: entry.relationship.sourceEntity.slug
        },
        {
          dependencyType: "ENTITY",
          dependencyKey: entry.relationship.targetEntity.slug,
          entitySlug: entry.relationship.targetEntity.slug
        }
      ];
      const explicitDependencies = readExplicitDependencies(entry.relationshipRevision.metadata);

      for (const dependency of [...implicitDependencies, ...explicitDependencies]) {
        const dedupeKey = `${entry.relationshipRevision.id}:${dependency.dependencyType}:${dependency.dependencyKey}`;

        if (seenDependencies.has(dedupeKey)) {
          continue;
        }

        seenDependencies.add(dedupeKey);
        dependencyRecords.push(
          buildDependencyRecord({
            dependency,
            includedEntitySlugs,
            includedManuscriptSlugs,
            includedRelationshipStates,
            sourceKey,
            sourceRevisionId: entry.relationshipRevision.id,
            sourceType: "RELATIONSHIP_REVISION"
          })
        );
      }
    }

    const missingDependencies = dependencyRecords.filter((dependency) => !dependency.isSatisfied);

    return {
      releaseSlug: release.slug,
      isComplete: missingDependencies.length === 0,
      dependencies: dependencyRecords,
      missingDependencies
    };
  }
};