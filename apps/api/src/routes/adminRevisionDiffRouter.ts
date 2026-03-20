import { Router } from "express";
import { z } from "zod";

import { requireAuthenticatedActor } from "../middleware/requireAuthenticatedActor.js";
import {
  RevisionDiffNotFoundError,
  RevisionDiffTargetMismatchError,
  RevisionNotFoundError,
  revisionDiffService
} from "../services/revisionDiffService.js";

const revisionDiffBodySchema = z.object({
  kind: z.enum(["ENTITY", "MANUSCRIPT"]),
  fromRevisionId: z.string().min(1),
  toRevisionId: z.string().min(1)
});

const revisionDiffQuerySchema = z.object({
  kind: z.enum(["ENTITY", "MANUSCRIPT"]),
  fromRevisionId: z.string().min(1),
  toRevisionId: z.string().min(1)
});

export const adminRevisionDiffRouter = Router();

adminRevisionDiffRouter.use(requireAuthenticatedActor(["EDITOR", "AUTHOR_ADMIN"]));

adminRevisionDiffRouter.get("/", async (request, response) => {
  const parsedQuery = revisionDiffQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: parsedQuery.error.flatten()
    });
    return;
  }

  try {
    const diff = await revisionDiffService.getCachedDiff(parsedQuery.data);

    response.json({
      source: "cache",
      diff
    });
  } catch (error) {
    if (error instanceof RevisionNotFoundError || error instanceof RevisionDiffNotFoundError) {
      response.status(404).json({
        error: error.message
      });
      return;
    }

    if (error instanceof RevisionDiffTargetMismatchError) {
      response.status(400).json({
        error: error.message
      });
      return;
    }

    response.status(500).json({
      error: error instanceof Error ? error.message : "Unable to fetch revision diff"
    });
  }
});

adminRevisionDiffRouter.post("/compute", async (request, response) => {
  const parsedBody = revisionDiffBodySchema.safeParse(request.body);

  if (!parsedBody.success) {
    response.status(400).json({
      error: parsedBody.error.flatten()
    });
    return;
  }

  try {
    const result = await revisionDiffService.getOrCreateDiff(parsedBody.data);

    response.json({
      source: result.fromCache ? "cache" : "computed",
      diff: result.diff
    });
  } catch (error) {
    if (error instanceof RevisionNotFoundError) {
      response.status(404).json({
        error: error.message
      });
      return;
    }

    if (error instanceof RevisionDiffTargetMismatchError) {
      response.status(400).json({
        error: error.message
      });
      return;
    }

    response.status(500).json({
      error: error instanceof Error ? error.message : "Unable to compute revision diff"
    });
  }
});
