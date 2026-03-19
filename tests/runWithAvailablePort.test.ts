import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const testDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const runWithAvailablePortScriptPath = path.resolve(testDirectoryPath, "..", "scripts", "runWithAvailablePort.mjs");

test("generic port wrapper reports the selected fallback port and forwards PORT to the child command", async () => {
  const occupiedServer = createServer((_request, response) => {
    response.statusCode = 204;
    response.end();
  });

  occupiedServer.listen(0);
  await once(occupiedServer, "listening");

  const address = occupiedServer.address();

  if (!address || typeof address === "string") {
    throw new Error("Unable to determine occupied port");
  }

  const child = spawn(process.execPath, [
    runWithAvailablePortScriptPath,
    "--preferred-port",
    String(address.port),
    "--",
    process.execPath,
    "-e",
    "console.log(`child-port=${process.env.PORT ?? 'missing'}`)"
  ]);

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += String(chunk);
  });

  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });

  const [exitCode] = (await once(child, "exit")) as [number | null, NodeJS.Signals | null];

  await new Promise<void>((resolve, reject) => {
    occupiedServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  assert.equal(exitCode, 0, stderr);
  assert.match(stdout, /\[port-fallback\] command=.* preferred=\d+ selected=\d+ fallbackUsed=true/);
  assert.match(stdout, /child-port=\d+/);

  const selectedPortMatch = stdout.match(/selected=(\d+)/);
  const childPortMatch = stdout.match(/child-port=(\d+)/);

  assert.ok(selectedPortMatch?.[1]);
  assert.ok(childPortMatch?.[1]);
  assert.equal(Number(selectedPortMatch[1]), Number(childPortMatch[1]));
  assert.notEqual(Number(selectedPortMatch[1]), address.port);
});