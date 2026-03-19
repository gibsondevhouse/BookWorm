import { factionRepository } from "../repositories/factionRepository.js";

export const publicFactionService = {
  async getBySlug(input: { slug: string; releaseSlug?: string }) {
    return factionRepository.findPublicFactionBySlug(input);
  }
};