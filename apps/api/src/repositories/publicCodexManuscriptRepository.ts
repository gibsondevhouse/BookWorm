import type { ManuscriptType } from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";

type ManuscriptListItem = {
  manuscriptType: "CHAPTER" | "SCENE";
  manuscriptSlug: string;
  title: string;
  summary: string;
  version: number;
  detailPath: string;
  detailHref: string;
};

type ManuscriptDetail = {
  manuscriptType: "CHAPTER" | "SCENE";
  manuscriptSlug: string;
  title: string;
  summary: string;
  version: number;
  payload: unknown;
  releaseSlug: string;
  detailPath: string;
  detailHref: string;
};

const publicCodexReleaseNotFoundErrorCode = "PUBLIC_CODEX_RELEASE_NOT_FOUND";
const publicManuscriptTypes: ManuscriptType[] = ["CHAPTER", "SCENE"];

const buildDetailPath = (manuscriptSlug: string): string => `/codex/manuscripts/${manuscriptSlug}`;

const buildDetailHref = (input: {
  detailPath: string;
  releaseSlug: string;
  includeReleaseSlugInHref: boolean;
}): string => {
  if (!input.includeReleaseSlugInHref) {
    return input.detailPath;
  }

  return `${input.detailPath}?releaseSlug=${encodeURIComponent(input.releaseSlug)}`;
};

// duplicated from publicCodexRepository.ts — extract to lib/findPublicRelease.ts when convenient
const findPublicRelease = async (releaseSlug?: string): Promise<{ releaseId: string; releaseSlug: string } | null> => {
  if (releaseSlug === undefined) {
    const activeRelease = await prismaClient.release.findFirst({
      where: {
        status: "ACTIVE"
      },
      orderBy: {
        activatedAt: "desc"
      },
      select: {
        id: true,
        slug: true
      }
    });

    if (!activeRelease) {
      return null;
    }

    return {
      releaseId: activeRelease.id,
      releaseSlug: activeRelease.slug
    };
  }

  const selectedRelease = await prismaClient.release.findFirst({
    where: {
      slug: releaseSlug,
      status: {
        in: ["ACTIVE", "ARCHIVED"]
      }
    },
    select: {
      id: true,
      slug: true
    }
  });

  if (!selectedRelease) {
    return null;
  }

  return {
    releaseId: selectedRelease.id,
    releaseSlug: selectedRelease.slug
  };
};

export const publicCodexManuscriptRepository = {
  async listManuscripts(opts: { releaseSlug?: string; type?: "CHAPTER" | "SCENE"; limit?: number }): Promise<{
    resolvedReleaseSlug: string;
    items: ManuscriptListItem[];
  }> {
    const resolvedRelease = await findPublicRelease(opts.releaseSlug);

    if (!resolvedRelease) {
      throw new Error(publicCodexReleaseNotFoundErrorCode);
    }

    const boundedLimit = Math.min(Math.max(opts.limit ?? 20, 1), 50);

    const entries = await prismaClient.releaseManuscriptEntry.findMany({
      where: {
        releaseId: resolvedRelease.releaseId,
        manuscript: {
          type: opts.type === undefined ? { in: publicManuscriptTypes } : opts.type
        },
        manuscriptRevision: {
          visibility: "PUBLIC"
        }
      },
      orderBy: [{ manuscriptRevision: { title: "asc" } }, { manuscript: { slug: "asc" } }],
      take: boundedLimit,
      select: {
        manuscript: {
          select: {
            type: true,
            slug: true
          }
        },
        manuscriptRevision: {
          select: {
            title: true,
            summary: true,
            version: true
          }
        }
      }
    });

    return {
      resolvedReleaseSlug: resolvedRelease.releaseSlug,
      items: entries.map((entry) => {
        const detailPath = buildDetailPath(entry.manuscript.slug);

        return {
          manuscriptType: entry.manuscript.type,
          manuscriptSlug: entry.manuscript.slug,
          title: entry.manuscriptRevision.title,
          summary: entry.manuscriptRevision.summary,
          version: entry.manuscriptRevision.version,
          detailPath,
          detailHref: buildDetailHref({
            detailPath,
            releaseSlug: resolvedRelease.releaseSlug,
            includeReleaseSlugInHref: opts.releaseSlug !== undefined
          })
        };
      })
    };
  },

  async getManuscriptDetail(opts: { slug: string; releaseSlug?: string }): Promise<ManuscriptDetail | null> {
    const resolvedRelease = await findPublicRelease(opts.releaseSlug);

    if (!resolvedRelease) {
      return null;
    }

    const entry = await prismaClient.releaseManuscriptEntry.findFirst({
      where: {
        releaseId: resolvedRelease.releaseId,
        manuscript: {
          slug: opts.slug,
          type: {
            in: publicManuscriptTypes
          }
        },
        manuscriptRevision: {
          visibility: "PUBLIC"
        }
      },
      select: {
        manuscript: {
          select: {
            type: true,
            slug: true
          }
        },
        manuscriptRevision: {
          select: {
            title: true,
            summary: true,
            version: true,
            payload: true
          }
        }
      }
    });

    if (!entry) {
      return null;
    }

    const detailPath = buildDetailPath(entry.manuscript.slug);

    return {
      manuscriptType: entry.manuscript.type,
      manuscriptSlug: entry.manuscript.slug,
      title: entry.manuscriptRevision.title,
      summary: entry.manuscriptRevision.summary,
      version: entry.manuscriptRevision.version,
      payload: entry.manuscriptRevision.payload,
      releaseSlug: resolvedRelease.releaseSlug,
      detailPath,
      detailHref: buildDetailHref({
        detailPath,
        releaseSlug: resolvedRelease.releaseSlug,
        includeReleaseSlugInHref: opts.releaseSlug !== undefined
      })
    };
  }
};
