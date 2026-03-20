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
const lowValueSuppressibleWarningRules = new Set<string>([
  "ENTITY_KNOWLEDGE_STATE_REGRESSION",
  "MANUSCRIPT_CHAPTER_SEQUENCING_ANOMALY",
  "RELATIONSHIP_REVEAL_CONSISTENCY_INCOMPLETE"
]);
type ContinuityIssueListSort =
  | "detectedAt.desc"
  | "detectedAt.asc"
  | "severity.desc"
  | "severity.asc"
  | "status.asc"
  | "status.desc"
  | "ruleCode.asc"
  | "ruleCode.desc";
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
  createdAt?: Date;
  updatedAt?: Date;
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
  ...(issue.resolvedAt === undefined ? {} : { resolvedAt: issue.resolvedAt?.toISOString() ?? null }),
  ...(issue.createdAt === undefined ? {} : { createdAt: issue.createdAt.toISOString() }),
  ...(issue.updatedAt === undefined ? {} : { updatedAt: issue.updatedAt.toISOString() })
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
    const generatedIssues: Array<{
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
          generatedIssues.push({
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
          generatedIssues.push({
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
          generatedIssues.push({
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
          generatedIssues.push({
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

      generatedIssues.push({
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

      generatedIssues.push({
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

      generatedIssues.push({
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

    // Stage 02 Expansion Rules

    // ENTITY_KNOWLEDGE_STATE_REGRESSION: Compare entity spoiler tier in current release against max tier in prior releases
    const tierOrder = ["NONE", "MINOR", "MAJOR"];
  const tierRank = new Map(tierOrder.map((tier, index) => [tier, index]));

    const priorMaxTierByEntityId = new Map<string, string>();
    for (const release of context.allReleasesForComparison) {
      for (const entry of release.entries) {
        const currentMax = priorMaxTierByEntityId.get(entry.entityId) ?? null;
        const tier = readExplicitSpoilerTier(entry.revision.payload);

        if (tier && tierRank.has(tier)) {
          const currentRank = currentMax ? tierRank.get(currentMax) ?? -1 : -1;
          const newRank = tierRank.get(tier) ?? -1;
          if (newRank > currentRank) {
            priorMaxTierByEntityId.set(entry.entityId, tier);
          }
        }
      }
    }

    for (const entry of context.release.entries) {
      if (!spoilerTypes.has(entry.entity.type)) {
        continue;
      }

      const currentTier = readExplicitSpoilerTier(entry.revision.payload);
      if (currentTier === null) {
        continue;
      }

      const priorMaxTier = priorMaxTierByEntityId.get(entry.entity.id) ?? null;
      if (priorMaxTier === null) {
        continue;
      }

      const currentRank = tierRank.get(currentTier) ?? -1;
      const priorRank = tierRank.get(priorMaxTier) ?? -1;

      if (currentRank < priorRank) {
        generatedIssues.push({
          ruleCode: "ENTITY_KNOWLEDGE_STATE_REGRESSION",
          severity: "WARNING",
          subjectType: "ENTITY_REVISION",
          subjectId: entry.revision.id,
          title: "Entity knowledge state regressed relative to prior release",
          details: `Entity ${entry.entity.slug} had spoiler tier ${priorMaxTier} in prior release but appears with tier ${currentTier} in current release`,
          fingerprint: fingerprint("ENTITY_KNOWLEDGE_STATE_REGRESSION", entry.revision.id, currentTier, priorMaxTier),
          metadata: { entitySlug: entry.entity.slug, entityType: entry.entity.type, currentTier, priorMaxTier },
          entityId: entry.entity.id,
          entityRevisionId: entry.revision.id
        });
      }
    }

    // MANUSCRIPT_CHAPTER_SEQUENCING_ANOMALY: Validate manuscript chapter sequence continuity
    for (const entry of context.release.manuscriptEntries) {
      const payloadRecord = readPayloadRecord(entry.manuscriptRevision.payload);
      const chapters = Array.isArray(payloadRecord.chapters) ? payloadRecord.chapters : [];

      const chapterNumbers: number[] = [];
      const anomalies: Array<{ type: string; position: number | string }> = [];

      for (const chapter of chapters) {
        if (isRecord(chapter) && typeof chapter.sequenceNumber === "number") {
          chapterNumbers.push(chapter.sequenceNumber);
        }
      }

      if (chapterNumbers.length === 0) {
        continue;
      }

      // Check for missing sequence numbers in range
      const minSeq = Math.min(...chapterNumbers);
      const maxSeq = Math.max(...chapterNumbers);
      const expectedSet = new Set(Array.from({ length: maxSeq - minSeq + 1 }, (_, i) => minSeq + i));
      const actualSet = new Set(chapterNumbers);

      for (const expected of expectedSet) {
        if (!actualSet.has(expected)) {
          anomalies.push({ type: "MISSING", position: expected });
        }
      }

      // Check for duplicate sequence numbers
      const seen = new Set<number>();
      for (const num of chapterNumbers) {
        if (seen.has(num)) {
          anomalies.push({ type: "DUPLICATE", position: num });
        }
        seen.add(num);
      }

      if (anomalies.length > 0) {
        for (const anomaly of anomalies) {
          generatedIssues.push({
            ruleCode: "MANUSCRIPT_CHAPTER_SEQUENCING_ANOMALY",
            severity: "WARNING",
            subjectType: "MANUSCRIPT_REVISION",
            subjectId: entry.manuscriptRevision.id,
            title: "Manuscript chapters exhibit sequence anomalies",
            details: `${anomaly.type === "MISSING" ? "Missing sequence number" : "Duplicate sequence number"} at position ${anomaly.position} in manuscript ${entry.manuscript.slug}`,
            fingerprint: fingerprint("MANUSCRIPT_CHAPTER_SEQUENCING_ANOMALY", entry.manuscriptRevision.id, anomaly.type, String(anomaly.position)),
            metadata: { manuscriptSlug: entry.manuscript.slug, anomalyType: anomaly.type, position: anomaly.position },
            manuscriptId: entry.manuscript.id,
            manuscriptRevisionId: entry.manuscriptRevision.id
          });
        }
      }
    }

    // RELATIONSHIP_REVEAL_CONSISTENCY_INCOMPLETE: Cross-check relationship reveal state against related entity visibility
    const entityIdToTierInCurrentRelease = new Map<string, string | null>();
    for (const entry of context.release.entries) {
      if (spoilerTypes.has(entry.entity.type)) {
        const tier = readExplicitSpoilerTier(entry.revision.payload);
        entityIdToTierInCurrentRelease.set(entry.entity.id, tier);
      }
    }

    for (const entry of context.release.relationshipEntries) {
      const revisionMetadata = isRecord(entry.relationshipRevision.metadata) ? entry.relationshipRevision.metadata : {};
      const relationshipTier = typeof revisionMetadata.tier === "string" ? revisionMetadata.tier : "NONE";

      const sourceEntityTier = entityIdToTierInCurrentRelease.get(entry.relationship.sourceEntityId);
      const targetEntityTier = entityIdToTierInCurrentRelease.get(entry.relationship.targetEntityId);

      // If relationship is unrevealed/restricted but related entities are public with lower tiers, flag it
      if (relationshipTier === "RESTRICTED" || relationshipTier === "UNREVEALED") {
        if (sourceEntityTier !== null && sourceEntityTier !== undefined) {
          if (sourceEntityTier === "NONE") {
            generatedIssues.push({
              ruleCode: "RELATIONSHIP_REVEAL_CONSISTENCY_INCOMPLETE",
              severity: "WARNING",
              subjectType: "RELATIONSHIP_REVISION",
              subjectId: entry.relationshipRevision.id,
              title: "Relationship reveal state is inconsistent with related entity visibility",
              details: `Relationship is marked as ${relationshipTier} but source entity is publicly visible with tier NONE`,
              fingerprint: fingerprint(
                "RELATIONSHIP_REVEAL_CONSISTENCY_INCOMPLETE",
                String(entry.relationship.id),
                entry.relationship.sourceEntityId,
                relationshipTier,
                sourceEntityTier
              ),
              metadata: {
                relationshipId: entry.relationship.id,
                sourceEntityId: entry.relationship.sourceEntityId,
                targetEntityId: entry.relationship.targetEntityId,
                relationshipTier,
                entityTier: sourceEntityTier,
                entityRole: "source"
              },
              relationshipId: entry.relationship.id,
              relationshipRevisionId: entry.relationshipRevision.id
            });
          }
        }

        if (targetEntityTier !== null && targetEntityTier !== undefined) {
          if (targetEntityTier === "NONE") {
            generatedIssues.push({
              ruleCode: "RELATIONSHIP_REVEAL_CONSISTENCY_INCOMPLETE",
              severity: "WARNING",
              subjectType: "RELATIONSHIP_REVISION",
              subjectId: entry.relationshipRevision.id,
              title: "Relationship reveal state is inconsistent with related entity visibility",
              details: `Relationship is marked as ${relationshipTier} but target entity is publicly visible with tier NONE`,
              fingerprint: fingerprint(
                "RELATIONSHIP_REVEAL_CONSISTENCY_INCOMPLETE",
                String(entry.relationship.id),
                entry.relationship.targetEntityId,
                relationshipTier,
                targetEntityTier
              ),
              metadata: {
                relationshipId: entry.relationship.id,
                sourceEntityId: entry.relationship.sourceEntityId,
                targetEntityId: entry.relationship.targetEntityId,
                relationshipTier,
                entityTier: targetEntityTier,
                entityRole: "target"
              },
              relationshipId: entry.relationship.id,
              relationshipRevisionId: entry.relationshipRevision.id
            });
          }
        }
      }
    }

    const existingIssues = await continuityIssueRepository.listIssuesForRelease(context.release.id);
    const suppressedLowValueFingerprints = new Set(
      existingIssues
        .filter(
          (issue) =>
            issue.status === "DISMISSED" &&
            issue.severity === "WARNING" &&
            lowValueSuppressibleWarningRules.has(issue.ruleCode)
        )
        .map((issue) => issue.fingerprint)
    );
    const issues = generatedIssues.filter(
      (issue) => !(issue.severity === "WARNING" && suppressedLowValueFingerprints.has(issue.fingerprint))
    );

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
        ruleCount: 9,
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
    relationshipId?: string;
    relationshipRevisionId?: string;
    sort: ContinuityIssueListSort;
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
      summary: result.summary,
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