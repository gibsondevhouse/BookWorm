import {
  type ContinuityIssueSeverity,
  type ContinuityIssueStatus,
  type ContinuityIssueSubjectType,
  type Prisma
} from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";

type PersistedIssueInput = {
  ruleCode: string;
  severity: ContinuityIssueSeverity;
  subjectType: ContinuityIssueSubjectType;
  subjectId: string;
  title: string;
  details: string;
  fingerprint: string;
  metadata?: Prisma.InputJsonValue;
  entityId?: string;
  entityRevisionId?: string;
  manuscriptId?: string;
  manuscriptRevisionId?: string;
  relationshipId?: string;
  relationshipRevisionId?: string;
};

type ListIssuesInput = {
  releaseSlug: string;
  status?: ContinuityIssueStatus;
  severity?: ContinuityIssueSeverity;
  ruleCode?: string;
  subjectType?: ContinuityIssueSubjectType;
  sort:
    | "detectedAt.desc"
    | "detectedAt.asc"
    | "severity.desc"
    | "severity.asc"
    | "status.asc"
    | "status.desc"
    | "ruleCode.asc"
    | "ruleCode.desc";
  limit: number;
  offset: number;
};

type UpdateIssueStatusInput = {
  releaseSlug: string;
  issueId: string;
  status: ContinuityIssueStatus;
};

type GetIssueByReleaseAndIdInput = {
  releaseSlug: string;
  issueId: string;
};

const issueSelect = {
  id: true,
  ruleCode: true,
  severity: true,
  status: true,
  subjectType: true,
  subjectId: true,
  title: true,
  details: true,
  fingerprint: true,
  metadata: true,
  detectedAt: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
  releaseId: true,
  entityId: true,
  entityRevisionId: true,
  manuscriptId: true,
  manuscriptRevisionId: true,
  relationshipId: true,
  relationshipRevisionId: true
} satisfies Prisma.ContinuityIssueSelect;

const buildIssueData = (
  issue: PersistedIssueInput,
  detectedAt: Date
): Omit<Prisma.ContinuityIssueUncheckedCreateInput, "releaseId"> => ({
  ruleCode: issue.ruleCode,
  severity: issue.severity,
  status: "OPEN",
  subjectType: issue.subjectType,
  subjectId: issue.subjectId,
  title: issue.title,
  details: issue.details,
  fingerprint: issue.fingerprint,
  detectedAt,
  ...(issue.metadata === undefined ? {} : { metadata: issue.metadata }),
  ...(issue.entityId === undefined ? {} : { entityId: issue.entityId }),
  ...(issue.entityRevisionId === undefined ? {} : { entityRevisionId: issue.entityRevisionId }),
  ...(issue.manuscriptId === undefined ? {} : { manuscriptId: issue.manuscriptId }),
  ...(issue.manuscriptRevisionId === undefined ? {} : { manuscriptRevisionId: issue.manuscriptRevisionId }),
  ...(issue.relationshipId === undefined ? {} : { relationshipId: issue.relationshipId }),
  ...(issue.relationshipRevisionId === undefined ? {} : { relationshipRevisionId: issue.relationshipRevisionId })
});

const sortOrderBy: Record<ListIssuesInput["sort"], Prisma.ContinuityIssueOrderByWithRelationInput[]> = {
  "detectedAt.desc": [{ detectedAt: "desc" }, { createdAt: "desc" }, { id: "asc" }],
  "detectedAt.asc": [{ detectedAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  "severity.desc": [{ severity: "desc" }, { detectedAt: "desc" }, { createdAt: "desc" }, { id: "asc" }],
  "severity.asc": [{ severity: "asc" }, { detectedAt: "desc" }, { createdAt: "desc" }, { id: "asc" }],
  "status.asc": [{ status: "asc" }, { detectedAt: "desc" }, { createdAt: "desc" }, { id: "asc" }],
  "status.desc": [{ status: "desc" }, { detectedAt: "desc" }, { createdAt: "desc" }, { id: "asc" }],
  "ruleCode.asc": [{ ruleCode: "asc" }, { detectedAt: "desc" }, { createdAt: "desc" }, { id: "asc" }],
  "ruleCode.desc": [{ ruleCode: "desc" }, { detectedAt: "desc" }, { createdAt: "desc" }, { id: "asc" }]
};

export const continuityIssueRepository = {
  async getReleaseContinuityContext(releaseSlug: string) {
    const [release, activeRelease, timelineEraEntities, allReleasesForComparison] = await prismaClient.$transaction([
      prismaClient.release.findUnique({
        where: { slug: releaseSlug },
        select: {
          id: true,
          slug: true,
          status: true,
          entries: {
            select: {
              entity: { select: { id: true, slug: true, type: true, retiredAt: true } },
              revision: { select: { id: true, visibility: true, payload: true } }
            }
          },
          manuscriptEntries: {
            select: {
              manuscript: { select: { id: true, slug: true, type: true } },
              manuscriptRevision: { select: { id: true, visibility: true, payload: true } }
            }
          },
          relationshipEntries: {
            select: {
              relationship: { select: { id: true, sourceEntityId: true, targetEntityId: true } },
              relationshipRevision: { select: { id: true, metadata: true, visibility: true } }
            }
          }
        }
      }),
      prismaClient.release.findFirst({
        where: { status: "ACTIVE" },
        select: {
          slug: true,
          entries: {
            select: {
              entityId: true,
              revision: { select: { id: true, payload: true } }
            }
          }
        }
      }),
      prismaClient.entity.findMany({
        where: { type: "TIMELINE_ERA", retiredAt: null },
        select: { id: true, slug: true }
      }),
      prismaClient.release.findMany({
        select: {
          entries: {
            select: {
              entityId: true,
              revision: { select: { payload: true } }
            }
          }
        }
      })
    ]);

    if (!release) {
      throw new Error("Release not found");
    }

    return {
      release,
      activeRelease,
      timelineEraEntities,
      allReleasesForComparison
    };
  },

  async persistRun(input: { releaseId: string; issues: PersistedIssueInput[] }) {
    const detectedAt = new Date();

    return prismaClient.$transaction(async (transaction) => {
      const existingIssues = await transaction.continuityIssue.findMany({
        where: { releaseId: input.releaseId },
        select: issueSelect
      });

      const existingByFingerprint = new Map(existingIssues.map((issue) => [issue.fingerprint, issue]));
      const currentFingerprints = new Set(input.issues.map((issue) => issue.fingerprint));

      for (const issue of input.issues) {
        const existing = existingByFingerprint.get(issue.fingerprint);
        const data = buildIssueData(issue, detectedAt);

        if (existing) {
          const nextStatus = existing.status === "DISMISSED" ? "DISMISSED" : "OPEN";

          await transaction.continuityIssue.update({
            where: { id: existing.id },
            data: {
              ...data,
              status: nextStatus,
              resolvedAt: nextStatus === "OPEN" ? null : existing.resolvedAt
            },
            select: issueSelect
          });
          continue;
        }

        await transaction.continuityIssue.create({
          data: {
            ...data,
            releaseId: input.releaseId
          },
          select: issueSelect
        });
      }

      for (const issue of existingIssues) {
        if (currentFingerprints.has(issue.fingerprint)) {
          continue;
        }

        if (issue.status !== "OPEN" && issue.status !== "ACKNOWLEDGED") {
          continue;
        }

        await transaction.continuityIssue.update({
          where: { id: issue.id },
          data: {
            status: "RESOLVED",
            resolvedAt: detectedAt
          }
        });
      }

      return transaction.continuityIssue.findMany({
        where: {
          releaseId: input.releaseId,
          fingerprint: { in: [...currentFingerprints] }
        },
        orderBy: [{ severity: "desc" }, { ruleCode: "asc" }, { title: "asc" }],
        select: issueSelect
      });
    });
  },

  async listIssuesForRelease(releaseId: string) {
    return prismaClient.continuityIssue.findMany({
      where: { releaseId },
      select: {
        id: true,
        ruleCode: true,
        severity: true,
        status: true,
        fingerprint: true
      }
    });
  },

  async listIssues(input: ListIssuesInput) {
    const release = await prismaClient.release.findUnique({
      where: { slug: input.releaseSlug },
      select: { id: true, slug: true }
    });

    if (!release) {
      throw new Error("Release not found");
    }

    const where = {
      releaseId: release.id,
      ...(input.status === undefined ? {} : { status: input.status }),
      ...(input.severity === undefined ? {} : { severity: input.severity }),
      ...(input.ruleCode === undefined ? {} : { ruleCode: input.ruleCode }),
      ...(input.subjectType === undefined ? {} : { subjectType: input.subjectType })
    } satisfies Prisma.ContinuityIssueWhereInput;

    const [items, total, allReleaseIssues] = await prismaClient.$transaction([
      prismaClient.continuityIssue.findMany({
        where,
        orderBy: sortOrderBy[input.sort],
        skip: input.offset,
        take: input.limit,
        select: issueSelect
      }),
      prismaClient.continuityIssue.count({ where }),
      prismaClient.continuityIssue.findMany({
        where: { releaseId: release.id },
        select: { severity: true, status: true }
      })
    ]);

    const summary = {
      blockingOpenCount: 0,
      warningOpenCount: 0,
      acknowledgedCount: 0,
      resolvedCount: 0,
      dismissedCount: 0,
      severityDistribution: {
        BLOCKING: 0,
        WARNING: 0
      }
    };

    for (const issue of allReleaseIssues) {
      summary.severityDistribution[issue.severity] += 1;

      if (issue.status === "ACKNOWLEDGED") {
        summary.acknowledgedCount += 1;
      }
      if (issue.status === "RESOLVED") {
        summary.resolvedCount += 1;
      }
      if (issue.status === "DISMISSED") {
        summary.dismissedCount += 1;
      }

      if (issue.status !== "OPEN" && issue.status !== "ACKNOWLEDGED") {
        continue;
      }

      if (issue.severity === "BLOCKING") {
        summary.blockingOpenCount += 1;
      } else {
        summary.warningOpenCount += 1;
      }
    }

    return {
      releaseSlug: release.slug,
      total,
      summary,
      issues: items
    };
  },

  async getIssueByReleaseAndId(input: GetIssueByReleaseAndIdInput) {
    return prismaClient.continuityIssue.findFirst({
      where: {
        id: input.issueId,
        release: { slug: input.releaseSlug }
      },
      select: issueSelect
    });
  },

  async updateIssueStatus(input: UpdateIssueStatusInput) {
    const issue = await continuityIssueRepository.getIssueByReleaseAndId({
      releaseSlug: input.releaseSlug,
      issueId: input.issueId
    });

    if (!issue) {
      throw new Error("Continuity issue not found");
    }

    return prismaClient.continuityIssue.update({
      where: { id: issue.id },
      data: {
        status: input.status,
        resolvedAt: input.status === "RESOLVED" ? new Date() : null
      },
      select: issueSelect
    });
  }
};