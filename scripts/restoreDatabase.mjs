import { spawn } from "node:child_process";
import { extname } from "node:path";
import { pathToFileURL } from "node:url";

const parseArgs = (argv) => {
  let input;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--input") {
      input = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith("--input=")) {
      input = arg.slice("--input=".length);
      continue;
    }
  }

  if (!input || input.trim().length === 0) {
    throw new Error("--input is required");
  }

  return { input: input.trim() };
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

const buildRestoreCommand = (input) => {
  const extension = extname(input).toLowerCase();
  const databaseUrl = process.env.DATABASE_URL;

  if (extension === ".sql") {
    const args = ["-f", input];

    if (databaseUrl) {
      args.push(databaseUrl);
    }

    return {
      command: "psql",
      args
    };
  }

  const args = ["--clean", "--if-exists", "--no-owner", "--no-privileges"];

  if (databaseUrl) {
    args.push("--dbname", databaseUrl);
  }

  args.push(input);

  return {
    command: "pg_restore",
    args
  };
};

export const restoreDatabase = async (argv = process.argv.slice(2)) => {
  const parsed = parseArgs(argv);
  const command = buildRestoreCommand(parsed.input);

  await runCommand(command.command, command.args, process.env);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  restoreDatabase().catch((error) => {
    const message = error instanceof Error ? error.message : "Unknown restore failure";

    console.error(message);
    process.exitCode = 1;
  });
}
