import {
  type ApprovalChainStatus,
  type ApprovalStepEventType,
  type ApprovalStepStatus,
  type ReviewRequestStatus,
  type Role
} from "@prisma/client";

import {
  type ReviewDecisionHistoryRecord,
  reviewDecisionAnalyticsRepository
} from "../repositories/reviewDecisionAnalyticsRepository.js";

type AnalyticsWindowKey = "24h" | "7d" | "30d";

type Actor = {
  userId: string;
  role: Role;
};

type ParsedAssignmentHistoryEntry = {
  assignedAt: string;
  assignedById: string;
  assignedApproverId: string;
  previousAssignedApproverId: string | null;
};

type ParsedLifecycleHistoryEntry = {
  transitionedAt: string;
  fromStatus: ReviewRequestStatus;
  toStatus: ReviewRequestStatus;
  transitionedById: string;
  transitionedByRole: Role;
};

const defaultLimit = 20;
const maxLimit = 100;

const analyticsWindowDurationMs: Record<AnalyticsWindowKey, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000
};

class ReviewDecisionAnalyticsUnauthorizedError extends Error {
  constructor() {
    super("You do not have permission to access decision analytics");
    this.name = "ReviewDecisionAnalyticsUnauthorizedError";
  }
}

class ReviewDecisionHistoryUnauthorizedError extends Error {
  constructor() {
    super("You do not have permission to access decision history");
    this.name = "ReviewDecisionHistoryUnauthorizedError";
  }
}

const assertCanReadAnalytics = (actor: Actor): void => {
  if (actor.role !== "AUTHOR_ADMIN") {
    throw new ReviewDecisionAnalyticsUnauthorizedError();
  }
};

const assertCanReadHistory = (actor: Actor): void => {
  if (actor.role !== "AUTHOR_ADMIN") {
    throw new ReviewDecisionHistoryUnauthorizedError();
  }
};

const normalizeLimit = (limit: number | undefined): number => {
  if (limit === undefined) {
    return defaultLimit;
  }

  return Math.min(Math.max(limit, 1), maxLimit);
};

const normalizeOffset = (offset: number | undefined): number => {
  if (offset === undefined || offset < 0) {
    return 0;
  }

  return offset;
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const parseAssignmentHistory = (value: unknown): ParsedAssignmentHistoryEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const entries: ParsedAssignmentHistoryEntry[] = [];

  for (const candidate of value) {
    if (!isObjectRecord(candidate)) {
      continue;
    }

    const assignedAt = candidate.assignedAt;
    const assignedById = candidate.assignedById;
    const assignedApproverId = candidate.assignedApproverId;
    const previousAssignedApproverId = candidate.previousAssignedApproverId;

    if (
      typeof assignedAt !== "string" ||
      typeof assignedById !== "string" ||
      typeof assignedApproverId !== "string" ||
      (previousAssignedApproverId !== null && typeof previousAssignedApproverId !== "string")
    ) {
      continue;
    }

    entries.push({
      assignedAt,
      assignedById,
      assignedApproverId,
      previousAssignedApproverId
    });
  }

  return entries;
};

const reviewRequestStatuses: ReviewRequestStatus[] = [
  "OPEN",
  "ACKNOWLEDGED",
  "IN_REVIEW",
  "RESOLVED",
  "CANCELED"
];

const actorRoles: Role[] = ["PUBLIC", "EDITOR", "AUTHOR_ADMIN"];

const parseLifecycleHistory = (value: unknown): ParsedLifecycleHistoryEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const entries: ParsedLifecycleHistoryEntry[] = [];

  for (const candidate of value) {
    if (!isObjectRecord(candidate)) {
      continue;
    }

    const transitionedAt = candidate.transitionedAt;
    const fromStatus = candidate.fromStatus;
    const toStatus = candidate.toStatus;
    const transitionedById = candidate.transitionedById;
    const transitionedByRole = candidate.transitionedByRole;

    if (
      typeof transitionedAt !== "string" ||
      typeof fromStatus !== "string" ||
      typeof toStatus !== "string" ||
      typeof transitionedById !== "string" ||
      typeof transitionedByRole !== "string"
    ) {
      continue;
    }

    if (
      !reviewRequestStatuses.includes(fromStatus as ReviewRequestStatus) ||
      !reviewRequestStatuses.includes(toStatus as ReviewRequestStatus) ||
      !actorRoles.includes(transitionedByRole as Role)
    ) {
      continue;
    }

    entries.push({
      transitionedAt,
      fromStatus: fromStatus as ReviewRequestStatus,
      toStatus: toStatus as ReviewRequestStatus,
      transitionedById,
      transitionedByRole: transitionedByRole as Role
    });
  }

  return entries;
};

const buildTimeline = (record: ReviewDecisionHistoryRecord) => {
  const timeline: Array<
    | {
        kind: "REVIEW_REQUEST_CREATED";
        occurredAt: Date;
      }
    | {
        kind: "APPROVER_ASSIGNED";
        occurredAt: Date;
        assignedById: string;
        assignedApproverId: string;
        previousAssignedApproverId: string | null;
      }
    | {
        kind: "LIFECYCLE_TRANSITION";
        occurredAt: Date;
        fromStatus: ReviewRequestStatus;
        toStatus: ReviewRequestStatus;
        transitionedById: string;
        transitionedByRole: Role;
      }
    | {
        kind: "APPROVAL_STEP_EVENT";
        occurredAt: Date;
        stepId: string;
        stepOrder: number;
        eventType: ApprovalStepEventType;
        reasonCode: string;
        reasonNote: string | null;
        actorUserId: string;
        fromAssignedReviewerId: string | null;
        fromAssignedRole: Role | null;
        toAssignedReviewerId: string | null;
        toAssignedRole: Role | null;
        escalationLevel: number;
      }
    | {
        kind: "APPROVAL_STEP_ACKNOWLEDGED";
        occurredAt: Date;
        stepId: string;
        stepOrder: number;
        acknowledgedById: string;
      }
    | {
        kind: "APPROVAL_STEP_DECIDED";
        occurredAt: Date;
        stepId: string;
        stepOrder: number;
        status: ApprovalStepStatus;
        decidedById: string;
      }
  > = [
    {
      kind: "REVIEW_REQUEST_CREATED",
      occurredAt: record.createdAt
    }
  ];

  const assignmentHistory = parseAssignmentHistory(record.assignmentHistory);

  for (const entry of assignmentHistory) {
    timeline.push({
      kind: "APPROVER_ASSIGNED",
      occurredAt: new Date(entry.assignedAt),
      assignedById: entry.assignedById,
      assignedApproverId: entry.assignedApproverId,
      previousAssignedApproverId: entry.previousAssignedApproverId
    });
  }

  const lifecycleHistory = parseLifecycleHistory(record.lifecycleHistory);

  for (const entry of lifecycleHistory) {
    timeline.push({
      kind: "LIFECYCLE_TRANSITION",
      occurredAt: new Date(entry.transitionedAt),
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      transitionedById: entry.transitionedById,
      transitionedByRole: entry.transitionedByRole
    });
  }

  if (record.approvalChain !== null) {
    for (const step of record.approvalChain.steps) {
      if (step.acknowledgedAt !== null && step.acknowledgedById !== null) {
        timeline.push({
          kind: "APPROVAL_STEP_ACKNOWLEDGED",
          occurredAt: step.acknowledgedAt,
          stepId: step.id,
          stepOrder: step.stepOrder,
          acknowledgedById: step.acknowledgedById
        });
      }

      if (step.decidedAt !== null && step.decidedById !== null) {
        timeline.push({
          kind: "APPROVAL_STEP_DECIDED",
          occurredAt: step.decidedAt,
          stepId: step.id,
          stepOrder: step.stepOrder,
          status: step.status,
          decidedById: step.decidedById
        });
      }

      for (const event of step.events) {
        timeline.push({
          kind: "APPROVAL_STEP_EVENT",
          occurredAt: event.createdAt,
          stepId: step.id,
          stepOrder: step.stepOrder,
          eventType: event.eventType,
          reasonCode: event.reasonCode,
          reasonNote: event.reasonNote,
          actorUserId: event.actorUserId,
          fromAssignedReviewerId: event.fromAssignedReviewerId,
          fromAssignedRole: event.fromAssignedRole,
          toAssignedReviewerId: event.toAssignedReviewerId,
          toAssignedRole: event.toAssignedRole,
          escalationLevel: event.escalationLevel
        });
      }
    }
  }

  return timeline.sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
};

const calculateLatencyAggregates = (
  records: ReviewDecisionHistoryRecord[],
  windowStart: Date,
  windowEnd: Date
): {
  count: number;
  minimum: number | null;
  maximum: number | null;
  average: number | null;
} => {
  const values = records
    .flatMap((record) => {
      const finalizedAt = record.approvalChain?.finalizedAt;

      if (finalizedAt === null || finalizedAt === undefined) {
        return [];
      }

      if (finalizedAt < windowStart || finalizedAt > windowEnd) {
        return [];
      }

      return [finalizedAt.getTime() - record.createdAt.getTime()];
    })
    .filter((value) => value >= 0);

  if (values.length === 0) {
    return {
      count: 0,
      minimum: null,
      maximum: null,
      average: null
    };
  }

  const total = values.reduce((sum, current) => sum + current, 0);

  return {
    count: values.length,
    minimum: Math.min(...values),
    maximum: Math.max(...values),
    average: Math.floor(total / values.length)
  };
};

const normalizeOutcome = (
  outcome: "APPROVED" | "REJECTED" | undefined
): ApprovalChainStatus | undefined => {
  if (outcome === undefined) {
    return undefined;
  }

  return outcome;
};

const resolveWindow = (window: AnalyticsWindowKey | undefined): {
  key: AnalyticsWindowKey;
  start: Date;
  end: Date;
} => {
  const key = window ?? "7d";
  const now = new Date();

  return {
    key,
    end: now,
    start: new Date(now.getTime() - analyticsWindowDurationMs[key])
  };
};

export const reviewDecisionAnalyticsService = {
  async getDecisionSummary(input: {
    actor: Actor;
    window?: AnalyticsWindowKey;
  }): Promise<{
    window: {
      key: AnalyticsWindowKey;
      start: Date;
      end: Date;
    };
    queueDepth: {
      open: number;
      acknowledged: number;
      inReview: number;
      resolved: number;
      canceled: number;
      total: number;
    };
    decisionOutcomes: {
      approved: number;
      rejected: number;
      pending: number;
    };
    approvalLatencyMs: {
      count: number;
      minimum: number | null;
      maximum: number | null;
      average: number | null;
    };
  }> {
    assertCanReadAnalytics(input.actor);

    const window = resolveWindow(input.window);
    const records = await reviewDecisionAnalyticsRepository.listForWindow({
      windowStart: window.start,
      windowEnd: window.end
    });

    const queueDepth = {
      open: records.filter((record) => record.status === "OPEN").length,
      acknowledged: records.filter((record) => record.status === "ACKNOWLEDGED").length,
      inReview: records.filter((record) => record.status === "IN_REVIEW").length,
      resolved: records.filter((record) => record.status === "RESOLVED").length,
      canceled: records.filter((record) => record.status === "CANCELED").length,
      total: records.length
    };

    const approved = records.filter((record) => record.approvalChain?.status === "APPROVED").length;
    const rejected = records.filter((record) => record.approvalChain?.status === "REJECTED").length;

    return {
      window,
      queueDepth,
      decisionOutcomes: {
        approved,
        rejected,
        pending: records.length - approved - rejected
      },
      approvalLatencyMs: calculateLatencyAggregates(records, window.start, window.end)
    };
  },

  async listDecisionHistory(input: {
    actor: Actor;
    status?: ReviewRequestStatus;
    outcome?: "APPROVED" | "REJECTED";
    limit?: number;
    offset?: number;
  }): Promise<{
    items: Array<{
      reviewRequestId: string;
      proposalId: string;
      status: ReviewRequestStatus;
      assignedApproverId: string | null;
      createdAt: Date;
      updatedAt: Date;
      approvalChain: {
        id: string;
        status: ApprovalChainStatus;
        finalizedAt: Date | null;
      } | null;
      timeline: ReturnType<typeof buildTimeline>;
    }>;
    total: number;
    limit: number;
    offset: number;
  }> {
    assertCanReadHistory(input.actor);

    const limit = normalizeLimit(input.limit);
    const offset = normalizeOffset(input.offset);
    const normalizedOutcome = input.outcome === undefined ? undefined : normalizeOutcome(input.outcome);

    const result = await reviewDecisionAnalyticsRepository.listHistoryPage({
      ...(input.status === undefined ? {} : { status: input.status }),
      ...(normalizedOutcome === undefined ? {} : { outcome: normalizedOutcome }),
      limit,
      offset
    });

    return {
      items: result.items.map((record) => ({
        reviewRequestId: record.id,
        proposalId: record.proposalId,
        status: record.status,
        assignedApproverId: record.assignedApproverId,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        approvalChain:
          record.approvalChain === null
            ? null
            : {
                id: record.approvalChain.id,
                status: record.approvalChain.status,
                finalizedAt: record.approvalChain.finalizedAt
              },
        timeline: buildTimeline(record)
      })),
      total: result.total,
      limit,
      offset
    };
  }
};
