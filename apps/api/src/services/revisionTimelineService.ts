import { type EntityType, type ManuscriptType, type RevisionDiffKind } from "@prisma/client";

import { revisionTimelineRepository, type RevisionTimelineFilters } from "../repositories/revisionTimelineRepository.js";
import { revisionDiffService } from "./revisionDiffService.js";

export const revisionTimelineService = {
  async getEntityTimeline(input: {
    entityType: EntityType;
    slug: string;
    filters: RevisionTimelineFilters;
  }) {
    return revisionTimelineRepository.listEntityRevisionTimeline(input);
  },

  async getManuscriptTimeline(input: {
    manuscriptType: ManuscriptType;
    slug: string;
    filters: RevisionTimelineFilters;
  }) {
    return revisionTimelineRepository.listManuscriptRevisionTimeline(input);
  },

  async compareRevisions(input: {
    kind: RevisionDiffKind;
    fromRevisionId: string;
    toRevisionId: string;
  }) {
    return revisionDiffService.computeDiff(input);
  }
};