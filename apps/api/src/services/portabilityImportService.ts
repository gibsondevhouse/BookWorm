import type {
  ParseFailure,
  ParsedEntityFile,
  ParsedManuscriptFile,
  ParsedRelationshipFile,
  ParsedReleaseFile
} from "../lib/portability/jsonPortabilityParser.js";
import { jsonPortabilityParser } from "../lib/portability/jsonPortabilityParser.js";
import { markdownPortabilityParser } from "../lib/portability/markdownPortabilityParser.js";
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
  kind: "entity" | "manuscript" | "relationship" | "release";
  slug: string;
  action: "CREATE" | "CREATE_REVISION" | "NO_CHANGE";
};

export type ImportErrorRecord = {
  file?: string;
  code: string;
  message: string;
};

export type ImportReport = {
  dryRun: boolean;
  summary: {
    entities: { created: number; revised: number; unchanged: number };
    manuscripts: { created: number; revised: number; unchanged: number };
    relationships: { created: number; revised: number; unchanged: number };
    releases: { created: number };
  };
  changes: ImportChangeRecord[];
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

  return changes;
};

const failReport = (dryRun: boolean, errors: ImportErrorRecord[]): ImportReport => ({
  dryRun,
  summary: {
    entities: { created: 0, revised: 0, unchanged: 0 },
    manuscripts: { created: 0, revised: 0, unchanged: 0 },
    relationships: { created: 0, revised: 0, unchanged: 0 },
    releases: { created: 0 }
  },
  changes: [],
  warnings: [],
  errors
});

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

    // Phase 1: Parse
    const parseResult =
      input.format === "json"
        ? await jsonPortabilityParser.parseDirectory(input.inputPath)
        : await markdownPortabilityParser.parseDirectory(input.inputPath);

    if (!parseResult.success) {
      return failReport(
        dryRun,
        parseResult.errors.map((e: ParseFailure) => ({ file: e.file, code: e.code, message: e.message }))
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
          errors.push({
            file: entityFile.filePath,
            code: "IDENTITY_AMBIGUOUS",
            message: `Entity id "${entity.id}" resolves to slug "${byId.slug}" but package declares slug "${entity.slug}"`
          });
          continue;
        }
      }

      const existing = await portabilityImportRepository.findEntityBySlug(entity.slug);
      importedEntitySlugs.add(entity.slug);

      if (!existing) {
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
          errors.push({
            file: entityFile.filePath,
            code: "PAYLOAD_INVALID",
            message: `Entity "${entity.slug}" exists with different content; use --conflict=create-revision`
          });
          continue;
        }

        const nextVersion = (existing.latestRevision?.version ?? 0) + 1;
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
          errors.push({
            file: manuscriptFile.filePath,
            code: "IDENTITY_AMBIGUOUS",
            message: `Manuscript id "${manuscript.id}" resolves to slug "${byId.slug}" but package declares slug "${manuscript.slug}"`
          });
          continue;
        }
      }

      const existing = await portabilityImportRepository.findManuscriptBySlug(manuscript.slug);
      importedManuscriptSlugs.add(manuscript.slug);

      if (!existing) {
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
          errors.push({
            file: manuscriptFile.filePath,
            code: "PAYLOAD_INVALID",
            message: `Manuscript "${manuscript.slug}" exists with different content; use --conflict=create-revision`
          });
          continue;
        }

        const nextVersion = (existing.latestRevision?.version ?? 0) + 1;
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
        errors.push({
          file: relFile.filePath,
          code: "DEPENDENCY_MISSING",
          message: `Relationship source entity "${sourceSlug}" not found in package or database`
        });
        continue;
      }

      const targetExists =
        importedEntitySlugs.has(targetSlug) ||
        !!(await portabilityImportRepository.findEntityBySlug(targetSlug));

      if (!targetExists) {
        errors.push({
          file: relFile.filePath,
          code: "DEPENDENCY_MISSING",
          message: `Relationship target entity "${targetSlug}" not found in package or database`
        });
        continue;
      }

      const existing = await portabilityImportRepository.findRelationshipByIdentity(
        sourceSlug,
        targetSlug,
        relationship.relationType
      );

      if (!existing) {
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
          errors.push({
            file: relFile.filePath,
            code: "PAYLOAD_INVALID",
            message: `Relationship "${key}" exists with different content; use --conflict=create-revision`
          });
          continue;
        }

        const nextVersion = (existing.latestRevision?.version ?? 0) + 1;
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
        errors.push({
          file: releaseFile.filePath,
          code: "RELEASE_CONFLICT",
          message: `Release slug "${release.slug}" already exists with status ${existingRelease.status}`
        });
        continue;
      }

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
          errors.push({
            file: releaseFile.filePath,
            code: "DEPENDENCY_MISSING",
            message: `Release composition references relationship "${relationshipKey}" not found`
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

    // Phase 5: Abort on validation errors
    if (errors.length > 0) {
      return failReport(dryRun, errors);
    }

    const plan: ImportApplyPlan = {
      entities: entityOps,
      manuscripts: manuscriptOps,
      relationships: relationshipOps,
      releases: releaseOps
    };

    const contentChanges = planToChanges(plan);
    const releaseCreates = releaseOps.filter((op) => op.action === "CREATE").length;

    // Phase 6: Apply or dry-run
    if (!dryRun) {
      await portabilityImportRepository.applyImport(plan, actorId);
    }

    return {
      dryRun,
      summary: buildSummaryFromChanges(contentChanges, releaseCreates),
      changes: [
        ...contentChanges,
        ...releaseOps
          .filter((op) => op.action === "CREATE")
          .map<ImportChangeRecord>((op) => ({ kind: "release", slug: op.slug, action: "CREATE" }))
      ],
      warnings,
      errors: []
    };
  }
};
