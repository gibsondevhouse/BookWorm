import type { EntityType, Prisma } from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";

type IndexableEntityRevision = {
  releaseSlug: string;
  releaseStatus: "ACTIVE" | "ARCHIVED";
  entityId: string;
  entityType: EntityType;
  entitySlug: string;
  revisionId: string;
  revisionName: string;
  revisionSummary: string;
  revisionVersion: number;
  revisionPayload: Prisma.JsonValue | null;
};

type IndexableManuscriptRevision = {
  releaseSlug: string;
  releaseStatus: "ACTIVE" | "ARCHIVED";
  manuscriptId: string;
  manuscriptType: "CHAPTER" | "SCENE";
  manuscriptSlug: string;
  revisionId: string;
  revisionTitle: string;
  revisionSummary: string;
  revisionVersion: number;
  revisionPayload: Prisma.JsonValue | null;
};

export const searchIndexRepository = {
  async findAllIndexableEntityRevisions(): Promise<IndexableEntityRevision[]> {
    const rows = await prismaClient.releaseEntry.findMany({
      where: {
        release: { status: { in: ["ACTIVE", "ARCHIVED"] } },
        revision: { visibility: "PUBLIC" },
        entity: { retiredAt: null }
      },
      orderBy: [{ release: { status: "desc" } }],
      select: {
        release: { select: { slug: true, status: true } },
        entity: { select: { id: true, type: true, slug: true } },
        revision: {
          select: {
            id: true,
            name: true,
            summary: true,
            version: true,
            payload: true
          }
        }
      }
    });

    return rows.map((row) => ({
      releaseSlug: row.release.slug,
      releaseStatus: row.release.status as "ACTIVE" | "ARCHIVED",
      entityId: row.entity.id,
      entityType: row.entity.type,
      entitySlug: row.entity.slug,
      revisionId: row.revision.id,
      revisionName: row.revision.name,
      revisionSummary: row.revision.summary,
      revisionVersion: row.revision.version,
      revisionPayload: row.revision.payload
    }));
  },

  async findAllIndexableManuscriptRevisions(): Promise<IndexableManuscriptRevision[]> {
    const rows = await prismaClient.releaseManuscriptEntry.findMany({
      where: {
        release: { status: { in: ["ACTIVE", "ARCHIVED"] } },
        manuscriptRevision: { visibility: "PUBLIC" }
      },
      orderBy: [{ release: { status: "desc" } }],
      select: {
        release: { select: { slug: true, status: true } },
        manuscript: { select: { id: true, type: true, slug: true } },
        manuscriptRevision: {
          select: {
            id: true,
            title: true,
            summary: true,
            version: true,
            payload: true
          }
        }
      }
    });

    return rows.map((row) => ({
      releaseSlug: row.release.slug,
      releaseStatus: row.release.status as "ACTIVE" | "ARCHIVED",
      manuscriptId: row.manuscript.id,
      manuscriptType: row.manuscript.type as "CHAPTER" | "SCENE",
      manuscriptSlug: row.manuscript.slug,
      revisionId: row.manuscriptRevision.id,
      revisionTitle: row.manuscriptRevision.title,
      revisionSummary: row.manuscriptRevision.summary,
      revisionVersion: row.manuscriptRevision.version,
      revisionPayload: row.manuscriptRevision.payload
    }));
  },

  async findEntityRevisionForIndex(revisionId: string): Promise<IndexableEntityRevision | null> {
    const row = await prismaClient.entityRevision.findFirst({
      where: {
        id: revisionId,
        visibility: "PUBLIC",
        entity: { retiredAt: null },
        releaseEntries: {
          some: { release: { status: { in: ["ACTIVE", "ARCHIVED"] } } }
        }
      },
      select: {
        id: true,
        name: true,
        summary: true,
        version: true,
        payload: true,
        entity: { select: { id: true, type: true, slug: true } },
        releaseEntries: {
          where: { release: { status: { in: ["ACTIVE", "ARCHIVED"] } } },
          orderBy: { release: { activatedAt: "desc" } },
          take: 1,
          select: { release: { select: { slug: true, status: true } } }
        }
      }
    });

    if (!row) return null;
    const firstEntry = row.releaseEntries[0];
    if (!firstEntry) return null;

    const release = firstEntry.release;

    return {
      releaseSlug: release.slug,
      releaseStatus: release.status as "ACTIVE" | "ARCHIVED",
      entityId: row.entity.id,
      entityType: row.entity.type,
      entitySlug: row.entity.slug,
      revisionId: row.id,
      revisionName: row.name,
      revisionSummary: row.summary,
      revisionVersion: row.version,
      revisionPayload: row.payload
    };
  },

  async findManuscriptRevisionForIndex(
    manuscriptRevisionId: string
  ): Promise<IndexableManuscriptRevision | null> {
    const row = await prismaClient.manuscriptRevision.findFirst({
      where: {
        id: manuscriptRevisionId,
        visibility: "PUBLIC",
        releaseEntries: {
          some: { release: { status: { in: ["ACTIVE", "ARCHIVED"] } } }
        }
      },
      select: {
        id: true,
        title: true,
        summary: true,
        version: true,
        payload: true,
        manuscript: { select: { id: true, type: true, slug: true } },
        releaseEntries: {
          where: { release: { status: { in: ["ACTIVE", "ARCHIVED"] } } },
          orderBy: { release: { activatedAt: "desc" } },
          take: 1,
          select: { release: { select: { slug: true, status: true } } }
        }
      }
    });

    if (!row) return null;
    const firstEntry = row.releaseEntries[0];
    if (!firstEntry) return null;

    const release = firstEntry.release;

    return {
      releaseSlug: release.slug,
      releaseStatus: release.status as "ACTIVE" | "ARCHIVED",
      manuscriptId: row.manuscript.id,
      manuscriptType: row.manuscript.type as "CHAPTER" | "SCENE",
      manuscriptSlug: row.manuscript.slug,
      revisionId: row.id,
      revisionTitle: row.title,
      revisionSummary: row.summary,
      revisionVersion: row.version,
      revisionPayload: row.payload
    };
  },

  async findActiveReleaseSlug(): Promise<string | null> {
    const release = await prismaClient.release.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { activatedAt: "desc" },
      select: { slug: true }
    });
    return release?.slug ?? null;
  }
};
