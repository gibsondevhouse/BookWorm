import type {
  EntityType,
  ManuscriptType,
  Prisma,
  ReleaseStatus,
  RelationshipRevisionState,
  Visibility
} from "@prisma/client";

import { entityMetadataContract } from "../entityMetadataContract.js";

type ExportFile = {
  path: string;
  content: string;
};

type ExportPackage = {
  manifest: {
    schemaVersion: 1;
    format: "json";
    scope: "current" | "release";
    exportedAt: string;
    release?: {
      id: string;
      slug: string;
      name: string;
        status: ReleaseStatus;
      createdAt: string;
      activatedAt: string | null;
    };
    counts: {
      entities: number;
      manuscripts: number;
      relationships: number;
      releases: number;
    };
  };
  files: ExportFile[];
};

const normalizeSegment = (value: string): string => value.toLowerCase().replaceAll("_", "-");

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => stableValue(item));
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = stableValue((value as Record<string, unknown>)[key]);
        return accumulator;
      }, {});
  }

  return value;
};

const stringifyDocument = (value: unknown): string => `${JSON.stringify(stableValue(value), null, 2)}\n`;

export const jsonPortabilitySerializer = {
  serialize(input: {
    scope: "current" | "release";
    exportedAt: Date;
    entities: Array<{
      id: string;
      slug: string;
      type: EntityType;
      retiredAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      revision: {
        id: string;
        version: number;
        name: string;
        summary: string;
        visibility: Visibility;
        payload: Prisma.JsonValue | null;
        createdAt: Date;
      };
    }>;
    manuscripts: Array<{
      id: string;
      slug: string;
      type: ManuscriptType;
      createdAt: Date;
      updatedAt: Date;
      revision: {
        id: string;
        version: number;
        title: string;
        summary: string;
        visibility: Visibility;
        payload: Prisma.JsonValue | null;
        createdAt: Date;
      };
    }>;
    relationships: Array<{
      id: string;
      relationType: string;
      createdAt: Date;
      updatedAt: Date;
      sourceEntity: {
        id: string;
        slug: string;
      };
      targetEntity: {
        id: string;
        slug: string;
      };
      revision: {
        id: string;
        version: number;
        state: RelationshipRevisionState;
        visibility: Visibility;
        metadata: Prisma.JsonValue | null;
        createdAt: Date;
      };
    }>;
    release?: {
      id: string;
      slug: string;
      name: string;
      status: ReleaseStatus;
      createdById: string;
      createdAt: Date;
      activatedAt: Date | null;
    };
  }): ExportPackage {
    const files: ExportFile[] = [];
    const releaseInfo = input.release
      ? {
          id: input.release.id,
          slug: input.release.slug,
          name: input.release.name,
          status: input.release.status,
          createdAt: input.release.createdAt.toISOString(),
          activatedAt: input.release.activatedAt?.toISOString() ?? null
        }
      : undefined;

    for (const entity of input.entities) {
      files.push({
        path: `entities/${normalizeSegment(entity.type)}/${entity.slug}.json`,
        content: stringifyDocument({
          scope: input.scope,
          ...(releaseInfo ? { release: releaseInfo } : {}),
          entity: {
            id: entity.id,
            slug: entity.slug,
            type: entity.type,
            retiredAt: entity.retiredAt?.toISOString() ?? null,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString()
          },
          revision: {
            id: entity.revision.id,
            version: entity.revision.version,
            name: entity.revision.name,
            summary: entity.revision.summary,
            visibility: entity.revision.visibility,
            metadata: entityMetadataContract.readMetadata({
              entityType: entity.type,
              payload: entity.revision.payload
            }),
            payload: entity.revision.payload,
            createdAt: entity.revision.createdAt.toISOString()
          }
        })
      });
    }

    for (const manuscript of input.manuscripts) {
      files.push({
        path: `manuscripts/${normalizeSegment(manuscript.type)}/${manuscript.slug}.json`,
        content: stringifyDocument({
          scope: input.scope,
          ...(releaseInfo ? { release: releaseInfo } : {}),
          manuscript: {
            id: manuscript.id,
            slug: manuscript.slug,
            type: manuscript.type,
            createdAt: manuscript.createdAt.toISOString(),
            updatedAt: manuscript.updatedAt.toISOString()
          },
          revision: {
            id: manuscript.revision.id,
            version: manuscript.revision.version,
            title: manuscript.revision.title,
            summary: manuscript.revision.summary,
            visibility: manuscript.revision.visibility,
            payload: manuscript.revision.payload,
            createdAt: manuscript.revision.createdAt.toISOString()
          }
        })
      });
    }

    for (const relationship of input.relationships) {
      files.push({
        path: `relationships/${relationship.sourceEntity.slug}--${relationship.relationType}--${relationship.targetEntity.slug}.json`,
        content: stringifyDocument({
          scope: input.scope,
          ...(releaseInfo ? { release: releaseInfo } : {}),
          relationship: {
            id: relationship.id,
            relationType: relationship.relationType,
            sourceEntity: relationship.sourceEntity,
            targetEntity: relationship.targetEntity,
            createdAt: relationship.createdAt.toISOString(),
            updatedAt: relationship.updatedAt.toISOString()
          },
          revision: {
            id: relationship.revision.id,
            version: relationship.revision.version,
            state: relationship.revision.state,
            visibility: relationship.revision.visibility,
            metadata: relationship.revision.metadata,
            createdAt: relationship.revision.createdAt.toISOString()
          }
        })
      });
    }

    if (input.release) {
      files.push({
        path: `releases/${input.release.slug}.json`,
        content: stringifyDocument({
          scope: input.scope,
          release: {
            id: input.release.id,
            slug: input.release.slug,
            name: input.release.name,
            status: input.release.status,
            createdById: input.release.createdById,
            createdAt: input.release.createdAt.toISOString(),
            activatedAt: input.release.activatedAt?.toISOString() ?? null
          },
          composition: {
            entities: input.entities.map((entity) => ({
              entityId: entity.id,
              entitySlug: entity.slug,
              revisionId: entity.revision.id,
              version: entity.revision.version,
              visibility: entity.revision.visibility
            })),
            manuscripts: input.manuscripts.map((manuscript) => ({
              manuscriptId: manuscript.id,
              manuscriptSlug: manuscript.slug,
              manuscriptRevisionId: manuscript.revision.id,
              version: manuscript.revision.version,
              visibility: manuscript.revision.visibility
            })),
            relationships: input.relationships.map((relationship) => ({
              relationshipId: relationship.id,
              sourceEntitySlug: relationship.sourceEntity.slug,
              targetEntitySlug: relationship.targetEntity.slug,
              relationType: relationship.relationType,
              relationshipRevisionId: relationship.revision.id,
              version: relationship.revision.version,
              visibility: relationship.revision.visibility
            }))
          }
        })
      });
    }

    files.sort((left, right) => left.path.localeCompare(right.path));

    const manifest = {
      schemaVersion: 1 as const,
      format: "json" as const,
      scope: input.scope,
      exportedAt: input.exportedAt.toISOString(),
      ...(releaseInfo ? { release: releaseInfo } : {}),
      counts: {
        entities: input.entities.length,
        manuscripts: input.manuscripts.length,
        relationships: input.relationships.length,
        releases: input.release ? 1 : 0
      }
    };

    files.unshift({
      path: "manifests/export-manifest.json",
      content: stringifyDocument(manifest)
    });

    return {
      manifest,
      files
    };
  }
};