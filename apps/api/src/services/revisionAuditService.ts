/**
 * Service for querying revision audit trails and application history.
 * This service is a thin wrapper around the revisionAuditRepository,
 * primarily for abstraction and future extension.
 */

import { type EntityType } from "@prisma/client";

import { revisionAuditRepository } from "../repositories/revisionAuditRepository.js";

export const revisionAuditService = {
  /**
   * Get audit trail of entity revisions created from applied proposals.
   * @param input - Entity type and slug
   * @returns Array of revisions with applied proposal metadata
   */
  async getEntityRevisionAuditTrail(input: { entityType: EntityType; slug: string }) {
    return revisionAuditRepository.findEntityRevisionsByAppliedProposals(input);
  },

  /**
   * Get audit trail of manuscript revisions created from applied proposals.
   * @param input - Manuscript ID
   * @returns Array of revisions with applied proposal metadata
   */
  async getManuscriptRevisionAuditTrail(input: { manuscriptId: string }) {
    return revisionAuditRepository.findManuscriptRevisionsByAppliedProposals(input);
  },

  /**
   * Get audit trail of relationship revisions created from applied proposals.
   * @param input - Relationship ID
   * @returns Array of revisions with applied proposal metadata
   */
  async getRelationshipRevisionAuditTrail(input: { relationshipId: string }) {
    return revisionAuditRepository.findRelationshipRevisionsByAppliedProposals(input);
  }
};
