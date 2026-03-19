import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

export type ParsedManifest = {
  schemaVersion: number;
  format: string;
  scope: string;
  exportedAt: string;
  counts: {
    entities: number;
    manuscripts: number;
    relationships: number;
    releases: number;
  };
};

export type ParsedEntityFile = {
  filePath: string;
  entity: {
    id?: string;
    slug: string;
    type: string;
    retiredAt: string | null;
  };
  revision: {
    id?: string;
    version: number;
    name: string;
    summary: string;
    visibility: string;
    payload: unknown;
  };
};

export type ParsedManuscriptFile = {
  filePath: string;
  manuscript: {
    id?: string;
    slug: string;
    type: string;
  };
  revision: {
    id?: string;
    version: number;
    title: string;
    summary: string;
    visibility: string;
    payload: unknown;
  };
};

export type ParsedRelationshipFile = {
  filePath: string;
  relationship: {
    id?: string;
    relationType: string;
    sourceEntity: { id?: string; slug: string };
    targetEntity: { id?: string; slug: string };
  };
  revision: {
    id?: string;
    version: number;
    state: string;
    visibility: string;
    metadata: unknown;
  };
};

export type ParsedReleaseFile = {
  filePath: string;
  release: {
    id?: string;
    slug: string;
    name: string;
    status: string;
  };
  composition: {
    entities: Array<{
      entityId?: string;
      entitySlug: string;
      revisionId?: string;
      version: number;
      visibility: string;
    }>;
    manuscripts: Array<{
      manuscriptId?: string;
      manuscriptSlug: string;
      manuscriptRevisionId?: string;
      version: number;
      visibility: string;
    }>;
    relationships: Array<{
      relationshipId?: string;
      sourceEntitySlug?: string;
      targetEntitySlug?: string;
      relationType: string;
      relationshipRevisionId?: string;
      version: number;
      visibility: string;
    }>;
  };
};

export type ParseFailure = {
  file: string;
  code: string;
  message: string;
};

export type ParsedImportPackage = {
  manifestPath: string;
  manifest: ParsedManifest;
  entities: ParsedEntityFile[];
  manuscripts: ParsedManuscriptFile[];
  relationships: ParsedRelationshipFile[];
  releases: ParsedReleaseFile[];
};

export type ParseResult =
  | { success: true; package: ParsedImportPackage }
  | { success: false; errors: ParseFailure[] };

const isSafePath = (rootDir: string, relativePath: string): boolean => {
  const resolved = resolve(join(rootDir, relativePath));
  const rel = relative(rootDir, resolved);
  return !rel.startsWith("..");
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const readJsonFile = async (rootDir: string, relativePath: string): Promise<unknown> => {
  const content = await readFile(join(rootDir, relativePath), "utf8");
  return JSON.parse(content);
};

// Spread optional id only when it is a real string (exactOptionalPropertyTypes compliance)
const optId = (value: unknown): { id: string } | Record<never, never> =>
  typeof value === "string" ? { id: value } : {};

const scanJsonFilesUnder = async (
  rootDir: string,
  subDir: string
): Promise<{ files: string[]; pathUnsafe?: string }> => {
  const fullSubDir = join(rootDir, subDir);
  let entries: Array<{ name: string; isDirectory: () => boolean }>;

  try {
    entries = await readdir(fullSubDir, { withFileTypes: true });
  } catch {
    return { files: [] };
  }

  const files: string[] = [];

  for (const entry of entries) {
    const relativePath = `${subDir}/${entry.name}`;

    if (!isSafePath(rootDir, relativePath)) {
      return { files: [], pathUnsafe: relativePath };
    }

    if (entry.isDirectory()) {
      const nested = await scanJsonFilesUnder(rootDir, relativePath);
      if (nested.pathUnsafe) return nested;
      files.push(...nested.files);
    } else if (entry.name.endsWith(".json")) {
      files.push(relativePath);
    }
  }

  return { files };
};

const validateEntityFile = (raw: unknown, filePath: string): ParsedEntityFile => {
  if (!isRecord(raw)) throw new Error("Expected object");

  const entity = raw["entity"];
  const revision = raw["revision"];

  if (!isRecord(entity)) throw new Error("Missing or invalid entity field");
  if (!isRecord(revision)) throw new Error("Missing or invalid revision field");

  if (typeof entity["slug"] !== "string" || !entity["slug"]) {
    throw new Error("entity.slug must be a non-empty string");
  }
  if (typeof entity["type"] !== "string" || !entity["type"]) {
    throw new Error("entity.type must be a non-empty string");
  }
  if (typeof revision["name"] !== "string") throw new Error("revision.name must be a string");
  if (typeof revision["summary"] !== "string") throw new Error("revision.summary must be a string");
  if (typeof revision["visibility"] !== "string") throw new Error("revision.visibility must be a string");
  if (typeof revision["version"] !== "number") throw new Error("revision.version must be a number");

  return {
    filePath,
    entity: {
      ...optId(entity["id"]),
      slug: entity["slug"],
      type: entity["type"],
      retiredAt: typeof entity["retiredAt"] === "string" ? entity["retiredAt"] : null
    },
    revision: {
      ...optId(revision["id"]),
      version: revision["version"],
      name: revision["name"],
      summary: revision["summary"],
      visibility: revision["visibility"],
      payload: revision["payload"] !== undefined ? revision["payload"] : null
    }
  };
};

const validateManuscriptFile = (raw: unknown, filePath: string): ParsedManuscriptFile => {
  if (!isRecord(raw)) throw new Error("Expected object");

  const manuscript = raw["manuscript"];
  const revision = raw["revision"];

  if (!isRecord(manuscript)) throw new Error("Missing or invalid manuscript field");
  if (!isRecord(revision)) throw new Error("Missing or invalid revision field");

  if (typeof manuscript["slug"] !== "string" || !manuscript["slug"]) {
    throw new Error("manuscript.slug must be a non-empty string");
  }
  if (typeof manuscript["type"] !== "string" || !manuscript["type"]) {
    throw new Error("manuscript.type must be a non-empty string");
  }
  if (typeof revision["title"] !== "string") throw new Error("revision.title must be a string");
  if (typeof revision["summary"] !== "string") throw new Error("revision.summary must be a string");
  if (typeof revision["visibility"] !== "string") throw new Error("revision.visibility must be a string");
  if (typeof revision["version"] !== "number") throw new Error("revision.version must be a number");

  return {
    filePath,
    manuscript: {
      ...optId(manuscript["id"]),
      slug: manuscript["slug"],
      type: manuscript["type"]
    },
    revision: {
      ...optId(revision["id"]),
      version: revision["version"],
      title: revision["title"],
      summary: revision["summary"],
      visibility: revision["visibility"],
      payload: revision["payload"] !== undefined ? revision["payload"] : null
    }
  };
};

const validateRelationshipFile = (raw: unknown, filePath: string): ParsedRelationshipFile => {
  if (!isRecord(raw)) throw new Error("Expected object");

  const relationship = raw["relationship"];
  const revision = raw["revision"];

  if (!isRecord(relationship)) throw new Error("Missing or invalid relationship field");
  if (!isRecord(revision)) throw new Error("Missing or invalid revision field");

  if (typeof relationship["relationType"] !== "string" || !relationship["relationType"]) {
    throw new Error("relationship.relationType must be a non-empty string");
  }

  const sourceEntity = relationship["sourceEntity"];
  const targetEntity = relationship["targetEntity"];

  if (!isRecord(sourceEntity) || typeof sourceEntity["slug"] !== "string") {
    throw new Error("relationship.sourceEntity.slug must be a string");
  }
  if (!isRecord(targetEntity) || typeof targetEntity["slug"] !== "string") {
    throw new Error("relationship.targetEntity.slug must be a string");
  }

  if (typeof revision["state"] !== "string") throw new Error("revision.state must be a string");
  if (typeof revision["visibility"] !== "string") throw new Error("revision.visibility must be a string");
  if (typeof revision["version"] !== "number") throw new Error("revision.version must be a number");

  return {
    filePath,
    relationship: {
      ...optId(relationship["id"]),
      relationType: relationship["relationType"],
      sourceEntity: {
        ...optId(sourceEntity["id"]),
        slug: sourceEntity["slug"]
      },
      targetEntity: {
        ...optId(targetEntity["id"]),
        slug: targetEntity["slug"]
      }
    },
    revision: {
      ...optId(revision["id"]),
      version: revision["version"],
      state: revision["state"],
      visibility: revision["visibility"],
      metadata: revision["metadata"] !== undefined ? revision["metadata"] : null
    }
  };
};

const validateReleaseFile = (raw: unknown, filePath: string): ParsedReleaseFile => {
  if (!isRecord(raw)) throw new Error("Expected object");

  const release = raw["release"];
  const composition = raw["composition"];

  if (!isRecord(release)) throw new Error("Missing or invalid release field");
  if (!isRecord(composition)) throw new Error("Missing or invalid composition field");

  if (typeof release["slug"] !== "string" || !release["slug"]) {
    throw new Error("release.slug must be a non-empty string");
  }
  if (typeof release["name"] !== "string") throw new Error("release.name must be a string");
  if (typeof release["status"] !== "string") throw new Error("release.status must be a string");

  const parseEntryArray = <T>(
    entries: unknown,
    validate: (entry: Record<string, unknown>) => T
  ): T[] => {
    if (!Array.isArray(entries)) return [];
    return entries.flatMap((entry: unknown) => {
      if (!isRecord(entry)) return [];
      return [validate(entry)];
    });
  };

  return {
    filePath,
    release: {
      ...optId(release["id"]),
      slug: release["slug"],
      name: release["name"],
      status: release["status"]
    },
    composition: {
      entities: parseEntryArray(composition["entities"], (entry) => ({
        ...optId(entry["entityId"]),
        entitySlug: typeof entry["entitySlug"] === "string" ? entry["entitySlug"] : "",
        ...(typeof entry["revisionId"] === "string" ? { revisionId: entry["revisionId"] } : {}),
        version: typeof entry["version"] === "number" ? entry["version"] : 0,
        visibility: typeof entry["visibility"] === "string" ? entry["visibility"] : "PUBLIC"
      })),
      manuscripts: parseEntryArray(composition["manuscripts"], (entry) => ({
        ...(typeof entry["manuscriptId"] === "string" ? { manuscriptId: entry["manuscriptId"] } : {}),
        manuscriptSlug:
          typeof entry["manuscriptSlug"] === "string" ? entry["manuscriptSlug"] : "",
        ...(typeof entry["manuscriptRevisionId"] === "string"
          ? { manuscriptRevisionId: entry["manuscriptRevisionId"] }
          : {}),
        version: typeof entry["version"] === "number" ? entry["version"] : 0,
        visibility: typeof entry["visibility"] === "string" ? entry["visibility"] : "PUBLIC"
      })),
      relationships: parseEntryArray(composition["relationships"], (entry) => ({
        ...(typeof entry["relationshipId"] === "string"
          ? { relationshipId: entry["relationshipId"] }
          : {}),
        ...(typeof entry["sourceEntitySlug"] === "string"
          ? { sourceEntitySlug: entry["sourceEntitySlug"] }
          : {}),
        ...(typeof entry["targetEntitySlug"] === "string"
          ? { targetEntitySlug: entry["targetEntitySlug"] }
          : {}),
        relationType: typeof entry["relationType"] === "string" ? entry["relationType"] : "",
        ...(typeof entry["relationshipRevisionId"] === "string"
          ? { relationshipRevisionId: entry["relationshipRevisionId"] }
          : {}),
        version: typeof entry["version"] === "number" ? entry["version"] : 0,
        visibility: typeof entry["visibility"] === "string" ? entry["visibility"] : "PUBLIC"
      }))
    }
  };
};

export const jsonPortabilityParser = {
  async parseDirectory(inputPath: string): Promise<ParseResult> {
    const rootDir = resolve(inputPath);

    try {
      const stats = await stat(rootDir);

      if (!stats.isDirectory()) {
        return {
          success: false,
          errors: [{ file: inputPath, code: "PAYLOAD_INVALID", message: "Input path is not a directory" }]
        };
      }
    } catch {
      return {
        success: false,
        errors: [{ file: inputPath, code: "PAYLOAD_INVALID", message: "Input directory does not exist" }]
      };
    }

    const manifestRelPath = "manifests/export-manifest.json";

    if (!isSafePath(rootDir, manifestRelPath)) {
      return {
        success: false,
        errors: [{ file: manifestRelPath, code: "PATH_UNSAFE", message: "Manifest path is unsafe" }]
      };
    }

    let rawManifest: unknown;

    try {
      rawManifest = await readJsonFile(rootDir, manifestRelPath);
    } catch {
      return {
        success: false,
        errors: [
          {
            file: manifestRelPath,
            code: "MANIFEST_INVALID",
            message: "Manifest file is missing or contains invalid JSON"
          }
        ]
      };
    }

    if (
      !isRecord(rawManifest) ||
      !("schemaVersion" in rawManifest) ||
      !("format" in rawManifest) ||
      !("counts" in rawManifest)
    ) {
      return {
        success: false,
        errors: [
          {
            file: manifestRelPath,
            code: "MANIFEST_INVALID",
            message: "Manifest is missing required fields: schemaVersion, format, counts"
          }
        ]
      };
    }

    if (rawManifest["schemaVersion"] !== 1) {
      return {
        success: false,
        errors: [
          {
            file: manifestRelPath,
            code: "SCHEMA_VERSION_UNSUPPORTED",
            message: `Unsupported schemaVersion: ${String(rawManifest["schemaVersion"])}`
          }
        ]
      };
    }

    if (rawManifest["format"] !== "json") {
      return {
        success: false,
        errors: [
          {
            file: manifestRelPath,
            code: "FORMAT_UNSUPPORTED",
            message: `Unsupported format: ${String(rawManifest["format"])}`
          }
        ]
      };
    }

    const countsRaw = isRecord(rawManifest["counts"]) ? rawManifest["counts"] : {};
    const manifest: ParsedManifest = {
      schemaVersion: rawManifest["schemaVersion"],
      format: rawManifest["format"],
      scope: typeof rawManifest["scope"] === "string" ? rawManifest["scope"] : "",
      exportedAt:
        typeof rawManifest["exportedAt"] === "string"
          ? rawManifest["exportedAt"]
          : new Date().toISOString(),
      counts: {
        entities: typeof countsRaw["entities"] === "number" ? countsRaw["entities"] : 0,
        manuscripts: typeof countsRaw["manuscripts"] === "number" ? countsRaw["manuscripts"] : 0,
        relationships: typeof countsRaw["relationships"] === "number" ? countsRaw["relationships"] : 0,
        releases: typeof countsRaw["releases"] === "number" ? countsRaw["releases"] : 0
      }
    };

    const errors: ParseFailure[] = [];
    const entities: ParsedEntityFile[] = [];
    const manuscripts: ParsedManuscriptFile[] = [];
    const relationships: ParsedRelationshipFile[] = [];
    const releases: ParsedReleaseFile[] = [];

    const entityScan = await scanJsonFilesUnder(rootDir, "entities");

    if (entityScan.pathUnsafe) {
      return {
        success: false,
        errors: [
          { file: entityScan.pathUnsafe, code: "PATH_UNSAFE", message: "Path traversal detected in entity files" }
        ]
      };
    }

    for (const filePath of entityScan.files) {
      try {
        entities.push(validateEntityFile(await readJsonFile(rootDir, filePath), filePath));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown parse error";
        errors.push({ file: filePath, code: "PAYLOAD_INVALID", message: `Invalid entity file: ${message}` });
      }
    }

    const manuscriptScan = await scanJsonFilesUnder(rootDir, "manuscripts");

    if (manuscriptScan.pathUnsafe) {
      return {
        success: false,
        errors: [
          {
            file: manuscriptScan.pathUnsafe,
            code: "PATH_UNSAFE",
            message: "Path traversal detected in manuscript files"
          }
        ]
      };
    }

    for (const filePath of manuscriptScan.files) {
      try {
        manuscripts.push(validateManuscriptFile(await readJsonFile(rootDir, filePath), filePath));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown parse error";
        errors.push({
          file: filePath,
          code: "PAYLOAD_INVALID",
          message: `Invalid manuscript file: ${message}`
        });
      }
    }

    const relationshipScan = await scanJsonFilesUnder(rootDir, "relationships");

    if (relationshipScan.pathUnsafe) {
      return {
        success: false,
        errors: [
          {
            file: relationshipScan.pathUnsafe,
            code: "PATH_UNSAFE",
            message: "Path traversal detected in relationship files"
          }
        ]
      };
    }

    for (const filePath of relationshipScan.files) {
      try {
        relationships.push(validateRelationshipFile(await readJsonFile(rootDir, filePath), filePath));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown parse error";
        errors.push({
          file: filePath,
          code: "PAYLOAD_INVALID",
          message: `Invalid relationship file: ${message}`
        });
      }
    }

    const releaseScan = await scanJsonFilesUnder(rootDir, "releases");

    if (releaseScan.pathUnsafe) {
      return {
        success: false,
        errors: [
          {
            file: releaseScan.pathUnsafe,
            code: "PATH_UNSAFE",
            message: "Path traversal detected in release files"
          }
        ]
      };
    }

    for (const filePath of releaseScan.files) {
      try {
        releases.push(validateReleaseFile(await readJsonFile(rootDir, filePath), filePath));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown parse error";
        errors.push({
          file: filePath,
          code: "PAYLOAD_INVALID",
          message: `Invalid release file: ${message}`
        });
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return {
      success: true,
      package: {
        manifestPath: manifestRelPath,
        manifest,
        entities,
        manuscripts,
        relationships,
        releases
      }
    };
  }
};
