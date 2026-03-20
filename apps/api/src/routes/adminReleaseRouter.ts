import { Router } from "express";
import { z } from "zod";

import { requireAuthenticatedActor } from "../middleware/requireAuthenticatedActor.js";
import { continuityIssueService } from "../services/continuityIssueService.js";
import { ReleaseActivationContinuityError } from "../services/releaseActivationContinuityError.js";
import { releaseHistoryService } from "../services/releaseHistoryService.js";
import { releaseService } from "../services/releaseService.js";
import { searchIndexService } from "../services/searchIndexService.js";
import { ReleaseActivationDependencyError } from "../services/releaseActivationDependencyError.js";
import { ReleaseActivationGuardError } from "../services/releaseActivationGuardError.js";
import { ReleaseMutationGuardError } from "../services/releaseMutationGuardError.js";

const createReleaseSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1)
});

const includeRevisionSchema = z
  .object({
    entitySlug: z.string().min(1).optional(),
    characterSlug: z.string().min(1).optional(),
    eventSlug: z.string().min(1).optional(),
    factionSlug: z.string().min(1).optional(),
    locationSlug: z.string().min(1).optional(),
    manuscriptSlug: z.string().min(1).optional(),
    chapterSlug: z.string().min(1).optional(),
    sceneSlug: z.string().min(1).optional(),
    revisionId: z.string().min(1).optional(),
    manuscriptRevisionId: z.string().min(1).optional()
  })
  .superRefine((value, context) => {
    const entitySlug = value.entitySlug ?? value.characterSlug ?? value.eventSlug ?? value.factionSlug ?? value.locationSlug;
    const manuscriptSlug = value.manuscriptSlug ?? value.chapterSlug ?? value.sceneSlug;

    if (!entitySlug && !manuscriptSlug) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "An entity or manuscript slug is required",
        path: ["entitySlug"]
      });
      return;
    }

    if (entitySlug && manuscriptSlug) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Entries can include either an entity revision or a manuscript revision, but not both",
        path: ["entitySlug"]
      });
    }

    if (entitySlug && !value.revisionId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Entity entries require revisionId",
        path: ["revisionId"]
      });
    }

    if (manuscriptSlug && !(value.manuscriptRevisionId ?? value.revisionId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Manuscript entries require manuscriptRevisionId",
        path: ["manuscriptRevisionId"]
      });
    }
  });

const continuityRunSchema = z.object({
  source: z.enum(["MANUAL", "ACTIVATION"]).optional()
});

const continuityIssueListQuerySchema = z.object({
  status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"]).optional(),
  severity: z.enum(["BLOCKING", "WARNING"]).optional(),
  ruleCode: z.string().min(1).optional(),
  subjectType: z.enum(["RELEASE", "ENTITY_REVISION", "MANUSCRIPT_REVISION", "RELATIONSHIP_REVISION"]).optional(),
  limit: z.coerce.number().int().min(1).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  sort: z
    .enum([
      "detectedAt.desc",
      "detectedAt.asc",
      "severity.desc",
      "severity.asc",
      "status.asc",
      "status.desc",
      "ruleCode.asc",
      "ruleCode.desc"
    ])
    .optional()
});

const continuityIssueStatusSchema = z.object({
  status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"])
});

const releaseHistoryQuerySchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

export const adminReleaseRouter = Router();

adminReleaseRouter.use(requireAuthenticatedActor(["AUTHOR_ADMIN"]));

adminReleaseRouter.get("/history", async (request, response) => {
  const parsedQuery = releaseHistoryQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: parsedQuery.error.flatten()
    });
    return;
  }

  try {
    const history = await releaseHistoryService.listReleaseHistory({
      actor: response.locals.actor,
      ...(parsedQuery.data.status === undefined ? {} : { status: parsedQuery.data.status }),
      limit: parsedQuery.data.limit,
      offset: parsedQuery.data.offset
    });

    response.json(history);
  } catch (error) {
    response.status(403).json({
      error: error instanceof Error ? error.message : "Unable to list release history"
    });
  }
});

adminReleaseRouter.get("/:slug/history", async (request, response) => {
  try {
    const history = await releaseHistoryService.getReleaseHistoryDetail({
      actor: response.locals.actor,
      releaseSlug: request.params.slug
    });

    response.json(history);
  } catch (error) {
    if (error instanceof Error && error.message === "Release not found") {
      response.status(404).json({
        error: error.message
      });
      return;
    }

    response.status(403).json({
      error: error instanceof Error ? error.message : "Unable to load release history detail"
    });
  }
});

adminReleaseRouter.get("/:slug/review", async (request, response) => {
  try {
    const reviewStatus = await releaseService.getReviewStatus({
      actor: response.locals.actor,
      releaseSlug: request.params.slug
    });

    response.json(reviewStatus);
  } catch (error) {
    response.status(404).json({
      error: error instanceof Error ? error.message : "Unable to build release review"
    });
  }
});

adminReleaseRouter.get("/:slug/validation", async (request, response) => {
  try {
    const validationStatus = await releaseService.getValidationStatus({
      actor: response.locals.actor,
      releaseSlug: request.params.slug
    });

    response.json(validationStatus);
  } catch (error) {
    response.status(404).json({
      error: error instanceof Error ? error.message : "Unable to validate release"
    });
  }
});

adminReleaseRouter.get("/:slug/dependency-status", async (request, response) => {
  try {
    const dependencyStatus = await releaseService.getDependencyStatus({
      actor: response.locals.actor,
      releaseSlug: request.params.slug
    });

    response.json(dependencyStatus);
  } catch (error) {
    response.status(404).json({
      error: error instanceof Error ? error.message : "Unable to resolve release dependency status"
    });
  }
});

adminReleaseRouter.post("/", async (request, response) => {
  const parsedBody = createReleaseSchema.safeParse(request.body);

  if (!parsedBody.success) {
    response.status(400).json({
      error: parsedBody.error.flatten()
    });
    return;
  }

  try {
    const release = await releaseService.createRelease({
      actor: response.locals.actor,
      ...parsedBody.data
    });

    response.status(201).json(release);
  } catch (error) {
    response.status(403).json({
      error: error instanceof Error ? error.message : "Unable to create release"
    });
  }
});

adminReleaseRouter.post("/:slug/entries", async (request, response) => {
  const parsedBody = includeRevisionSchema.safeParse(request.body);

  if (!parsedBody.success) {
    response.status(400).json({
      error: parsedBody.error.flatten()
    });
    return;
  }

  try {
    const entitySlug =
      parsedBody.data.entitySlug ??
      parsedBody.data.characterSlug ??
      parsedBody.data.eventSlug ??
      parsedBody.data.factionSlug ??
      parsedBody.data.locationSlug;

    const manuscriptSlug = parsedBody.data.manuscriptSlug ?? parsedBody.data.chapterSlug ?? parsedBody.data.sceneSlug;

    const releaseEntry =
      entitySlug === undefined
        ? await releaseService.includeManuscriptRevision({
            actor: response.locals.actor,
            releaseSlug: request.params.slug,
            manuscriptSlug: manuscriptSlug ?? "",
            manuscriptRevisionId: parsedBody.data.manuscriptRevisionId ?? parsedBody.data.revisionId ?? ""
          })
        : await releaseService.includeRevision({
            actor: response.locals.actor,
            releaseSlug: request.params.slug,
            entitySlug,
            revisionId: parsedBody.data.revisionId ?? ""
          });

    response.status(201).json(releaseEntry);
  } catch (error) {
    if (error instanceof ReleaseMutationGuardError) {
      response.status(409).json({
        error: error.message,
        code: error.code,
        releaseSlug: error.releaseSlug,
        releaseStatus: error.releaseStatus
      });
      return;
    }

    response.status(404).json({
      error: error instanceof Error ? error.message : "Unable to include revision"
    });
  }
});

adminReleaseRouter.post("/:slug/activate", async (request, response) => {
  try {
    const release = await releaseService.activateRelease({
      actor: response.locals.actor,
      releaseSlug: request.params.slug
    });

    response.json(release);
    // Triggers R1 (DRAFT → ACTIVE) and R2 (ACTIVE → ARCHIVED implicitly via
    // releaseRepository.activateRelease transaction). Fire-and-forget so activation
    // response returns immediately; index reflects new state within rebuild time.
    searchIndexService.rebuildIndex().catch((error) => {
      console.error("[search] post-activation rebuild failed:", error);
    });
  } catch (error) {
    if (error instanceof ReleaseActivationGuardError) {
      response.status(409).json({
        error: error.message,
        code: error.code,
        releaseSlug: error.releaseSlug,
        ...(error.releaseStatus === undefined ? {} : { releaseStatus: error.releaseStatus })
      });
      return;
    }

    if (error instanceof ReleaseActivationDependencyError) {
      response.status(409).json({
        error: error.message,
        dependencyStatus: error.dependencyStatus
      });
      return;
    }

    if (error instanceof ReleaseActivationContinuityError) {
      response.status(409).json({
        error: error.message,
        continuityStatus: error.continuityStatus
      });
      return;
    }

    response.status(404).json({
      error: error instanceof Error ? error.message : "Unable to activate release"
    });
  }
});

adminReleaseRouter.post("/:slug/continuity/runs", async (request, response) => {
  const parsedBody = continuityRunSchema.safeParse(request.body ?? {});

  if (!parsedBody.success) {
    response.status(400).json({
      error: parsedBody.error.flatten()
    });
    return;
  }

  try {
    const result = await continuityIssueService.runBaseline({
      actor: response.locals.actor,
      releaseSlug: request.params.slug,
      ...(parsedBody.data.source === undefined ? {} : { source: parsedBody.data.source })
    });

    response.json(result);
  } catch (error) {
    response.status(404).json({
      error: error instanceof Error ? error.message : "Unable to run continuity checks"
    });
  }
});

adminReleaseRouter.get("/:slug/continuity/issues", async (request, response) => {
  const parsedQuery = continuityIssueListQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: parsedQuery.error.flatten()
    });
    return;
  }

  try {
    const issues = await continuityIssueService.listIssues({
      actor: response.locals.actor,
      releaseSlug: request.params.slug,
      limit: Math.min(parsedQuery.data.limit ?? 50, 200),
      offset: parsedQuery.data.offset ?? 0,
      sort: parsedQuery.data.sort ?? "detectedAt.desc",
      ...(parsedQuery.data.status === undefined ? {} : { status: parsedQuery.data.status }),
      ...(parsedQuery.data.severity === undefined ? {} : { severity: parsedQuery.data.severity }),
      ...(parsedQuery.data.ruleCode === undefined ? {} : { ruleCode: parsedQuery.data.ruleCode }),
      ...(parsedQuery.data.subjectType === undefined ? {} : { subjectType: parsedQuery.data.subjectType })
    });

    response.json(issues);
  } catch (error) {
    response.status(404).json({
      error: error instanceof Error ? error.message : "Unable to list continuity issues"
    });
  }
});

adminReleaseRouter.patch("/:slug/continuity/issues/:issueId/status", async (request, response) => {
  const parsedBody = continuityIssueStatusSchema.safeParse(request.body);

  if (!parsedBody.success) {
    response.status(400).json({
      error: parsedBody.error.flatten()
    });
    return;
  }

  try {
    const issue = await continuityIssueService.updateIssueStatus({
      actor: response.locals.actor,
      releaseSlug: request.params.slug,
      issueId: request.params.issueId,
      status: parsedBody.data.status
    });

    response.json(issue);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid continuity issue status transition") {
      response.status(400).json({ error: error.message });
      return;
    }

    response.status(404).json({
      error: error instanceof Error ? error.message : "Unable to update continuity issue status"
    });
  }
});