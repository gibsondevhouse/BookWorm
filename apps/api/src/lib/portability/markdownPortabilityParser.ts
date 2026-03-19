import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import { entityMetadataContract } from "../entityMetadataContract.js";
import type {
  ParseFailure,
  ParsedEntityFile,
  ParsedImportPackage,
  ParsedManifest,
  ParsedManuscriptFile,
  ParsedRelationshipFile,
  ParsedReleaseFile,
  ParseResult
} from "./jsonPortabilityParser.js";

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

const scanFilesUnder = async (
  rootDir: string,
  subDir: string,
  extension: ".json" | ".md"
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
      const nested = await scanFilesUnder(rootDir, relativePath, extension);
      if (nested.pathUnsafe) return nested;
      files.push(...nested.files);
    } else if (entry.name.endsWith(extension)) {
      files.push(relativePath);
    }
  }

  return { files };
};

const parseScalar = (rawValue: string): unknown => {
  const value = rawValue.trim();

  if (value === "null") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);

  if (
    value.startsWith("\"") ||
    value.startsWith("[") ||
    value.startsWith("{") ||
    value.startsWith("'")
  ) {
    try {
      if (value.startsWith("'")) {
        return value.slice(1, -1);
      }

      return JSON.parse(value);
    } catch {
      throw new Error(`Invalid front matter value: ${value}`);
    }
  }

  return value;
};

const parseMarkdownDocument = (content: string): { frontMatter: Record<string, unknown>; body: string } => {
  if (!content.startsWith("---\n")) {
    throw new Error("Missing front matter start delimiter");
  }

  const closeIndex = content.indexOf("\n---\n", 4);

  if (closeIndex === -1) {
    throw new Error("Missing front matter end delimiter");
  }

  const rawFrontMatter = content.slice(4, closeIndex).trim();
  const body = content.slice(closeIndex + 5);
  const frontMatter: Record<string, unknown> = {};

  if (rawFrontMatter.length === 0) {
    throw new Error("Front matter cannot be empty");
  }

  for (const line of rawFrontMatter.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    const separatorIndex = trimmed.indexOf(":");

    if (separatorIndex <= 0) {
      throw new Error(`Malformed front matter line: ${line}`);
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1);

    if (!key) {
      throw new Error("Front matter key cannot be empty");
    }

    frontMatter[key] = parseScalar(value);
  }

  return { frontMatter, body };
};

const parseHeadingAndContent = (body: string): { heading: string; content: string } => {
  const normalizedBody = body.replace(/\r\n/g, "\n").trim();

  if (!normalizedBody.startsWith("# ")) {
    throw new Error("Body must start with a level-one heading");
  }

  const [firstLine, ...restLines] = normalizedBody.split("\n");

  if (!firstLine) {
    throw new Error("Body heading is required");
  }

  const heading = firstLine.slice(2).trim();
  const content = restLines.join("\n").trim();

  if (!heading) {
    throw new Error("Heading cannot be empty");
  }

  if (!content) {
    throw new Error("Body content cannot be empty");
  }

  return { heading, content };
};

const validateEntityMarkdownFile = async (
  rootDir: string,
  filePath: string
): Promise<ParsedEntityFile> => {
  const fileContent = await readFile(join(rootDir, filePath), "utf8");
  const { frontMatter, body } = parseMarkdownDocument(fileContent);

  if (typeof frontMatter["slug"] !== "string" || frontMatter["slug"].trim().length === 0) {
    throw new Error("slug must be a non-empty string");
  }

  if (typeof frontMatter["type"] !== "string" || frontMatter["type"].trim().length === 0) {
    throw new Error("type must be a non-empty string");
  }

  if (typeof frontMatter["visibility"] !== "string" || frontMatter["visibility"].trim().length === 0) {
    throw new Error("visibility must be a non-empty string");
  }

  if (typeof frontMatter["version"] !== "number") {
    throw new Error("version must be a number");
  }

  if (
    typeof frontMatter["revisionId"] !== "string" ||
    frontMatter["revisionId"].trim().length === 0
  ) {
    throw new Error("revisionId must be a non-empty string");
  }

  const metadata = frontMatter["metadata"] ?? {};
  const metadataValidation = entityMetadataContract.metadataInputSchema.safeParse(metadata);

  if (!metadataValidation.success) {
    throw new Error(`metadata is invalid: ${metadataValidation.error.issues[0]?.message ?? "unknown"}`);
  }

  const { heading, content } = parseHeadingAndContent(body);

  return {
    filePath,
    entity: {
      ...(typeof frontMatter["id"] === "string" ? { id: frontMatter["id"] } : {}),
      slug: frontMatter["slug"],
      type: frontMatter["type"],
      retiredAt: typeof frontMatter["retiredAt"] === "string" ? frontMatter["retiredAt"] : null
    },
    revision: {
      ...(typeof frontMatter["revisionId"] === "string" ? { id: frontMatter["revisionId"] } : {}),
      version: frontMatter["version"],
      name: heading,
      summary: content,
      visibility: frontMatter["visibility"],
      payload: {
        name: heading,
        summary: content,
        visibility: frontMatter["visibility"],
        metadata: metadataValidation.data
      }
    }
  };
};

const validateManuscriptMarkdownFile = async (
  rootDir: string,
  filePath: string,
  expectedType: "CHAPTER" | "SCENE"
): Promise<ParsedManuscriptFile> => {
  const fileContent = await readFile(join(rootDir, filePath), "utf8");
  const { frontMatter, body } = parseMarkdownDocument(fileContent);

  if (typeof frontMatter["slug"] !== "string" || frontMatter["slug"].trim().length === 0) {
    throw new Error("slug must be a non-empty string");
  }

  if (
    typeof frontMatter["manuscriptType"] !== "string" ||
    frontMatter["manuscriptType"].trim().length === 0
  ) {
    throw new Error("manuscriptType must be a non-empty string");
  }

  if (typeof frontMatter["visibility"] !== "string" || frontMatter["visibility"].trim().length === 0) {
    throw new Error("visibility must be a non-empty string");
  }

  if (typeof frontMatter["version"] !== "number") {
    throw new Error("version must be a number");
  }

  if (
    typeof frontMatter["revisionId"] !== "string" ||
    frontMatter["revisionId"].trim().length === 0
  ) {
    throw new Error("revisionId must be a non-empty string");
  }

  if (frontMatter["manuscriptType"] !== expectedType) {
    throw new Error(`manuscriptType must be ${expectedType} for files under ${expectedType.toLowerCase()}s/`);
  }

  if (typeof frontMatter["summary"] !== "string" || frontMatter["summary"].trim().length === 0) {
    throw new Error("summary must be a non-empty string");
  }

  const metadata = frontMatter["metadata"];
  if (metadata !== undefined && (!isRecord(metadata) || Array.isArray(metadata))) {
    throw new Error("metadata must be an object when provided");
  }

  const { heading, content } = parseHeadingAndContent(body);

  return {
    filePath,
    manuscript: {
      ...(typeof frontMatter["id"] === "string" ? { id: frontMatter["id"] } : {}),
      slug: frontMatter["slug"],
      type: frontMatter["manuscriptType"]
    },
    revision: {
      ...(typeof frontMatter["revisionId"] === "string" ? { id: frontMatter["revisionId"] } : {}),
      version: frontMatter["version"],
      title: heading,
      summary: frontMatter["summary"],
      visibility: frontMatter["visibility"],
      payload: {
        title: heading,
        summary: frontMatter["summary"],
        visibility: frontMatter["visibility"],
        body: content,
        ...(metadata ? { metadata } : {})
      }
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
      ...(typeof relationship["id"] === "string" ? { id: relationship["id"] } : {}),
      relationType: relationship["relationType"],
      sourceEntity: {
        ...(typeof sourceEntity["id"] === "string" ? { id: sourceEntity["id"] } : {}),
        slug: sourceEntity["slug"]
      },
      targetEntity: {
        ...(typeof targetEntity["id"] === "string" ? { id: targetEntity["id"] } : {}),
        slug: targetEntity["slug"]
      }
    },
    revision: {
      ...(typeof revision["id"] === "string" ? { id: revision["id"] } : {}),
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
      ...(typeof release["id"] === "string" ? { id: release["id"] } : {}),
      slug: release["slug"],
      name: release["name"],
      status: release["status"]
    },
    composition: {
      entities: parseEntryArray(composition["entities"], (entry) => ({
        ...(typeof entry["entityId"] === "string" ? { entityId: entry["entityId"] } : {}),
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

export const markdownPortabilityParser = {
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

    if (rawManifest["format"] !== "markdown") {
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

    const entityScan = await scanFilesUnder(rootDir, "entities", ".md");

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
        entities.push(await validateEntityMarkdownFile(rootDir, filePath));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown parse error";
        errors.push({ file: filePath, code: "PAYLOAD_INVALID", message: `Invalid entity file: ${message}` });
      }
    }

    const [chapterScan, sceneScan] = await Promise.all([
      scanFilesUnder(rootDir, "chapters", ".md"),
      scanFilesUnder(rootDir, "scenes", ".md")
    ]);

    if (chapterScan.pathUnsafe) {
      return {
        success: false,
        errors: [
          {
            file: chapterScan.pathUnsafe,
            code: "PATH_UNSAFE",
            message: "Path traversal detected in chapter files"
          }
        ]
      };
    }

    if (sceneScan.pathUnsafe) {
      return {
        success: false,
        errors: [
          {
            file: sceneScan.pathUnsafe,
            code: "PATH_UNSAFE",
            message: "Path traversal detected in scene files"
          }
        ]
      };
    }

    for (const filePath of chapterScan.files) {
      try {
        manuscripts.push(await validateManuscriptMarkdownFile(rootDir, filePath, "CHAPTER"));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown parse error";
        errors.push({
          file: filePath,
          code: "PAYLOAD_INVALID",
          message: `Invalid manuscript file: ${message}`
        });
      }
    }

    for (const filePath of sceneScan.files) {
      try {
        manuscripts.push(await validateManuscriptMarkdownFile(rootDir, filePath, "SCENE"));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown parse error";
        errors.push({
          file: filePath,
          code: "PAYLOAD_INVALID",
          message: `Invalid manuscript file: ${message}`
        });
      }
    }

    const relationshipScan = await scanFilesUnder(rootDir, "relationships", ".json");

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

    const releaseScan = await scanFilesUnder(rootDir, "releases", ".json");

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

    const parsedPackage: ParsedImportPackage = {
      manifestPath: manifestRelPath,
      manifest,
      entities,
      manuscripts,
      relationships,
      releases
    };

    return {
      success: true,
      package: parsedPackage
    };
  }
};