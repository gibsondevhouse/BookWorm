import type { SearchAdapter } from "../searchAdapter.js";
import type { SearchDocument, SearchQuery, SearchResult } from "../searchTypes.js";

type MatchBucket = "EXACT" | "EXPANDED" | "TYPO" | "METADATA";

type RankedDocument = {
  doc: SearchDocument;
  bucket: MatchBucket;
  score: number;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function getPrimaryText(doc: SearchDocument): string {
  return doc.documentType === "ENTITY" ? doc.name : doc.title;
}

function getBodyText(doc: SearchDocument): string {
  return doc.documentType === "ENTITY"
    ? `${doc.name} ${doc.summary}`
    : `${doc.title} ${doc.summary}`;
}

function rankDocument(doc: SearchDocument, query: SearchQuery): RankedDocument | null {
  if (query.q === undefined || query.q.trim().length === 0) {
    return {
      doc,
      bucket: "EXACT",
      score: 1.0
    };
  }

  const q = normalize(query.q);
  const expandedTerms = (query.expandedTerms ?? []).map(normalize);
  const typoTerms = (query.typoTerms ?? []).map(normalize);
  const primary = normalize(getPrimaryText(doc));
  const body = normalize(getBodyText(doc));
  const tags = doc.tags.map(normalize);
  const timelineEra = doc.documentType === "ENTITY" ? normalize(doc.timelineEraSlug ?? "") : "";

  if (primary === q) {
    return {
      doc,
      bucket: "EXACT",
      score: 1.0
    };
  }

  if (body.includes(q)) {
    return {
      doc,
      bucket: "EXACT",
      score: 0.95
    };
  }

  for (const term of expandedTerms) {
    if (primary.includes(term) || body.includes(term)) {
      return {
        doc,
        bucket: "EXPANDED",
        score: 0.8
      };
    }
  }

  for (const term of typoTerms) {
    if (primary.includes(term) || body.includes(term)) {
      return {
        doc,
        bucket: "TYPO",
        score: 0.7
      };
    }
  }

  for (const term of expandedTerms) {
    if (tags.includes(term) || (timelineEra && timelineEra === term)) {
      return {
        doc,
        bucket: "METADATA",
        score: 0.65
      };
    }
  }

  return null;
}

function compareRankedDocuments(a: RankedDocument, b: RankedDocument): number {
  if (a.score !== b.score) {
    return b.score - a.score;
  }

  const aPrimary = normalize(getPrimaryText(a.doc));
  const bPrimary = normalize(getPrimaryText(b.doc));
  const primaryCompare = aPrimary.localeCompare(bPrimary);
  if (primaryCompare !== 0) {
    return primaryCompare;
  }

  const typeCompare = a.doc.documentType.localeCompare(b.doc.documentType);
  if (typeCompare !== 0) {
    return typeCompare;
  }

  return a.doc.id.localeCompare(b.doc.id);
}

export class InMemorySearchAdapter implements SearchAdapter {
  private readonly store = new Map<string, SearchDocument>();

  async index(doc: SearchDocument): Promise<void> {
    this.store.set(doc.id, doc);
  }

  async indexBatch(docs: SearchDocument[]): Promise<void> {
    for (const doc of docs) {
      this.store.set(doc.id, doc);
    }
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async rebuild(docs: SearchDocument[]): Promise<void> {
    this.store.clear();
    for (const doc of docs) {
      this.store.set(doc.id, doc);
    }
  }

  async healthCheck(): Promise<{ ready: boolean }> {
    return { ready: true };
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    if (!query.releaseSlug) {
      return { resolvedReleaseSlug: null, total: 0, hits: [] };
    }

    let filtered = Array.from(this.store.values());

    // 1. Visibility guard
    filtered = filtered.filter((doc) => doc.visibility === "PUBLIC");

    // 2. Release scope
    filtered = filtered.filter((doc) => doc.releaseSlug === query.releaseSlug);

    // 3. documentType filter
    if (query.documentType !== undefined) {
      filtered = filtered.filter((doc) => doc.documentType === query.documentType);
    }

    // 4. entityType filter — applies only to ENTITY docs
    if (query.entityType !== undefined) {
      filtered = filtered.filter(
        (doc) => doc.documentType !== "ENTITY" || doc.entityType === query.entityType
      );
    }

    // 5. manuscriptType filter — applies only to MANUSCRIPT docs
    if (query.manuscriptType !== undefined) {
      filtered = filtered.filter(
        (doc) => doc.documentType !== "MANUSCRIPT" || doc.manuscriptType === query.manuscriptType
      );
    }

    // 6. spoilerTier filter — OR semantics
    if (query.spoilerTier !== undefined && query.spoilerTier.length > 0) {
      filtered = filtered.filter((doc) => query.spoilerTier!.includes(doc.spoilerTier));
    }

    // 7. tags filter — AND semantics
    if (query.tags !== undefined && query.tags.length > 0) {
      filtered = filtered.filter((doc) =>
        query.tags!.every((t) => doc.tags.includes(t))
      );
    }

    // 8. timelineEraSlug filter — ENTITY docs only
    if (query.timelineEraSlug !== undefined) {
      filtered = filtered.filter(
        (doc) =>
          doc.documentType !== "ENTITY" ||
          doc.timelineEraSlug === query.timelineEraSlug
      );
    }

    const ranked = filtered
      .map((doc) => rankDocument(doc, query))
      .filter((item): item is RankedDocument => item !== null)
      .sort(compareRankedDocuments);

    const total = ranked.length;
    const safeOffset = Math.max(0, query.offset);
    const hits = ranked.slice(safeOffset, safeOffset + query.limit).map((item) => ({
      id: item.doc.id,
      documentType: item.doc.documentType,
      score: item.score,
      document: item.doc
    }));

    return { resolvedReleaseSlug: query.releaseSlug, total, hits };
  }
}
