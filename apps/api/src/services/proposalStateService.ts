import { type ProposalWorkflowState, type Role } from "@prisma/client";

export class ProposalInvalidStateTransitionError extends Error {
  constructor(fromState: ProposalWorkflowState, toState: ProposalWorkflowState) {
    super(`Invalid state transition from ${fromState} to ${toState}`);
    this.name = "ProposalInvalidStateTransitionError";
  }
}

export class ProposalStateTransitionUnauthorizedError extends Error {
  constructor(state: ProposalWorkflowState, role: Role, action: string) {
    super(`Role ${role} cannot ${action} proposal in state ${state}`);
    this.name = "ProposalStateTransitionUnauthorizedError";
  }
}

type StateTransitionKey = `${ProposalWorkflowState}:${Role}`;

/**
 * Defines the valid state transitions for each (state, role) pair.
 * E.g., from DRAFT as AUTHOR_ADMIN (proposer), transitions to SUBMITTED only.
 * From SUBMITTED as AUTHOR_ADMIN, transitions back to DRAFT only (revert).
 */
const stateTransitionRules: Record<StateTransitionKey, ProposalWorkflowState[]> = {
  "DRAFT:PUBLIC": [],
  "DRAFT:EDITOR": ["SUBMITTED"],
  "DRAFT:AUTHOR_ADMIN": ["SUBMITTED", "IN_REVIEW"],
  "SUBMITTED:PUBLIC": [],
  "SUBMITTED:EDITOR": ["DRAFT"],
  "SUBMITTED:AUTHOR_ADMIN": ["IN_REVIEW", "DRAFT"],
  "IN_REVIEW:PUBLIC": [],
  "IN_REVIEW:EDITOR": [],
  "IN_REVIEW:AUTHOR_ADMIN": ["APPROVED", "REJECTED", "IN_REVIEW"],
  "APPROVED:PUBLIC": [],
  "APPROVED:EDITOR": [],
  "APPROVED:AUTHOR_ADMIN": ["APPLIED", "ARCHIVED"],
  "REJECTED:PUBLIC": [],
  "REJECTED:EDITOR": [],
  "REJECTED:AUTHOR_ADMIN": ["ARCHIVED"],
  "APPLIED:PUBLIC": [],
  "APPLIED:EDITOR": [],
  "APPLIED:AUTHOR_ADMIN": ["ARCHIVED"],
  "ARCHIVED:PUBLIC": [],
  "ARCHIVED:EDITOR": [],
  "ARCHIVED:AUTHOR_ADMIN": []
};

export const proposalStateService = {
  /**
   * Validates if a state transition is allowed for a given role.
   * Author (proposer) can: DRAFT → SUBMITTED, SUBMITTED → DRAFT (revert)
   * Admin can: SUBMITTED → IN_REVIEW, IN_REVIEW → APPROVED/REJECTED, APPROVED → APPLIED/ARCHIVED, etc.
   */
  validateStateTransition(
    fromState: ProposalWorkflowState,
    toState: ProposalWorkflowState,
    role: Role,
    proposerIsActor: boolean = false
  ): boolean {
    // Terminal state, no transitions out
    if (fromState === "ARCHIVED") {
      return false;
    }

    // Admin-only transitions
    if (role === "AUTHOR_ADMIN") {
      const key: StateTransitionKey = `${fromState}:${role}`;
      const allowedTransitions = stateTransitionRules[key] ?? [];
      return allowedTransitions.includes(toState);
    }

    // Author (proposer) transitions
    if (role === "EDITOR" && proposerIsActor) {
      // Author proposing can submit or revert
      if (fromState === "DRAFT" && toState === "SUBMITTED") return true;
      if (fromState === "SUBMITTED" && toState === "DRAFT") return true;
      return false;
    }

    return false;
  },

  /**
   * Returns the state transition rules as a map for UI helpers.
   * Maps (fromState, role) → allowedToStates[]
   */
  getStateTransitionRules(): Map<string, ProposalWorkflowState[]> {
    const rules = new Map<string, ProposalWorkflowState[]>();

    // DRAFT transitions
    rules.set("DRAFT:AUTHOR_ADMIN", ["SUBMITTED", "IN_REVIEW"]);
    rules.set("DRAFT:EDITOR_PROPOSER", ["SUBMITTED"]);

    // SUBMITTED transitions
    rules.set("SUBMITTED:AUTHOR_ADMIN", ["IN_REVIEW", "DRAFT"]);
    rules.set("SUBMITTED:EDITOR_PROPOSER", ["DRAFT"]);

    // IN_REVIEW transitions
    rules.set("IN_REVIEW:AUTHOR_ADMIN", ["APPROVED", "REJECTED", "IN_REVIEW"]);

    // APPROVED transitions
    rules.set("APPROVED:AUTHOR_ADMIN", ["APPLIED", "ARCHIVED"]);

    // REJECTED transitions
    rules.set("REJECTED:AUTHOR_ADMIN", ["ARCHIVED"]);

    // APPLIED transitions
    rules.set("APPLIED:AUTHOR_ADMIN", ["ARCHIVED"]);

    // ARCHIVED: no transitions

    return rules;
  },

  /**
   * Gets the timestamp field name for a state transition.
   * Used to record when the state change occurred.
   */
  getTimestampForState(state: ProposalWorkflowState): string | null {
    const timestampFields: Record<ProposalWorkflowState, string | null> = {
      DRAFT: null,
      SUBMITTED: "submittedAt",
      IN_REVIEW: "reviewStartedAt",
      APPROVED: "approvedAt",
      REJECTED: "approvedAt",
      APPLIED: "appliedAt",
      ARCHIVED: "archivedAt"
    };

    return timestampFields[state] ?? null;
  }
};
