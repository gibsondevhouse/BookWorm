import { type EntityType, type Role, type ProposalWorkflowState } from "@prisma/client";

import { proposalRepository } from "../repositories/proposalRepository.js";
import {
  proposalStateService,
  ProposalInvalidStateTransitionError,
  ProposalStateTransitionUnauthorizedError
} from "./proposalStateService.js";

type Actor = {
  userId: string;
  role: Role;
};

type ProposalRecord = NonNullable<Awaited<ReturnType<typeof proposalRepository.findProposalById>>>;
type ProposalListItem = Awaited<ReturnType<typeof proposalRepository.listProposalsByTarget>>[number];
type ProposalFilteredListItem = Awaited<ReturnType<typeof proposalRepository.listFilteredProposals>>["proposals"][number];
type ProposalChangeTypeValue = ProposalListItem["changeType"];
type ProposalStatusValue = ProposalListItem["status"];
type ProposalTargetRecord = Parameters<typeof proposalRepository.listProposalsByTarget>[0];

type ProposalTargetInput =
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

type ProposalItem = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  proposedById: string;
  decidedById: string | null;
  appliedById: string | null;
  entityId: string | null;
  manuscriptId: string | null;
  changeType: ProposalChangeTypeValue;
  status: ProposalStatusValue;
  title: string;
  summary: string;
  payload: unknown | null;
  decisionNote: string | null;
  appliedNote: string | null;
  decidedAt: Date | null;
  appliedAt: Date | null;
  workflowState: ProposalWorkflowState;
  submittedAt: Date | null;
  reviewStartedAt: Date | null;
  approvedAt: Date | null;
  archivedAt: Date | null;
  reviewNotes: string | null;
  proposedBy: {
    userId: string;
    email: string;
    displayName: string;
    role: Role;
  };
  decidedBy: {
    userId: string;
    email: string;
    displayName: string;
    role: Role;
  } | null;
};

type ProposalMetadataItem = {
  id: string;
  updatedAt: Date;
  status: ProposalStatusValue;
  workflowState: ProposalWorkflowState;
  decisionNote: string | null;
  rationale: string | null;
  reviewNotes: string | null;
  appliedNote: string | null;
  decidedAt: Date | null;
  reviewStartedAt: Date | null;
  approvedAt: Date | null;
  appliedAt: Date | null;
};

class ProposalNotFoundError extends Error {
  constructor() {
    super("Proposal not found");
    this.name = "ProposalNotFoundError";
  }
}

class ProposalAlreadyDecidedError extends Error {
  constructor() {
    super("Proposal already decided");
    this.name = "ProposalAlreadyDecidedError";
  }
}

class ProposalListUnauthorizedError extends Error {
  constructor() {
    super("You do not have permission to query this proposal view");
    this.name = "ProposalListUnauthorizedError";
  }
}

class ProposalMetadataUpdateUnauthorizedError extends Error {
  constructor() {
    super("You do not have permission to update proposal metadata");
    this.name = "ProposalMetadataUpdateUnauthorizedError";
  }
}

const maxTitleLength = 200;
const maxSummaryLength = 5000;
const maxProposalNoteLength = 5000;

const assertTitle = (title: string): string => {
  const trimmedTitle = title.trim();

  if (trimmedTitle.length === 0) {
    throw new Error("Proposal title is required");
  }

  if (trimmedTitle.length > maxTitleLength) {
    throw new Error("Proposal title must be at most 200 characters");
  }

  return trimmedTitle;
};

const assertSummary = (summary: string): string => {
  const trimmedSummary = summary.trim();

  if (trimmedSummary.length === 0) {
    throw new Error("Proposal summary is required");
  }

  if (trimmedSummary.length > maxSummaryLength) {
    throw new Error("Proposal summary must be at most 5000 characters");
  }

  return trimmedSummary;
};

const mapProposal = (proposal: ProposalRecord): ProposalItem => ({
  id: proposal.id,
  createdAt: proposal.createdAt,
  updatedAt: proposal.updatedAt,
  proposedById: proposal.proposedById,
  decidedById: proposal.decidedById,
  appliedById: proposal.appliedById,
  entityId: proposal.entityId,
  manuscriptId: proposal.manuscriptId,
  changeType: proposal.changeType,
  status: proposal.status,
  title: proposal.title,
  summary: proposal.summary,
  payload: proposal.payload,
  decisionNote: proposal.decisionNote,
  appliedNote: proposal.appliedNote,
  decidedAt: proposal.decidedAt,
  appliedAt: proposal.appliedAt,
  workflowState: proposal.workflowState,
  submittedAt: proposal.submittedAt,
  reviewStartedAt: proposal.reviewStartedAt,
  approvedAt: proposal.approvedAt,
  archivedAt: proposal.archivedAt,
  reviewNotes: proposal.reviewNotes,
  proposedBy: {
    userId: proposal.proposedBy.id,
    email: proposal.proposedBy.email,
    displayName: proposal.proposedBy.displayName,
    role: proposal.proposedBy.role
  },
  decidedBy:
    proposal.decidedBy === null
      ? null
      : {
          userId: proposal.decidedBy.id,
          email: proposal.decidedBy.email,
          displayName: proposal.decidedBy.displayName,
          role: proposal.decidedBy.role
        }
});

const mapProposalListItem = (proposal: ProposalFilteredListItem): ProposalItem => ({
  id: proposal.id,
  createdAt: proposal.createdAt,
  updatedAt: proposal.updatedAt,
  proposedById: proposal.proposedById,
  decidedById: proposal.decidedById,
  appliedById: proposal.appliedById,
  entityId: proposal.entityId,
  manuscriptId: proposal.manuscriptId,
  changeType: proposal.changeType,
  status: proposal.status,
  title: proposal.title,
  summary: proposal.summary,
  payload: proposal.payload,
  decisionNote: proposal.decisionNote,
  appliedNote: proposal.appliedNote,
  decidedAt: proposal.decidedAt,
  appliedAt: proposal.appliedAt,
  workflowState: proposal.workflowState,
  submittedAt: proposal.submittedAt,
  reviewStartedAt: proposal.reviewStartedAt,
  approvedAt: proposal.approvedAt,
  archivedAt: proposal.archivedAt,
  reviewNotes: proposal.reviewNotes,
  proposedBy: {
    userId: proposal.proposedBy.id,
    email: proposal.proposedBy.email,
    displayName: proposal.proposedBy.displayName,
    role: proposal.proposedBy.role
  },
  decidedBy:
    proposal.decidedBy === null
      ? null
      : {
          userId: proposal.decidedBy.id,
          email: proposal.decidedBy.email,
          displayName: proposal.decidedBy.displayName,
          role: proposal.decidedBy.role
        }
});

const normalizeDate = (dateValue: string | undefined): Date | undefined => {
  if (dateValue === undefined) {
    return undefined;
  }

  return new Date(dateValue);
};

const normalizeOptionalMetadataText = (
  value: string | null | undefined,
  fieldName: string
): string | null | undefined => {
  if (value === undefined || value === null) {
    return value;
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error(`${fieldName} must not be empty`);
  }

  if (normalized.length > maxProposalNoteLength) {
    throw new Error(`${fieldName} must be at most 5000 characters`);
  }

  return normalized;
};

const mapProposalMetadata = (proposal: ProposalRecord): ProposalMetadataItem => ({
  id: proposal.id,
  updatedAt: proposal.updatedAt,
  status: proposal.status,
  workflowState: proposal.workflowState,
  decisionNote: proposal.decisionNote,
  rationale: proposal.decisionNote,
  reviewNotes: proposal.reviewNotes,
  appliedNote: proposal.appliedNote,
  decidedAt: proposal.decidedAt,
  reviewStartedAt: proposal.reviewStartedAt,
  approvedAt: proposal.approvedAt,
  appliedAt: proposal.appliedAt
});

const resolveTarget = async (target: ProposalTargetInput): Promise<ProposalTargetRecord> => {
  if ("manuscriptId" in target) {
    const manuscript = await proposalRepository.findManuscriptById(target.manuscriptId);

    if (!manuscript) {
      throw new Error("Manuscript not found");
    }

    return {
      manuscriptId: manuscript.id
    };
  }

  {
    const entity = await proposalRepository.findEntityByTypeAndSlug({
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

export const proposalService = {
  async createProposal(input: {
    userId: string;
    target: ProposalTargetInput;
    changeType: ProposalChangeTypeValue;
    title: string;
    summary: string;
    payload?: unknown;
  }): Promise<ProposalItem> {
    const title = assertTitle(input.title);
    const summary = assertSummary(input.summary);
    const target = await resolveTarget(input.target);

    const proposal = await proposalRepository.createProposal({
      proposedById: input.userId,
      target,
      changeType: input.changeType,
      title,
      summary,
      ...(input.payload === undefined ? {} : { payload: input.payload })
    });

    return mapProposal(proposal);
  },

  async listProposalsByTarget(input: {
    target: ProposalTargetInput;
  }): Promise<ProposalItem[]> {
    const target = await resolveTarget(input.target);
    const proposals = await proposalRepository.listProposalsByTarget(target);

    return proposals.map((proposal) => mapProposal(proposal));
  },

  async getProposalById(input: { proposalId: string }): Promise<ProposalItem> {
    const proposal = await proposalRepository.findProposalById(input.proposalId);

    if (!proposal) {
      throw new ProposalNotFoundError();
    }

    return mapProposal(proposal);
  },

  async listAdminProposals(input?: {
    status?: ProposalStatusValue;
    changeType?: ProposalChangeTypeValue;
  }): Promise<ProposalItem[]> {
    const proposals = await proposalRepository.listAdminProposals(input);

    return proposals.map((proposal) => mapProposal(proposal));
  },

  async acceptProposal(input: {
    proposalId: string;
    decidedById: string;
    decisionNote?: string;
  }): Promise<ProposalItem> {
    const proposal = await proposalRepository.findProposalById(input.proposalId);

    if (!proposal) {
      throw new ProposalNotFoundError();
    }

    if (proposal.status !== "PENDING") {
      throw new ProposalAlreadyDecidedError();
    }

    const updatedProposal = await proposalRepository.decideProposal({
      proposalId: input.proposalId,
      status: "ACCEPTED",
      decidedById: input.decidedById,
      ...(input.decisionNote === undefined ? {} : { decisionNote: input.decisionNote.trim() })
    });

    return mapProposal(updatedProposal);
  },

  async rejectProposal(input: {
    proposalId: string;
    decidedById: string;
    decisionNote: string;
  }): Promise<ProposalItem> {
    const decisionNote = input.decisionNote.trim();

    if (decisionNote.length === 0) {
      throw new Error("Decision note is required");
    }

    const proposal = await proposalRepository.findProposalById(input.proposalId);

    if (!proposal) {
      throw new ProposalNotFoundError();
    }

    if (proposal.status !== "PENDING") {
      throw new ProposalAlreadyDecidedError();
    }

    const updatedProposal = await proposalRepository.decideProposal({
      proposalId: input.proposalId,
      status: "REJECTED",
      decidedById: input.decidedById,
      decisionNote
    });

    return mapProposal(updatedProposal);
  },

  /**
   * Submit a proposal from DRAFT to SUBMITTED (author/proposer only)
   */
  async submitProposal(
    proposalId: string,
    actor: Actor
  ): Promise<ProposalItem> {
    const proposal = await proposalRepository.findProposalById(proposalId);

    if (!proposal) {
      throw new ProposalNotFoundError();
    }

    // Only the proposer can submit
    if (proposal.proposedById !== actor.userId) {
      throw new ProposalStateTransitionUnauthorizedError(proposal.workflowState, actor.role, "submit");
    }

    // Validate transition
    const isProposer = proposal.proposedById === actor.userId;
    if (!proposalStateService.validateStateTransition(proposal.workflowState, "SUBMITTED", actor.role, isProposer)) {
      throw new ProposalInvalidStateTransitionError(proposal.workflowState, "SUBMITTED");
    }

    const updatedProposal = await proposalRepository.updateProposalWorkflowState(proposalId, "SUBMITTED", {
      submittedAt: new Date(),
      actor: actor.userId
    });

    return mapProposal(updatedProposal);
  },

  /**
   * Start review (admin only): SUBMITTED → IN_REVIEW
   */
  async startProposalReview(
    proposalId: string,
    actor: Actor
  ): Promise<ProposalItem> {
    if (actor.role !== "AUTHOR_ADMIN") {
      throw new ProposalStateTransitionUnauthorizedError("SUBMITTED", actor.role, "start review");
    }

    const proposal = await proposalRepository.findProposalById(proposalId);

    if (!proposal) {
      throw new ProposalNotFoundError();
    }

    if (!proposalStateService.validateStateTransition(proposal.workflowState, "IN_REVIEW", actor.role)) {
      throw new ProposalInvalidStateTransitionError(proposal.workflowState, "IN_REVIEW");
    }

    const updatedProposal = await proposalRepository.updateProposalWorkflowState(proposalId, "IN_REVIEW", {
      reviewStartedAt: new Date(),
      actor: actor.userId
    });

    return mapProposal(updatedProposal);
  },

  /**
   * Approve proposal for decision (admin only): IN_REVIEW → APPROVED
   */
  async approveProposalForDecision(
    proposalId: string,
    actor: Actor,
    reviewNotes?: string
  ): Promise<ProposalItem> {
    if (actor.role !== "AUTHOR_ADMIN") {
      throw new ProposalStateTransitionUnauthorizedError("IN_REVIEW", actor.role, "approve");
    }

    const proposal = await proposalRepository.findProposalById(proposalId);

    if (!proposal) {
      throw new ProposalNotFoundError();
    }

    if (!proposalStateService.validateStateTransition(proposal.workflowState, "APPROVED", actor.role)) {
      throw new ProposalInvalidStateTransitionError(proposal.workflowState, "APPROVED");
    }

    const notes = reviewNotes?.trim() ?? null;
    if (notes && notes.length > 5000) {
      throw new Error("Review notes must be at most 5000 characters");
    }

    const updates: {
      approvedAt: Date;
      reviewNotes?: string;
      actor: string;
    } = {
      approvedAt: new Date(),
      actor: actor.userId
    };

    if (notes) {
      updates.reviewNotes = notes;
    }

    const updatedProposal = await proposalRepository.updateProposalWorkflowState(proposalId, "APPROVED", updates);

    return mapProposal(updatedProposal);
  },

  /**
   * Reject proposal for decision (admin only): IN_REVIEW → REJECTED
   */
  async rejectProposalForDecision(
    proposalId: string,
    actor: Actor,
    reviewNotes?: string
  ): Promise<ProposalItem> {
    if (actor.role !== "AUTHOR_ADMIN") {
      throw new ProposalStateTransitionUnauthorizedError("IN_REVIEW", actor.role, "reject");
    }

    const proposal = await proposalRepository.findProposalById(proposalId);

    if (!proposal) {
      throw new ProposalNotFoundError();
    }

    if (!proposalStateService.validateStateTransition(proposal.workflowState, "REJECTED", actor.role)) {
      throw new ProposalInvalidStateTransitionError(proposal.workflowState, "REJECTED");
    }

    const notes = reviewNotes?.trim() ?? null;
    if (notes && notes.length > 5000) {
      throw new Error("Review notes must be at most 5000 characters");
    }

    const updates: {
      approvedAt: Date;
      reviewNotes?: string;
      actor: string;
    } = {
      approvedAt: new Date(),
      actor: actor.userId
    };

    if (notes) {
      updates.reviewNotes = notes;
    }

    const updatedProposal = await proposalRepository.updateProposalWorkflowState(proposalId, "REJECTED", updates);

    return mapProposal(updatedProposal);
  },

  /**
   * Archive proposal (admin only): terminal states → ARCHIVED
   */
  async archiveProposal(
    proposalId: string,
    actor: Actor
  ): Promise<ProposalItem> {
    if (actor.role !== "AUTHOR_ADMIN") {
      throw new ProposalStateTransitionUnauthorizedError("ARCHIVED", actor.role, "archive");
    }

    const proposal = await proposalRepository.findProposalById(proposalId);

    if (!proposal) {
      throw new ProposalNotFoundError();
    }

    if (!proposalStateService.validateStateTransition(proposal.workflowState, "ARCHIVED", actor.role)) {
      throw new ProposalInvalidStateTransitionError(proposal.workflowState, "ARCHIVED");
    }

    const updatedProposal = await proposalRepository.updateProposalWorkflowState(proposalId, "ARCHIVED", {
      archivedAt: new Date(),
      actor: actor.userId
    });

    return mapProposal(updatedProposal);
  },

  /**
   * Get proposals by workflow state with pagination
   */
  async listProposalsByWorkflowState(
    workflowState: ProposalWorkflowState,
    options?: { limit: number; offset: number }
  ): Promise<{ proposals: ProposalItem[]; total: number }> {
    const result = await proposalRepository.findProposalsByWorkflowState(workflowState, {
      limit: options?.limit ?? 50,
      offset: options?.offset ?? 0
    });

    return {
      proposals: result.proposals.map((p) => mapProposal(p)),
      total: result.total
    };
  },

  async listMyProposals(input: {
    actor: Actor;
    filters?: {
      workflowState?: ProposalWorkflowState;
      changeType?: ProposalChangeTypeValue;
      createdAtFrom?: string;
      createdAtTo?: string;
      limit?: number;
      offset?: number;
    };
  }): Promise<{ proposals: ProposalItem[]; total: number; limit: number; offset: number }> {
    const limit = input.filters?.limit ?? 50;
    const offset = input.filters?.offset ?? 0;
    const createdAtFrom = normalizeDate(input.filters?.createdAtFrom);
    const createdAtTo = normalizeDate(input.filters?.createdAtTo);

    const result = await proposalRepository.listFilteredProposals({
      ...(input.filters?.workflowState === undefined
        ? {}
        : { workflowState: input.filters.workflowState }),
      ...(input.filters?.changeType === undefined ? {} : { changeType: input.filters.changeType }),
      proposedById: input.actor.userId,
      ...(createdAtFrom === undefined ? {} : { createdAtFrom }),
      ...(createdAtTo === undefined ? {} : { createdAtTo }),
      limit,
      offset
    });

    return {
      proposals: result.proposals.map((proposal) => mapProposalListItem(proposal)),
      total: result.total,
      limit,
      offset
    };
  },

  async listPendingReviewProposals(input: {
    actor: Actor;
    filters?: {
      workflowState?: ProposalWorkflowState;
      changeType?: ProposalChangeTypeValue;
      submitterId?: string;
      createdAtFrom?: string;
      createdAtTo?: string;
      limit?: number;
      offset?: number;
    };
  }): Promise<{ proposals: ProposalItem[]; total: number; limit: number; offset: number }> {
    if (input.actor.role !== "AUTHOR_ADMIN") {
      throw new ProposalListUnauthorizedError();
    }

    const limit = input.filters?.limit ?? 50;
    const offset = input.filters?.offset ?? 0;
    const createdAtFrom = normalizeDate(input.filters?.createdAtFrom);
    const createdAtTo = normalizeDate(input.filters?.createdAtTo);
    const allowedPendingStates: ProposalWorkflowState[] = ["SUBMITTED", "IN_REVIEW"];
    const requestedState = input.filters?.workflowState;
    const workflowStates =
      requestedState === undefined
        ? allowedPendingStates
        : allowedPendingStates.includes(requestedState)
          ? [requestedState]
          : [];

    if (workflowStates.length === 0) {
      return {
        proposals: [],
        total: 0,
        limit,
        offset
      };
    }

    const result = await proposalRepository.listFilteredProposals({
      workflowStates,
      ...(input.filters?.changeType === undefined ? {} : { changeType: input.filters.changeType }),
      ...(input.filters?.submitterId === undefined ? {} : { proposedById: input.filters.submitterId }),
      ...(createdAtFrom === undefined ? {} : { createdAtFrom }),
      ...(createdAtTo === undefined ? {} : { createdAtTo }),
      limit,
      offset
    });

    return {
      proposals: result.proposals.map((proposal) => mapProposalListItem(proposal)),
      total: result.total,
      limit,
      offset
    };
  },

  async listAppliedProposals(input: {
    actor: Actor;
    filters?: {
      workflowState?: ProposalWorkflowState;
      changeType?: ProposalChangeTypeValue;
      submitterId?: string;
      createdAtFrom?: string;
      createdAtTo?: string;
      limit?: number;
      offset?: number;
    };
  }): Promise<{ proposals: ProposalItem[]; total: number; limit: number; offset: number }> {
    if (input.actor.role !== "AUTHOR_ADMIN") {
      throw new ProposalListUnauthorizedError();
    }

    const limit = input.filters?.limit ?? 50;
    const offset = input.filters?.offset ?? 0;
    const createdAtFrom = normalizeDate(input.filters?.createdAtFrom);
    const createdAtTo = normalizeDate(input.filters?.createdAtTo);
    const requestedState = input.filters?.workflowState;

    if (requestedState !== undefined && requestedState !== "APPLIED") {
      return {
        proposals: [],
        total: 0,
        limit,
        offset
      };
    }

    const result = await proposalRepository.listFilteredProposals({
      workflowState: "APPLIED",
      ...(input.filters?.changeType === undefined ? {} : { changeType: input.filters.changeType }),
      ...(input.filters?.submitterId === undefined ? {} : { proposedById: input.filters.submitterId }),
      ...(createdAtFrom === undefined ? {} : { createdAtFrom }),
      ...(createdAtTo === undefined ? {} : { createdAtTo }),
      appliedOnly: true,
      limit,
      offset
    });

    return {
      proposals: result.proposals.map((proposal) => mapProposalListItem(proposal)),
      total: result.total,
      limit,
      offset
    };
  },

  async getProposalMetadata(input: { proposalId: string }): Promise<ProposalMetadataItem> {
    const proposal = await proposalRepository.findProposalById(input.proposalId);

    if (!proposal) {
      throw new ProposalNotFoundError();
    }

    return mapProposalMetadata(proposal);
  },

  async updateProposalMetadata(input: {
    proposalId: string;
    actor: Actor;
    metadata: {
      reviewNotes?: string | null;
      decisionNote?: string | null;
      appliedNote?: string | null;
    };
  }): Promise<ProposalMetadataItem> {
    if (input.actor.role !== "AUTHOR_ADMIN") {
      throw new ProposalMetadataUpdateUnauthorizedError();
    }

    const proposal = await proposalRepository.findProposalById(input.proposalId);

    if (!proposal) {
      throw new ProposalNotFoundError();
    }

    const hasDecisionNote = Object.hasOwn(input.metadata, "decisionNote");
    const hasReviewNotes = Object.hasOwn(input.metadata, "reviewNotes");
    const hasAppliedNote = Object.hasOwn(input.metadata, "appliedNote");

    if (!hasDecisionNote && !hasReviewNotes && !hasAppliedNote) {
      throw new Error("At least one metadata field is required");
    }

    if (hasAppliedNote && proposal.appliedAt === null) {
      throw new Error("Applied note can only be updated for proposals in APPLIED state");
    }

    const decisionNote = normalizeOptionalMetadataText(
      input.metadata.decisionNote,
      "Decision note"
    );
    const reviewNotes = normalizeOptionalMetadataText(
      input.metadata.reviewNotes,
      "Review notes"
    );
    const appliedNote = normalizeOptionalMetadataText(
      input.metadata.appliedNote,
      "Applied note"
    );

    const updatedProposal = await proposalRepository.updateProposalMetadata({
      proposalId: input.proposalId,
      ...(hasDecisionNote ? { decisionNote: decisionNote ?? null } : {}),
      ...(hasReviewNotes ? { reviewNotes: reviewNotes ?? null } : {}),
      ...(hasAppliedNote ? { appliedNote: appliedNote ?? null } : {})
    });

    return mapProposalMetadata(updatedProposal);
  },

  async getWorkflowStateSummary(input: {
    actor: Actor;
    from?: string;
    to?: string;
  }): Promise<{
    counts: {
      DRAFT: number;
      SUBMITTED: number;
      IN_REVIEW: number;
      APPROVED: number;
      REJECTED: number;
      APPLIED: number;
      ARCHIVED: number;
    };
    total: number;
  }> {
    if (input.actor.role !== "AUTHOR_ADMIN") {
      throw new ProposalListUnauthorizedError();
    }

    const createdAtFrom = normalizeDate(input.from);
    const createdAtTo = normalizeDate(input.to);

    const counts = await proposalRepository.countByWorkflowState({
      ...(createdAtFrom === undefined ? {} : { createdAtFrom }),
      ...(createdAtTo === undefined ? {} : { createdAtTo })
    });

    return {
      counts,
      total:
        counts.DRAFT +
        counts.SUBMITTED +
        counts.IN_REVIEW +
        counts.APPROVED +
        counts.REJECTED +
        counts.APPLIED +
        counts.ARCHIVED
    };
  },

  async getChangeTypeSummary(input: {
    actor: Actor;
    from?: string;
    to?: string;
  }): Promise<{
    counts: {
      CREATE: number;
      UPDATE: number;
      DELETE: number;
    };
    total: number;
  }> {
    if (input.actor.role !== "AUTHOR_ADMIN") {
      throw new ProposalListUnauthorizedError();
    }

    const createdAtFrom = normalizeDate(input.from);
    const createdAtTo = normalizeDate(input.to);

    const counts = await proposalRepository.countByChangeType({
      ...(createdAtFrom === undefined ? {} : { createdAtFrom }),
      ...(createdAtTo === undefined ? {} : { createdAtTo })
    });

    return {
      counts,
      total: counts.CREATE + counts.UPDATE + counts.DELETE
    };
  }
}
