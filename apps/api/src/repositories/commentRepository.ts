import type {
  Prisma,
  CommentSeverity,
  CommentStatus,
  CommentTag,
  CommentType,
  EntityType,
  Role
} from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";

export type CommentTargetRecord =
  | {
      entityId: string;
      manuscriptId?: never;
    }
  | {
      manuscriptId: string;
      entityId?: never;
    };

type CommentWhereInput = {
  entityId?: string | null;
  manuscriptId?: string | null;
  parentCommentId?: string | null;
};

const commentSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  entityId: true,
  manuscriptId: true,
  parentCommentId: true,
  body: true,
  editedAt: true,
  currentVersion: true,
  type: true,
  severity: true,
  tags: true,
  status: true,
  user: {
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true
    }
  }
} satisfies Prisma.CommentSelect;

const buildCommentTargetWhere = (target: CommentTargetRecord): CommentWhereInput => {
  if ("entityId" in target) {
    return {
      entityId: target.entityId,
      manuscriptId: null
    };
  }

  return {
    manuscriptId: target.manuscriptId,
    entityId: null
  };
};

const commentVersionSelect = {
  id: true,
  commentId: true,
  version: true,
  previousBody: true,
  resultingBody: true,
  previousType: true,
  resultingType: true,
  previousSeverity: true,
  resultingSeverity: true,
  previousTags: true,
  resultingTags: true,
  previousStatus: true,
  resultingStatus: true,
  editedById: true,
  editReason: true,
  createdAt: true,
  editedBy: {
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true
    }
  }
} satisfies Prisma.CommentVersionSelect;

type CommentRecord = Prisma.CommentGetPayload<{
  select: typeof commentSelect;
}>;

type CommentVersionRecord = Prisma.CommentVersionGetPayload<{
  select: typeof commentVersionSelect;
}>;

export const commentRepository = {
  async findEntityByTypeAndSlug(input: { entityType: EntityType; slug: string }) {
    return prismaClient.entity.findFirst({
      where: {
        slug: input.slug,
        type: input.entityType,
        retiredAt: null
      },
      select: {
        id: true,
        slug: true,
        type: true
      }
    });
  },

  async findManuscriptById(manuscriptId: string) {
    return prismaClient.manuscript.findUnique({
      where: {
        id: manuscriptId
      },
      select: {
        id: true,
        slug: true,
        type: true
      }
    });
  },

  async findUserRoleById(userId: string): Promise<Role | null> {
    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      select: {
        role: true
      }
    });

    return user?.role ?? null;
  },

  async createComment(input: {
    userId: string;
    body: string;
    type?: CommentType;
    severity?: CommentSeverity;
    tags?: CommentTag[];
    parentCommentId?: string;
    target: CommentTargetRecord;
  }) {
    return prismaClient.comment.create({
      data: {
        userId: input.userId,
        body: input.body,
        ...(input.type === undefined ? {} : { type: input.type }),
        ...(input.severity === undefined ? {} : { severity: input.severity }),
        ...(input.tags === undefined ? {} : { tags: input.tags }),
        ...(input.parentCommentId === undefined ? {} : { parentCommentId: input.parentCommentId }),
        ...input.target
      },
      select: commentSelect
    });
  },

  async findCommentById(commentId: string) {
    return prismaClient.comment.findUnique({
      where: {
        id: commentId
      },
      select: commentSelect
    });
  },

  async listCommentsByTarget(target: CommentTargetRecord) {
    return prismaClient.comment.findMany({
      where: buildCommentTargetWhere(target),
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: commentSelect
    });
  },

  async listRootCommentsByTarget(input: {
    target: CommentTargetRecord;
    limit: number;
    offset: number;
  }) {
    return prismaClient.comment.findMany({
      where: {
        ...buildCommentTargetWhere(input.target),
        parentCommentId: null
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: input.limit,
      skip: input.offset,
      select: commentSelect
    });
  },

  async countRootCommentsByTarget(target: CommentTargetRecord) {
    return prismaClient.comment.count({
      where: {
        ...buildCommentTargetWhere(target),
        parentCommentId: null
      }
    });
  },

  async updateCommentWithVersion(input: {
    commentId: string;
    previousComment: CommentRecord;
    editedById: string;
    editReason: string;
    body?: string;
    type?: CommentType;
    severity?: CommentSeverity;
    tags?: CommentTag[];
  }) {
    return prismaClient.$transaction(async (transaction) => {
      const editedAt = new Date();
      const updatedComment = await transaction.comment.update({
        where: {
          id: input.commentId
        },
        data: {
          ...(input.body === undefined ? {} : { body: input.body }),
          ...(input.type === undefined ? {} : { type: input.type }),
          ...(input.severity === undefined ? {} : { severity: input.severity }),
          ...(input.tags === undefined ? {} : { tags: input.tags }),
          editedAt,
          currentVersion: {
            increment: 1
          }
        },
        select: commentSelect
      });

      await transaction.commentVersion.create({
        data: {
          commentId: input.commentId,
          version: updatedComment.currentVersion,
          previousBody: input.previousComment.body,
          resultingBody: updatedComment.body,
          previousType: input.previousComment.type,
          resultingType: updatedComment.type,
          previousSeverity: input.previousComment.severity,
          resultingSeverity: updatedComment.severity,
          previousTags: input.previousComment.tags,
          resultingTags: updatedComment.tags,
          previousStatus: input.previousComment.status,
          resultingStatus: updatedComment.status,
          editedById: input.editedById,
          editReason: input.editReason
        }
      });

      return updatedComment;
    });
  },

  async updateCommentStatusWithVersion(input: {
    commentId: string;
    previousComment: CommentRecord;
    editedById: string;
    editReason: string;
    status: CommentStatus;
  }) {
    return prismaClient.$transaction(async (transaction) => {
      const editedAt = new Date();
      const updatedComment = await transaction.comment.update({
        where: {
          id: input.commentId
        },
        data: {
          status: input.status,
          editedAt,
          currentVersion: {
            increment: 1
          }
        },
        select: commentSelect
      });

      await transaction.commentVersion.create({
        data: {
          commentId: input.commentId,
          version: updatedComment.currentVersion,
          previousBody: input.previousComment.body,
          resultingBody: updatedComment.body,
          previousType: input.previousComment.type,
          resultingType: updatedComment.type,
          previousSeverity: input.previousComment.severity,
          resultingSeverity: updatedComment.severity,
          previousTags: input.previousComment.tags,
          resultingTags: updatedComment.tags,
          previousStatus: input.previousComment.status,
          resultingStatus: updatedComment.status,
          editedById: input.editedById,
          editReason: input.editReason
        }
      });

      return updatedComment;
    });
  },

  async listCommentHistory(commentId: string): Promise<CommentVersionRecord[]> {
    return prismaClient.commentVersion.findMany({
      where: {
        commentId
      },
      orderBy: [{ version: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      select: commentVersionSelect
    });
  },

  async deleteCommentById(commentId: string): Promise<void> {
    await prismaClient.comment.delete({
      where: {
        id: commentId
      }
    });
  }
};
