import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

const testDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const runDevWithPortSummaryScriptPath = path.resolve(testDirectoryPath, "..", "scripts", "runDevWithPortSummary.mjs");

const createPnpmStub = async (): Promise<string> => {
  const stubDirectoryPath = await mkdtemp(path.join(os.tmpdir(), "book-worm-dev-launcher-"));
  const stubPath = path.join(stubDirectoryPath, "pnpm");

  const stubSource = `#!/usr/bin/env node
const args = process.argv.slice(2);
const filterIndex = args.indexOf("--filter");

if (filterIndex === -1 || args[filterIndex + 1] === undefined || args.at(-1) !== "dev") {
  console.error("Unexpected pnpm arguments:", args.join(" "));
  process.exit(1);
}

const filterName = args[filterIndex + 1];

if (filterName === "@book-worm/api") {
  console.log("[port-fallback] service=book-worm-api preferred=4000 selected=4001 fallbackUsed=true");
  setTimeout(() => process.exit(0), 120);
  return;
}

if (filterName === "@book-worm/web") {
  setTimeout(() => {
    console.error("[port-fallback] command=next preferred=3000 selected=3002 fallbackUsed=true");
  }, 20);

  setTimeout(() => process.exit(0), 80);
  return;
}

console.error("Unexpected filter:", filterName);
process.exit(1);
`;

  await writeFile(stubPath, stubSource, "utf8");
  await chmod(stubPath, 0o755);

  return stubDirectoryPath;
};

test("root dev launcher prints a combined summary after both child launchers report selected ports", async () => {
  const stubDirectoryPath = await createPnpmStub();

  try {
    const child = spawn(process.execPath, [runDevWithPortSummaryScriptPath], {
      env: {
        ...process.env,
        PATH: `${stubDirectoryPath}${path.delimiter}${process.env.PATH ?? ""}`
      }
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    const [exitCode, signal] = (await Promise.race([
      once(child, "exit"),
      delay(5_000).then(() => {
        child.kill("SIGKILL");
        throw new Error("Timed out waiting for root dev launcher to exit");
      })
    ])) as [number | null, NodeJS.Signals | null];

    assert.equal(signal, null);
    assert.equal(exitCode, 0, stderr);
    assert.match(stdout, /\[port-fallback\] service=book-worm-api preferred=4000 selected=4001 fallbackUsed=true/);
    assert.match(stderr, /\[port-fallback\] command=next preferred=3000 selected=3002 fallbackUsed=true/);

    const summaryLines = stdout.match(/^\[dev-summary\].*$/gm) ?? [];

    assert.equal(summaryLines.length, 1, stdout);
    assert.equal(
      summaryLines[0],
      "[dev-summary] api=http://localhost:4001 preferred=4000 web=http://localhost:3002 preferred=3000"
    );

    const apiFallbackIndex = stdout.indexOf("[port-fallback] service=book-worm-api");
    const summaryIndex = stdout.indexOf("[dev-summary]");
    const webFallbackIndex = stderr.indexOf("[port-fallback] command=next");

    assert.notEqual(apiFallbackIndex, -1);
    assert.notEqual(webFallbackIndex, -1);
    assert.ok(summaryIndex > apiFallbackIndex, stdout);
  } finally {
    await rm(stubDirectoryPath, {
      force: true,
      recursive: true
    });
  }
});