import {
  type CommentSeverity,
  type CommentStatus,
  type CommentTag,
  type CommentType,
  type EntityType,
  type Role
} from "@prisma/client";

import { commentRepository, type CommentTargetRecord } from "../repositories/commentRepository.js";

type CommentRecord = NonNullable<Awaited<ReturnType<typeof commentRepository.findCommentById>>>;

type CommentTargetInput =
  | {
      entityType: EntityType;
      entitySlug: string;
      manuscriptId?: never;
    }
  | {
      manuscriptId: string;
      entityType?: never;
      entitySlug?: never;
    };

export type CommentThreadItem = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  userId: string;
  author: {
    userId: string;
    email: string;
    displayName: string;
    role: Role;
  };
  entityId: string | null;
  manuscriptId: string | null;
  parentCommentId: string | null;
  body: string;
  type: CommentType;
  severity: CommentSeverity;
  tags: CommentTag[];
  status: CommentStatus;
  replies: CommentThreadItem[];
};

export type CommentVersionHistoryItem = {
  id: string;
  commentId: string;
  version: number;
  editedById: string;
  editReason: string;
  createdAt: Date;
  editor: {
    userId: string;
    email: string;
    displayName: string;
    role: Role;
  };
  previous: {
    body: string;
    type: CommentType;
    severity: CommentSeverity;
    tags: CommentTag[];
    status: CommentStatus;
  };
  resulting: {
    body: string;
    type: CommentType;
    severity: CommentSeverity;
    tags: CommentTag[];
    status: CommentStatus;
  };
};

type CommentMetadataInput = {
  type?: string;
  severity?: string;
  tags?: string[];
};

type CommentMetadata = {
  type: CommentType;
  severity: CommentSeverity;
  tags: CommentTag[];
};

type CommentMetadataPatch = {
  type?: CommentType;
  severity?: CommentSeverity;
  tags?: CommentTag[];
};

export type PaginatedCommentThreads = {
  threads: CommentThreadItem[];
  page: number;
  limit: number;
  total: number;
};

const maxBodyLength = 5000;
const maxEditReasonLength = 250;
const defaultCommentType: CommentType = "GENERAL";
const defaultCommentSeverity: CommentSeverity = "INFO";
const allowedCommentTypes = ["GENERAL", "QUESTION", "SUGGESTION", "CONCERN", "RESOLVED"] as const;
const allowedCommentSeverities = ["INFO", "MINOR", "MAJOR"] as const;
const canonicalTagOrder: readonly CommentTag[] = ["SPELLING", "FACTUAL", "CONSISTENCY", "CLARITY", "TONE"];

const resolveStatus: CommentStatus = "RESOLVED";
const activeStatus: CommentStatus = "ACTIVE";
const archivedStatus: CommentStatus = "ARCHIVED";

const isCommentType = (value: string): value is CommentType => {
  return (allowedCommentTypes as readonly string[]).includes(value);
};

const isCommentSeverity = (value: string): value is CommentSeverity => {
  return (allowedCommentSeverities as readonly string[]).includes(value);
};

const isCommentTag = (value: string): value is CommentTag => {
  return (canonicalTagOrder as readonly string[]).includes(value);
};

const normalizeTags = (tags: string[]): CommentTag[] => {
  const dedupedTags = new Set<CommentTag>();

  for (const tag of tags) {
    if (!isCommentTag(tag)) {
      throw new Error(`Comment metadata tag is invalid: ${tag}`);
    }

    dedupedTags.add(tag);
  }

  return canonicalTagOrder.filter((tag) => dedupedTags.has(tag));
};

const resolveCommentMetadata = (input: CommentMetadataInput): CommentMetadata => {
  const type = input.type ?? defaultCommentType;
  const severity = input.severity ?? defaultCommentSeverity;
  const tags = input.tags ?? [];

  if (!isCommentType(type)) {
    throw new Error(`Comment metadata type is invalid: ${type}`);
  }

  if (!isCommentSeverity(severity)) {
    throw new Error(`Comment metadata severity is invalid: ${severity}`);
  }

  return {
    type,
    severity,
    tags: normalizeTags(tags)
  };
};

const resolveCommentMetadataPatch = (input: CommentMetadataInput): CommentMetadataPatch => {
  const metadataPatch: CommentMetadataPatch = {};

  if (input.type !== undefined) {
    if (!isCommentType(input.type)) {
      throw new Error(`Comment metadata type is invalid: ${input.type}`);
    }

    metadataPatch.type = input.type;
  }

  if (input.severity !== undefined) {
    if (!isCommentSeverity(input.severity)) {
      throw new Error(`Comment metadata severity is invalid: ${input.severity}`);
    }

    metadataPatch.severity = input.severity;
  }

  if (input.tags !== undefined) {
    metadataPatch.tags = normalizeTags(input.tags);
  }

  return metadataPatch;
};

const assertBody = (body: string): string => {
  const trimmedBody = body.trim();

  if (trimmedBody.length === 0) {
    throw new Error("Comment body is required");
  }

  if (trimmedBody.length > maxBodyLength) {
    throw new Error("Comment body must be at most 5000 characters");
  }

  return trimmedBody;
};

const assertEditReason = (editReason: string): string => {
  const trimmedReason = editReason.trim();

  if (trimmedReason.length === 0) {
    throw new Error("Comment edit reason is required");
  }

  if (trimmedReason.length > maxEditReasonLength) {
    throw new Error("Comment edit reason must be at most 250 characters");
  }

  return trimmedReason;
};

const mapComment = (comment: CommentRecord): CommentThreadItem => ({
  id: comment.id,
  createdAt: comment.createdAt,
  updatedAt: comment.updatedAt,
  editedAt: comment.editedAt,
  userId: comment.userId,
  author: {
    userId: comment.user.id,
    email: comment.user.email,
    displayName: comment.user.displayName,
    role: comment.user.role
  },
  entityId: comment.entityId,
  manuscriptId: comment.manuscriptId,
  parentCommentId: comment.parentCommentId,
  body: comment.body,
  type: comment.type,
  severity: comment.severity,
  tags: comment.tags,
  status: comment.status,
  replies: []
});

const mapCommentVersion = (
  version: Awaited<ReturnType<typeof commentRepository.listCommentHistory>>[number]
): CommentVersionHistoryItem => ({
  id: version.id,
  commentId: version.commentId,
  version: version.version,
  editedById: version.editedById,
  editReason: version.editReason,
  createdAt: version.createdAt,
  editor: {
    userId: version.editedBy.id,
    email: version.editedBy.email,
    displayName: version.editedBy.displayName,
    role: version.editedBy.role
  },
  previous: {
    body: version.previousBody,
    type: version.previousType,
    severity: version.previousSeverity,
    tags: version.previousTags,
    status: version.previousStatus
  },
  resulting: {
    body: version.resultingBody,
    type: version.resultingType,
    severity: version.resultingSeverity,
    tags: version.resultingTags,
    status: version.resultingStatus
  }
});

const areTagsEqual = (left: CommentTag[], right: CommentTag[]): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((tag, index) => tag === right[index]);
};

const resolveCommentEditReason = (input: {
  explicitReason: string | undefined;
  changedBody: boolean;
  changedMetadata: boolean;
}): string => {
  if (input.explicitReason !== undefined) {
    return assertEditReason(input.explicitReason);
  }

  if (input.changedBody && input.changedMetadata) {
    return "Comment body and metadata updated";
  }

  if (input.changedBody) {
    return "Comment body updated";
  }

  return "Comment metadata updated";
};

const resolveStatusEditReason = (
  targetStatus: CommentStatus,
  explicitReason: string | undefined
): string => {
  if (explicitReason !== undefined) {
    return assertEditReason(explicitReason);
  }

  if (targetStatus === resolveStatus) {
    return "Comment resolved";
  }

  if (targetStatus === activeStatus) {
    return "Comment reopened";
  }

  return "Comment archived";
};

const assertCommentLifecycleTransition = (fromStatus: CommentStatus, toStatus: CommentStatus): void => {
  if (fromStatus === activeStatus && toStatus === resolveStatus) {
    return;
  }

  if (fromStatus === resolveStatus && toStatus === activeStatus) {
    return;
  }

  if ((fromStatus === activeStatus || fromStatus === resolveStatus) && toStatus === archivedStatus) {
    return;
  }

  throw new Error("Comment lifecycle transition is invalid");
};

const assertCollaboratorRole = (actorRole: Role | null): void => {
  if (actorRole === "EDITOR" || actorRole === "AUTHOR_ADMIN") {
    return;
  }

  throw new Error("Only authenticated collaborators can change comment status");
};

const resolveTarget = async (target: CommentTargetInput): Promise<CommentTargetRecord> => {
  if ("manuscriptId" in target) {
    const manuscript = await commentRepository.findManuscriptById(target.manuscriptId);

    if (!manuscript) {
      throw new Error("Manuscript not found");
    }

    return {
      manuscriptId: manuscript.id
    };
  }

  {
    const entity = await commentRepository.findEntityByTypeAndSlug({
      entityType: target.entityType,
      slug: target.entitySlug
    });

    if (!entity) {
      throw new Error("Entity not found");
    }

    return {
      entityId: entity.id
    };
  }
};

const buildThreads = (comments: CommentRecord[], rootIds?: Set<string>): CommentThreadItem[] => {
  const childIdsByParentId = new Map<string, string[]>();

  for (const comment of comments) {
    if (!comment.parentCommentId) {
      continue;
    }

    const childIds = childIdsByParentId.get(comment.parentCommentId) ?? [];

    childIds.push(comment.id);
    childIdsByParentId.set(comment.parentCommentId, childIds);
  }

  const selectedIds =
    rootIds === undefined
      ? new Set(comments.map((comment) => comment.id))
      : new Set<string>();

  if (rootIds !== undefined) {
    const queue = [...rootIds];

    while (queue.length > 0) {
      const currentId = queue.shift();

      if (!currentId || selectedIds.has(currentId)) {
        continue;
      }

      selectedIds.add(currentId);
      const children = childIdsByParentId.get(currentId) ?? [];

      for (const childId of children) {
        queue.push(childId);
      }
    }
  }

  const nodesById = new Map<string, CommentThreadItem>();

  for (const comment of comments) {
    if (!selectedIds.has(comment.id)) {
      continue;
    }

    nodesById.set(comment.id, mapComment(comment));
  }

  const roots: CommentThreadItem[] = [];

  for (const comment of comments) {
    if (!selectedIds.has(comment.id)) {
      continue;
    }

    const node = nodesById.get(comment.id);

    if (!node) {
      continue;
    }

    if (!comment.parentCommentId) {
      roots.push(node);
      continue;
    }

    const parentNode = nodesById.get(comment.parentCommentId);

    if (!parentNode) {
      roots.push(node);
      continue;
    }

    parentNode.replies.push(node);
  }

  return roots;
};

export const commentService = {
  async createComment(input: {
    userId: string;
    body: string;
    type?: string;
    severity?: string;
    tags?: string[];
    target: CommentTargetInput;
  }): Promise<CommentThreadItem> {
    const body = assertBody(input.body);
    const metadata = resolveCommentMetadata({
      ...(input.type === undefined ? {} : { type: input.type }),
      ...(input.severity === undefined ? {} : { severity: input.severity }),
      ...(input.tags === undefined ? {} : { tags: input.tags })
    });
    const target = await resolveTarget(input.target);

    const comment = await commentRepository.createComment({
      userId: input.userId,
      body,
      type: metadata.type,
      severity: metadata.severity,
      tags: metadata.tags,
      target
    });

    return mapComment(comment);
  },

  async getCommentThread(input: { target: CommentTargetInput }): Promise<CommentThreadItem[]> {
    const target = await resolveTarget(input.target);
    const comments = await commentRepository.listCommentsByTarget(target);

    return buildThreads(comments);
  },

  async listCommentThreads(input: {
    target: CommentTargetInput;
    page: number;
    limit: number;
  }): Promise<PaginatedCommentThreads> {
    const target = await resolveTarget(input.target);
    const offset = (input.page - 1) * input.limit;

    const [rootComments, total, allComments] = await Promise.all([
      commentRepository.listRootCommentsByTarget({
        target,
        limit: input.limit,
        offset
      }),
      commentRepository.countRootCommentsByTarget(target),
      commentRepository.listCommentsByTarget(target)
    ]);

    const threads = buildThreads(
      allComments,
      new Set(rootComments.map((comment: CommentRecord) => comment.id))
    );

    return {
      threads,
      page: input.page,
      limit: input.limit,
      total
    };
  },

  async replyToComment(input: {
    userId: string;
    parentCommentId: string;
    body: string;
    type?: string;
    severity?: string;
    tags?: string[];
    target?: CommentTargetInput;
  }): Promise<CommentThreadItem> {
    const body = assertBody(input.body);
    const metadata = resolveCommentMetadata({
      ...(input.type === undefined ? {} : { type: input.type }),
      ...(input.severity === undefined ? {} : { severity: input.severity }),
      ...(input.tags === undefined ? {} : { tags: input.tags })
    });
    const parentComment = await commentRepository.findCommentById(input.parentCommentId);

    if (!parentComment) {
      throw new Error("Parent comment not found");
    }

    const target: CommentTargetRecord =
      parentComment.entityId !== null
        ? { entityId: parentComment.entityId }
        : parentComment.manuscriptId !== null
          ? { manuscriptId: parentComment.manuscriptId }
          : (() => {
              throw new Error("Parent comment has no target");
            })();

    if (input.target !== undefined) {
      const expectedTarget = await resolveTarget(input.target);

      const targetMismatch =
        ("entityId" in expectedTarget && "entityId" in target && expectedTarget.entityId !== target.entityId) ||
        ("manuscriptId" in expectedTarget &&
          "manuscriptId" in target &&
          expectedTarget.manuscriptId !== target.manuscriptId) ||
        ("entityId" in expectedTarget && "manuscriptId" in target) ||
        ("manuscriptId" in expectedTarget && "entityId" in target);

      if (targetMismatch) {
        throw new Error("Parent comment target mismatch");
      }
    }

    const comment = await commentRepository.createComment({
      userId: input.userId,
      parentCommentId: input.parentCommentId,
      body,
      type: metadata.type,
      severity: metadata.severity,
      tags: metadata.tags,
      target
    });

    return mapComment(comment);
  },

  async deleteComment(input: {
    userId: string;
    commentId: string;
  }): Promise<void> {
    const [comment, actorRole] = await Promise.all([
      commentRepository.findCommentById(input.commentId),
      commentRepository.findUserRoleById(input.userId)
    ]);

    if (!comment) {
      throw new Error("Comment not found");
    }

    if (actorRole === null) {
      throw new Error("Actor not found");
    }

    if (comment.userId !== input.userId && actorRole !== "AUTHOR_ADMIN") {
      throw new Error("Only the comment author or author-admin can delete this comment");
    }

    await commentRepository.deleteCommentById(input.commentId);
  },

  async editComment(input: {
    userId: string;
    commentId: string;
    newBody?: string;
    type?: string;
    severity?: string;
    tags?: string[];
    editReason?: string;
  }): Promise<CommentThreadItem> {
    const body = input.newBody === undefined ? undefined : assertBody(input.newBody);
    const metadataPatch = resolveCommentMetadataPatch({
      ...(input.type === undefined ? {} : { type: input.type }),
      ...(input.severity === undefined ? {} : { severity: input.severity }),
      ...(input.tags === undefined ? {} : { tags: input.tags })
    });

    if (
      body === undefined &&
      metadataPatch.type === undefined &&
      metadataPatch.severity === undefined &&
      metadataPatch.tags === undefined
    ) {
      throw new Error("No comment changes provided");
    }

    const comment = await commentRepository.findCommentById(input.commentId);

    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.userId !== input.userId) {
      throw new Error("Only the comment author can edit this comment");
    }

    const changedBody = body !== undefined && body !== comment.body;
    const changedType = metadataPatch.type !== undefined && metadataPatch.type !== comment.type;
    const changedSeverity =
      metadataPatch.severity !== undefined && metadataPatch.severity !== comment.severity;
    const changedTags = metadataPatch.tags !== undefined && !areTagsEqual(metadataPatch.tags, comment.tags);
    const changedMetadata = changedType || changedSeverity || changedTags;

    if (!changedBody && !changedMetadata) {
      throw new Error("No comment changes provided");
    }

    const editReason = resolveCommentEditReason({
      explicitReason: input.editReason,
      changedBody,
      changedMetadata
    });

    const updatedComment = await commentRepository.updateCommentWithVersion({
      commentId: input.commentId,
      previousComment: comment,
      editedById: input.userId,
      editReason,
      ...(body === undefined ? {} : { body }),
      ...(changedType ? { type: metadataPatch.type } : {}),
      ...(changedSeverity ? { severity: metadataPatch.severity } : {}),
      ...(changedTags ? { tags: metadataPatch.tags } : {})
    });

    return mapComment(updatedComment);
  },

  async listCommentHistory(input: {
    userId: string;
    commentId: string;
  }): Promise<CommentVersionHistoryItem[]> {
    const [comment, actorRole] = await Promise.all([
      commentRepository.findCommentById(input.commentId),
      commentRepository.findUserRoleById(input.userId)
    ]);

    if (!comment) {
      throw new Error("Comment not found");
    }

    assertCollaboratorRole(actorRole);

    const history = await commentRepository.listCommentHistory(input.commentId);

    return history.map((version) => mapCommentVersion(version));
  },

  async resolveComment(input: {
    userId: string;
    commentId: string;
    editReason?: string;
  }): Promise<CommentThreadItem> {
    const [comment, actorRole] = await Promise.all([
      commentRepository.findCommentById(input.commentId),
      commentRepository.findUserRoleById(input.userId)
    ]);

    if (!comment) {
      throw new Error("Comment not found");
    }

    assertCollaboratorRole(actorRole);

    assertCommentLifecycleTransition(comment.status, resolveStatus);

    const updatedComment = await commentRepository.updateCommentStatusWithVersion({
      commentId: input.commentId,
      previousComment: comment,
      editedById: input.userId,
      editReason: resolveStatusEditReason(resolveStatus, input.editReason),
      status: resolveStatus
    });

    return mapComment(updatedComment);
  },

  async reopenComment(input: {
    userId: string;
    commentId: string;
    editReason?: string;
  }): Promise<CommentThreadItem> {
    const [comment, actorRole] = await Promise.all([
      commentRepository.findCommentById(input.commentId),
      commentRepository.findUserRoleById(input.userId)
    ]);

    if (!comment) {
      throw new Error("Comment not found");
    }

    assertCollaboratorRole(actorRole);

    assertCommentLifecycleTransition(comment.status, activeStatus);

    const updatedComment = await commentRepository.updateCommentStatusWithVersion({
      commentId: input.commentId,
      previousComment: comment,
      editedById: input.userId,
      editReason: resolveStatusEditReason(activeStatus, input.editReason),
      status: activeStatus
    });

    return mapComment(updatedComment);
  },

  async archiveComment(input: {
    userId: string;
    commentId: string;
    editReason?: string;
  }): Promise<CommentThreadItem> {
    const [comment, actorRole] = await Promise.all([
      commentRepository.findCommentById(input.commentId),
      commentRepository.findUserRoleById(input.userId)
    ]);

    if (!comment) {
      throw new Error("Comment not found");
    }

    if (actorRole !== "AUTHOR_ADMIN") {
      throw new Error("Only author-admin can archive comments");
    }

    assertCommentLifecycleTransition(comment.status, archivedStatus);

    const updatedComment = await commentRepository.updateCommentStatusWithVersion({
      commentId: input.commentId,
      previousComment: comment,
      editedById: input.userId,
      editReason: resolveStatusEditReason(archivedStatus, input.editReason),
      status: archivedStatus
    });

    return mapComment(updatedComment);
  }
};
