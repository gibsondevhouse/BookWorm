import { createHash } from "node:crypto";

import {
  type ContinuityIssueSeverity,
  type ContinuityIssueStatus,
  type ContinuityIssueSubjectType,
  type EntityType,
  type Prisma,
  type Role
} from "@prisma/client";

import { type SessionActor } from "../auth/sessionActor.js";
import { entityMetadataContract } from "../lib/entityMetadataContract.js";
import { continuityIssueRepository } from "../repositories/continuityIssueRepository.js";

type ContinuityRunSource = "MANUAL" | "ACTIVATION";

const allowedRoles: Role[] = ["AUTHOR_ADMIN"];
const chronologyTypes = new Set<EntityType>(["EVENT", "REVEAL", "TIMELINE_ERA"]);
const spoilerTypes = new Set<EntityType>(["SECRET", "REVEAL", "EVENT"]);
const spoilerValues = new Set(["NONE", "MINOR", "MAJOR"]);
const transitionMap = {
  OPEN: new Set<ContinuityIssueStatus>(["ACKNOWLEDGED", "RESOLVED", "DISMISSED"]),
  ACKNOWLEDGED: new Set<ContinuityIssueStatus>(["OPEN", "RESOLVED", "DISMISSED"]),
  RESOLVED: new Set<ContinuityIssueStatus>(["OPEN"]),
  DISMISSED: new Set<ContinuityIssueStatus>(["OPEN"])
} satisfies Record<ContinuityIssueStatus, Set<ContinuityIssueStatus>>;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const assertReleaseRole = (role: Role): void => {
  if (!allowedRoles.includes(role)) {
    throw new Error("Release management requires author-admin role");
  }
};

const fingerprint = (...parts: Array<string | null | undefined>): string =>
  createHash("sha256")
    .update(parts.map((part) => part ?? "").join("|"))
    .digest("hex");

const readPayloadRecord = (payload: Prisma.JsonValue | null): Record<string, unknown> => (isRecord(payload) ? payload : {});

const readExplicitSpoilerTier = (payload: Prisma.JsonValue | null): string | null => {
  const metadata = readPayloadRecord(payload).metadata;

  if (!isRecord(metadata) || !("spoilerTier" in metadata)) {
    return null;
  }

  return typeof metadata.spoilerTier === "string" ? metadata.spoilerTier : null;
};

const toResponseIssue = (issue: {
  id: string;
  ruleCode: string;
  severity: ContinuityIssueSeverity;
  status: ContinuityIssueStatus;
  subjectType: ContinuityIssueSubjectType;
  subjectId: string;
  title: string;
  details: string;
  detectedAt?: Date;
  resolvedAt?: Date | null;
}) => ({
  id: issue.id,
  ruleCode: issue.ruleCode,
  severity: issue.severity,
  status: issue.status,
  subjectType: issue.subjectType,
  subjectId: issue.subjectId,
  title: issue.title,
  details: issue.details,
  ...(issue.detectedAt === undefined ? {} : { detectedAt: issue.detectedAt.toISOString() }),
  ...(issue.resolvedAt === undefined ? {} : { resolvedAt: issue.resolvedAt?.toISOString() ?? null })
});

const buildChronologyDetails = (problems: string[]): string =>
  problems.length === 1 ? problems[0] ?? "Missing chronology metadata" : problems.join("; ");

export const continuityIssueService = {
  async runBaseline(input: { actor: SessionActor; releaseSlug: string; source?: ContinuityRunSource }) {
    assertReleaseRole(input.actor.role);

    const source = input.source ?? "MANUAL";
    const context = await continuityIssueRepository.getReleaseContinuityContext(input.releaseSlug);
    const includedEntitySlugs = new Set(context.release.entries.map((entry) => entry.entity.slug));
    const timelineEraBySlug = new Map(context.timelineEraEntities.map((entity) => [entity.slug, entity]));
    const activeSortKeyByEntityId = new Map(
      (context.activeRelease?.entries ?? []).map((entry) => {
        const activeMetadata = entityMetadataContract.readMetadata({ entityType: "EVENT", payload: entry.revision.payload });
        return [entry.entityId, activeMetadata.timelineAnchor?.sortKey ?? null] as const;
      })
    );
    const issues: Array<{
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
    }> = [];

    for (const entry of context.release.entries) {
      const payloadRecord = readPayloadRecord(entry.revision.payload);
      const metadata = isRecord(payloadRecord.metadata) ? payloadRecord.metadata : {};
      const timelineAnchor = isRecord(metadata.timelineAnchor) ? metadata.timelineAnchor : null;

      if (chronologyTypes.has(entry.entity.type)) {
        const problems: string[] = [];
        const anchorLabel = timelineAnchor?.anchorLabel;
        const sortKey = timelineAnchor?.sortKey;
        const timelineEraSlug = timelineAnchor?.timelineEraSlug;

        if (!timelineAnchor) {
          problems.push("metadata.timelineAnchor must exist");
        }
        if (typeof anchorLabel !== "string" || anchorLabel.trim().length === 0) {
          problems.push("metadata.timelineAnchor.anchorLabel must be non-empty");
        }
        if (typeof sortKey !== "string" || sortKey.trim().length === 0) {
          problems.push("metadata.timelineAnchor.sortKey must be non-empty");
        }
        if (timelineEraSlug !== undefined && timelineEraSlug !== null) {
          if (typeof timelineEraSlug !== "string" || timelineEraSlug.trim().length === 0) {
            problems.push("metadata.timelineAnchor.timelineEraSlug must be null or a non-empty string");
          } else if (!timelineEraBySlug.has(timelineEraSlug)) {
            problems.push("metadata.timelineAnchor.timelineEraSlug must resolve to a non-retired TIMELINE_ERA entity");
          }
        }

        if (problems.length > 0) {
          issues.push({
            ruleCode: "REQ_META_CHRONOLOGY_ANCHOR",
            severity: "BLOCKING",
            subjectType: "ENTITY_REVISION",
            subjectId: entry.revision.id,
            title: "Missing timeline anchor metadata",
            details: buildChronologyDetails(problems),
            fingerprint: fingerprint("REQ_META_CHRONOLOGY_ANCHOR", entry.revision.id),
            metadata: { entitySlug: entry.entity.slug, entityType: entry.entity.type, problems },
            entityId: entry.entity.id,
            entityRevisionId: entry.revision.id
          });
        }

        const currentSortKey = typeof sortKey === "string" ? sortKey : null;
        const activeSortKey = activeSortKeyByEntityId.get(entry.entity.id) ?? null;

        if (currentSortKey && activeSortKey && currentSortKey < activeSortKey) {
          issues.push({
            ruleCode: "DATE_ORDER_SORT_KEY_REGRESSION",
            severity: "BLOCKING",
            subjectType: "ENTITY_REVISION",
            subjectId: entry.revision.id,
            title: "Timeline sort key regressed relative to the active release",
            details: `Revision sort key ${currentSortKey} must be greater than or equal to active release value ${activeSortKey}`,
            fingerprint: fingerprint("DATE_ORDER_SORT_KEY_REGRESSION", entry.revision.id),
            metadata: { entitySlug: entry.entity.slug, activeSortKey, currentSortKey },
            entityId: entry.entity.id,
            entityRevisionId: entry.revision.id
          });
        }
      }

      if (entry.revision.visibility === "PUBLIC" && spoilerTypes.has(entry.entity.type)) {
        const spoilerTier = readExplicitSpoilerTier(entry.revision.payload);

        if (spoilerTier === null || !spoilerValues.has(spoilerTier)) {
          issues.push({
            ruleCode: "REQ_META_SPOILER_TIER_PUBLIC",
            severity: "BLOCKING",
            subjectType: "ENTITY_REVISION",
            subjectId: entry.revision.id,
            title: "Public revision is missing explicit spoiler tier metadata",
            details: `${entry.entity.type} public revisions must declare metadata.spoilerTier as NONE, MINOR, or MAJOR`,
            fingerprint: fingerprint("REQ_META_SPOILER_TIER_PUBLIC", entry.revision.id),
            metadata: { entitySlug: entry.entity.slug, entityType: entry.entity.type },
            entityId: entry.entity.id,
            entityRevisionId: entry.revision.id
          });
        }
      }

      if (entry.entity.type === "REVEAL" && entry.revision.visibility === "PUBLIC") {
        const dependencies = Array.isArray(payloadRecord.requiredDependencies) ? payloadRecord.requiredDependencies : [];
        const entityDependencySlugs = dependencies
          .filter((dependency): dependency is Record<string, unknown> => isRecord(dependency) && dependency.kind === "ENTITY")
          .map((dependency) => (typeof dependency.entitySlug === "string" ? dependency.entitySlug : ""))
          .filter((slug) => slug.length > 0);
        const missingEntitySlugs = entityDependencySlugs.filter((slug) => !includedEntitySlugs.has(slug));

        if (entityDependencySlugs.length === 0 || missingEntitySlugs.length > 0) {
          issues.push({
            ruleCode: "REVEAL_TIMING_DEPENDENCY_PRESENT",
            severity: "BLOCKING",
            subjectType: "ENTITY_REVISION",
            subjectId: entry.revision.id,
            title: "Reveal revision is missing in-release dependency references",
            details:
              entityDependencySlugs.length === 0
                ? "REVEAL public revisions must include at least one ENTITY required dependency"
                : `Required entity dependencies must be included in the same release: ${missingEntitySlugs.join(", ")}`,
            fingerprint: fingerprint("REVEAL_TIMING_DEPENDENCY_PRESENT", entry.revision.id),
            metadata: { entitySlug: entry.entity.slug, entityDependencySlugs, missingEntitySlugs },
            entityId: entry.entity.id,
            entityRevisionId: entry.revision.id
          });
        }
      }
    }

    for (const entry of context.release.manuscriptEntries) {
      if (entry.manuscriptRevision.visibility !== "PUBLIC") {
        continue;
      }

      const spoilerTier = readExplicitSpoilerTier(entry.manuscriptRevision.payload);

      if (spoilerTier !== null && spoilerValues.has(spoilerTier)) {
        continue;
      }

      issues.push({
        ruleCode: "REQ_META_SPOILER_TIER_PUBLIC",
        severity: "BLOCKING",
        subjectType: "MANUSCRIPT_REVISION",
        subjectId: entry.manuscriptRevision.id,
        title: "Public manuscript revision is missing explicit spoiler tier metadata",
        details: "Public manuscript revisions must declare metadata.spoilerTier as NONE, MINOR, or MAJOR",
        fingerprint: fingerprint("REQ_META_SPOILER_TIER_PUBLIC", entry.manuscriptRevision.id),
        metadata: { manuscriptSlug: entry.manuscript.slug, manuscriptType: entry.manuscript.type },
        manuscriptId: entry.manuscript.id,
        manuscriptRevisionId: entry.manuscriptRevision.id
      });
    }

    const entitySlugCounts = new Map<string, number>();
    const manuscriptSlugCounts = new Map<string, number>();

    for (const entry of context.release.entries) {
      entitySlugCounts.set(entry.entity.slug, (entitySlugCounts.get(entry.entity.slug) ?? 0) + 1);
    }
    for (const entry of context.release.manuscriptEntries) {
      manuscriptSlugCounts.set(entry.manuscript.slug, (manuscriptSlugCounts.get(entry.manuscript.slug) ?? 0) + 1);
    }

    for (const [entitySlug, count] of entitySlugCounts) {
      if (count < 2) {
        continue;
      }

      issues.push({
        ruleCode: "DUPLICATE_ENTITY_SLUG_IN_RELEASE",
        severity: "BLOCKING",
        subjectType: "RELEASE",
        subjectId: context.release.id,
        title: "Release contains duplicate entity slugs",
        details: `Entity slug ${entitySlug} appears ${count} times in the release composition`,
        fingerprint: fingerprint("DUPLICATE_ENTITY_SLUG_IN_RELEASE", context.release.id, entitySlug),
        metadata: { entitySlug, count }
      });
    }

    for (const [manuscriptSlug, count] of manuscriptSlugCounts) {
      if (count < 2) {
        continue;
      }

      issues.push({
        ruleCode: "DUPLICATE_MANUSCRIPT_SLUG_IN_RELEASE",
        severity: "BLOCKING",
        subjectType: "RELEASE",
        subjectId: context.release.id,
        title: "Release contains duplicate manuscript slugs",
        details: `Manuscript slug ${manuscriptSlug} appears ${count} times in the release composition`,
        fingerprint: fingerprint("DUPLICATE_MANUSCRIPT_SLUG_IN_RELEASE", context.release.id, manuscriptSlug),
        metadata: { manuscriptSlug, count }
      });
    }

    const persistedIssues = await continuityIssueRepository.persistRun({
      releaseId: context.release.id,
      issues
    });
    const blockingOpenIssues = persistedIssues.filter((issue) => issue.severity === "BLOCKING" && issue.status === "OPEN");
    const warningOpenCount = persistedIssues.filter((issue) => issue.severity === "WARNING" && issue.status === "OPEN").length;

    return {
      releaseSlug: context.release.slug,
      source,
      summary: {
        ruleCount: 6,
        issueCount: persistedIssues.length,
        blockingOpenCount: blockingOpenIssues.length,
        warningOpenCount
      },
      issues: persistedIssues.map((issue) => toResponseIssue(issue))
    };
  },

  async listIssues(input: {
    actor: SessionActor;
    releaseSlug: string;
    status?: ContinuityIssueStatus;
    severity?: ContinuityIssueSeverity;
    ruleCode?: string;
    subjectType?: ContinuityIssueSubjectType;
    limit: number;
    offset: number;
  }) {
    assertReleaseRole(input.actor.role);

    const result = await continuityIssueRepository.listIssues(input);

    return {
      releaseSlug: result.releaseSlug,
      total: result.total,
      limit: input.limit,
      offset: input.offset,
      issues: result.issues.map((issue) => toResponseIssue(issue))
    };
  },

  async updateIssueStatus(input: {
    actor: SessionActor;
    releaseSlug: string;
    issueId: string;
    status: ContinuityIssueStatus;
  }) {
    assertReleaseRole(input.actor.role);

    const issue = await continuityIssueRepository.getIssueByReleaseAndId({
      releaseSlug: input.releaseSlug,
      issueId: input.issueId
    });

    if (!issue) {
      throw new Error("Continuity issue not found");
    }

    if (!transitionMap[issue.status].has(input.status)) {
      throw new Error("Invalid continuity issue status transition");
    }

    const updatedIssue = await continuityIssueRepository.updateIssueStatus(input);

    return toResponseIssue(updatedIssue);
  }
};