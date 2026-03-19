import { Router } from "express";
import { z } from "zod";

import { requireAuthenticatedActor } from "../middleware/requireAuthenticatedActor.js";
import { chapterAdminService } from "../services/chapterAdminService.js";
import { chapterDraftService } from "../services/chapterDraftService.js";

const saveChapterDraftSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  visibility: z.enum(["PUBLIC", "RESTRICTED", "PRIVATE"]).default("PRIVATE"),
  payload: z.record(z.string(), z.unknown()).optional()
});

export const adminChapterRouter = Router();

adminChapterRouter.use(requireAuthenticatedActor(["EDITOR", "AUTHOR_ADMIN"]));

adminChapterRouter.get("/:slug/history", async (request, response) => {
  const history = await chapterAdminService.getHistory({
    actor: response.locals.actor,
    slug: request.params.slug
  });

  if (history.length === 0) {
    response.status(404).json({
      error: "Chapter draft not found"
    });
    return;
  }

  response.json({
    chapterSlug: request.params.slug,
    revisions: history.map((revision) => ({
      manuscriptRevisionId: revision.manuscriptRevisionId,
      version: revision.version,
      title: revision.title,
      summary: revision.summary,
      visibility: revision.visibility,
      payload: revision.payload,
      createdAt: revision.createdAt.toISOString(),
      createdBy: revision.createdBy
    }))
  });
});

adminChapterRouter.get("/:slug", async (request, response) => {
  const chapter = await chapterAdminService.getBySlug({
    actor: response.locals.actor,
    slug: request.params.slug
  });

  if (!chapter) {
    response.status(404).json({
      error: "Chapter draft not found"
    });
    return;
  }

  response.json({
    chapterSlug: chapter.manuscriptSlug,
    manuscriptType: chapter.manuscriptType,
    manuscriptRevisionId: chapter.manuscriptRevisionId,
    version: chapter.version,
    title: chapter.title,
    summary: chapter.summary,
    visibility: chapter.visibility,
    payload: chapter.payload,
    createdAt: chapter.createdAt.toISOString(),
    createdBy: chapter.createdBy
  });
});

adminChapterRouter.post("/drafts", async (request, response) => {
  const parsedBody = saveChapterDraftSchema.safeParse(request.body);

  if (!parsedBody.success) {
    response.status(400).json({
      error: parsedBody.error.flatten()
    });
    return;
  }

  try {
    const chapterDraft = await chapterDraftService.saveDraft({
      actor: response.locals.actor,
      slug: parsedBody.data.slug,
      title: parsedBody.data.title,
      summary: parsedBody.data.summary,
      visibility: parsedBody.data.visibility,
      ...(parsedBody.data.payload === undefined ? {} : { payload: parsedBody.data.payload })
    });

    response.status(201).json(chapterDraft);
  } catch (error) {
    response.status(403).json({
      error: error instanceof Error ? error.message : "Unable to save chapter draft"
    });
  }
});