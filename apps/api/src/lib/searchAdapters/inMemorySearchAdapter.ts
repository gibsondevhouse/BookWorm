import type { SearchAdapter } from "../searchAdapter.js";
import type { SearchDocument, SearchQuery, SearchResult } from "../searchTypes.js";

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

    // 9. q: case-insensitive substring match
    if (query.q !== undefined && query.q.trim().length > 0) {
      const q = query.q.toLowerCase().trim();
      filtered = filtered.filter((doc) => {
        const haystack =
          doc.documentType === "ENTITY"
            ? `${doc.name} ${doc.summary}`
            : `${doc.title} ${doc.summary}`;
        return haystack.toLowerCase().includes(q);
      });
    }

    const total = filtered.length;
    const safeOffset = Math.max(0, query.offset);
    const hits = filtered.slice(safeOffset, safeOffset + query.limit).map((doc) => ({
      id: doc.id,
      documentType: doc.documentType,
      score: 1.0,
      document: doc
    }));

    return { resolvedReleaseSlug: query.releaseSlug, total, hits };
  }
}
