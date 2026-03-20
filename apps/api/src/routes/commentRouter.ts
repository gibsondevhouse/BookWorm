import { EntityType } from "@prisma/client";
import { type Response, Router } from "express";
import { z } from "zod";

import { requireAuthenticatedActor } from "../middleware/requireAuthenticatedActor.js";
import {
  commentService,
  type CommentThreadItem,
  type CommentVersionHistoryItem
} from "../services/commentService.js";

const entityParamsSchema = z.object({
  type: z.nativeEnum(EntityType),
  slug: z.string().min(1)
});

const manuscriptParamsSchema = z.object({
  id: z.string().min(1)
});

const commentIdParamsSchema = z.object({
  id: z.string().min(1)
});

const entityReplyParamsSchema = z.object({
  type: z.nativeEnum(EntityType),
  slug: z.string().min(1),
  commentId: z.string().min(1)
});

const manuscriptReplyParamsSchema = z.object({
  id: z.string().min(1),
  commentId: z.string().min(1)
});

const listCommentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const commentTypeSchema = z.enum(["GENERAL", "QUESTION", "SUGGESTION", "CONCERN", "RESOLVED"]);
const commentSeveritySchema = z.enum(["INFO", "MINOR", "MAJOR"]);
const commentTagSchema = z.enum(["SPELLING", "FACTUAL", "CONSISTENCY", "CLARITY", "TONE"]);

const createCommentBodySchema = z.object({
  body: z.string().trim().min(1).max(5000),
  type: commentTypeSchema.optional().default("GENERAL"),
  severity: commentSeveritySchema.optional().default("INFO"),
  tags: z.array(commentTagSchema).optional().default([])
});

const editCommentBodySchema =
  z
    .object({
      body: z.string().trim().min(1).max(5000).optional(),
      type: commentTypeSchema.optional(),
      severity: commentSeveritySchema.optional(),
      tags: z.array(commentTagSchema).optional(),
      editReason: z.string().trim().min(1).max(250).optional()
    })
    .refine(
      (value) =>
        value.body !== undefined ||
        value.type !== undefined ||
        value.severity !== undefined ||
        value.tags !== undefined,
      {
        message: "At least one editable comment field is required"
      }
    );

const commentEditReasonSchema = z.object({
  editReason: z.string().trim().min(1).max(250).optional()
});

type SerializedComment = {
  id: string;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  userId: string;
  author: CommentThreadItem["author"];
  entityId: string | null;
  manuscriptId: string | null;
  parentCommentId: string | null;
  body: string;
  type: CommentThreadItem["type"];
  severity: CommentThreadItem["severity"];
  tags: CommentThreadItem["tags"];
  status: CommentThreadItem["status"];
  replies: SerializedComment[];
};

type SerializedCommentVersionHistoryItem = {
  id: string;
  commentId: string;
  version: number;
  editedById: string;
  editReason: string;
  createdAt: string;
  editor: CommentVersionHistoryItem["editor"];
  previous: {
    body: string;
    type: CommentVersionHistoryItem["previous"]["type"];
    severity: CommentVersionHistoryItem["previous"]["severity"];
    tags: CommentVersionHistoryItem["previous"]["tags"];
    status: CommentVersionHistoryItem["previous"]["status"];
  };
  resulting: {
    body: string;
    type: CommentVersionHistoryItem["resulting"]["type"];
    severity: CommentVersionHistoryItem["resulting"]["severity"];
    tags: CommentVersionHistoryItem["resulting"]["tags"];
    status: CommentVersionHistoryItem["resulting"]["status"];
  };
};

const serializeComment = (comment: CommentThreadItem): SerializedComment => ({
  id: comment.id,
  createdAt: comment.createdAt.toISOString(),
  updatedAt: comment.updatedAt.toISOString(),
  editedAt: comment.editedAt?.toISOString() ?? null,
  userId: comment.userId,
  author: comment.author,
  entityId: comment.entityId,
  manuscriptId: comment.manuscriptId,
  parentCommentId: comment.parentCommentId,
  body: comment.body,
  type: comment.type,
  severity: comment.severity,
  tags: comment.tags,
  status: comment.status,
  replies: comment.replies.map((reply) => serializeComment(reply))
});

const serializeCommentHistoryItem = (
  item: CommentVersionHistoryItem
): SerializedCommentVersionHistoryItem => ({
  id: item.id,
  commentId: item.commentId,
  version: item.version,
  editedById: item.editedById,
  editReason: item.editReason,
  createdAt: item.createdAt.toISOString(),
  editor: item.editor,
  previous: item.previous,
  resulting: item.resulting
});

const handleCommentError = (error: unknown, response: Response): void => {
  if (!(error instanceof Error)) {
    response.status(500).json({
      error: "Unexpected comment error"
    });
    return;
  }

  if (
    error.message === "Entity not found" ||
    error.message === "Manuscript not found" ||
    error.message === "Parent comment not found" ||
    error.message === "Comment not found"
  ) {
    response.status(404).json({
      error: error.message
    });
    return;
  }

  if (
    error.message === "Only the comment author can edit this comment" ||
    error.message === "Only the comment author or author-admin can delete this comment" ||
    error.message === "Only author-admin can archive comments" ||
    error.message === "Only authenticated collaborators can change comment status"
  ) {
    response.status(403).json({
      error: error.message
    });
    return;
  }

  if (
    error.message.includes("Comment body") ||
    error.message.includes("Comment edit reason") ||
    error.message.includes("Comment metadata") ||
    error.message === "No comment changes provided"
  ) {
    response.status(400).json({
      error: error.message
    });
    return;
  }

  if (error.message === "Parent comment target mismatch") {
    response.status(400).json({
      error: error.message
    });
    return;
  }

  if (error.message === "Comment lifecycle transition is invalid") {
    response.status(409).json({
      error: error.message
    });
    return;
  }

  response.status(500).json({
    error: error.message
  });
};

export const commentRouter = Router();
const requireCommentActor = requireAuthenticatedActor(["EDITOR", "AUTHOR_ADMIN"]);

commentRouter.post("/entities/:type/:slug/comments", requireCommentActor, async (request, response) => {
  const parsedParams = entityParamsSchema.safeParse(request.params);
  const parsedBody = createCommentBodySchema.safeParse(request.body);

  if (!parsedParams.success || !parsedBody.success) {
    response.status(400).json({
      error: {
        params: parsedParams.success ? null : parsedParams.error.flatten(),
        body: parsedBody.success ? null : parsedBody.error.flatten()
      }
    });
    return;
  }

  try {
    const comment = await commentService.createComment({
      userId: response.locals.actor.userId,
      body: parsedBody.data.body,
      type: parsedBody.data.type,
      severity: parsedBody.data.severity,
      tags: parsedBody.data.tags,
      target: {
        entityType: parsedParams.data.type,
        entitySlug: parsedParams.data.slug
      }
    });

    response.status(201).json(serializeComment(comment));
  } catch (error) {
    handleCommentError(error, response);
  }
});

commentRouter.get("/entities/:type/:slug/comments", requireCommentActor, async (request, response) => {
  const parsedParams = entityParamsSchema.safeParse(request.params);
  const parsedQuery = listCommentsQuerySchema.safeParse(request.query);

  if (!parsedParams.success || !parsedQuery.success) {
    response.status(400).json({
      error: {
        params: parsedParams.success ? null : parsedParams.error.flatten(),
        query: parsedQuery.success ? null : parsedQuery.error.flatten()
      }
    });
    return;
  }

  try {
    const threads = await commentService.listCommentThreads({
      target: {
        entityType: parsedParams.data.type,
        entitySlug: parsedParams.data.slug
      },
      page: parsedQuery.data.page,
      limit: parsedQuery.data.limit
    });

    response.json({
      page: threads.page,
      limit: threads.limit,
      total: threads.total,
      threads: threads.threads.map((thread) => serializeComment(thread))
    });
  } catch (error) {
    handleCommentError(error, response);
  }
});

commentRouter.post("/entities/:type/:slug/comments/:commentId/replies", requireCommentActor, async (request, response) => {
  const parsedParams = entityReplyParamsSchema.safeParse(request.params);
  const parsedBody = createCommentBodySchema.safeParse(request.body);

  if (!parsedParams.success || !parsedBody.success) {
    response.status(400).json({
      error: {
        params: parsedParams.success ? null : parsedParams.error.flatten(),
        body: parsedBody.success ? null : parsedBody.error.flatten()
      }
    });
    return;
  }

  try {
    const comment = await commentService.replyToComment({
      userId: response.locals.actor.userId,
      parentCommentId: parsedParams.data.commentId,
      body: parsedBody.data.body,
      type: parsedBody.data.type,
      severity: parsedBody.data.severity,
      tags: parsedBody.data.tags,
      target: {
        entityType: parsedParams.data.type,
        entitySlug: parsedParams.data.slug
      }
    });

    response.status(201).json(serializeComment(comment));
  } catch (error) {
    handleCommentError(error, response);
  }
});

commentRouter.post("/manuscripts/:id/comments", requireCommentActor, async (request, response) => {
  const parsedParams = manuscriptParamsSchema.safeParse(request.params);
  const parsedBody = createCommentBodySchema.safeParse(request.body);

  if (!parsedParams.success || !parsedBody.success) {
    response.status(400).json({
      error: {
        params: parsedParams.success ? null : parsedParams.error.flatten(),
        body: parsedBody.success ? null : parsedBody.error.flatten()
      }
    });
    return;
  }

  try {
    const comment = await commentService.createComment({
      userId: response.locals.actor.userId,
      body: parsedBody.data.body,
      type: parsedBody.data.type,
      severity: parsedBody.data.severity,
      tags: parsedBody.data.tags,
      target: {
        manuscriptId: parsedParams.data.id
      }
    });

    response.status(201).json(serializeComment(comment));
  } catch (error) {
    handleCommentError(error, response);
  }
});

commentRouter.get("/manuscripts/:id/comments", requireCommentActor, async (request, response) => {
  const parsedParams = manuscriptParamsSchema.safeParse(request.params);
  const parsedQuery = listCommentsQuerySchema.safeParse(request.query);

  if (!parsedParams.success || !parsedQuery.success) {
    response.status(400).json({
      error: {
        params: parsedParams.success ? null : parsedParams.error.flatten(),
        query: parsedQuery.success ? null : parsedQuery.error.flatten()
      }
    });
    return;
  }

  try {
    const threads = await commentService.listCommentThreads({
      target: {
        manuscriptId: parsedParams.data.id
      },
      page: parsedQuery.data.page,
      limit: parsedQuery.data.limit
    });

    response.json({
      page: threads.page,
      limit: threads.limit,
      total: threads.total,
      threads: threads.threads.map((thread) => serializeComment(thread))
    });
  } catch (error) {
    handleCommentError(error, response);
  }
});

commentRouter.post("/manuscripts/:id/comments/:commentId/replies", requireCommentActor, async (request, response) => {
  const parsedParams = manuscriptReplyParamsSchema.safeParse(request.params);
  const parsedBody = createCommentBodySchema.safeParse(request.body);

  if (!parsedParams.success || !parsedBody.success) {
    response.status(400).json({
      error: {
        params: parsedParams.success ? null : parsedParams.error.flatten(),
        body: parsedBody.success ? null : parsedBody.error.flatten()
      }
    });
    return;
  }

  try {
    const comment = await commentService.replyToComment({
      userId: response.locals.actor.userId,
      parentCommentId: parsedParams.data.commentId,
      body: parsedBody.data.body,
      type: parsedBody.data.type,
      severity: parsedBody.data.severity,
      tags: parsedBody.data.tags,
      target: {
        manuscriptId: parsedParams.data.id
      }
    });

    response.status(201).json(serializeComment(comment));
  } catch (error) {
    handleCommentError(error, response);
  }
});

commentRouter.patch("/comments/:id", requireCommentActor, async (request, response) => {
  const parsedParams = commentIdParamsSchema.safeParse(request.params);
  const parsedBody = editCommentBodySchema.safeParse(request.body);

  if (!parsedParams.success || !parsedBody.success) {
    response.status(400).json({
      error: {
        params: parsedParams.success ? null : parsedParams.error.flatten(),
        body: parsedBody.success ? null : parsedBody.error.flatten()
      }
    });
    return;
  }

  try {
    const comment = await commentService.editComment({
      userId: response.locals.actor.userId,
      commentId: parsedParams.data.id,
      ...(parsedBody.data.body === undefined ? {} : { newBody: parsedBody.data.body }),
      ...(parsedBody.data.type === undefined ? {} : { type: parsedBody.data.type }),
      ...(parsedBody.data.severity === undefined ? {} : { severity: parsedBody.data.severity }),
      ...(parsedBody.data.tags === undefined ? {} : { tags: parsedBody.data.tags }),
      ...(parsedBody.data.editReason === undefined ? {} : { editReason: parsedBody.data.editReason })
    });

    response.json(serializeComment(comment));
  } catch (error) {
    handleCommentError(error, response);
  }
});

commentRouter.get("/comments/:id/history", requireCommentActor, async (request, response) => {
  const parsedParams = commentIdParamsSchema.safeParse(request.params);

  if (!parsedParams.success) {
    response.status(400).json({
      error: parsedParams.error.flatten()
    });
    return;
  }

  try {
    const history = await commentService.listCommentHistory({
      userId: response.locals.actor.userId,
      commentId: parsedParams.data.id
    });

    response.json({
      order: "asc",
      history: history.map((item) => serializeCommentHistoryItem(item))
    });
  } catch (error) {
    handleCommentError(error, response);
  }
});

commentRouter.delete("/comments/:id", requireCommentActor, async (request, response) => {
  const parsedParams = commentIdParamsSchema.safeParse(request.params);

  if (!parsedParams.success) {
    response.status(400).json({
      error: parsedParams.error.flatten()
    });
    return;
  }

  try {
    await commentService.deleteComment({
      userId: response.locals.actor.userId,
      commentId: parsedParams.data.id
    });

    response.status(204).send();
  } catch (error) {
    handleCommentError(error, response);
  }
});

commentRouter.post("/comments/:id/resolve", requireCommentActor, async (request, response) => {
  const parsedParams = commentIdParamsSchema.safeParse(request.params);
  const parsedBody = commentEditReasonSchema.safeParse(request.body ?? {});

  if (!parsedParams.success || !parsedBody.success) {
    response.status(400).json({
      error: {
        params: parsedParams.success ? null : parsedParams.error.flatten(),
        body: parsedBody.success ? null : parsedBody.error.flatten()
      }
    });
    return;
  }

  try {
    const comment = await commentService.resolveComment({
      userId: response.locals.actor.userId,
      commentId: parsedParams.data.id,
      ...(parsedBody.data.editReason === undefined ? {} : { editReason: parsedBody.data.editReason })
    });

    response.json(serializeComment(comment));
  } catch (error) {
    handleCommentError(error, response);
  }
});

commentRouter.post("/comments/:id/reopen", requireCommentActor, async (request, response) => {
  const parsedParams = commentIdParamsSchema.safeParse(request.params);
  const parsedBody = commentEditReasonSchema.safeParse(request.body ?? {});

  if (!parsedParams.success || !parsedBody.success) {
    response.status(400).json({
      error: {
        params: parsedParams.success ? null : parsedParams.error.flatten(),
        body: parsedBody.success ? null : parsedBody.error.flatten()
      }
    });
    return;
  }

  try {
    const comment = await commentService.reopenComment({
      userId: response.locals.actor.userId,
      commentId: parsedParams.data.id,
      ...(parsedBody.data.editReason === undefined ? {} : { editReason: parsedBody.data.editReason })
    });

    response.json(serializeComment(comment));
  } catch (error) {
    handleCommentError(error, response);
  }
});

commentRouter.post("/comments/:id/archive", requireCommentActor, async (request, response) => {
  const parsedParams = commentIdParamsSchema.safeParse(request.params);
  const parsedBody = commentEditReasonSchema.safeParse(request.body ?? {});

  if (!parsedParams.success || !parsedBody.success) {
    response.status(400).json({
      error: {
        params: parsedParams.success ? null : parsedParams.error.flatten(),
        body: parsedBody.success ? null : parsedBody.error.flatten()
      }
    });
    return;
  }

  try {
    const comment = await commentService.archiveComment({
      userId: response.locals.actor.userId,
      commentId: parsedParams.data.id,
      ...(parsedBody.data.editReason === undefined ? {} : { editReason: parsedBody.data.editReason })
    });

    response.json(serializeComment(comment));
  } catch (error) {
    handleCommentError(error, response);
  }
});
