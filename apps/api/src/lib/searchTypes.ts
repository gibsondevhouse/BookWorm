import type { EntityType } from "@prisma/client";

export interface EntitySearchDocument {
  id: string;
  documentType: "ENTITY";
  entityId: string;
  entityType: EntityType;
  entitySlug: string;
  name: string;
  summary: string;
  revisionVersion: number;
  visibility: "PUBLIC";
  spoilerTier: "NONE" | "MINOR" | "MAJOR";
  tags: string[];
  timelineEraSlug: string | null;
  anchorLabel: string | null;
  sortKey: string | null;
  releaseSlug: string;
  detailPath: string | null;
  indexedAt: string;
}

export interface ManuscriptSearchDocument {
  id: string;
  documentType: "MANUSCRIPT";
  manuscriptId: string;
  manuscriptType: "CHAPTER" | "SCENE";
  manuscriptSlug: string;
  title: string;
  summary: string;
  revisionVersion: number;
  visibility: "PUBLIC";
  spoilerTier: "NONE" | "MINOR" | "MAJOR";
  tags: string[];
  releaseSlug: string;
  detailPath: string;
  indexedAt: string;
}

export type SearchDocument = EntitySearchDocument | ManuscriptSearchDocument;

export type SearchQuery = {
  q?: string;
  releaseSlug?: string;
  documentType?: "ENTITY" | "MANUSCRIPT";
  entityType?: EntityType;
  manuscriptType?: "CHAPTER" | "SCENE";
  spoilerTier?: ("NONE" | "MINOR" | "MAJOR")[];
  tags?: string[];
  timelineEraSlug?: string;
  limit: number;
  offset: number;
};

export type SearchHit = {
  id: string;
  documentType: "ENTITY" | "MANUSCRIPT";
  score: number;
  document: SearchDocument;
};

export type SearchResult = {
  resolvedReleaseSlug: string | null;
  total: number;
  hits: SearchHit[];
};
