import type { EntityType, Visibility } from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";
import { entityMetadataContract } from "../lib/entityMetadataContract.js";

type EntityMetadataRecord = ReturnType<(typeof entityMetadataContract)["readMetadata"]>;

export type PublicDiscoveryItem = {
  releaseSlug: string;
  entityType: EntityType;
  slug: string;
  name: string;
  summary: string;
  visibility: Visibility;
  metadata: EntityMetadataRecord;
  version: number;
};

export type PublicDiscoveryResult = {
  releaseSlug: string | null;
  items: PublicDiscoveryItem[];
};

export type PublicDiscoveryInput = {
  entityType?: EntityType;
  query?: string;
  limit: number;
};

export const publicDiscoveryRepository = {
  async listActivePublicContent(input: PublicDiscoveryInput): Promise<PublicDiscoveryResult> {
    const activeRelease = await prismaClient.release.findFirst({
      where: {
        status: "ACTIVE"
      },
      orderBy: {
        activatedAt: "desc"
      },
      select: {
        id: true,
        slug: true
      }
    });

    if (!activeRelease) {
      return {
        releaseSlug: null,
        items: []
      };
    }

    const trimmedQuery = input.query?.trim();

    const entries = await prismaClient.releaseEntry.findMany({
      where: {
        releaseId: activeRelease.id,
        entity: {
          ...(input.entityType === undefined ? {} : { type: input.entityType })
        },
        revision: {
          visibility: "PUBLIC"
        },
        ...(trimmedQuery === undefined || trimmedQuery.length === 0
          ? {}
          : {
              OR: [
                { revision: { name: { contains: trimmedQuery, mode: "insensitive" } } },
                { revision: { summary: { contains: trimmedQuery, mode: "insensitive" } } },
                { entity: { slug: { contains: trimmedQuery, mode: "insensitive" } } }
              ]
            })
      },
      orderBy: [
        { entity: { type: "asc" } },
        { revision: { name: "asc" } }
      ],
      take: input.limit,
      select: {
        entity: {
          select: {
            type: true,
            slug: true
          }
        },
        revision: {
          select: {
            name: true,
            summary: true,
            visibility: true,
            payload: true,
            version: true
          }
        }
      }
    });

    return {
      releaseSlug: activeRelease.slug,
      items: entries.map((entry) => ({
        releaseSlug: activeRelease.slug,
        entityType: entry.entity.type,
        slug: entry.entity.slug,
        name: entry.revision.name,
        summary: entry.revision.summary,
        visibility: entry.revision.visibility,
        metadata: entityMetadataContract.readMetadata({
          entityType: entry.entity.type,
          payload: entry.revision.payload
        }),
        version: entry.revision.version
      }))
    };
  }
};