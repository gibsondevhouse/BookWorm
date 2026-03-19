import { manuscriptRevisionRepository } from "../repositories/manuscriptRevisionRepository.js";

export const publicChapterService = {
  async list(limit: number) {
    return manuscriptRevisionRepository.listActivePublicByType({
      manuscriptType: "CHAPTER",
      limit
    });
  },

  async getBySlug(slug: string) {
    return manuscriptRevisionRepository.findActivePublicBySlug({
      manuscriptType: "CHAPTER",
      slug
    });
  }
};