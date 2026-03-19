import { locationRepository } from "../repositories/locationRepository.js";

export const publicLocationService = {
  async getBySlug(input: { slug: string; releaseSlug?: string }) {
    return locationRepository.findPublicLocationBySlug(input);
  }
};