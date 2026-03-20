import { type ApprovalChainStatus, type ApprovalStepStatus, type Role } from "@prisma/client";

import { reviewRequestApprovalRepository } from "../repositories/reviewRequestApprovalRepository.js";
import { notificationEventService } from "./notificationEventService.js";

type Actor = {
  userId: string;
  role: Role;
};

type ApprovalDecision = "APPROVE" | "REJECT";
type DelegationReasonCode = "UNAVAILABLE" | "WORKLOAD_BALANCING" | "CONFLICT_OF_INTEREST" | "OTHER";
type EscalationReasonCode = "TIME_THRESHOLD_EXCEEDED" | "UNAVAILABLE_REVIEWER" | "CONFLICT_OF_INTEREST";

type ApprovalChainRecord = NonNullable<
  Awaited<ReturnType<typeof reviewRequestApprovalRepository.findByReviewRequestId>>
>;

type ApprovalStepRecord = ApprovalChainRecord["steps"][number];

const ESCALATION_THRESHOLD_MS = 24 * 60 * 60 * 1000;

class ReviewRequestApprovalChainNotFoundError extends Error {
  constructor() {
    super("Review request approval chain not found");
    this.name = "ReviewRequestApprovalChainNotFoundError";
  }
}

class ReviewRequestApprovalStepNotFoundError extends Error {
  constructor() {
    super("Review request approval step not found");
    this.name = "ReviewRequestApprovalStepNotFoundError";
  }
}

class ReviewRequestApprovalUnauthorizedError extends Error {
  constructor() {
    super("You do not have permission to act on this approval step");
    this.name = "ReviewRequestApprovalUnauthorizedError";
  }
}

class ReviewRequestApprovalStepOrderError extends Error {
  constructor() {
    super("Required approval steps must be completed in order");
    this.name = "ReviewRequestApprovalStepOrderError";
  }
}

class ReviewRequestApprovalTransitionInvalidError extends Error {
  constructor() {
    super("Approval step transition is not permitted");
    this.name = "ReviewRequestApprovalTransitionInvalidError";
  }
}

class ReviewRequestApprovalChainFinalizedError extends Error {
  constructor() {
    super("Approval chain is already finalized");
    this.name = "ReviewRequestApprovalChainFinalizedError";
  }
}

class ReviewRequestApprovalPolicyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewRequestApprovalPolicyViolationError";
  }
}

class ReviewRequestApprovalDelegateNotFoundError extends Error {
  constructor() {
    super("Delegate user is not eligible for approval delegation");
    this.name = "ReviewRequestApprovalDelegateNotFoundError";
  }
}

const isStepActionable = (status: ApprovalStepStatus): boolean => status === "PENDING" || status === "ACKNOWLEDGED";

const assertChainActive = (status: ApprovalChainStatus): void => {
  if (status !== "ACTIVE") {
    throw new ReviewRequestApprovalChainFinalizedError();
  }
};

const assertPriorRequiredApproved = (chain: ApprovalChainRecord, stepOrder: number): void => {
  const blocked = chain.steps.some(
    (step) => step.required && step.stepOrder < stepOrder && step.status !== "APPROVED"
  );

  if (blocked) {
    throw new ReviewRequestApprovalStepOrderError();
  }
};

const assertActorAuthorized = (input: {
  actor: Actor;
  chain: ApprovalChainRecord;
  step: ApprovalChainRecord["steps"][number];
}): void => {
  const { actor, chain, step } = input;

  if (step.assignedReviewerId !== null) {
    if (step.assignedReviewerId !== actor.userId) {
      throw new ReviewRequestApprovalUnauthorizedError();
    }
    return;
  }

  if (step.assignedRole !== null && step.assignedRole !== actor.role) {
    throw new ReviewRequestApprovalUnauthorizedError();
  }

  if (step.assignedRole === "EDITOR" && chain.reviewRequest.assignedApproverId !== null) {
    if (chain.reviewRequest.assignedApproverId !== actor.userId) {
      throw new ReviewRequestApprovalUnauthorizedError();
    }
  }
};

const getStepByOrder = (chain: ApprovalChainRecord, stepOrder: number): ApprovalChainRecord["steps"][number] => {
  const step = chain.steps.find((candidate) => candidate.stepOrder === stepOrder);

  if (step === undefined) {
    throw new ReviewRequestApprovalStepNotFoundError();
  }

  return step;
};

const assertStepActionable = (step: ApprovalStepRecord): void => {
  if (!isStepActionable(step.status)) {
    throw new ReviewRequestApprovalTransitionInvalidError();
  }
};

const assertActorCanDelegate = (input: { actor: Actor; step: ApprovalStepRecord }): void => {
  const { actor, step } = input;

  if (step.assignedReviewerId === actor.userId || actor.role === "AUTHOR_ADMIN") {
    return;
  }

  throw new ReviewRequestApprovalUnauthorizedError();
};

const assertDelegateRoleCompatible = (input: {
  step: ApprovalStepRecord;
  delegateRole: Role;
  delegateUserId: string;
  actorUserId: string;
}): void => {
  const { step, delegateRole, delegateUserId, actorUserId } = input;

  if (delegateUserId === actorUserId) {
    throw new ReviewRequestApprovalPolicyViolationError("Delegation target must differ from the actor");
  }

  if (step.assignedRole !== null && delegateRole !== step.assignedRole) {
    throw new ReviewRequestApprovalPolicyViolationError(
      "Delegation target role must match the approval step assigned role"
    );
  }
};

const assertActorCanEscalate = (input: { actor: Actor; step: ApprovalStepRecord }): void => {
  const { actor, step } = input;

  if (actor.role === "AUTHOR_ADMIN" || step.assignedReviewerId === actor.userId) {
    return;
  }

  throw new ReviewRequestApprovalUnauthorizedError();
};

const assertActorCanReadStep = (input: { actor: Actor; chain: ApprovalChainRecord; step: ApprovalStepRecord }): void => {
  if (input.actor.role === "AUTHOR_ADMIN") {
    return;
  }

  assertActorAuthorized(input);
};

const assertEscalationReasonAllowed = (input: {
  reasonCode: EscalationReasonCode;
  step: ApprovalStepRecord;
  now: Date;
}): void => {
  if (input.reasonCode !== "TIME_THRESHOLD_EXCEEDED") {
    return;
  }

  if (input.now.getTime() - input.step.updatedAt.getTime() < ESCALATION_THRESHOLD_MS) {
    throw new ReviewRequestApprovalPolicyViolationError(
      "Escalation threshold has not been met for TIME_THRESHOLD_EXCEEDED"
    );
  }
};

const assertEscalationTargetAvailable = (step: ApprovalStepRecord): void => {
  if (step.assignedRole === "AUTHOR_ADMIN" && step.assignedReviewerId === null) {
    throw new ReviewRequestApprovalPolicyViolationError("Approval step is already escalated to AUTHOR_ADMIN");
  }
};

const mapStepEvent = (
  event: Awaited<ReturnType<typeof reviewRequestApprovalRepository.listStepEvents>>[number]
) => ({
  id: event.id,
  stepId: event.stepId,
  eventType: event.eventType,
  reasonCode: event.reasonCode,
  reasonNote: event.reasonNote,
  actorUserId: event.actorUserId,
  fromAssignedReviewerId: event.fromAssignedReviewerId,
  fromAssignedRole: event.fromAssignedRole,
  toAssignedReviewerId: event.toAssignedReviewerId,
  toAssignedRole: event.toAssignedRole,
  escalationLevel: event.escalationLevel,
  createdAt: event.createdAt
});

const mapChain = (chain: ApprovalChainRecord) => ({
  id: chain.id,
  reviewRequestId: chain.reviewRequestId,
  status: chain.status,
  currentStepOrder: chain.currentStepOrder,
  finalizedAt: chain.finalizedAt,
  createdAt: chain.createdAt,
  updatedAt: chain.updatedAt,
  steps: chain.steps.map((step) => ({
    id: step.id,
    stepOrder: step.stepOrder,
    title: step.title,
    required: step.required,
    status: step.status,
    assignedReviewerId: step.assignedReviewerId,
    assignedRole: step.assignedRole,
    acknowledgedAt: step.acknowledgedAt,
    acknowledgedById: step.acknowledgedById,
    decidedAt: step.decidedAt,
    decidedById: step.decidedById,
    decisionNote: step.decisionNote,
    escalationLevel: step.escalationLevel,
    escalatedAt: step.escalatedAt,
    escalatedById: step.escalatedById,
    createdAt: step.createdAt,
    updatedAt: step.updatedAt
  }))
});

const buildNotificationEventKey = (parts: string[]): string => {
  return parts.join(":");
};

export const reviewRequestApprovalService = {
  async createDefaultChain(reviewRequestId: string): Promise<void> {
    await reviewRequestApprovalRepository.createDefaultApprovalChain(reviewRequestId);
  },

  async assignFirstStepReviewer(input: { reviewRequestId: string; assigneeUserId: string }): Promise<void> {
    await reviewRequestApprovalRepository.assignFirstStepReviewer({
      reviewRequestId: input.reviewRequestId,
      assigneeUserId: input.assigneeUserId
    });
  },

  async acknowledgeStep(input: { actor: Actor; reviewRequestId: string; stepOrder: number }) {
    const chain = await reviewRequestApprovalRepository.findByReviewRequestId(input.reviewRequestId);

    if (chain === null) {
      throw new ReviewRequestApprovalChainNotFoundError();
    }

    assertChainActive(chain.status);

    const step = getStepByOrder(chain, input.stepOrder);
    assertPriorRequiredApproved(chain, step.stepOrder);
    assertActorAuthorized({ actor: input.actor, chain, step });

    if (step.status !== "PENDING") {
      throw new ReviewRequestApprovalTransitionInvalidError();
    }

    await reviewRequestApprovalRepository.acknowledgeStep({
      stepId: step.id,
      actorUserId: input.actor.userId,
      acknowledgedAt: new Date()
    });

    const refreshed = await reviewRequestApprovalRepository.findByReviewRequestId(input.reviewRequestId);

    if (refreshed === null) {
      throw new ReviewRequestApprovalChainNotFoundError();
    }

    return mapChain(refreshed);
  },

  async decideStep(input: {
    actor: Actor;
    reviewRequestId: string;
    stepOrder: number;
    decision: ApprovalDecision;
    decisionNote?: string;
  }) {
    const chain = await reviewRequestApprovalRepository.findByReviewRequestId(input.reviewRequestId);

    if (chain === null) {
      throw new ReviewRequestApprovalChainNotFoundError();
    }

    assertChainActive(chain.status);

    const step = getStepByOrder(chain, input.stepOrder);
    assertPriorRequiredApproved(chain, step.stepOrder);
    assertActorAuthorized({ actor: input.actor, chain, step });

    assertStepActionable(step);

    const now = new Date();
    const decisionNote = input.decisionNote?.trim();

    if (input.decision === "APPROVE") {
      const lastRequiredStepOrder = chain.steps
        .filter((candidate) => candidate.required)
        .reduce((max, candidate) => Math.max(max, candidate.stepOrder), 0);
      const chainComplete = step.required && step.stepOrder === lastRequiredStepOrder;

      await reviewRequestApprovalRepository.approveStep({
        chainId: chain.id,
        stepId: step.id,
        actorUserId: input.actor.userId,
        decidedAt: now,
        decisionNote: decisionNote === undefined || decisionNote.length === 0 ? null : decisionNote,
        nextStepOrder: step.stepOrder + 1,
        chainComplete
      });
    } else {
      await reviewRequestApprovalRepository.rejectStep({
        chainId: chain.id,
        stepId: step.id,
        stepOrder: step.stepOrder,
        actorUserId: input.actor.userId,
        decidedAt: now,
        decisionNote: decisionNote === undefined || decisionNote.length === 0 ? null : decisionNote
      });
    }

    const refreshed = await reviewRequestApprovalRepository.findByReviewRequestId(input.reviewRequestId);

    if (refreshed === null) {
      throw new ReviewRequestApprovalChainNotFoundError();
    }

    await notificationEventService.emitNotificationEvent({
      eventType: "APPROVAL_STEP_DECISION_RECORDED",
      eventKey: buildNotificationEventKey([
        "approval-step-decision",
        step.id,
        input.decision,
        now.toISOString()
      ]),
      occurredAt: now,
      reviewRequestId: chain.reviewRequestId,
      approvalChainId: chain.id,
      approvalStepId: step.id,
      actorUserId: input.actor.userId,
      payload: {
        decision: input.decision,
        decisionNote: decisionNote === undefined || decisionNote.length === 0 ? null : decisionNote,
        stepOrder: step.stepOrder,
        chainStatus: refreshed.status
      }
    });

    return mapChain(refreshed);
  },

  async delegateStep(input: {
    actor: Actor;
    reviewRequestId: string;
    stepOrder: number;
    delegateToUserId: string;
    reasonCode: DelegationReasonCode;
    reasonNote?: string;
  }) {
    const chain = await reviewRequestApprovalRepository.findByReviewRequestId(input.reviewRequestId);

    if (chain === null) {
      throw new ReviewRequestApprovalChainNotFoundError();
    }

    assertChainActive(chain.status);

    const step = getStepByOrder(chain, input.stepOrder);
    assertPriorRequiredApproved(chain, step.stepOrder);
    assertStepActionable(step);
    assertActorCanDelegate({ actor: input.actor, step });

    if (step.assignedReviewerId === null) {
      throw new ReviewRequestApprovalPolicyViolationError("Approval step must have an assigned reviewer to delegate");
    }

    const delegate = await reviewRequestApprovalRepository.findEligibleActorById(input.delegateToUserId);

    if (delegate === null) {
      throw new ReviewRequestApprovalDelegateNotFoundError();
    }

    assertDelegateRoleCompatible({
      step,
      delegateRole: delegate.role,
      delegateUserId: delegate.id,
      actorUserId: input.actor.userId
    });

    const delegatedAt = new Date();
    const delegated = await reviewRequestApprovalRepository.delegateStep({
      stepId: step.id,
      actorUserId: input.actor.userId,
      delegatedAt,
      delegateToUserId: delegate.id,
      fromAssignedReviewerId: step.assignedReviewerId,
      fromAssignedRole: step.assignedRole,
      toAssignedRole: step.assignedRole,
      reasonCode: input.reasonCode,
      reasonNote: input.reasonNote?.trim() ? input.reasonNote.trim() : null,
      escalationLevel: step.escalationLevel
    });

    if (!delegated) {
      throw new ReviewRequestApprovalTransitionInvalidError();
    }

    const refreshed = await reviewRequestApprovalRepository.findByReviewRequestId(input.reviewRequestId);

    if (refreshed === null) {
      throw new ReviewRequestApprovalChainNotFoundError();
    }

    await notificationEventService.emitNotificationEvent({
      eventType: "APPROVAL_STEP_DELEGATED",
      eventKey: buildNotificationEventKey([
        "approval-step-delegated",
        step.id,
        delegate.id,
        delegatedAt.toISOString()
      ]),
      occurredAt: delegatedAt,
      reviewRequestId: chain.reviewRequestId,
      approvalChainId: chain.id,
      approvalStepId: step.id,
      actorUserId: input.actor.userId,
      payload: {
        fromAssignedReviewerId: step.assignedReviewerId,
        toAssignedReviewerId: delegate.id,
        reasonCode: input.reasonCode,
        reasonNote: input.reasonNote?.trim() ? input.reasonNote.trim() : null,
        stepOrder: step.stepOrder,
        escalationLevel: step.escalationLevel
      }
    });

    return mapChain(refreshed);
  },

  async escalateStep(input: {
    actor: Actor;
    reviewRequestId: string;
    stepOrder: number;
    reasonCode: EscalationReasonCode;
    reasonNote?: string;
  }) {
    const chain = await reviewRequestApprovalRepository.findByReviewRequestId(input.reviewRequestId);

    if (chain === null) {
      throw new ReviewRequestApprovalChainNotFoundError();
    }

    assertChainActive(chain.status);

    const step = getStepByOrder(chain, input.stepOrder);
    assertPriorRequiredApproved(chain, step.stepOrder);
    assertStepActionable(step);
    assertActorCanEscalate({ actor: input.actor, step });
    assertEscalationTargetAvailable(step);

    const now = new Date();
    assertEscalationReasonAllowed({ reasonCode: input.reasonCode, step, now });

    const escalated = await reviewRequestApprovalRepository.escalateStep({
      stepId: step.id,
      actorUserId: input.actor.userId,
      escalatedAt: now,
      fromAssignedReviewerId: step.assignedReviewerId,
      fromAssignedRole: step.assignedRole,
      reasonCode: input.reasonCode,
      reasonNote: input.reasonNote?.trim() ? input.reasonNote.trim() : null,
      escalationLevel: step.escalationLevel + 1
    });

    if (!escalated) {
      throw new ReviewRequestApprovalTransitionInvalidError();
    }

    const refreshed = await reviewRequestApprovalRepository.findByReviewRequestId(input.reviewRequestId);

    if (refreshed === null) {
      throw new ReviewRequestApprovalChainNotFoundError();
    }

    await notificationEventService.emitNotificationEvent({
      eventType: "APPROVAL_STEP_ESCALATED",
      eventKey: buildNotificationEventKey([
        "approval-step-escalated",
        step.id,
        String(step.escalationLevel + 1),
        now.toISOString()
      ]),
      occurredAt: now,
      reviewRequestId: chain.reviewRequestId,
      approvalChainId: chain.id,
      approvalStepId: step.id,
      actorUserId: input.actor.userId,
      payload: {
        fromAssignedReviewerId: step.assignedReviewerId,
        fromAssignedRole: step.assignedRole,
        toAssignedRole: "AUTHOR_ADMIN",
        reasonCode: input.reasonCode,
        reasonNote: input.reasonNote?.trim() ? input.reasonNote.trim() : null,
        stepOrder: step.stepOrder,
        escalationLevel: step.escalationLevel + 1
      }
    });

    return mapChain(refreshed);
  },

  async getEscalationState(input: { actor: Actor; reviewRequestId: string; stepOrder: number }) {
    const chain = await reviewRequestApprovalRepository.findByReviewRequestId(input.reviewRequestId);

    if (chain === null) {
      throw new ReviewRequestApprovalChainNotFoundError();
    }

    const step = getStepByOrder(chain, input.stepOrder);
    assertActorCanReadStep({ actor: input.actor, chain, step });

    return {
      reviewRequestId: chain.reviewRequestId,
      stepOrder: step.stepOrder,
      stepId: step.id,
      status: step.status,
      isEscalated: step.escalationLevel > 0,
      escalationLevel: step.escalationLevel,
      escalatedAt: step.escalatedAt,
      escalatedById: step.escalatedById,
      assignedReviewerId: step.assignedReviewerId,
      assignedRole: step.assignedRole
    };
  },

  async getStepLineage(input: { actor: Actor; reviewRequestId: string; stepOrder: number }) {
    const chain = await reviewRequestApprovalRepository.findByReviewRequestId(input.reviewRequestId);

    if (chain === null) {
      throw new ReviewRequestApprovalChainNotFoundError();
    }

    const step = getStepByOrder(chain, input.stepOrder);
    assertActorCanReadStep({ actor: input.actor, chain, step });

    const events = await reviewRequestApprovalRepository.listStepEvents(step.id);

    return {
      reviewRequestId: chain.reviewRequestId,
      stepOrder: step.stepOrder,
      stepId: step.id,
      currentStatus: step.status,
      currentAssignedReviewerId: step.assignedReviewerId,
      currentAssignedRole: step.assignedRole,
      escalationLevel: step.escalationLevel,
      events: events.map((event) => mapStepEvent(event))
    };
  }
};
