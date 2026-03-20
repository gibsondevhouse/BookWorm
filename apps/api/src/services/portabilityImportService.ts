import type {
  ApprovalChainStatus,
  ApprovalStepEventType,
  ApprovalStepStatus,
  NotificationEventStatus,
  NotificationEventType,
  ReviewRequestStatus,
  Role
} from "@prisma/client";

import type {
  ParseFailure,
  ParsedEntityFile,
  ParsedManuscriptFile,
  ParsedRelationshipFile,
  ParsedReleaseFile
} from "../lib/portability/jsonPortabilityParser.js";
import { jsonPortabilityParser } from "../lib/portability/jsonPortabilityParser.js";
import { markdownPortabilityParser } from "../lib/portability/markdownPortabilityParser.js";
import { portabilityZipPackage } from "../lib/portability/portabilityZipPackage.js";
import type {
  EntityApplyOp,
  EntityRecord,
  ImportApplyPlan,
  ManuscriptApplyOp,
  ManuscriptRecord,
  RelationshipApplyOp,
  RelationshipRecord
} from "../repositories/portabilityImportRepository.js";
import { portabilityImportRepository } from "../repositories/portabilityImportRepository.js";

export type ImportChangeRecord = {
  kind:
    | "entity"
    | "manuscript"
    | "relationship"
    | "release"
    | "review-request"
    | "approval-chain"
    | "approval-step"
    | "approval-step-event"
    | "notification-event"
    | "notification-preference";
  slug: string;
  action: "CREATE" | "CREATE_REVISION" | "NO_CHANGE" | "UPSERT";
};

export type ImportErrorRecord = {
  file?: string;
  code: string;
  message: string;
};

export type ImportConflictClass =
  | "IDENTITY_MISMATCH"
  | "DUPLICATE_SLUG"
  | "RELEASE_SLUG_COLLISION"
  | "UNRESOLVED_RELATIONSHIP_REFERENCE"
  | "SCHEMA_VERSION_INCOMPATIBLE"
  | "OTHER";

type ImportPolicyMode = "fail" | "create-revision" | "not-applicable";

type ImportDecisionOutcome = "CREATE" | "CREATE_REVISION" | "NO_CHANGE" | "UPSERT" | "ERROR";

export type ImportDecisionRecord = {
  kind: ImportChangeRecord["kind"] | "package";
  record: string;
  file?: string;
  policy: ImportPolicyMode;
  outcome: ImportDecisionOutcome;
  reason: string;
  conflictClass?: ImportConflictClass;
};

export type ImportConflictSummaryRecord = {
  conflictClass: ImportConflictClass;
  policy: ImportPolicyMode;
  outcome: Extract<ImportDecisionOutcome, "CREATE_REVISION" | "ERROR">;
  count: number;
};

export type ImportReport = {
  dryRun: boolean;
  execution: {
    mode: "dry-run" | "apply";
    status: "succeeded" | "failed";
    rollback: {
      status: "not-applicable" | "not-required" | "confirmed";
      transactionality: "single-transaction";
    };
  };
  summary: {
    entities: { created: number; revised: number; unchanged: number };
    manuscripts: { created: number; revised: number; unchanged: number };
    relationships: { created: number; revised: number; unchanged: number };
    releases: { created: number };
  };
  changes: ImportChangeRecord[];
  conflicts: ImportConflictSummaryRecord[];
  decisions: ImportDecisionRecord[];
  warnings: string[];
  errors: ImportErrorRecord[];
};

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map((item) => stableValue(item));

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, stableValue(v)])
    );
  }

  return value;
};

const contentKey = (value: unknown): string => JSON.stringify(stableValue(value));

const entityRevisionChanged = (
  pkg: ParsedEntityFile["revision"],
  db: EntityRecord["latestRevision"]
): boolean => {
  if (!db) return true;

  return (
    pkg.name !== db.name ||
    pkg.summary !== db.summary ||
    pkg.visibility !== db.visibility ||
    contentKey(pkg.payload) !== contentKey(db.payload)
  );
};

const manuscriptRevisionChanged = (
  pkg: ParsedManuscriptFile["revision"],
  db: ManuscriptRecord["latestRevision"]
): boolean => {
  if (!db) return true;

  return (
    pkg.title !== db.title ||
    pkg.summary !== db.summary ||
    pkg.visibility !== db.visibility ||
    contentKey(pkg.payload) !== contentKey(db.payload)
  );
};

const relationshipRevisionChanged = (
  pkg: ParsedRelationshipFile["revision"],
  db: RelationshipRecord["latestRevision"]
): boolean => {
  if (!db) return true;

  return (
    pkg.state !== db.state ||
    pkg.visibility !== db.visibility ||
    contentKey(pkg.metadata) !== contentKey(db.metadata)
  );
};

const makeRelKey = (sourceSlug: string, relationType: string, targetSlug: string): string =>
  `${sourceSlug}--${relationType}--${targetSlug}`;

const buildSummaryFromChanges = (
  changes: ImportChangeRecord[],
  releaseCreates: number
): ImportReport["summary"] => ({
  entities: {
    created: changes.filter((c) => c.kind === "entity" && c.action === "CREATE").length,
    revised: changes.filter((c) => c.kind === "entity" && c.action === "CREATE_REVISION").length,
    unchanged: changes.filter((c) => c.kind === "entity" && c.action === "NO_CHANGE").length
  },
  manuscripts: {
    created: changes.filter((c) => c.kind === "manuscript" && c.action === "CREATE").length,
    revised: changes.filter((c) => c.kind === "manuscript" && c.action === "CREATE_REVISION").length,
    unchanged: changes.filter((c) => c.kind === "manuscript" && c.action === "NO_CHANGE").length
  },
  relationships: {
    created: changes.filter((c) => c.kind === "relationship" && c.action === "CREATE").length,
    revised: changes.filter((c) => c.kind === "relationship" && c.action === "CREATE_REVISION").length,
    unchanged: changes.filter((c) => c.kind === "relationship" && c.action === "NO_CHANGE").length
  },
  releases: { created: releaseCreates }
});

const planToChanges = (plan: ImportApplyPlan): ImportChangeRecord[] => {
  const changes: ImportChangeRecord[] = [];

  for (const op of plan.entities) {
    const action =
      op.action === "CREATE" ? "CREATE" : op.action === "CREATE_REVISION" ? "CREATE_REVISION" : "NO_CHANGE";
    changes.push({ kind: "entity", slug: op.slug, action });
  }

  for (const op of plan.manuscripts) {
    const action =
      op.action === "CREATE" ? "CREATE" : op.action === "CREATE_REVISION" ? "CREATE_REVISION" : "NO_CHANGE";
    changes.push({ kind: "manuscript", slug: op.slug, action });
  }

  for (const op of plan.relationships) {
    const action =
      op.action === "CREATE" ? "CREATE" : op.action === "CREATE_REVISION" ? "CREATE_REVISION" : "NO_CHANGE";
    changes.push({ kind: "relationship", slug: op.key, action });
  }

  for (const op of plan.governance.reviewRequests) {
    changes.push({ kind: "review-request", slug: op.id, action: op.action });
  }

  for (const op of plan.governance.approvalChains) {
    changes.push({ kind: "approval-chain", slug: op.id, action: op.action });
  }

  for (const op of plan.governance.approvalSteps) {
    changes.push({ kind: "approval-step", slug: op.id, action: op.action });
  }

  for (const op of plan.governance.approvalStepEvents) {
    changes.push({ kind: "approval-step-event", slug: op.id, action: op.action });
  }

  for (const op of plan.governance.notificationEvents) {
    changes.push({ kind: "notification-event", slug: op.id, action: op.action === "CREATE" ? "CREATE" : "NO_CHANGE" });
  }

  for (const op of plan.governance.notificationPreferences) {
    changes.push({
      kind: "notification-preference",
      slug: `${op.userId}:${op.eventType}`,
      action: op.action
    });
  }

  return changes;
};

const classifyConflict = (error: ImportErrorRecord): ImportConflictClass | null => {
  if (error.code === "IDENTITY_AMBIGUOUS") return "IDENTITY_MISMATCH";
  if (error.code === "RELEASE_CONFLICT") return "RELEASE_SLUG_COLLISION";
  if (error.code === "SCHEMA_VERSION_UNSUPPORTED") return "SCHEMA_VERSION_INCOMPATIBLE";

  if (error.code === "DEPENDENCY_MISSING" && /relationship/i.test(error.message)) {
    return "UNRESOLVED_RELATIONSHIP_REFERENCE";
  }

  if (error.code === "MANIFEST_INVALID") {
    return "SCHEMA_VERSION_INCOMPATIBLE";
  }

  if (error.code === "PAYLOAD_INVALID" && /exists with different content/i.test(error.message)) {
    return "DUPLICATE_SLUG";
  }

  return null;
};

const buildConflictSummary = (decisions: ImportDecisionRecord[]): ImportConflictSummaryRecord[] => {
  const aggregate = new Map<string, ImportConflictSummaryRecord>();

  for (const decision of decisions) {
    if (!decision.conflictClass) continue;
    if (decision.outcome !== "CREATE_REVISION" && decision.outcome !== "ERROR") continue;

    const key = `${decision.conflictClass}|${decision.policy}|${decision.outcome}`;
    const existing = aggregate.get(key);

    if (existing) {
      existing.count += 1;
      continue;
    }

    aggregate.set(key, {
      conflictClass: decision.conflictClass,
      policy: decision.policy,
      outcome: decision.outcome,
      count: 1
    });
  }

  return [...aggregate.values()].sort((left, right) => {
    const classCompare = left.conflictClass.localeCompare(right.conflictClass);
    if (classCompare !== 0) return classCompare;

    const policyCompare = left.policy.localeCompare(right.policy);
    if (policyCompare !== 0) return policyCompare;

    return left.outcome.localeCompare(right.outcome);
  });
};

const buildExecution = (input: {
  dryRun: boolean;
  status: "succeeded" | "failed";
  rollbackStatus: "not-applicable" | "not-required" | "confirmed";
}): ImportReport["execution"] => ({
  mode: input.dryRun ? "dry-run" : "apply",
  status: input.status,
  rollback: {
    status: input.rollbackStatus,
    transactionality: "single-transaction"
  }
});

const errorToDecision = (
  error: ImportErrorRecord,
  policy: ImportPolicyMode,
  fallbackRecord: string
): ImportDecisionRecord => {
  const conflictClass = classifyConflict(error) ?? "OTHER";

  return {
    kind: "package",
    record: error.file ?? fallbackRecord,
    ...(error.file ? { file: error.file } : {}),
    policy,
    outcome: "ERROR",
    reason: error.message,
    conflictClass
  };
};

const failReport = (
  dryRun: boolean,
  errors: ImportErrorRecord[],
  input?: {
    policy?: ImportPolicyMode;
    changes?: ImportChangeRecord[];
    warnings?: string[];
    decisions?: ImportDecisionRecord[];
    rollbackStatus?: "not-applicable" | "not-required" | "confirmed";
  }
): ImportReport => {
  const policy = input?.policy ?? "not-applicable";
  const decisions = input?.decisions ?? errors.map((error) => errorToDecision(error, policy, "import"));

  return {
    dryRun,
    execution: buildExecution({
      dryRun,
      status: "failed",
      rollbackStatus: input?.rollbackStatus ?? (dryRun ? "not-applicable" : "not-required")
    }),
    summary: {
      entities: { created: 0, revised: 0, unchanged: 0 },
      manuscripts: { created: 0, revised: 0, unchanged: 0 },
      relationships: { created: 0, revised: 0, unchanged: 0 },
      releases: { created: 0 }
    },
    changes: input?.changes ?? [],
    conflicts: buildConflictSummary(decisions),
    decisions,
    warnings: input?.warnings ?? [],
    errors
  };
};

export const portabilityImportService = {
  async runImport(input: {
    inputPath: string;
    format: "json" | "markdown";
    actorEmail: string;
    dryRun?: boolean;
    conflictMode?: "fail" | "create-revision";
  }): Promise<ImportReport> {
    const dryRun = input.dryRun ?? false;
    const conflictMode = input.conflictMode ?? "fail";
    const decisions: ImportDecisionRecord[] = [];

    // Phase 1: Parse
    const parseResult =
      input.format === "json"
        ? await jsonPortabilityParser.parseDirectory(input.inputPath)
        : await markdownPortabilityParser.parseDirectory(input.inputPath);

    if (!parseResult.success) {
      const parseErrors = parseResult.errors.map((e: ParseFailure) => ({
        file: e.file,
        code: e.code,
        message: e.message
      }));

      return failReport(
        dryRun,
        parseErrors,
        {
          policy: "not-applicable",
          decisions: parseErrors.map((error) => errorToDecision(error, "not-applicable", "parse"))
        }
      );
    }

    const pkg = parseResult.package;
    const errors: ImportErrorRecord[] = [];
    const warnings: string[] = [];

    // Phase 2: Actor validation
    const actor = await portabilityImportRepository.findActorByEmail(input.actorEmail);

    if (!actor) {
      return failReport(dryRun, [
        { code: "ACTOR_NOT_FOUND", message: `Actor not found for email: ${input.actorEmail}` }
      ]);
    }

    if (actor.role !== "AUTHOR_ADMIN") {
      return failReport(dryRun, [
        {
          code: "ACTOR_FORBIDDEN",
          message: `Actor ${input.actorEmail} does not have AUTHOR_ADMIN role (has: ${actor.role})`
        }
      ]);
    }

    const actorId = actor.id;

    // Phase 3a: Entity identity and conflict resolution
    const entityOps: EntityApplyOp[] = [];
    const importedEntitySlugs = new Set<string>();

    for (const entityFile of pkg.entities) {
      const { entity, revision } = entityFile;

      if (entity.id) {
        const byId = await portabilityImportRepository.findEntityById(entity.id);

        if (byId && byId.slug !== entity.slug) {
          const error: ImportErrorRecord = {
            file: entityFile.filePath,
            code: "IDENTITY_AMBIGUOUS",
            message: `Entity id "${entity.id}" resolves to slug "${byId.slug}" but package declares slug "${entity.slug}"`
          };

          errors.push(error);
          decisions.push({
            kind: "entity",
            record: entity.slug,
            file: entityFile.filePath,
            policy: "not-applicable",
            outcome: "ERROR",
            reason: error.message,
            conflictClass: "IDENTITY_MISMATCH"
          });
          continue;
        }
      }

      const existing = await portabilityImportRepository.findEntityBySlug(entity.slug);
      importedEntitySlugs.add(entity.slug);

      if (!existing) {
        decisions.push({
          kind: "entity",
          record: entity.slug,
          file: entityFile.filePath,
          policy: conflictMode,
          outcome: "CREATE",
          reason: "Entity slug does not exist; create new record"
        });

        entityOps.push({
          action: "CREATE",
          slug: entity.slug,
          type: entity.type,
          retiredAt: entity.retiredAt ? new Date(entity.retiredAt) : null,
          nextVersion: 1,
          revision: {
            name: revision.name,
            summary: revision.summary,
            visibility: revision.visibility,
            payload: revision.payload
          }
        });
      } else if (entityRevisionChanged(revision, existing.latestRevision)) {
        if (conflictMode === "fail") {
          const error: ImportErrorRecord = {
            file: entityFile.filePath,
            code: "PAYLOAD_INVALID",
            message: `Entity "${entity.slug}" exists with different content; use --conflict=create-revision`
          };

          errors.push(error);
          decisions.push({
            kind: "entity",
            record: entity.slug,
            file: entityFile.filePath,
            policy: conflictMode,
            outcome: "ERROR",
            reason: error.message,
            conflictClass: "DUPLICATE_SLUG"
          });
          continue;
        }

        const nextVersion = (existing.latestRevision?.version ?? 0) + 1;
        decisions.push({
          kind: "entity",
          record: entity.slug,
          file: entityFile.filePath,
          policy: conflictMode,
          outcome: "CREATE_REVISION",
          reason: "Entity slug exists with different content; creating a new revision",
          conflictClass: "DUPLICATE_SLUG"
        });

        entityOps.push({
          action: "CREATE_REVISION",
          slug: entity.slug,
          entityId: existing.id,
          nextVersion,
          retiredAt: entity.retiredAt ? new Date(entity.retiredAt) : null,
          revision: {
            name: revision.name,
            summary: revision.summary,
            visibility: revision.visibility,
            payload: revision.payload
          }
        });
      } else {
        const packageRetiredAt = entity.retiredAt ? new Date(entity.retiredAt) : null;
        const existingRetiredAt = existing.retiredAt;
        const retiredAtDiffers =
          (packageRetiredAt?.toISOString() ?? null) !== (existingRetiredAt?.toISOString() ?? null);

        decisions.push({
          kind: "entity",
          record: entity.slug,
          file: entityFile.filePath,
          policy: conflictMode,
          outcome: "NO_CHANGE",
          reason: "Entity content already matches package payload"
        });

        entityOps.push({
          action: "NO_CHANGE",
          slug: entity.slug,
          entityId: existing.id,
          revisionId: existing.latestRevision?.id ?? "",
          ...(retiredAtDiffers ? { newRetiredAt: packageRetiredAt } : {})
        });
      }
    }

    // Phase 3b: Manuscript identity and conflict resolution
    const manuscriptOps: ManuscriptApplyOp[] = [];
    const importedManuscriptSlugs = new Set<string>();

    for (const manuscriptFile of pkg.manuscripts) {
      const { manuscript, revision } = manuscriptFile;

      if (manuscript.id) {
        const byId = await portabilityImportRepository.findManuscriptById(manuscript.id);

        if (byId && byId.slug !== manuscript.slug) {
          const error: ImportErrorRecord = {
            file: manuscriptFile.filePath,
            code: "IDENTITY_AMBIGUOUS",
            message: `Manuscript id "${manuscript.id}" resolves to slug "${byId.slug}" but package declares slug "${manuscript.slug}"`
          };

          errors.push(error);
          decisions.push({
            kind: "manuscript",
            record: manuscript.slug,
            file: manuscriptFile.filePath,
            policy: "not-applicable",
            outcome: "ERROR",
            reason: error.message,
            conflictClass: "IDENTITY_MISMATCH"
          });
          continue;
        }
      }

      const existing = await portabilityImportRepository.findManuscriptBySlug(manuscript.slug);
      importedManuscriptSlugs.add(manuscript.slug);

      if (!existing) {
        decisions.push({
          kind: "manuscript",
          record: manuscript.slug,
          file: manuscriptFile.filePath,
          policy: conflictMode,
          outcome: "CREATE",
          reason: "Manuscript slug does not exist; create new record"
        });

        manuscriptOps.push({
          action: "CREATE",
          slug: manuscript.slug,
          type: manuscript.type,
          nextVersion: 1,
          revision: {
            title: revision.title,
            summary: revision.summary,
            visibility: revision.visibility,
            payload: revision.payload
          }
        });
      } else if (manuscriptRevisionChanged(revision, existing.latestRevision)) {
        if (conflictMode === "fail") {
          const error: ImportErrorRecord = {
            file: manuscriptFile.filePath,
            code: "PAYLOAD_INVALID",
            message: `Manuscript "${manuscript.slug}" exists with different content; use --conflict=create-revision`
          };

          errors.push(error);
          decisions.push({
            kind: "manuscript",
            record: manuscript.slug,
            file: manuscriptFile.filePath,
            policy: conflictMode,
            outcome: "ERROR",
            reason: error.message,
            conflictClass: "DUPLICATE_SLUG"
          });
          continue;
        }

        const nextVersion = (existing.latestRevision?.version ?? 0) + 1;
        decisions.push({
          kind: "manuscript",
          record: manuscript.slug,
          file: manuscriptFile.filePath,
          policy: conflictMode,
          outcome: "CREATE_REVISION",
          reason: "Manuscript slug exists with different content; creating a new revision",
          conflictClass: "DUPLICATE_SLUG"
        });

        manuscriptOps.push({
          action: "CREATE_REVISION",
          slug: manuscript.slug,
          manuscriptId: existing.id,
          nextVersion,
          revision: {
            title: revision.title,
            summary: revision.summary,
            visibility: revision.visibility,
            payload: revision.payload
          }
        });
      } else {
        decisions.push({
          kind: "manuscript",
          record: manuscript.slug,
          file: manuscriptFile.filePath,
          policy: conflictMode,
          outcome: "NO_CHANGE",
          reason: "Manuscript content already matches package payload"
        });

        manuscriptOps.push({
          action: "NO_CHANGE",
          slug: manuscript.slug,
          manuscriptId: existing.id,
          revisionId: existing.latestRevision?.id ?? ""
        });
      }
    }

    // Phase 3c: Relationship identity and dependency resolution
    const relationshipOps: RelationshipApplyOp[] = [];

    for (const relFile of pkg.relationships) {
      const { relationship, revision } = relFile;
      const sourceSlug = relationship.sourceEntity.slug;
      const targetSlug = relationship.targetEntity.slug;
      const key = makeRelKey(sourceSlug, relationship.relationType, targetSlug);

      const sourceExists =
        importedEntitySlugs.has(sourceSlug) ||
        !!(await portabilityImportRepository.findEntityBySlug(sourceSlug));

      if (!sourceExists) {
        const error: ImportErrorRecord = {
          file: relFile.filePath,
          code: "DEPENDENCY_MISSING",
          message: `Relationship source entity "${sourceSlug}" not found in package or database`
        };

        errors.push(error);
        decisions.push({
          kind: "relationship",
          record: key,
          file: relFile.filePath,
          policy: "not-applicable",
          outcome: "ERROR",
          reason: error.message,
          conflictClass: "UNRESOLVED_RELATIONSHIP_REFERENCE"
        });
        continue;
      }

      const targetExists =
        importedEntitySlugs.has(targetSlug) ||
        !!(await portabilityImportRepository.findEntityBySlug(targetSlug));

      if (!targetExists) {
        const error: ImportErrorRecord = {
          file: relFile.filePath,
          code: "DEPENDENCY_MISSING",
          message: `Relationship target entity "${targetSlug}" not found in package or database`
        };

        errors.push(error);
        decisions.push({
          kind: "relationship",
          record: key,
          file: relFile.filePath,
          policy: "not-applicable",
          outcome: "ERROR",
          reason: error.message,
          conflictClass: "UNRESOLVED_RELATIONSHIP_REFERENCE"
        });
        continue;
      }

      const existing = await portabilityImportRepository.findRelationshipByIdentity(
        sourceSlug,
        targetSlug,
        relationship.relationType
      );

      if (!existing) {
        decisions.push({
          kind: "relationship",
          record: key,
          file: relFile.filePath,
          policy: conflictMode,
          outcome: "CREATE",
          reason: "Relationship identity does not exist; create new record"
        });

        relationshipOps.push({
          action: "CREATE",
          key,
          sourceEntitySlug: sourceSlug,
          targetEntitySlug: targetSlug,
          relationType: relationship.relationType,
          nextVersion: 1,
          revision: {
            state: revision.state,
            visibility: revision.visibility,
            metadata: revision.metadata
          }
        });
      } else if (relationshipRevisionChanged(revision, existing.latestRevision)) {
        if (conflictMode === "fail") {
          const error: ImportErrorRecord = {
            file: relFile.filePath,
            code: "PAYLOAD_INVALID",
            message: `Relationship "${key}" exists with different content; use --conflict=create-revision`
          };

          errors.push(error);
          decisions.push({
            kind: "relationship",
            record: key,
            file: relFile.filePath,
            policy: conflictMode,
            outcome: "ERROR",
            reason: error.message,
            conflictClass: "DUPLICATE_SLUG"
          });
          continue;
        }

        const nextVersion = (existing.latestRevision?.version ?? 0) + 1;
        decisions.push({
          kind: "relationship",
          record: key,
          file: relFile.filePath,
          policy: conflictMode,
          outcome: "CREATE_REVISION",
          reason: "Relationship identity exists with different content; creating a new revision",
          conflictClass: "DUPLICATE_SLUG"
        });

        relationshipOps.push({
          action: "CREATE_REVISION",
          key,
          relationshipId: existing.id,
          nextVersion,
          revision: {
            state: revision.state,
            visibility: revision.visibility,
            metadata: revision.metadata
          }
        });
      } else {
        decisions.push({
          kind: "relationship",
          record: key,
          file: relFile.filePath,
          policy: conflictMode,
          outcome: "NO_CHANGE",
          reason: "Relationship content already matches package payload"
        });

        relationshipOps.push({
          action: "NO_CHANGE",
          key,
          relationshipId: existing.id,
          revisionId: existing.latestRevision?.id ?? ""
        });
      }
    }

    // Phase 4: Release validation
    const releaseOps: ImportApplyPlan["releases"] = [];

    for (const releaseFile of pkg.releases) {
      const { release, composition } = releaseFile;

      const existingRelease = await portabilityImportRepository.findReleaseBySlug(release.slug);

      if (existingRelease) {
        const error: ImportErrorRecord = {
          file: releaseFile.filePath,
          code: "RELEASE_CONFLICT",
          message: `Release slug "${release.slug}" already exists with status ${existingRelease.status}`
        };

        errors.push(error);
        decisions.push({
          kind: "release",
          record: release.slug,
          file: releaseFile.filePath,
          policy: "not-applicable",
          outcome: "ERROR",
          reason: error.message,
          conflictClass: "RELEASE_SLUG_COLLISION"
        });
        continue;
      }

      decisions.push({
        kind: "release",
        record: release.slug,
        file: releaseFile.filePath,
        policy: "not-applicable",
        outcome: "CREATE",
        reason: "Release slug does not exist; create new draft release"
      });

      for (const entry of composition.entities) {
        if (!entry.entitySlug) continue;

        const exists =
          importedEntitySlugs.has(entry.entitySlug) ||
          !!(await portabilityImportRepository.findEntityBySlug(entry.entitySlug));

        if (!exists) {
          errors.push({
            file: releaseFile.filePath,
            code: "DEPENDENCY_MISSING",
            message: `Release composition references entity "${entry.entitySlug}" not found`
          });
        }
      }

      for (const entry of composition.manuscripts) {
        if (!entry.manuscriptSlug) continue;

        const exists =
          importedManuscriptSlugs.has(entry.manuscriptSlug) ||
          !!(await portabilityImportRepository.findManuscriptBySlug(entry.manuscriptSlug));

        if (!exists) {
          errors.push({
            file: releaseFile.filePath,
            code: "DEPENDENCY_MISSING",
            message: `Release composition references manuscript "${entry.manuscriptSlug}" not found`
          });
        }
      }

      const compositionRelationshipKeys: string[] = [];

      for (const relationshipEntry of composition.relationships) {
        const sourceEntitySlug = relationshipEntry.sourceEntitySlug?.trim() ?? "";
        const targetEntitySlug = relationshipEntry.targetEntitySlug?.trim() ?? "";
        const relationType = relationshipEntry.relationType.trim();

        if (!sourceEntitySlug || !targetEntitySlug || !relationType) {
          errors.push({
            file: releaseFile.filePath,
            code: "PAYLOAD_INVALID",
            message:
              "Release composition relationship entries must include sourceEntitySlug, targetEntitySlug, and relationType"
          });
          continue;
        }

        const relationshipKey = makeRelKey(sourceEntitySlug, relationType, targetEntitySlug);
        const existingPlannedOp = relationshipOps.find((op) => op.key === relationshipKey);

        if (existingPlannedOp) {
          compositionRelationshipKeys.push(relationshipKey);
          continue;
        }

        const existingRelationship = await portabilityImportRepository.findRelationshipByIdentity(
          sourceEntitySlug,
          targetEntitySlug,
          relationType
        );

        if (!existingRelationship?.latestRevision) {
          const error: ImportErrorRecord = {
            file: releaseFile.filePath,
            code: "DEPENDENCY_MISSING",
            message: `Release composition references relationship "${relationshipKey}" not found`
          };

          errors.push(error);
          decisions.push({
            kind: "release",
            record: release.slug,
            file: releaseFile.filePath,
            policy: "not-applicable",
            outcome: "ERROR",
            reason: error.message,
            conflictClass: "UNRESOLVED_RELATIONSHIP_REFERENCE"
          });
          continue;
        }

        relationshipOps.push({
          action: "NO_CHANGE",
          key: relationshipKey,
          relationshipId: existingRelationship.id,
          revisionId: existingRelationship.latestRevision.id
        });

        compositionRelationshipKeys.push(relationshipKey);
      }

      releaseOps.push({
        action: "CREATE",
        slug: release.slug,
        name: release.name,
        compositionEntitySlugs: composition.entities
          .map((e: ParsedReleaseFile["composition"]["entities"][number]) => e.entitySlug)
          .filter(Boolean),
        compositionManuscriptSlugs: composition.manuscripts
          .map((m: ParsedReleaseFile["composition"]["manuscripts"][number]) => m.manuscriptSlug)
          .filter(Boolean),
        compositionRelationshipKeys
      });
    }

    // Ensure pre-existing entities referenced in release composition are in the entity ops map
    for (const releaseOp of releaseOps) {
      for (const entitySlug of releaseOp.compositionEntitySlugs) {
        if (entityOps.some((op) => op.slug === entitySlug)) continue;

        const existing = await portabilityImportRepository.findEntityBySlug(entitySlug);
        if (existing?.latestRevision) {
          entityOps.push({
            action: "NO_CHANGE",
            slug: entitySlug,
            entityId: existing.id,
            revisionId: existing.latestRevision.id
          });
        }
      }

      for (const manuscriptSlug of releaseOp.compositionManuscriptSlugs) {
        if (manuscriptOps.some((op) => op.slug === manuscriptSlug)) continue;

        const existing = await portabilityImportRepository.findManuscriptBySlug(manuscriptSlug);
        if (existing?.latestRevision) {
          manuscriptOps.push({
            action: "NO_CHANGE",
            slug: manuscriptSlug,
            manuscriptId: existing.id,
            revisionId: existing.latestRevision.id
          });
        }
      }
    }

    const plan: ImportApplyPlan = {
      entities: entityOps,
      manuscripts: manuscriptOps,
      relationships: relationshipOps,
      releases: releaseOps,
      governance: {
        reviewRequests: [],
        approvalChains: [],
        approvalSteps: [],
        approvalStepEvents: [],
        notificationEvents: [],
        notificationPreferences: []
      }
    };

    const governance = pkg.governance;

    if (governance) {
      for (const reviewRequestFile of governance.reviewRequests) {
        const reviewRequest = reviewRequestFile.reviewRequest;
        const existing = await portabilityImportRepository.findReviewRequestById(reviewRequest.id);

        if (existing) {
          plan.governance.reviewRequests.push({ action: "NO_CHANGE", id: reviewRequest.id });
          continue;
        }

        const proposal = await portabilityImportRepository.findProposalById(reviewRequest.proposalId);

        if (!proposal) {
          errors.push({
            file: reviewRequestFile.filePath,
            code: "DEPENDENCY_MISSING",
            message: `Review request references missing proposal id "${reviewRequest.proposalId}"`
          });
          continue;
        }

        const createdBy = await portabilityImportRepository.findUserById(reviewRequest.createdById);

        if (!createdBy) {
          errors.push({
            file: reviewRequestFile.filePath,
            code: "DEPENDENCY_MISSING",
            message: `Review request references missing createdBy user id "${reviewRequest.createdById}"`
          });
          continue;
        }

        if (reviewRequest.assignedApproverId) {
          const assignedApprover = await portabilityImportRepository.findUserById(
            reviewRequest.assignedApproverId
          );

          if (!assignedApprover) {
            warnings.push(
              `Skipping assignedApproverId for review request ${reviewRequest.id} because user ${reviewRequest.assignedApproverId} does not exist`
            );
          }
        }

        plan.governance.reviewRequests.push({
          action: "CREATE",
          id: reviewRequest.id,
          proposalId: reviewRequest.proposalId,
          createdById: reviewRequest.createdById,
          assignedApproverId:
            reviewRequest.assignedApproverId &&
            (await portabilityImportRepository.findUserById(reviewRequest.assignedApproverId))
              ? reviewRequest.assignedApproverId
              : null,
          assignedAt: reviewRequest.assignedAt ? new Date(reviewRequest.assignedAt) : null,
          assignmentHistory: reviewRequest.assignmentHistory,
          lifecycleHistory: reviewRequest.lifecycleHistory,
          status: reviewRequest.status as ReviewRequestStatus,
          createdAt: new Date(reviewRequest.createdAt),
          updatedAt: new Date(reviewRequest.updatedAt)
        });
      }

      for (const approvalChainFile of governance.approvalChains) {
        const approvalChain = approvalChainFile.approvalChain;
        const existing = await portabilityImportRepository.findApprovalChainById(approvalChain.id);

        if (existing) {
          plan.governance.approvalChains.push({ action: "NO_CHANGE", id: approvalChain.id });
          continue;
        }

        const reviewRequestExistsInPlan = plan.governance.reviewRequests.some(
          (op) => op.id === approvalChain.reviewRequestId
        );
        const existingReviewRequest = await portabilityImportRepository.findReviewRequestById(
          approvalChain.reviewRequestId
        );

        if (!reviewRequestExistsInPlan && !existingReviewRequest) {
          errors.push({
            file: approvalChainFile.filePath,
            code: "DEPENDENCY_MISSING",
            message: `Approval chain references missing review request id "${approvalChain.reviewRequestId}"`
          });
          continue;
        }

        plan.governance.approvalChains.push({
          action: "CREATE",
          id: approvalChain.id,
          reviewRequestId: approvalChain.reviewRequestId,
          status: approvalChain.status as ApprovalChainStatus,
          currentStepOrder: approvalChain.currentStepOrder,
          finalizedAt: approvalChain.finalizedAt ? new Date(approvalChain.finalizedAt) : null,
          createdAt: new Date(approvalChain.createdAt),
          updatedAt: new Date(approvalChain.updatedAt)
        });
      }

      for (const approvalStepFile of governance.approvalSteps) {
        const approvalStep = approvalStepFile.approvalStep;
        const existing = await portabilityImportRepository.findApprovalStepById(approvalStep.id);

        if (existing) {
          plan.governance.approvalSteps.push({ action: "NO_CHANGE", id: approvalStep.id });
          continue;
        }

        const chainExistsInPlan = plan.governance.approvalChains.some((op) => op.id === approvalStep.chainId);
        const existingChain = await portabilityImportRepository.findApprovalChainById(approvalStep.chainId);

        if (!chainExistsInPlan && !existingChain) {
          errors.push({
            file: approvalStepFile.filePath,
            code: "DEPENDENCY_MISSING",
            message: `Approval step references missing chain id "${approvalStep.chainId}"`
          });
          continue;
        }

        const optionalUserIds = [
          approvalStep.assignedReviewerId,
          approvalStep.acknowledgedById,
          approvalStep.decidedById,
          approvalStep.escalatedById
        ].filter((value): value is string => value !== null);

        const existingOptionalUserIds = new Set<string>();

        for (const userId of optionalUserIds) {
          if (await portabilityImportRepository.findUserById(userId)) {
            existingOptionalUserIds.add(userId);
          } else {
            warnings.push(`Approval step ${approvalStep.id} references missing user ${userId}; field will be set to null`);
          }
        }

        plan.governance.approvalSteps.push({
          action: "CREATE",
          id: approvalStep.id,
          chainId: approvalStep.chainId,
          stepOrder: approvalStep.stepOrder,
          title: approvalStep.title,
          required: approvalStep.required,
          status: approvalStep.status as ApprovalStepStatus,
          assignedReviewerId: existingOptionalUserIds.has(approvalStep.assignedReviewerId ?? "")
            ? approvalStep.assignedReviewerId
            : null,
          assignedRole: (approvalStep.assignedRole as Role | null) ?? null,
          acknowledgedAt: approvalStep.acknowledgedAt ? new Date(approvalStep.acknowledgedAt) : null,
          acknowledgedById: existingOptionalUserIds.has(approvalStep.acknowledgedById ?? "")
            ? approvalStep.acknowledgedById
            : null,
          decidedAt: approvalStep.decidedAt ? new Date(approvalStep.decidedAt) : null,
          decidedById: existingOptionalUserIds.has(approvalStep.decidedById ?? "")
            ? approvalStep.decidedById
            : null,
          decisionNote: approvalStep.decisionNote,
          escalationLevel: approvalStep.escalationLevel,
          escalatedAt: approvalStep.escalatedAt ? new Date(approvalStep.escalatedAt) : null,
          escalatedById: existingOptionalUserIds.has(approvalStep.escalatedById ?? "")
            ? approvalStep.escalatedById
            : null,
          createdAt: new Date(approvalStep.createdAt),
          updatedAt: new Date(approvalStep.updatedAt)
        });
      }

      for (const approvalStepEventFile of governance.approvalStepEvents) {
        const approvalStepEvent = approvalStepEventFile.approvalStepEvent;
        const existing = await portabilityImportRepository.findApprovalStepEventById(approvalStepEvent.id);

        if (existing) {
          plan.governance.approvalStepEvents.push({ action: "NO_CHANGE", id: approvalStepEvent.id });
          continue;
        }

        const stepExistsInPlan = plan.governance.approvalSteps.some((op) => op.id === approvalStepEvent.stepId);
        const existingStep = await portabilityImportRepository.findApprovalStepById(approvalStepEvent.stepId);

        if (!stepExistsInPlan && !existingStep) {
          errors.push({
            file: approvalStepEventFile.filePath,
            code: "DEPENDENCY_MISSING",
            message: `Approval step event references missing step id "${approvalStepEvent.stepId}"`
          });
          continue;
        }

        const actor = await portabilityImportRepository.findUserById(approvalStepEvent.actorUserId);

        if (!actor) {
          errors.push({
            file: approvalStepEventFile.filePath,
            code: "DEPENDENCY_MISSING",
            message: `Approval step event references missing actor user id "${approvalStepEvent.actorUserId}"`
          });
          continue;
        }

        const optionalUserIds = [
          approvalStepEvent.fromAssignedReviewerId,
          approvalStepEvent.toAssignedReviewerId
        ].filter((value): value is string => value !== null);

        const existingOptionalUserIds = new Set<string>();
        for (const userId of optionalUserIds) {
          if (await portabilityImportRepository.findUserById(userId)) {
            existingOptionalUserIds.add(userId);
          }
        }

        plan.governance.approvalStepEvents.push({
          action: "CREATE",
          id: approvalStepEvent.id,
          stepId: approvalStepEvent.stepId,
          eventType: approvalStepEvent.eventType as ApprovalStepEventType,
          reasonCode: approvalStepEvent.reasonCode,
          reasonNote: approvalStepEvent.reasonNote,
          actorUserId: approvalStepEvent.actorUserId,
          fromAssignedReviewerId: existingOptionalUserIds.has(approvalStepEvent.fromAssignedReviewerId ?? "")
            ? approvalStepEvent.fromAssignedReviewerId
            : null,
          fromAssignedRole: (approvalStepEvent.fromAssignedRole as Role | null) ?? null,
          toAssignedReviewerId: existingOptionalUserIds.has(approvalStepEvent.toAssignedReviewerId ?? "")
            ? approvalStepEvent.toAssignedReviewerId
            : null,
          toAssignedRole: (approvalStepEvent.toAssignedRole as Role | null) ?? null,
          escalationLevel: approvalStepEvent.escalationLevel,
          createdAt: new Date(approvalStepEvent.createdAt)
        });
      }

      for (const notificationEventFile of governance.notificationEvents) {
        const notificationEvent = notificationEventFile.notificationEvent;
        const existingById = await portabilityImportRepository.findNotificationEventById(notificationEvent.id);
        const existingByKey = await portabilityImportRepository.findNotificationEventByEventKey(
          notificationEvent.eventKey
        );

        if (existingById || existingByKey) {
          plan.governance.notificationEvents.push({
            action: "NO_CHANGE",
            id: notificationEvent.id,
            eventKey: notificationEvent.eventKey
          });
          continue;
        }

        const reviewRequestId = notificationEvent.reviewRequestId;
        if (reviewRequestId) {
          const reviewRequestExistsInPlan = plan.governance.reviewRequests.some((op) => op.id === reviewRequestId);
          const existingReviewRequest = await portabilityImportRepository.findReviewRequestById(reviewRequestId);

          if (!reviewRequestExistsInPlan && !existingReviewRequest) {
            errors.push({
              file: notificationEventFile.filePath,
              code: "DEPENDENCY_MISSING",
              message: `Notification event references missing review request id "${reviewRequestId}"`
            });
            continue;
          }
        }

        const approvalChainId = notificationEvent.approvalChainId;
        if (approvalChainId) {
          const approvalChainExistsInPlan = plan.governance.approvalChains.some((op) => op.id === approvalChainId);
          const existingApprovalChain = await portabilityImportRepository.findApprovalChainById(approvalChainId);

          if (!approvalChainExistsInPlan && !existingApprovalChain) {
            errors.push({
              file: notificationEventFile.filePath,
              code: "DEPENDENCY_MISSING",
              message: `Notification event references missing approval chain id "${approvalChainId}"`
            });
            continue;
          }
        }

        const approvalStepId = notificationEvent.approvalStepId;
        if (approvalStepId) {
          const approvalStepExistsInPlan = plan.governance.approvalSteps.some((op) => op.id === approvalStepId);
          const existingApprovalStep = await portabilityImportRepository.findApprovalStepById(approvalStepId);

          if (!approvalStepExistsInPlan && !existingApprovalStep) {
            errors.push({
              file: notificationEventFile.filePath,
              code: "DEPENDENCY_MISSING",
              message: `Notification event references missing approval step id "${approvalStepId}"`
            });
            continue;
          }
        }

        let actorUserId: string | null = notificationEvent.actorUserId;

        if (actorUserId && !(await portabilityImportRepository.findUserById(actorUserId))) {
          warnings.push(
            `Notification event ${notificationEvent.id} references missing actor user ${actorUserId}; actorUserId will be null`
          );
          actorUserId = null;
        }

        plan.governance.notificationEvents.push({
          action: "CREATE",
          id: notificationEvent.id,
          eventType: notificationEvent.eventType as NotificationEventType,
          eventKey: notificationEvent.eventKey,
          status: notificationEvent.status as NotificationEventStatus,
          reviewRequestId: notificationEvent.reviewRequestId,
          approvalChainId: notificationEvent.approvalChainId,
          approvalStepId: notificationEvent.approvalStepId,
          actorUserId,
          payload: notificationEvent.payload,
          attemptCount: notificationEvent.attemptCount,
          nextAttemptAt: new Date(notificationEvent.nextAttemptAt),
          lastAttemptAt: notificationEvent.lastAttemptAt ? new Date(notificationEvent.lastAttemptAt) : null,
          deliveredAt: notificationEvent.deliveredAt ? new Date(notificationEvent.deliveredAt) : null,
          lastError: notificationEvent.lastError,
          processingToken: notificationEvent.processingToken,
          createdAt: new Date(notificationEvent.createdAt),
          updatedAt: new Date(notificationEvent.updatedAt)
        });
      }

      for (const notificationPreferenceFile of governance.notificationPreferences) {
        const notificationPreference = notificationPreferenceFile.notificationPreference;

        const user = await portabilityImportRepository.findUserById(notificationPreference.userId);
        if (!user) {
          errors.push({
            file: notificationPreferenceFile.filePath,
            code: "DEPENDENCY_MISSING",
            message: `Notification preference references missing user id "${notificationPreference.userId}"`
          });
          continue;
        }

        const existing = await portabilityImportRepository.findNotificationPreferenceByUnique({
          userId: notificationPreference.userId,
          eventType: notificationPreference.eventType as NotificationEventType
        });

        if (existing) {
          plan.governance.notificationPreferences.push({
            action: "NO_CHANGE",
            id: existing.id,
            userId: notificationPreference.userId,
            eventType: notificationPreference.eventType as NotificationEventType
          });
          continue;
        }

        plan.governance.notificationPreferences.push({
          action: "UPSERT",
          id: notificationPreference.id,
          userId: notificationPreference.userId,
          eventType: notificationPreference.eventType as NotificationEventType,
          enabled: notificationPreference.enabled,
          createdAt: new Date(notificationPreference.createdAt),
          updatedAt: new Date(notificationPreference.updatedAt)
        });
      }
    }

    const contentChanges = planToChanges(plan);
    const releaseCreates = releaseOps.filter((op) => op.action === "CREATE").length;
    const plannedReleaseChanges = releaseOps
      .filter((op) => op.action === "CREATE")
      .map<ImportChangeRecord>((op) => ({ kind: "release", slug: op.slug, action: "CREATE" }));

    if (errors.length > 0) {
      return failReport(dryRun, errors, {
        policy: conflictMode,
        changes: [...contentChanges, ...plannedReleaseChanges],
        warnings,
        decisions,
        rollbackStatus: dryRun ? "not-applicable" : "not-required"
      });
    }

    // Phase 6: Apply or dry-run
    if (!dryRun) {
      try {
        await portabilityImportRepository.applyImport(plan, actorId);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown apply failure";
        const applyError: ImportErrorRecord = {
          code: "APPLY_ROLLED_BACK",
          message: `Import apply failed and was rolled back: ${message}`
        };

        return failReport(dryRun, [applyError], {
          policy: conflictMode,
          changes: [...contentChanges, ...plannedReleaseChanges],
          warnings,
          decisions: [
            ...decisions,
            {
              kind: "package",
              record: "apply",
              policy: conflictMode,
              outcome: "ERROR",
              reason: applyError.message,
              conflictClass: "OTHER"
            }
          ],
          rollbackStatus: "confirmed"
        });
      }
    }

    return {
      dryRun,
      execution: buildExecution({
        dryRun,
        status: "succeeded",
        rollbackStatus: dryRun ? "not-applicable" : "not-required"
      }),
      summary: buildSummaryFromChanges(contentChanges, releaseCreates),
      changes: [
        ...contentChanges,
        ...plannedReleaseChanges
      ],
      conflicts: buildConflictSummary(decisions),
      decisions,
      warnings,
      errors: []
    };
  },

  async runZipImport(input: {
    inputPath: string;
    actorEmail: string;
    dryRun?: boolean;
    conflictMode?: "fail" | "create-revision";
    format?: "json" | "markdown";
  }): Promise<ImportReport> {
    const dryRun = input.dryRun ?? false;

    const parsed = await portabilityZipPackage.parseArchiveToDirectory(input.inputPath);

    if (!parsed.success) {
      const parseError: ImportErrorRecord = {
        code: parsed.error.code,
        message: parsed.error.message,
        ...(parsed.error.file ? { file: parsed.error.file } : {})
      };

      return failReport(dryRun, [
        parseError
      ], {
        policy: input.conflictMode ?? "fail",
        decisions: [errorToDecision(parseError, input.conflictMode ?? "fail", "zip")]
      });
    }

    if (input.format && input.format !== parsed.format) {
      await parsed.cleanup();

      return failReport(dryRun, [
        {
          code: "FORMAT_UNSUPPORTED",
          message: `Zip package payload format is ${parsed.format}, but --format=${input.format} was requested`
        }
      ], {
        policy: input.conflictMode ?? "fail"
      });
    }

    try {
      return await portabilityImportService.runImport({
        inputPath: parsed.inputPath,
        format: parsed.format,
        actorEmail: input.actorEmail,
        dryRun,
        ...(input.conflictMode ? { conflictMode: input.conflictMode } : {})
      });
    } finally {
      await parsed.cleanup();
    }
  }
};
