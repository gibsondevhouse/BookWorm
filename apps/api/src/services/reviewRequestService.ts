import { type ProposalWorkflowState, type Role, type ReviewRequestStatus } from "@prisma/client";

import { reviewRequestApprovalService } from "./reviewRequestApprovalService.js";
import { notificationEventService } from "./notificationEventService.js";
import { reviewRequestRepository } from "../repositories/reviewRequestRepository.js";

type ReviewRequestRecord = NonNullable<Awaited<ReturnType<typeof reviewRequestRepository.findReviewRequestById>>>;

type Actor = {
  userId: string;
  role: Role;
};

type ReviewRequestItem = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  proposalId: string;
  createdById: string;
  assignedApproverId: string | null;
  assignedAt: Date | null;
  assignmentHistory: {
    assignedAt: Date;
    assignedById: string;
    assignedApproverId: string;
    previousAssignedApproverId: string | null;
  }[];
  lifecycleHistory: {
    transitionedAt: Date;
    fromStatus: ReviewRequestStatus;
    toStatus: ReviewRequestStatus;
    transitionedById: string;
    transitionedByRole: Role;
  }[];
  status: ReviewRequestStatus;
  proposal: {
    id: string;
    entityId: string | null;
    manuscriptId: string | null;
    status: "PENDING" | "ACCEPTED" | "REJECTED";
    workflowState: "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "APPLIED" | "ARCHIVED";
  };
  createdBy: {
    userId: string;
    email: string;
    displayName: string;
    role: Role;
  };
  assignedApprover: {
    userId: string;
    email: string;
    displayName: string;
    role: Role;
  } | null;
};

type ReviewRequestListResult = {
  reviewRequests: ReviewRequestItem[];
  total: number;
  limit: number;
  offset: number;
};

type StoredAssignmentHistoryEntry = {
  assignedAt: string;
  assignedById: string;
  assignedApproverId: string;
  previousAssignedApproverId: string | null;
};

type AssignmentHistoryEntry = {
  assignedAt: Date;
  assignedById: string;
  assignedApproverId: string;
  previousAssignedApproverId: string | null;
};

type StoredLifecycleHistoryEntry = {
  transitionedAt: string;
  fromStatus: ReviewRequestStatus;
  toStatus: ReviewRequestStatus;
  transitionedById: string;
  transitionedByRole: Role;
};

type LifecycleHistoryEntry = {
  transitionedAt: Date;
  fromStatus: ReviewRequestStatus;
  toStatus: ReviewRequestStatus;
  transitionedById: string;
  transitionedByRole: Role;
};

class ReviewRequestCreateUnauthorizedError extends Error {
  constructor() {
    super("You do not have permission to create review requests");
    this.name = "ReviewRequestCreateUnauthorizedError";
  }
}

class ReviewRequestReadUnauthorizedError extends Error {
  constructor() {
    super("You do not have permission to read review requests");
    this.name = "ReviewRequestReadUnauthorizedError";
  }
}

class ReviewRequestListUnauthorizedError extends Error {
  constructor() {
    super("You do not have permission to list review requests");
    this.name = "ReviewRequestListUnauthorizedError";
  }
}

class ReviewRequestAssignUnauthorizedError extends Error {
  constructor() {
    super("You do not have permission to assign approvers");
    this.name = "ReviewRequestAssignUnauthorizedError";
  }
}

class ReviewRequestQueueUnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewRequestQueueUnauthorizedError";
  }
}

class ReviewRequestProposalReferenceMissingError extends Error {
  constructor() {
    super("Review request proposal reference is required");
    this.name = "ReviewRequestProposalReferenceMissingError";
  }
}

class ReviewRequestProposalNotFoundError extends Error {
  constructor() {
    super("Review request proposal reference is invalid");
    this.name = "ReviewRequestProposalNotFoundError";
  }
}

class ReviewRequestProposalIneligibleError extends Error {
  constructor() {
    super("Proposal is not eligible for review request linkage");
    this.name = "ReviewRequestProposalIneligibleError";
  }
}

class ReviewRequestNotFoundError extends Error {
  constructor() {
    super("Review request not found");
    this.name = "ReviewRequestNotFoundError";
  }
}

class ReviewRequestAssigneeReferenceMissingError extends Error {
  constructor() {
    super("Review request assignee reference is required");
    this.name = "ReviewRequestAssigneeReferenceMissingError";
  }
}

class ReviewRequestAssigneeInvalidError extends Error {
  constructor() {
    super("Review request assignee reference is invalid");
    this.name = "ReviewRequestAssigneeInvalidError";
  }
}

class ReviewRequestAssignmentStateInvalidError extends Error {
  constructor() {
    super("Review request must be OPEN to assign an approver");
    this.name = "ReviewRequestAssignmentStateInvalidError";
  }
}

class ReviewRequestTransitionUnauthorizedError extends Error {
  constructor() {
    super("You do not have permission to transition review request lifecycle state");
    this.name = "ReviewRequestTransitionUnauthorizedError";
  }
}

class ReviewRequestLifecycleTransitionInvalidError extends Error {
  constructor() {
    super("Review request lifecycle transition is not permitted");
    this.name = "ReviewRequestLifecycleTransitionInvalidError";
  }
}

class ReviewRequestLifecycleProposalConflictError extends Error {
  constructor() {
    super("Review request lifecycle transition conflicts with current proposal status");
    this.name = "ReviewRequestLifecycleProposalConflictError";
  }
}

class ReviewRequestLifecycleTransitionRaceError extends Error {
  constructor() {
    super("Review request lifecycle transition was preempted by another update");
    this.name = "ReviewRequestLifecycleTransitionRaceError";
  }
}

const defaultStatus: ReviewRequestStatus = "OPEN";
const defaultLimit = 20;
const maxLimit = 100;

const reviewRequestTransitionMatrix: Record<ReviewRequestStatus, ReviewRequestStatus[]> = {
  OPEN: ["ACKNOWLEDGED", "IN_REVIEW", "CANCELED"],
  ACKNOWLEDGED: ["IN_REVIEW", "CANCELED"],
  IN_REVIEW: ["RESOLVED", "CANCELED"],
  RESOLVED: [],
  CANCELED: []
};

const assertProposalId = (proposalId: string): string => {
  const normalized = proposalId.trim();

  if (normalized.length === 0) {
    throw new ReviewRequestProposalReferenceMissingError();
  }

  return normalized;
};

const assertCanCreate = (actor: Actor): void => {
  if (actor.role !== "AUTHOR_ADMIN") {
    throw new ReviewRequestCreateUnauthorizedError();
  }
};

const assertCanRead = (actor: Actor): void => {
  if (actor.role !== "AUTHOR_ADMIN") {
    throw new ReviewRequestReadUnauthorizedError();
  }
};

const assertCanList = (actor: Actor): void => {
  if (actor.role !== "AUTHOR_ADMIN") {
    throw new ReviewRequestListUnauthorizedError();
  }
};

const assertCanAssign = (actor: Actor, reviewRequest: ReviewRequestRecord): void => {
  if (actor.role === "AUTHOR_ADMIN") {
    return;
  }

  if (actor.role === "EDITOR" && reviewRequest.assignedApproverId === actor.userId) {
    return;
  }

  throw new ReviewRequestAssignUnauthorizedError();
};

const assertCanTransition = (actor: Actor, reviewRequest: ReviewRequestRecord): void => {
  if (actor.role === "AUTHOR_ADMIN") {
    return;
  }

  if (actor.role === "EDITOR" && reviewRequest.assignedApproverId === actor.userId) {
    return;
  }

  throw new ReviewRequestTransitionUnauthorizedError();
};

const assertCanListAdminQueue = (actor: Actor): void => {
  if (actor.role !== "AUTHOR_ADMIN") {
    throw new ReviewRequestQueueUnauthorizedError("You do not have permission to access the admin queue");
  }
};

const resolveReviewerQueueAssigneeId = (input: {
  actor: Actor;
  assigneeUserId?: string;
}): string => {
  if (input.actor.role === "AUTHOR_ADMIN") {
    return input.assigneeUserId ?? input.actor.userId;
  }

  if (input.actor.role !== "EDITOR") {
    throw new ReviewRequestQueueUnauthorizedError("You do not have permission to access reviewer queues");
  }

  if (input.assigneeUserId !== undefined && input.assigneeUserId !== input.actor.userId) {
    throw new ReviewRequestQueueUnauthorizedError("Reviewer queue access is limited to your own assignments");
  }

  return input.actor.userId;
};

const assertProposalEligible = async (proposalId: string): Promise<void> => {
  const proposal = await reviewRequestRepository.findProposalLinkById(proposalId);

  if (proposal === null) {
    throw new ReviewRequestProposalNotFoundError();
  }

  if (proposal.entityId === null && proposal.manuscriptId === null) {
    throw new ReviewRequestProposalIneligibleError();
  }

  if (proposal.status !== "PENDING" || proposal.workflowState !== "IN_REVIEW") {
    throw new ReviewRequestProposalIneligibleError();
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

const normalizeQueueStatus = (status: ReviewRequestStatus | undefined): ReviewRequestStatus => {
  return status ?? defaultStatus;
};

const buildNotificationEventKey = (parts: string[]): string => {
  return parts.join(":");
};

const assertAssigneeReference = (assigneeUserId: string): string => {
  const normalized = assigneeUserId.trim();

  if (normalized.length === 0) {
    throw new ReviewRequestAssigneeReferenceMissingError();
  }

  return normalized;
};

const assertLifecycleTransitionAllowed = (fromStatus: ReviewRequestStatus, toStatus: ReviewRequestStatus): void => {
  const allowedTransitions = reviewRequestTransitionMatrix[fromStatus];

  if (!allowedTransitions.includes(toStatus)) {
    throw new ReviewRequestLifecycleTransitionInvalidError();
  }
};

const assertLifecycleProposalAlignment = (
  reviewRequest: ReviewRequestRecord,
  toStatus: ReviewRequestStatus
): void => {
  const proposal = reviewRequest.proposal;

  if (toStatus === "RESOLVED") {
    const isDecisionFinalized =
      proposal.status !== "PENDING" ||
      proposal.workflowState === "APPROVED" ||
      proposal.workflowState === "REJECTED" ||
      proposal.workflowState === "APPLIED" ||
      proposal.workflowState === "ARCHIVED";

    if (!isDecisionFinalized) {
      throw new ReviewRequestLifecycleProposalConflictError();
    }

    return;
  }

  const isPendingInReview = proposal.status === "PENDING" && proposal.workflowState === "IN_REVIEW";

  if (!isPendingInReview) {
    throw new ReviewRequestLifecycleProposalConflictError();
  }
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const parseStoredAssignmentHistory = (value: unknown): StoredAssignmentHistoryEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const entries: StoredAssignmentHistoryEntry[] = [];

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

const parseStoredLifecycleHistory = (value: unknown): StoredLifecycleHistoryEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const entries: StoredLifecycleHistoryEntry[] = [];

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

    const validStatuses = ["OPEN", "ACKNOWLEDGED", "IN_REVIEW", "RESOLVED", "CANCELED"];
    const validRoles = ["PUBLIC", "EDITOR", "AUTHOR_ADMIN"];

    if (!validStatuses.includes(fromStatus) || !validStatuses.includes(toStatus) || !validRoles.includes(transitionedByRole)) {
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

const toAssignmentHistory = (value: unknown): AssignmentHistoryEntry[] => {
  return parseStoredAssignmentHistory(value).map((entry) => ({
    assignedAt: new Date(entry.assignedAt),
    assignedById: entry.assignedById,
    assignedApproverId: entry.assignedApproverId,
    previousAssignedApproverId: entry.previousAssignedApproverId
  }));
};

const toLifecycleHistory = (value: unknown): LifecycleHistoryEntry[] => {
  return parseStoredLifecycleHistory(value).map((entry) => ({
    transitionedAt: new Date(entry.transitionedAt),
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    transitionedById: entry.transitionedById,
    transitionedByRole: entry.transitionedByRole
  }));
};

const mapReviewRequest = (reviewRequest: ReviewRequestRecord): ReviewRequestItem => ({
  id: reviewRequest.id,
  createdAt: reviewRequest.createdAt,
  updatedAt: reviewRequest.updatedAt,
  proposalId: reviewRequest.proposalId,
  createdById: reviewRequest.createdById,
  assignedApproverId: reviewRequest.assignedApproverId,
  assignedAt: reviewRequest.assignedAt,
  assignmentHistory: toAssignmentHistory(reviewRequest.assignmentHistory),
  lifecycleHistory: toLifecycleHistory(reviewRequest.lifecycleHistory),
  status: reviewRequest.status,
  proposal: {
    id: reviewRequest.proposal.id,
    entityId: reviewRequest.proposal.entityId,
    manuscriptId: reviewRequest.proposal.manuscriptId,
    status: reviewRequest.proposal.status,
    workflowState: reviewRequest.proposal.workflowState
  },
  createdBy: {
    userId: reviewRequest.createdBy.id,
    email: reviewRequest.createdBy.email,
    displayName: reviewRequest.createdBy.displayName,
    role: reviewRequest.createdBy.role
  },
  assignedApprover:
    reviewRequest.assignedApprover === null
      ? null
      : {
          userId: reviewRequest.assignedApprover.id,
          email: reviewRequest.assignedApprover.email,
          displayName: reviewRequest.assignedApprover.displayName,
          role: reviewRequest.assignedApprover.role
        }
});

export const reviewRequestService = {
  async createReviewRequest(input: { actor: Actor; proposalId: string }): Promise<ReviewRequestItem> {
    assertCanCreate(input.actor);

    const proposalId = assertProposalId(input.proposalId);
    await assertProposalEligible(proposalId);

    const reviewRequest = await reviewRequestRepository.createReviewRequest({
      proposalId,
      createdById: input.actor.userId,
      status: defaultStatus
    });

    await reviewRequestApprovalService.createDefaultChain(reviewRequest.id);

    await notificationEventService.emitNotificationEvent({
      eventType: "REVIEW_REQUEST_CREATED",
      eventKey: buildNotificationEventKey(["review-request-created", reviewRequest.id]),
      occurredAt: reviewRequest.createdAt,
      reviewRequestId: reviewRequest.id,
      actorUserId: input.actor.userId,
      payload: {
        proposalId: reviewRequest.proposalId,
        status: reviewRequest.status
      }
    });

    return mapReviewRequest(reviewRequest);
  },

  async getReviewRequestById(input: { actor: Actor; reviewRequestId: string }): Promise<ReviewRequestItem> {
    assertCanRead(input.actor);

    const reviewRequest = await reviewRequestRepository.findReviewRequestById(input.reviewRequestId);

    if (reviewRequest === null) {
      throw new ReviewRequestNotFoundError();
    }

    return mapReviewRequest(reviewRequest);
  },

  async listReviewRequests(input: {
    actor: Actor;
    limit?: number;
    offset?: number;
  }): Promise<ReviewRequestListResult> {
    assertCanList(input.actor);

    const limit = normalizeLimit(input.limit);
    const offset = normalizeOffset(input.offset);

    const result = await reviewRequestRepository.listReviewRequests({
      limit,
      offset
    });

    return {
      reviewRequests: result.reviewRequests.map((reviewRequest) => mapReviewRequest(reviewRequest)),
      total: result.total,
      limit,
      offset
    };
  },

  async assignApprover(input: {
    actor: Actor;
    reviewRequestId: string;
    assigneeUserId: string;
  }): Promise<ReviewRequestItem> {
    const reviewRequest = await reviewRequestRepository.findReviewRequestById(input.reviewRequestId);

    if (reviewRequest === null) {
      throw new ReviewRequestNotFoundError();
    }

    if (reviewRequest.status !== "OPEN") {
      throw new ReviewRequestAssignmentStateInvalidError();
    }

    assertCanAssign(input.actor, reviewRequest);

    const assigneeUserId = assertAssigneeReference(input.assigneeUserId);
    const assignee = await reviewRequestRepository.findAssignableApproverById(assigneeUserId);

    if (assignee === null) {
      throw new ReviewRequestAssigneeInvalidError();
    }

    const assignedAt = new Date();
    const priorHistory = parseStoredAssignmentHistory(reviewRequest.assignmentHistory);
    const nextHistory: StoredAssignmentHistoryEntry[] = [
      ...priorHistory,
      {
        assignedAt: assignedAt.toISOString(),
        assignedById: input.actor.userId,
        assignedApproverId: assignee.id,
        previousAssignedApproverId: reviewRequest.assignedApproverId
      }
    ];

    const assigned = await reviewRequestRepository.assignReviewRequest({
      reviewRequestId: reviewRequest.id,
      assignedApproverId: assignee.id,
      assignedAt,
      assignmentHistory: nextHistory
    });

    await reviewRequestApprovalService.assignFirstStepReviewer({
      reviewRequestId: reviewRequest.id,
      assigneeUserId: assignee.id
    });

    await notificationEventService.emitNotificationEvent({
      eventType: "REVIEW_REQUEST_ASSIGNED",
      eventKey: buildNotificationEventKey([
        "review-request-assigned",
        assigned.id,
        assigned.assignedAt?.toISOString() ?? "none"
      ]),
      occurredAt: assigned.assignedAt ?? new Date(),
      reviewRequestId: assigned.id,
      actorUserId: input.actor.userId,
      payload: {
        assignedApproverId: assigned.assignedApproverId,
        previousAssignedApproverId: reviewRequest.assignedApproverId,
        status: assigned.status
      }
    });

    return mapReviewRequest(assigned);
  },

  async transitionLifecycle(input: {
    actor: Actor;
    reviewRequestId: string;
    toStatus: ReviewRequestStatus;
  }): Promise<ReviewRequestItem> {
    const reviewRequest = await reviewRequestRepository.findReviewRequestById(input.reviewRequestId);

    if (reviewRequest === null) {
      throw new ReviewRequestNotFoundError();
    }

    assertCanTransition(input.actor, reviewRequest);
    assertLifecycleTransitionAllowed(reviewRequest.status, input.toStatus);
    assertLifecycleProposalAlignment(reviewRequest, input.toStatus);

    const transitionedAt = new Date();
    const priorHistory = parseStoredLifecycleHistory(reviewRequest.lifecycleHistory);
    const nextHistory: StoredLifecycleHistoryEntry[] = [
      ...priorHistory,
      {
        transitionedAt: transitionedAt.toISOString(),
        fromStatus: reviewRequest.status,
        toStatus: input.toStatus,
        transitionedById: input.actor.userId,
        transitionedByRole: input.actor.role
      }
    ];

    const transitioned = await reviewRequestRepository.transitionReviewRequestStatus({
      reviewRequestId: reviewRequest.id,
      fromStatus: reviewRequest.status,
      toStatus: input.toStatus,
      lifecycleHistory: nextHistory
    });

    if (transitioned === null) {
      throw new ReviewRequestLifecycleTransitionRaceError();
    }

    await notificationEventService.emitNotificationEvent({
      eventType: "REVIEW_REQUEST_STATUS_CHANGED",
      eventKey: buildNotificationEventKey([
        "review-request-status-changed",
        transitioned.id,
        reviewRequest.status,
        input.toStatus,
        transitionedAt.toISOString()
      ]),
      occurredAt: transitionedAt,
      reviewRequestId: transitioned.id,
      actorUserId: input.actor.userId,
      payload: {
        fromStatus: reviewRequest.status,
        toStatus: input.toStatus,
        proposalWorkflowState: transitioned.proposal.workflowState,
        proposalStatus: transitioned.proposal.status
      }
    });

    return mapReviewRequest(transitioned);
  },

  async listLifecycleHistory(input: {
    actor: Actor;
    reviewRequestId: string;
  }): Promise<{
    reviewRequestId: string;
    currentStatus: ReviewRequestStatus;
    lifecycleHistory: LifecycleHistoryEntry[];
  }> {
    const reviewRequest = await reviewRequestRepository.findReviewRequestById(input.reviewRequestId);

    if (reviewRequest === null) {
      throw new ReviewRequestNotFoundError();
    }

    assertCanTransition(input.actor, reviewRequest);

    return {
      reviewRequestId: reviewRequest.id,
      currentStatus: reviewRequest.status,
      lifecycleHistory: toLifecycleHistory(reviewRequest.lifecycleHistory)
    };
  },

  async listReviewerQueue(input: {
    actor: Actor;
    assigneeUserId?: string;
    status?: ReviewRequestStatus;
    workflowState?: ProposalWorkflowState;
    limit?: number;
    offset?: number;
  }): Promise<ReviewRequestListResult & { assigneeUserId: string; status: ReviewRequestStatus }> {
    const assigneeUserId = resolveReviewerQueueAssigneeId({
      actor: input.actor,
      ...(input.assigneeUserId === undefined ? {} : { assigneeUserId: input.assigneeUserId })
    });
    const status = normalizeQueueStatus(input.status);
    const limit = normalizeLimit(input.limit);
    const offset = normalizeOffset(input.offset);

    const result = await reviewRequestRepository.listReviewerQueue({
      assigneeUserId,
      status,
      ...(input.workflowState === undefined ? {} : { proposalWorkflowState: input.workflowState }),
      limit,
      offset
    });

    return {
      reviewRequests: result.reviewRequests.map((reviewRequest) => mapReviewRequest(reviewRequest)),
      total: result.total,
      assigneeUserId,
      status,
      limit,
      offset
    };
  },

  async listAdminQueue(input: {
    actor: Actor;
    assigneeUserId?: string;
    status?: ReviewRequestStatus;
    workflowState?: ProposalWorkflowState;
    limit?: number;
    offset?: number;
  }): Promise<ReviewRequestListResult & { status: ReviewRequestStatus; assigneeUserId: string | null }> {
    assertCanListAdminQueue(input.actor);

    const status = normalizeQueueStatus(input.status);
    const limit = normalizeLimit(input.limit);
    const offset = normalizeOffset(input.offset);

    const result = await reviewRequestRepository.listAdminQueue({
      ...(input.assigneeUserId === undefined ? {} : { assigneeUserId: input.assigneeUserId }),
      status,
      ...(input.workflowState === undefined ? {} : { proposalWorkflowState: input.workflowState }),
      limit,
      offset
    });

    return {
      reviewRequests: result.reviewRequests.map((reviewRequest) => mapReviewRequest(reviewRequest)),
      total: result.total,
      status,
      assigneeUserId: input.assigneeUserId ?? null,
      limit,
      offset
    };
  }
};
