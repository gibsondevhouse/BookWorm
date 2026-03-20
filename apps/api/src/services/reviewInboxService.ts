import type { ReviewRequestStatus, Role } from "@prisma/client";

import { reviewInboxRepository, type ReviewInboxRecord } from "../repositories/reviewInboxRepository.js";

const OVERDUE_THRESHOLD_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

type Actor = {
  userId: string;
  role: Role;
};

class ReviewInboxUnauthorizedError extends Error {
  constructor() {
    super("You do not have permission to access this reviewer inbox");
    this.name = "ReviewInboxUnauthorizedError";
  }
}

const resolveInboxUserId = (actor: Actor, requestedUserId: string | undefined): string => {
  if (actor.role === "AUTHOR_ADMIN") {
    return requestedUserId ?? actor.userId;
  }

  if (requestedUserId !== undefined && requestedUserId !== actor.userId) {
    throw new ReviewInboxUnauthorizedError();
  }

  return actor.userId;
};

const computeItemFlags = (
  record: ReviewInboxRecord,
  now: Date
): { hasEscalatedSteps: boolean; hasOverdueSteps: boolean } => {
  const steps = record.approvalChain?.steps ?? [];
  const overdueThreshold = new Date(now.getTime() - OVERDUE_THRESHOLD_MS);

  const hasEscalatedSteps = steps.some((s) => s.escalationLevel > 0);
  const hasOverdueSteps = steps.some(
    (s) =>
      (s.status === "PENDING" || s.status === "ACKNOWLEDGED") &&
      s.decidedAt === null &&
      s.createdAt < overdueThreshold
  );

  return { hasEscalatedSteps, hasOverdueSteps };
};

export type ReviewInboxItem = ReviewInboxRecord & {
  hasEscalatedSteps: boolean;
  hasOverdueSteps: boolean;
};

export const reviewInboxService = {
  async getReviewerInbox(input: {
    actor: Actor;
    reviewerUserId?: string;
    status?: ReviewRequestStatus;
    escalated?: boolean;
    delegated?: boolean;
    overdue?: boolean;
    limit?: number;
    offset?: number;
    now?: Date;
  }): Promise<{
    items: ReviewInboxItem[];
    total: number;
    reviewerUserId: string;
    limit: number;
    offset: number;
  }> {
    const userId = resolveInboxUserId(input.actor, input.reviewerUserId);
    const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const offset = Math.max(input.offset ?? 0, 0);
    const now = input.now ?? new Date();

    const result = await reviewInboxRepository.findForUser({
      userId,
      ...(input.status === undefined ? {} : { status: input.status }),
      ...(input.escalated === undefined ? {} : { escalated: input.escalated }),
      ...(input.delegated === undefined ? {} : { delegated: input.delegated }),
      ...(input.overdue === undefined ? {} : { overdue: input.overdue }),
      overdueThresholdMs: OVERDUE_THRESHOLD_MS,
      now,
      limit,
      offset
    });

    const items: ReviewInboxItem[] = result.items.map((record) => ({
      ...record,
      ...computeItemFlags(record, now)
    }));

    return {
      items,
      total: result.total,
      reviewerUserId: userId,
      limit,
      offset
    };
  }
};
