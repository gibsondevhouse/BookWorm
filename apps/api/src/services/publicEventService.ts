import { eventRepository } from "../repositories/eventRepository.js";

export const publicEventService = {
  async getBySlug(input: { slug: string; releaseSlug?: string }) {
    return eventRepository.findPublicEventBySlug(input);
  }
};