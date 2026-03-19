import { Router } from "express";
import { z } from "zod";

import { publicCodexService } from "../services/publicCodexService.js";

const publicCodexEntityTypeSchema = z.enum(["CHARACTER", "FACTION", "LOCATION", "EVENT"]);

const publicCodexQuerySchema = z.object({
  releaseSlug: z.string().trim().min(1).optional(),
  type: publicCodexEntityTypeSchema.optional(),
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().positive().max(50).default(20)
});

const publicCodexRelatedQuerySchema = z.object({
  releaseSlug: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().positive().max(50).default(20)
});

const publicCodexTimelineQuerySchema = z.object({
  releaseSlug: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().positive().max(50).default(20)
});

const publicCodexManuscriptTypeSchema = z.enum(["CHAPTER", "SCENE"]);

const publicCodexManuscriptsQuerySchema = z.object({
  releaseSlug: z.string().trim().min(1).optional(),
  type: publicCodexManuscriptTypeSchema.optional(),
  limit: z.coerce.number().int().positive().max(50).default(20)
});

const publicCodexManuscriptDetailQuerySchema = z.object({
  releaseSlug: z.string().trim().min(1).optional()
});

const publicCodexReleaseArchiveQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

export const publicCodexRouter = Router();

publicCodexRouter.get("/releases", async (request, response) => {
  const parsedQuery = publicCodexReleaseArchiveQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: parsedQuery.error.flatten()
    });
    return;
  }

  const releases = await publicCodexService.listReleases({
    limit: parsedQuery.data.limit,
    offset: parsedQuery.data.offset
  });

  response.json(releases);
});

publicCodexRouter.get("/", async (request, response) => {
  const parsedQuery = publicCodexQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: parsedQuery.error.flatten()
    });
    return;
  }

  const codex = await publicCodexService.listContent({
    limit: parsedQuery.data.limit,
    ...(parsedQuery.data.releaseSlug === undefined ? {} : { releaseSlug: parsedQuery.data.releaseSlug }),
    ...(parsedQuery.data.type === undefined ? {} : { entityType: parsedQuery.data.type }),
    ...(parsedQuery.data.q === undefined ? {} : { query: parsedQuery.data.q })
  });

  if (!codex.found) {
    response.status(404).json({
      error: "Selected release not found in the public codex"
    });
    return;
  }

  response.json({
    releaseSlug: codex.releaseSlug,
    items: codex.items
  });
});

publicCodexRouter.get("/manuscripts", async (request, response) => {
  const parsedQuery = publicCodexManuscriptsQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: parsedQuery.error.flatten()
    });
    return;
  }

  try {
    const manuscripts = await publicCodexService.listManuscripts({
      limit: parsedQuery.data.limit,
      ...(parsedQuery.data.releaseSlug === undefined ? {} : { releaseSlug: parsedQuery.data.releaseSlug }),
      ...(parsedQuery.data.type === undefined ? {} : { type: parsedQuery.data.type })
    });

    response.json({
      releaseSlug: manuscripts.resolvedReleaseSlug,
      items: manuscripts.items
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PUBLIC_CODEX_RELEASE_NOT_FOUND") {
      response.status(404).json({
        error: "Selected release not found in the public codex"
      });
      return;
    }

    throw error;
  }
});

publicCodexRouter.get("/manuscripts/:slug", async (request, response) => {
  const parsedParams = z
    .object({
      slug: z.string().trim().min(1)
    })
    .safeParse(request.params);

  if (!parsedParams.success) {
    response.status(400).json({
      error: parsedParams.error.flatten()
    });
    return;
  }

  const parsedQuery = publicCodexManuscriptDetailQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: parsedQuery.error.flatten()
    });
    return;
  }

  const manuscript = await publicCodexService.getManuscriptDetail({
    slug: parsedParams.data.slug,
    ...(parsedQuery.data.releaseSlug === undefined ? {} : { releaseSlug: parsedQuery.data.releaseSlug })
  });

  if (!manuscript) {
    response.status(404).json({
      error:
        parsedQuery.data.releaseSlug === undefined
          ? "Manuscript not found in the active public release"
          : "Manuscript not found in the selected public release"
    });
    return;
  }

  response.json(manuscript);
});

publicCodexRouter.get("/:entityType/:slug/related", async (request, response) => {
  const parsedParams = z
    .object({
      entityType: publicCodexEntityTypeSchema,
      slug: z.string().trim().min(1)
    })
    .safeParse(request.params);

  if (!parsedParams.success) {
    response.status(400).json({
      error: parsedParams.error.flatten()
    });
    return;
  }

  const parsedQuery = publicCodexRelatedQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: parsedQuery.error.flatten()
    });
    return;
  }

  const relatedContent = await publicCodexService.listRelatedContent({
    entityType: parsedParams.data.entityType,
    slug: parsedParams.data.slug,
    limit: parsedQuery.data.limit,
    ...(parsedQuery.data.releaseSlug === undefined ? {} : { releaseSlug: parsedQuery.data.releaseSlug })
  });

  if (!relatedContent.found) {
    response.status(404).json({
      error: "Selected release not found in the public codex"
    });
    return;
  }

  if (!relatedContent.sourceFound) {
    response.status(404).json({
      error:
        parsedQuery.data.releaseSlug === undefined
          ? "Entity not found in the active public release"
          : "Entity not found in the selected public release"
    });
    return;
  }

  response.json({
    releaseSlug: relatedContent.releaseSlug,
    source: {
      entityType: relatedContent.entityType,
      slug: relatedContent.slug
    },
    items: relatedContent.items
  });
});

publicCodexRouter.get("/timeline/events", async (request, response) => {
  const parsedQuery = publicCodexTimelineQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: parsedQuery.error.flatten()
    });
    return;
  }

  const timeline = await publicCodexService.listTimelineEvents({
    limit: parsedQuery.data.limit,
    ...(parsedQuery.data.releaseSlug === undefined ? {} : { releaseSlug: parsedQuery.data.releaseSlug })
  });

  if (!timeline.found) {
    response.status(404).json({
      error: "Selected release not found in the public codex"
    });
    return;
  }

  response.json({
    releaseSlug: timeline.releaseSlug,
    items: timeline.items
  });
});
