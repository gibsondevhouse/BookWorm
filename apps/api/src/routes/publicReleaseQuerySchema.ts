import { z } from "zod";

export const publicReleaseQuerySchema = z.object({
  releaseSlug: z.string().trim().min(1).optional()
});