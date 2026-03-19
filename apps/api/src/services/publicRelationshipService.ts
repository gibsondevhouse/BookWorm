import { relationshipRepository } from "../repositories/relationshipRepository.js";

export const publicRelationshipService = {
  async getByKey(input: {
    sourceEntitySlug: string;
    targetEntitySlug: string;
    relationType: string;
  }) {
    return relationshipRepository.findActivePublicRelationship(input);
  }
};