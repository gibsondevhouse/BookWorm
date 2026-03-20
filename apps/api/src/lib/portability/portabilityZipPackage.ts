import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";

import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

const ZIP_PACKAGE_SCHEMA_VERSION = 1;
const ZIP_PACKAGE_CONTAINER = "bookworm-portability-zip";
const ZIP_PACKAGE_MANIFEST_PATH = "package-manifest.json";
const ZIP_PACKAGE_PAYLOAD_ROOT = "payload";
const ZIP_PACKAGE_PAYLOAD_MANIFEST_PATH = `${ZIP_PACKAGE_PAYLOAD_ROOT}/manifests/export-manifest.json`;

const MAX_ZIP_ENTRIES = 4_000;
const MAX_SINGLE_ENTRY_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_EXTRACTED_BYTES = 100 * 1024 * 1024;

const fixedZipMtime = new Date("2000-01-01T00:00:00.000Z");

type ExportManifestCounts = {
  entities: number;
  manuscripts: number;
  relationships: number;
  releases: number;
  reviewRequests?: number;
  approvalChains?: number;
  approvalSteps?: number;
  approvalStepEvents?: number;
  notificationEvents?: number;
  notificationPreferences?: number;
};

export type ZipPackageManifest = {
  schemaVersion: 1;
  container: "bookworm-portability-zip";
  payload: {
    format: "json" | "markdown";
    scope: "current" | "release";
    exportedAt: string;
    rootPath: "payload";
    manifestPath: "payload/manifests/export-manifest.json";
    counts: ExportManifestCounts;
  };
};

type BuildZipPackageInput = {
  format: "json" | "markdown";
  scope: "current" | "release";
  exportedAt: Date;
  manifestCounts: ExportManifestCounts;
  files: Array<{
    path: string;
    content: string;
  }>;
};

type BuildZipPackageResult = {
  packageManifest: ZipPackageManifest;
  archive: Uint8Array;
};

type ZipParseError = {
  code: string;
  message: string;
  file?: string;
};

type ParseZipToDirectorySuccess = {
  success: true;
  inputPath: string;
  format: "json" | "markdown";
  packageManifest: ZipPackageManifest;
  cleanup: () => Promise<void>;
};

type ParseZipToDirectoryFailure = {
  success: false;
  error: ZipParseError;
};

const isSafeArchivePath = (entryPath: string): boolean => {
  if (!entryPath || entryPath.includes("\\") || entryPath.includes("\u0000")) {
    return false;
  }

  if (entryPath.startsWith("/") || /^[a-zA-Z]:/.test(entryPath)) {
    return false;
  }

  const segments = entryPath.split("/");

  if (segments.some((segment) => segment === "." || segment === ".." || segment.length === 0)) {
    return false;
  }

  return true;
};

const isSafeWritePath = (rootDir: string, relativePath: string): boolean => {
  const resolved = resolve(join(rootDir, relativePath));
  const rel = relative(rootDir, resolved);

  return rel.length > 0 && !rel.startsWith("..");
};

const parsePackageManifest = (raw: unknown): ZipPackageManifest | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const record = raw as Record<string, unknown>;

  if (
    record["schemaVersion"] !== ZIP_PACKAGE_SCHEMA_VERSION ||
    record["container"] !== ZIP_PACKAGE_CONTAINER ||
    !record["payload"] ||
    typeof record["payload"] !== "object" ||
    Array.isArray(record["payload"])
  ) {
    return null;
  }

  const payload = record["payload"] as Record<string, unknown>;

  if (
    (payload["format"] !== "json" && payload["format"] !== "markdown") ||
    (payload["scope"] !== "current" && payload["scope"] !== "release") ||
    typeof payload["exportedAt"] !== "string" ||
    payload["rootPath"] !== ZIP_PACKAGE_PAYLOAD_ROOT ||
    payload["manifestPath"] !== ZIP_PACKAGE_PAYLOAD_MANIFEST_PATH ||
    !payload["counts"] ||
    typeof payload["counts"] !== "object" ||
    Array.isArray(payload["counts"])
  ) {
    return null;
  }

  const counts = payload["counts"] as Record<string, unknown>;

  const normalizedCounts: ExportManifestCounts = {
    entities: typeof counts["entities"] === "number" ? counts["entities"] : 0,
    manuscripts: typeof counts["manuscripts"] === "number" ? counts["manuscripts"] : 0,
    relationships: typeof counts["relationships"] === "number" ? counts["relationships"] : 0,
    releases: typeof counts["releases"] === "number" ? counts["releases"] : 0,
    ...(typeof counts["reviewRequests"] === "number" ? { reviewRequests: counts["reviewRequests"] } : {}),
    ...(typeof counts["approvalChains"] === "number" ? { approvalChains: counts["approvalChains"] } : {}),
    ...(typeof counts["approvalSteps"] === "number" ? { approvalSteps: counts["approvalSteps"] } : {}),
    ...(typeof counts["approvalStepEvents"] === "number"
      ? { approvalStepEvents: counts["approvalStepEvents"] }
      : {}),
    ...(typeof counts["notificationEvents"] === "number"
      ? { notificationEvents: counts["notificationEvents"] }
      : {}),
    ...(typeof counts["notificationPreferences"] === "number"
      ? { notificationPreferences: counts["notificationPreferences"] }
      : {})
  };

  return {
    schemaVersion: ZIP_PACKAGE_SCHEMA_VERSION,
    container: ZIP_PACKAGE_CONTAINER,
    payload: {
      format: payload["format"] as "json" | "markdown",
      scope: payload["scope"] as "current" | "release",
      exportedAt: payload["exportedAt"],
      rootPath: ZIP_PACKAGE_PAYLOAD_ROOT,
      manifestPath: ZIP_PACKAGE_PAYLOAD_MANIFEST_PATH,
      counts: normalizedCounts
    }
  };
};

export const portabilityZipPackage = {
  buildArchive(input: BuildZipPackageInput): BuildZipPackageResult {
    const packageManifest: ZipPackageManifest = {
      schemaVersion: ZIP_PACKAGE_SCHEMA_VERSION,
      container: ZIP_PACKAGE_CONTAINER,
      payload: {
        format: input.format,
        scope: input.scope,
        exportedAt: input.exportedAt.toISOString(),
        rootPath: ZIP_PACKAGE_PAYLOAD_ROOT,
        manifestPath: ZIP_PACKAGE_PAYLOAD_MANIFEST_PATH,
        counts: input.manifestCounts
      }
    };

    const entries = [
      {
        path: ZIP_PACKAGE_MANIFEST_PATH,
        content: `${JSON.stringify(packageManifest, null, 2)}\n`
      },
      ...input.files.map((file) => ({
        path: `${ZIP_PACKAGE_PAYLOAD_ROOT}/${file.path}`,
        content: file.content
      }))
    ].sort((left, right) => left.path.localeCompare(right.path));

    const archiveInput: Record<string, Uint8Array> = {};

    for (const entry of entries) {
      archiveInput[entry.path] = strToU8(entry.content);
    }

    const archive = zipSync(archiveInput, { level: 9, mtime: fixedZipMtime });

    return {
      packageManifest,
      archive
    };
  },

  async parseArchiveToDirectory(
    inputPath: string
  ): Promise<ParseZipToDirectorySuccess | ParseZipToDirectoryFailure> {
    let archiveBytes: Uint8Array;

    try {
      archiveBytes = await readFile(inputPath);
    } catch {
      return {
        success: false,
        error: {
          code: "PAYLOAD_INVALID",
          file: inputPath,
          message: "Zip package path does not exist or cannot be read"
        }
      };
    }

    let archiveEntries: Record<string, Uint8Array>;

    try {
      archiveEntries = unzipSync(archiveBytes);
    } catch {
      return {
        success: false,
        error: {
          code: "ARCHIVE_INVALID",
          file: inputPath,
          message: "Zip package is malformed or not a valid zip archive"
        }
      };
    }

    const entryNames = Object.keys(archiveEntries).sort((left, right) => left.localeCompare(right));

    if (entryNames.length === 0) {
      return {
        success: false,
        error: {
          code: "ARCHIVE_INVALID",
          file: inputPath,
          message: "Zip package is empty"
        }
      };
    }

    if (entryNames.length > MAX_ZIP_ENTRIES) {
      return {
        success: false,
        error: {
          code: "ARCHIVE_TOO_LARGE",
          file: inputPath,
          message: `Zip package has too many entries (max ${String(MAX_ZIP_ENTRIES)})`
        }
      };
    }

    let totalBytes = 0;

    for (const entryName of entryNames) {
      if (!isSafeArchivePath(entryName)) {
        return {
          success: false,
          error: {
            code: "PATH_UNSAFE",
            file: entryName,
            message: "Zip entry path is unsafe"
          }
        };
      }

      const entryBytes = archiveEntries[entryName];

      if (!entryBytes) {
        return {
          success: false,
          error: {
            code: "ARCHIVE_INVALID",
            file: entryName,
            message: "Zip entry could not be read"
          }
        };
      }

      const entrySize = entryBytes.byteLength;

      if (entrySize > MAX_SINGLE_ENTRY_BYTES) {
        return {
          success: false,
          error: {
            code: "ARCHIVE_TOO_LARGE",
            file: entryName,
            message: `Zip entry exceeds max size of ${String(MAX_SINGLE_ENTRY_BYTES)} bytes`
          }
        };
      }

      totalBytes += entrySize;

      if (totalBytes > MAX_TOTAL_EXTRACTED_BYTES) {
        return {
          success: false,
          error: {
            code: "ARCHIVE_TOO_LARGE",
            file: inputPath,
            message: `Zip package exceeds max extracted size of ${String(MAX_TOTAL_EXTRACTED_BYTES)} bytes`
          }
        };
      }
    }

    const packageManifestBytes = archiveEntries[ZIP_PACKAGE_MANIFEST_PATH];

    if (!packageManifestBytes) {
      return {
        success: false,
        error: {
          code: "MANIFEST_INVALID",
          file: ZIP_PACKAGE_MANIFEST_PATH,
          message: "Zip package manifest is missing"
        }
      };
    }

    let rawPackageManifest: unknown;

    try {
      rawPackageManifest = JSON.parse(strFromU8(packageManifestBytes));
    } catch {
      return {
        success: false,
        error: {
          code: "MANIFEST_INVALID",
          file: ZIP_PACKAGE_MANIFEST_PATH,
          message: "Zip package manifest contains invalid JSON"
        }
      };
    }

    const packageManifest = parsePackageManifest(rawPackageManifest);

    if (!packageManifest) {
      return {
        success: false,
        error: {
          code: "MANIFEST_INVALID",
          file: ZIP_PACKAGE_MANIFEST_PATH,
          message:
            "Zip package manifest is invalid (requires schemaVersion=1, container, payload format/scope/root/manifest path)"
        }
      };
    }

    const payloadEntries = entryNames.filter((entryName) => entryName !== ZIP_PACKAGE_MANIFEST_PATH);

    if (payloadEntries.some((entryName) => !entryName.startsWith(`${ZIP_PACKAGE_PAYLOAD_ROOT}/`))) {
      return {
        success: false,
        error: {
          code: "PACKAGE_LAYOUT_INVALID",
          file: inputPath,
          message: "Zip package layout is invalid; all payload files must be under payload/"
        }
      };
    }

    if (!archiveEntries[ZIP_PACKAGE_PAYLOAD_MANIFEST_PATH]) {
      return {
        success: false,
        error: {
          code: "MANIFEST_INVALID",
          file: ZIP_PACKAGE_PAYLOAD_MANIFEST_PATH,
          message: "Zip payload manifest is missing"
        }
      };
    }

    const extractionRoot = await mkdtemp(join(tmpdir(), "bookworm-portability-zip-"));

    try {
      for (const entryName of payloadEntries) {
        const entryBytes = archiveEntries[entryName];

        if (!entryBytes) {
          return {
            success: false,
            error: {
              code: "ARCHIVE_INVALID",
              file: entryName,
              message: "Zip payload entry could not be read"
            }
          };
        }

        const relativePayloadPath = entryName.slice(`${ZIP_PACKAGE_PAYLOAD_ROOT}/`.length);

        if (!isSafeArchivePath(relativePayloadPath) || !isSafeWritePath(extractionRoot, relativePayloadPath)) {
          return {
            success: false,
            error: {
              code: "PATH_UNSAFE",
              file: entryName,
              message: "Zip payload path is unsafe"
            }
          };
        }

        const outputPath = join(extractionRoot, relativePayloadPath);

        await mkdir(dirname(outputPath), { recursive: true });

        await writeFile(outputPath, entryBytes);
      }

      return {
        success: true,
        inputPath: extractionRoot,
        format: packageManifest.payload.format,
        packageManifest,
        cleanup: async () => {
          await rm(extractionRoot, { recursive: true, force: true });
        }
      };
    } catch (error) {
      await rm(extractionRoot, { recursive: true, force: true });

      return {
        success: false,
        error: {
          code: "PAYLOAD_INVALID",
          message: error instanceof Error ? error.message : "Failed to extract zip payload"
        }
      };
    }
  }
};
