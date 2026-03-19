import type {
  EntitySearchDocument,
  ManuscriptSearchDocument,
  SearchDocument,
} from "./searchTypes.js";

export interface SearchIndexBuilder {
  /**
   * Build the full set of indexable documents across all non-DRAFT releases.
   *
   * Ordering guarantee: ARCHIVED-release documents are built before ACTIVE-release documents
   * so that, for shared revision IDs, the ACTIVE-release version takes precedence when the
   * caller passes the result to SearchAdapter.rebuild() or indexBatch().
   *
   * Respects gates E1–E3 for entities and M1–M2 for manuscripts.
   */
  buildAllDocuments(): Promise<SearchDocument[]>;

  /**
   * Build the set of indexable documents for a single named release.
   * Throws if the release does not exist or has status DRAFT.
   */
  buildDocumentsForRelease(releaseSlug: string): Promise<SearchDocument[]>;

  /**
   * Build the indexable document for a single entity revision.
   * Evaluates gates E1–E3 at call time against the current DB state.
   * Returns null if the revision does not satisfy all gates.
   */
  buildEntityDocument(revisionId: string): Promise<EntitySearchDocument | null>;

  /**
   * Build the indexable document for a single manuscript revision.
   * Evaluates gates M1–M2 at call time.
   * Returns null if the revision does not satisfy all gates.
   */
  buildManuscriptDocument(
    manuscriptRevisionId: string
  ): Promise<ManuscriptSearchDocument | null>;
}
