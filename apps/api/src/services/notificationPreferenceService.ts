import type { NotificationEventType, Role } from "@prisma/client";

import {
  notificationPreferenceRepository,
  SUPPORTED_EVENT_TYPES
} from "../repositories/notificationPreferenceRepository.js";

type Actor = {
  userId: string;
  role: Role;
};

type PreferenceItem = {
  eventType: NotificationEventType;
  enabled: boolean;
  updatedAt: Date | null;
};

class NotificationPreferenceInvalidCategoryError extends Error {
  constructor() {
    super("Notification category is not supported");
    this.name = "NotificationPreferenceInvalidCategoryError";
  }
}

const isValidEventType = (value: string): value is NotificationEventType =>
  (SUPPORTED_EVENT_TYPES as string[]).includes(value);

export const notificationPreferenceService = {
  async getPreferences(input: { actor: Actor }): Promise<{ preferences: PreferenceItem[] }> {
    const stored = await notificationPreferenceRepository.findByUserId(input.actor.userId);
    const storedMap = new Map(stored.map((p) => [p.eventType, p]));

    const preferences: PreferenceItem[] = SUPPORTED_EVENT_TYPES.map((eventType) => {
      const record = storedMap.get(eventType);

      return {
        eventType,
        enabled: record !== undefined ? record.enabled : true,
        updatedAt: record?.updatedAt ?? null
      };
    });

    return { preferences };
  },

  async updatePreference(input: {
    actor: Actor;
    eventType: string;
    enabled: boolean;
  }): Promise<{ eventType: NotificationEventType; enabled: boolean; updatedAt: Date }> {
    if (!isValidEventType(input.eventType)) {
      throw new NotificationPreferenceInvalidCategoryError();
    }

    return notificationPreferenceRepository.upsertPreference({
      userId: input.actor.userId,
      eventType: input.eventType,
      enabled: input.enabled
    });
  }
};
