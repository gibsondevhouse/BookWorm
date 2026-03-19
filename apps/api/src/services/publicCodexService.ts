import type { EntityType } from "@prisma/client";

import { publicCodexManuscriptRepository } from "../repositories/publicCodexManuscriptRepository.js";
import { publicCodexRepository } from "../repositories/publicCodexRepository.js";

export const publicCodexService = {
  async listReleases(input: {
    limit: number;
    offset: number;
  }) {
    return publicCodexRepository.listReleases(input);
  },

  async listContent(input: {
    releaseSlug?: string;
    entityType?: EntityType;
    query?: string;
    limit: number;
  }) {
    return publicCodexRepository.listContent(input);
  },

  async listRelatedContent(input: {
    releaseSlug?: string;
    entityType: EntityType;
    slug: string;
    limit: number;
  }) {
    return publicCodexRepository.listRelatedContent(input);
  },

  async listTimelineEvents(input: {
    releaseSlug?: string;
    limit: number;
  }) {
    return publicCodexRepository.listTimelineEvents(input);
  },

  async listManuscripts(input: {
    releaseSlug?: string;
    type?: "CHAPTER" | "SCENE";
    limit?: number;
  }) {
    return publicCodexManuscriptRepository.listManuscripts(input);
  },

  async getManuscriptDetail(input: {
    slug: string;
    releaseSlug?: string;
  }) {
    return publicCodexManuscriptRepository.getManuscriptDetail(input);
  }
};
