import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const parseArgs = (argv) => {
  let output;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--output") {
      output = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith("--output=")) {
      output = arg.slice("--output=".length);
      continue;
    }
  }

  if (!output || output.trim().length === 0) {
    throw new Error("--output is required");
  }

  return { output: output.trim() };
};

const runCommand = (command, args, env) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} failed with exit code ${String(code)}`));
    });
  });

export const backupDatabase = async (argv = process.argv.slice(2)) => {
  const parsed = parseArgs(argv);
  const args = ["--format=custom", "--file", parsed.output];

  if (process.env.DATABASE_URL) {
    args.push(process.env.DATABASE_URL);
  }

  await runCommand("pg_dump", args, process.env);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  backupDatabase().catch((error) => {
    const message = error instanceof Error ? error.message : "Unknown backup failure";

    console.error(message);
    process.exitCode = 1;
  });
}
