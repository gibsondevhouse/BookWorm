import type { SearchDocument, SearchQuery, SearchResult } from "./searchTypes.js";

export interface SearchAdapter {
  /**
   * Add or replace a single document by id (upsert semantics).
   * If a document with the same id already exists, it is fully replaced atomically.
   */
  index(doc: SearchDocument): Promise<void>;

  /**
   * Add or replace multiple documents in one operation.
   * Semantically equivalent to sequential index() calls.
   * Implementations may optimize the batch case internally.
   */
  indexBatch(docs: SearchDocument[]): Promise<void>;

  /**
   * Remove the document with the given id from the index.
   * Must resolve without error when the id is not present.
   */
  delete(id: string): Promise<void>;

  /**
   * Execute a search query. Must respect all invariants in §5.4.
   */
  search(query: SearchQuery): Promise<SearchResult>;

  /**
   * Atomically replace the entire index with the provided document set.
   * All previously indexed documents absent from docs are removed.
   */
  rebuild(docs: SearchDocument[]): Promise<void>;

  /**
   * Remove all documents from the index.
   */
  clear(): Promise<void>;

  /**
   * Return adapter readiness.
   */
  healthCheck(): Promise<{ ready: boolean }>;
}
