import { characterRepository } from "../repositories/characterRepository.js";

export const publicCharacterService = {
  async getBySlug(input: { slug: string; releaseSlug?: string }) {
    return characterRepository.findPublicCharacterBySlug(input);
  }
};