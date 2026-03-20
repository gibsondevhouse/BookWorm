import { writeFile } from "node:fs/promises";
import { pathToFileURL, URL } from "node:url";

import { config } from "dotenv";

import { portabilityImportService } from "../apps/api/src/services/portabilityImportService.js";
import { parseCliArgs } from "./parseCliArgs.js";

config({ path: new URL("../.env", import.meta.url).pathname });

const normalizeBooleanFlags = (argv: string[]): string[] =>
  argv.map((arg) => (arg === "--dry-run" ? "--dry-run=true" : arg));

const parseArgs = (
  argv: string[]
): {
  packageFormat: "directory" | "zip";
  format?: "json" | "markdown";
  input: string;
  actorEmail: string;
  dryRun: boolean;
  report?: string;
  conflictMode: "fail" | "create-revision";
} => {
  const values = parseCliArgs(normalizeBooleanFlags(argv));

  const format = values.get("format");
  const packageFormat = values.get("package-format") ?? "directory";
  const input = values.get("input");
  const actorEmail = values.get("actor-email");
  const dryRun = values.get("dry-run") === "true";
  const report = values.get("report");
  const conflict = values.get("conflict");

  if (packageFormat !== "directory" && packageFormat !== "zip") {
    throw new Error("--package-format must be directory or zip");
  }

  if (packageFormat === "directory" && format !== "json" && format !== "markdown") {
    throw new Error("--format must be json or markdown when --package-format=directory");
  }

  if (packageFormat === "zip" && format && format !== "json" && format !== "markdown") {
    throw new Error("--format must be json or markdown when provided");
  }

  if (!input) {
    throw new Error("--input is required");
  }

  if (!actorEmail) {
    throw new Error("--actor-email is required");
  }

  if (conflict && conflict !== "fail" && conflict !== "create-revision") {
    throw new Error("--conflict must be fail or create-revision");
  }

  return {
    packageFormat,
    ...(format === "json" || format === "markdown" ? { format } : {}),
    input,
    actorEmail,
    dryRun,
    ...(report ? { report } : {}),
    conflictMode: (conflict as "fail" | "create-revision" | undefined) ?? "fail"
  };
};

export const importPortability = async (argv: string[] = process.argv.slice(2)): Promise<void> => {
  const parsed = parseArgs(argv);

  const importReport =
    parsed.packageFormat === "zip"
      ? await portabilityImportService.runZipImport({
          inputPath: parsed.input,
          ...(parsed.format ? { format: parsed.format } : {}),
          actorEmail: parsed.actorEmail,
          dryRun: parsed.dryRun,
          conflictMode: parsed.conflictMode
        })
      : await portabilityImportService.runImport({
          inputPath: parsed.input,
          format: parsed.format ?? "json",
          actorEmail: parsed.actorEmail,
          dryRun: parsed.dryRun,
          conflictMode: parsed.conflictMode
        });

  const reportJson = JSON.stringify(importReport, null, 2);

  console.log(reportJson);

  if (parsed.report) {
    await writeFile(parsed.report, reportJson, "utf8");
    console.log(`Report written to ${parsed.report}`);
  }

  if (importReport.errors.length > 0) {
    process.exitCode = 1;
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  importPortability().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown import failure";

    console.error(message);
    process.exitCode = 1;
  });
}
