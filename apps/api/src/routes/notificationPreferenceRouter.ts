import { Router } from "express";
import { z } from "zod";

import { requireAuthenticatedActor } from "../middleware/requireAuthenticatedActor.js";
import { notificationPreferenceService } from "../services/notificationPreferenceService.js";

const categoryParamsSchema = z.object({
  category: z.string().min(1)
});

const updatePreferenceBodySchema = z.object({
  enabled: z.boolean()
});

const handlePreferenceError = (error: unknown): { statusCode: number; message: string } => {
  if (error instanceof Error && error.name === "NotificationPreferenceInvalidCategoryError") {
    return { statusCode: 400, message: error.message };
  }

  return {
    statusCode: 500,
    message: error instanceof Error ? error.message : "Unexpected notification preference error"
  };
};

const requireActor = requireAuthenticatedActor(["EDITOR", "AUTHOR_ADMIN"]);

export const notificationPreferenceRouter = Router();

notificationPreferenceRouter.get("/notification-preferences", requireActor, async (request, response) => {
  try {
    const result = await notificationPreferenceService.getPreferences({
      actor: {
        userId: response.locals.actor.userId,
        role: response.locals.actor.role
      }
    });

    response.json({
      preferences: result.preferences.map((p) => ({
        eventType: p.eventType,
        enabled: p.enabled,
        updatedAt: p.updatedAt?.toISOString() ?? null
      }))
    });
  } catch (error) {
    const handled = handlePreferenceError(error);
    response.status(handled.statusCode).json({ error: handled.message });
  }
});

notificationPreferenceRouter.put(
  "/notification-preferences/:category",
  requireActor,
  async (request, response) => {
    const parsedParams = categoryParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      response.status(400).json({ error: { params: parsedParams.error.flatten() } });
      return;
    }

    const parsedBody = updatePreferenceBodySchema.safeParse(request.body);

    if (!parsedBody.success) {
      response.status(400).json({ error: { body: parsedBody.error.flatten() } });
      return;
    }

    try {
      const result = await notificationPreferenceService.updatePreference({
        actor: {
          userId: response.locals.actor.userId,
          role: response.locals.actor.role
        },
        eventType: parsedParams.data.category,
        enabled: parsedBody.data.enabled
      });

      response.json({
        eventType: result.eventType,
        enabled: result.enabled,
        updatedAt: result.updatedAt.toISOString()
      });
    } catch (error) {
      const handled = handlePreferenceError(error);
      response.status(handled.statusCode).json({ error: handled.message });
    }
  }
);
