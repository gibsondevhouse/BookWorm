import type { NotificationEventType } from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";

export const SUPPORTED_EVENT_TYPES: NotificationEventType[] = [
  "REVIEW_REQUEST_CREATED",
  "REVIEW_REQUEST_STATUS_CHANGED",
  "REVIEW_REQUEST_ASSIGNED",
  "APPROVAL_STEP_DECISION_RECORDED",
  "APPROVAL_STEP_DELEGATED",
  "APPROVAL_STEP_ESCALATED"
];

type PreferenceRecord = {
  eventType: NotificationEventType;
  enabled: boolean;
  updatedAt: Date;
};

export const notificationPreferenceRepository = {
  async findByUserId(userId: string): Promise<PreferenceRecord[]> {
    return prismaClient.notificationPreference.findMany({
      where: { userId },
      select: { eventType: true, enabled: true, updatedAt: true },
      orderBy: [{ eventType: "asc" }]
    });
  },

  async upsertPreference(input: {
    userId: string;
    eventType: NotificationEventType;
    enabled: boolean;
  }): Promise<PreferenceRecord> {
    return prismaClient.notificationPreference.upsert({
      where: {
        userId_eventType: {
          userId: input.userId,
          eventType: input.eventType
        }
      },
      create: {
        userId: input.userId,
        eventType: input.eventType,
        enabled: input.enabled
      },
      update: {
        enabled: input.enabled
      },
      select: { eventType: true, enabled: true, updatedAt: true }
    });
  },

  async findEnabledEventTypesForUser(userId: string): Promise<NotificationEventType[]> {
    const records = await prismaClient.notificationPreference.findMany({
      where: { userId },
      select: { eventType: true, enabled: true }
    });

    const disabledTypes = new Set(records.filter((r) => !r.enabled).map((r) => r.eventType));

    return SUPPORTED_EVENT_TYPES.filter((t) => !disabledTypes.has(t));
  }
};
