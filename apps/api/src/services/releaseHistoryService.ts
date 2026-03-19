import { type Role } from "@prisma/client";

import { type SessionActor } from "../auth/sessionActor.js";
import { releaseHistoryRepository } from "../repositories/releaseHistoryRepository.js";

const allowedReleaseHistoryRoles: Role[] = ["AUTHOR_ADMIN"];

const assertReleaseHistoryRole = (actorRole: Role): void => {
  if (!allowedReleaseHistoryRoles.includes(actorRole)) {
    throw new Error("Release history requires author-admin role");
  }
};

export const releaseHistoryService = {
  async listReleaseHistory(input: {
    actor: SessionActor;
    status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
    limit: number;
    offset: number;
  }): Promise<{
    items: Array<{
      slug: string;
      name: string;
      status: "DRAFT" | "ACTIVE" | "ARCHIVED";
      createdAt: string;
      activatedAt: string | null;
      entryCounts: {
        entities: number;
        manuscripts: number;
        relationships: number;
      };
      isMutable: boolean;
    }>;
    page: {
      limit: number;
      offset: number;
      total: number;
    };
  }> {
    assertReleaseHistoryRole(input.actor.role);

    const history = await releaseHistoryRepository.listReleaseHistory({
      ...(input.status === undefined ? {} : { status: input.status }),
      limit: input.limit,
      offset: input.offset
    });

    return {
      items: history.items.map((item) => ({
        slug: item.slug,
        name: item.name,
        status: item.status,
        createdAt: item.createdAt.toISOString(),
        activatedAt: item.activatedAt?.toISOString() ?? null,
        entryCounts: item.entryCounts,
        isMutable: false
      })),
      page: {
        limit: input.limit,
        offset: input.offset,
        total: history.total
      }
    };
  },

  async getReleaseHistoryDetail(input: {
    actor: SessionActor;
    releaseSlug: string;
  }): Promise<{
    release: {
      slug: string;
      name: string;
      status: "DRAFT" | "ACTIVE" | "ARCHIVED";
      createdAt: string;
      activatedAt: string | null;
      isMutable: boolean;
    };
    composition: {
      entityEntries: Array<{
        entitySlug: string;
        entityType: string;
        revisionId: string;
        version: number;
        visibility: "PUBLIC" | "RESTRICTED" | "PRIVATE";
      }>;
      manuscriptEntries: Array<{
        manuscriptSlug: string;
        manuscriptType: string;
        manuscriptRevisionId: string;
        version: number;
        visibility: "PUBLIC" | "RESTRICTED" | "PRIVATE";
      }>;
      relationshipEntries: Array<{
        relationshipId: string;
        relationshipRevisionId: string;
        relationType: string;
        version: number;
        visibility: "PUBLIC" | "RESTRICTED" | "PRIVATE";
      }>;
    };
  }> {
    assertReleaseHistoryRole(input.actor.role);

    const historyDetail = await releaseHistoryRepository.getReleaseHistoryDetail(input.releaseSlug);

    if (!historyDetail) {
      throw new Error("Release not found");
    }

    return {
      release: {
        slug: historyDetail.slug,
        name: historyDetail.name,
        status: historyDetail.status,
        createdAt: historyDetail.createdAt.toISOString(),
        activatedAt: historyDetail.activatedAt?.toISOString() ?? null,
        isMutable: false
      },
      composition: {
        entityEntries: historyDetail.entityEntries,
        manuscriptEntries: historyDetail.manuscriptEntries,
        relationshipEntries: historyDetail.relationshipEntries
      }
    };
  }
};
