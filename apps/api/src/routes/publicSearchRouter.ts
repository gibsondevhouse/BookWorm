import { EntityType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { searchIndexService } from "../services/searchIndexService.js";

const spoilerTierEnum = z.enum(["NONE", "MINOR", "MAJOR"]);

const searchQuerySchema = z.object({
  q: z.string().trim().optional(),
  releaseSlug: z.string().optional(),
  documentType: z.enum(["ENTITY", "MANUSCRIPT"]).optional(),
  entityType: z.nativeEnum(EntityType).optional(),
  manuscriptType: z.enum(["CHAPTER", "SCENE"]).optional(),
  spoilerTier: z
    .union([z.array(spoilerTierEnum), spoilerTierEnum])
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      return Array.isArray(v) ? v : [v];
    }),
  tags: z
    .union([z.array(z.string().trim().min(1)), z.string().trim().min(1)])
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      return Array.isArray(v) ? v : v.split(",").map((t) => t.trim()).filter(Boolean);
    }),
  timelineEraSlug: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

export const publicSearchRouter = Router();

publicSearchRouter.get("/", async (request, response) => {
  const parsed = searchQuerySchema.safeParse(request.query);

  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const result = await searchIndexService.search({
    limit: parsed.data.limit,
    offset: parsed.data.offset,
    ...(parsed.data.q !== undefined ? { q: parsed.data.q } : {}),
    ...(parsed.data.releaseSlug !== undefined ? { releaseSlug: parsed.data.releaseSlug } : {}),
    ...(parsed.data.documentType !== undefined ? { documentType: parsed.data.documentType } : {}),
    ...(parsed.data.entityType !== undefined ? { entityType: parsed.data.entityType } : {}),
    ...(parsed.data.manuscriptType !== undefined ? { manuscriptType: parsed.data.manuscriptType } : {}),
    ...(parsed.data.spoilerTier !== undefined ? { spoilerTier: parsed.data.spoilerTier } : {}),
    ...(parsed.data.tags !== undefined ? { tags: parsed.data.tags } : {}),
    ...(parsed.data.timelineEraSlug !== undefined ? { timelineEraSlug: parsed.data.timelineEraSlug } : {})
  });
  response.json(result);
});
