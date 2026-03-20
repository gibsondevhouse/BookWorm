import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { config } from "dotenv";

import { portabilityExportService } from "../apps/api/src/services/portabilityExportService.js";
import { parseCliArgs } from "./parseCliArgs.js";

config({ path: new URL("../.env", import.meta.url).pathname });

const ensureSafeOutputDirectory = async (outputDirectory: string): Promise<void> => {
  let directoryStats: Awaited<ReturnType<typeof stat>> | null = null;

  try {
    directoryStats = await stat(outputDirectory);
  } catch (error: unknown) {
    const code = error && typeof error === "object" && "code" in error ? error.code : null;

    if (code !== "ENOENT") {
      throw error;
    }
  }

  if (!directoryStats) {
    await mkdir(outputDirectory, { recursive: true });
    return;
  }

  if (!directoryStats.isDirectory()) {
    throw new Error("--output must point to a directory");
  }

  const existingEntries = await readdir(outputDirectory);

  if (existingEntries.length > 0) {
    throw new Error("--output must point to a missing or empty directory");
  }
};

const parseArgs = (argv: string[]): {
  scope: "current" | "release";
  format: "json" | "markdown";
  packageFormat: "directory" | "zip";
  output: string;
  releaseSlug?: string;
} => {
  const values = parseCliArgs(argv);

  const scope = values.get("scope");
  const format = values.get("format");
  const packageFormat = values.get("package-format") ?? "directory";
  const output = values.get("output");
  const releaseSlug = values.get("release-slug");

  if (scope !== "current" && scope !== "release") {
    throw new Error("--scope must be current or release");
  }

  if (format !== "json" && format !== "markdown") {
    throw new Error("--format must be json or markdown");
  }

  if (packageFormat !== "directory" && packageFormat !== "zip") {
    throw new Error("--package-format must be directory or zip");
  }

  if (!output) {
    throw new Error("--output is required");
  }

  if (packageFormat === "zip" && !output.endsWith(".zip")) {
    throw new Error("--output must end with .zip when --package-format=zip");
  }

  if (scope === "release" && !releaseSlug) {
    throw new Error("--release-slug is required when --scope=release");
  }

  return {
    scope,
    format,
    packageFormat,
    output,
    ...(releaseSlug ? { releaseSlug } : {})
  };
};

export const exportPortability = async (argv: string[] = process.argv.slice(2)): Promise<void> => {
  const parsed = parseArgs(argv);

  if (parsed.packageFormat === "zip") {
    const outputZipPath = resolve(parsed.output);

    try {
      await stat(outputZipPath);
      throw new Error("--output must point to a missing .zip file");
    } catch (error: unknown) {
      const code = error && typeof error === "object" && "code" in error ? error.code : null;

      if (code !== "ENOENT") {
        throw error;
      }
    }

    const exportPackage = await portabilityExportService.prepareZipExport(parsed);

    await mkdir(dirname(outputZipPath), { recursive: true });
    await writeFile(outputZipPath, exportPackage.archive);

    console.log(
      `Exported zip package to ${outputZipPath} for ${exportPackage.manifest.scope} scope (${exportPackage.manifest.format})`
    );
    return;
  }

  const exportPackage = await portabilityExportService.prepareExport(parsed);
  const outputDirectory = resolve(parsed.output);

  await ensureSafeOutputDirectory(outputDirectory);

  for (const file of exportPackage.files) {
    const targetPath = resolve(outputDirectory, file.path);

    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, file.content, "utf8");
  }

  console.log(
    `Exported ${exportPackage.files.length} files to ${outputDirectory} for ${exportPackage.manifest.scope} scope`
  );
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  exportPortability().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown export failure";

    console.error(message);
    process.exitCode = 1;
  });
}