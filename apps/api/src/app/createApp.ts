import cors from "cors";
import express, { type Express } from "express";

import { env } from "../config/env.js";
import { getRootStatus } from "../lib/rootStatus.js";
import { adminChapterRouter } from "../routes/adminChapterRouter.js";
import { authSessionRouter } from "../routes/authSessionRouter.js";
import { adminCharacterRouter } from "../routes/adminCharacterRouter.js";
import { commentRouter } from "../routes/commentRouter.js";
import { adminEntityRouter } from "../routes/adminEntityRouter.js";
import { adminEventRouter } from "../routes/adminEventRouter.js";
import { adminFactionRouter } from "../routes/adminFactionRouter.js";
import { adminLocationRouter } from "../routes/adminLocationRouter.js";
import { adminRevisionDiffRouter } from "../routes/adminRevisionDiffRouter.js";
import { adminRevisionTimelineRouter } from "../routes/adminRevisionTimelineRouter.js";
import { adminRelationshipRouter } from "../routes/adminRelationshipRouter.js";
import { adminReleaseRouter } from "../routes/adminReleaseRouter.js";
import { adminSceneRouter } from "../routes/adminSceneRouter.js";
import { healthRouter } from "../routes/healthRouter.js";
import { notificationEventRouter } from "../routes/notificationEventRouter.js";
import { notificationPreferenceRouter } from "../routes/notificationPreferenceRouter.js";
import { proposalRouter } from "../routes/proposalRouter.js";
import { proposalApplicationRouter } from "../routes/proposalApplicationRouter.js";
import { proposalPreviewRouter } from "../routes/proposalPreviewRouter.js";
import { proposalWorkflowRouter } from "../routes/proposalWorkflowRouter.js";
import { publicCharacterRouter } from "../routes/publicCharacterRouter.js";
import { publicChapterRouter } from "../routes/publicChapterRouter.js";
import { publicCodexRouter } from "../routes/publicCodexRouter.js";
import { publicDiscoveryRouter } from "../routes/publicDiscoveryRouter.js";
import { publicEventRouter } from "../routes/publicEventRouter.js";
import { publicSearchRouter } from "../routes/publicSearchRouter.js";
import { publicFactionRouter } from "../routes/publicFactionRouter.js";
import { publicLocationRouter } from "../routes/publicLocationRouter.js";
import { publicRelationshipRouter } from "../routes/publicRelationshipRouter.js";
import { publicSceneRouter } from "../routes/publicSceneRouter.js";
import { reviewInboxRouter } from "../routes/reviewInboxRouter.js";
import { reviewRequestRouter } from "../routes/reviewRequestRouter.js";

export const createApp = (): Express => {
  const app = express();

  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true
    })
  );
  app.use(express.json({ limit: "2mb" }));

  app.get("/", async (_request, response) => {
    response.json(await getRootStatus());
  });

  app.use("/auth/session", authSessionRouter);
  app.use("/admin/chapters", adminChapterRouter);
  app.use("/admin/characters", adminCharacterRouter);
  app.use("/admin/entities", adminEntityRouter);
  app.use("/admin/events", adminEventRouter);
  app.use("/admin/factions", adminFactionRouter);
  app.use("/admin/locations", adminLocationRouter);
  app.use("/admin/revision-diffs", adminRevisionDiffRouter);
  app.use("/admin/revision-history", adminRevisionTimelineRouter);
  app.use("/admin/relationships", adminRelationshipRouter);
  app.use("/admin/releases", adminReleaseRouter);
  app.use("/admin/scenes", adminSceneRouter);
  app.use(commentRouter);
  app.use(notificationEventRouter);
  app.use(notificationPreferenceRouter);
  app.use(proposalRouter);
  app.use(proposalApplicationRouter);
  app.use(proposalPreviewRouter);
  app.use(proposalWorkflowRouter);
  app.use(reviewInboxRouter);
  app.use(reviewRequestRouter);
  app.use("/chapters", publicChapterRouter);
  app.use("/characters", publicCharacterRouter);
  app.use("/codex", publicCodexRouter);
  app.use("/discover", publicDiscoveryRouter);
  app.use("/events", publicEventRouter);
  app.use("/search", publicSearchRouter);
  app.use("/factions", publicFactionRouter);
  app.use("/locations", publicLocationRouter);
  app.use("/relationships", publicRelationshipRouter);
  app.use("/scenes", publicSceneRouter);
  app.use("/health", healthRouter);

  return app;
};
