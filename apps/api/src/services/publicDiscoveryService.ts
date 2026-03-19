import type { EntityType } from "@prisma/client";

import { publicDiscoveryRepository } from "../repositories/publicDiscoveryRepository.js";

export const publicDiscoveryService = {
  async listContent(input: {
    entityType?: EntityType;
    query?: string;
    limit: number;
  }) {
    return publicDiscoveryRepository.listActivePublicContent(input);
  }
};