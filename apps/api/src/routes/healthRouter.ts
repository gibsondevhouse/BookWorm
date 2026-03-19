import { Router } from "express";

import { env } from "../config/env.js";
import { prismaClient } from "../db/prismaClient.js";

export const healthRouter = Router();

healthRouter.get("/", async (_request, response) => {
  try {
    await prismaClient.$queryRaw`SELECT 1`;

    response.json({
      status: "ok",
      service: "book-worm-api",
      environment: env.nodeEnv,
      dependencies: {
        database: "reachable"
      }
    });
  } catch {
    response.status(503).json({
      status: "degraded",
      service: "book-worm-api",
      environment: env.nodeEnv,
      dependencies: {
        database: "unreachable"
      }
    });
  }
});
