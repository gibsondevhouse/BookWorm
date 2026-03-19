import { EntityType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { publicDiscoveryService } from "../services/publicDiscoveryService.js";

const publicDiscoveryQuerySchema = z.object({
  type: z.nativeEnum(EntityType).optional(),
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().positive().max(50).default(20)
});

export const publicDiscoveryRouter = Router();

publicDiscoveryRouter.get("/", async (request, response) => {
  const parsedQuery = publicDiscoveryQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: parsedQuery.error.flatten()
    });
    return;
  }

  const discovery = await publicDiscoveryService.listContent({
    limit: parsedQuery.data.limit,
    ...(parsedQuery.data.type === undefined ? {} : { entityType: parsedQuery.data.type }),
    ...(parsedQuery.data.q === undefined ? {} : { query: parsedQuery.data.q })
  });

  response.json(discovery);
});