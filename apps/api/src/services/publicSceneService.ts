import { manuscriptRevisionRepository } from "../repositories/manuscriptRevisionRepository.js";

export const publicSceneService = {
  async list(limit: number) {
    return manuscriptRevisionRepository.listActivePublicByType({
      manuscriptType: "SCENE",
      limit
    });
  },

  async getBySlug(slug: string) {
    return manuscriptRevisionRepository.findActivePublicBySlug({
      manuscriptType: "SCENE",
      slug
    });
  }
};