import type { Prisma } from "@prisma/client";
import type { EntityType } from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";
import { entityMetadataContract } from "../lib/entityMetadataContract.js";
import { expandSearchQuery } from "../lib/searchQueryExpansion.js";
import { InMemorySearchAdapter } from "../lib/searchAdapters/inMemorySearchAdapter.js";
import type { SearchIndexBuilder } from "../lib/searchIndexBuilder.js";
import type {
  EntitySearchDocument,
  ManuscriptSearchDocument,
  SearchDocument,
  SearchQuery,
  SearchResult
} from "../lib/searchTypes.js";
import { searchIndexRepository } from "../repositories/searchIndexRepository.js";

const adapter = new InMemorySearchAdapter();

const ENTITY_DETAIL_PATHS: Partial<Record<EntityType, string>> = {
  CHARACTER: "/characters",
  FACTION: "/factions",
  LOCATION: "/locations",
  EVENT: "/events"
};

function buildEntityDetailPath(entityType: EntityType, entitySlug: string): string | null {
  const base = ENTITY_DETAIL_PATHS[entityType];
  return base !== undefined ? `${base}/${entitySlug}` : null;
}

function extractManuscriptSpoilerTier(
  payload: Prisma.JsonValue | null
): "NONE" | "MINOR" | "MAJOR" {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "NONE";
  const meta = (payload as Record<string, unknown>).metadata;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return "NONE";
  const tier = (meta as Record<string, unknown>).spoilerTier;
  return tier === "NONE" || tier === "MINOR" || tier === "MAJOR" ? tier : "NONE";
}

function extractManuscriptTags(payload: Prisma.JsonValue | null): string[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const meta = (payload as Record<string, unknown>).metadata;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return [];
  const rawTags = (meta as Record<string, unknown>).tags;
  if (!Array.isArray(rawTags)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const t of rawTags) {
    if (typeof t !== "string") continue;
    const normalized = t.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function buildEntityDoc(row: {
  releaseSlug: string;
  entityId: string;
  entityType: EntityType;
  entitySlug: string;
  revisionId: string;
  revisionName: string;
  revisionSummary: string;
  revisionVersion: number;
  revisionPayload: Prisma.JsonValue | null;
}): EntitySearchDocument {
  const metadata = entityMetadataContract.readMetadata({
    entityType: row.entityType,
    payload: row.revisionPayload
  });

  return {
    id: row.revisionId,
    documentType: "ENTITY",
    entityId: row.entityId,
    entityType: row.entityType,
    entitySlug: row.entitySlug,
    name: row.revisionName,
    summary: row.revisionSummary,
    revisionVersion: row.revisionVersion,
    visibility: "PUBLIC",
    spoilerTier: metadata.spoilerTier,
    tags: metadata.tags,
    timelineEraSlug: metadata.timelineAnchor?.timelineEraSlug ?? null,
    anchorLabel: metadata.timelineAnchor?.anchorLabel ?? null,
    sortKey: metadata.timelineAnchor?.sortKey ?? null,
    releaseSlug: row.releaseSlug,
    detailPath: buildEntityDetailPath(row.entityType, row.entitySlug),
    indexedAt: new Date().toISOString()
  };
}

function buildManuscriptDoc(row: {
  releaseSlug: string;
  manuscriptId: string;
  manuscriptType: "CHAPTER" | "SCENE";
  manuscriptSlug: string;
  revisionId: string;
  revisionTitle: string;
  revisionSummary: string;
  revisionVersion: number;
  revisionPayload: Prisma.JsonValue | null;
}): ManuscriptSearchDocument {
  return {
    id: row.revisionId,
    documentType: "MANUSCRIPT",
    manuscriptId: row.manuscriptId,
    manuscriptType: row.manuscriptType,
    manuscriptSlug: row.manuscriptSlug,
    title: row.revisionTitle,
    summary: row.revisionSummary,
    revisionVersion: row.revisionVersion,
    visibility: "PUBLIC",
    spoilerTier: extractManuscriptSpoilerTier(row.revisionPayload),
    tags: extractManuscriptTags(row.revisionPayload),
    releaseSlug: row.releaseSlug,
    detailPath: `/codex/manuscripts/${row.manuscriptSlug}`,
    indexedAt: new Date().toISOString()
  };
}

export const searchIndexService: SearchIndexBuilder & {
  search(query: SearchQuery): Promise<SearchResult>;
  rebuildIndex(): Promise<void>;
} = {
  async buildAllDocuments(): Promise<SearchDocument[]> {
    const [entityRows, manuscriptRows] = await Promise.all([
      searchIndexRepository.findAllIndexableEntityRevisions(),
      searchIndexRepository.findAllIndexableManuscriptRevisions()
    ]);

    const entityDocs = entityRows.map(buildEntityDoc);
    const manuscriptDocs = manuscriptRows.map(buildManuscriptDoc);

    return [...entityDocs, ...manuscriptDocs];
  },

  async buildDocumentsForRelease(releaseSlug: string): Promise<SearchDocument[]> {
    const release = await prismaClient.release.findFirst({ where: { slug: releaseSlug } });

    if (!release) {
      throw new Error(`Release not found: ${releaseSlug}`);
    }

    if (release.status === "DRAFT") {
      throw new Error(`Cannot build documents for DRAFT release: ${releaseSlug}`);
    }

    const [entityRows, manuscriptRows] = await Promise.all([
      searchIndexRepository.findAllIndexableEntityRevisions(),
      searchIndexRepository.findAllIndexableManuscriptRevisions()
    ]);

    const entityDocs = entityRows
      .filter((r) => r.releaseSlug === releaseSlug)
      .map(buildEntityDoc);

    const manuscriptDocs = manuscriptRows
      .filter((r) => r.releaseSlug === releaseSlug)
      .map(buildManuscriptDoc);

    return [...entityDocs, ...manuscriptDocs];
  },

  async buildEntityDocument(revisionId: string): Promise<EntitySearchDocument | null> {
    const row = await searchIndexRepository.findEntityRevisionForIndex(revisionId);
    if (!row) return null;
    return buildEntityDoc(row);
  },

  async buildManuscriptDocument(
    manuscriptRevisionId: string
  ): Promise<ManuscriptSearchDocument | null> {
    const row = await searchIndexRepository.findManuscriptRevisionForIndex(manuscriptRevisionId);
    if (!row) return null;
    return buildManuscriptDoc(row);
  },

  async search(query: SearchQuery): Promise<SearchResult> {
    const resolvedReleaseSlug =
      query.releaseSlug ?? (await searchIndexRepository.findActiveReleaseSlug());

    if (!resolvedReleaseSlug) {
      return { resolvedReleaseSlug: null, total: 0, hits: [] };
    }

    const expansion = expandSearchQuery(query);

    return adapter.search({
      ...query,
      ...(expansion.normalizedQuery ? { q: expansion.normalizedQuery } : {}),
      ...(expansion.expandedTerms.length > 0
        ? { expandedTerms: expansion.expandedTerms }
        : {}),
      ...(expansion.typoTerms.length > 0 ? { typoTerms: expansion.typoTerms } : {}),
      ...(expansion.expansionSources.length > 0
        ? { expansionSources: expansion.expansionSources }
        : {}),
      releaseSlug: resolvedReleaseSlug
    });
  },

  async rebuildIndex(): Promise<void> {
    const docs = await searchIndexService.buildAllDocuments();
    await adapter.rebuild(docs);
  }
};
