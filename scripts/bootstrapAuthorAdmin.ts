import { pathToFileURL } from "node:url";

import { config } from "dotenv";

import { bootstrapAuthorAdminService } from "../apps/api/src/services/bootstrapAuthorAdminService.js";
import { parseCliArgs } from "./parseCliArgs.js";

config({ path: new URL("../.env", import.meta.url).pathname });

const parseArgs = (argv: string[]): {
  email: string;
  displayName: string;
  password: string;
} => {
  const values = parseCliArgs(argv);

  const email = values.get("email");
  const displayName = values.get("display-name");
  const password = values.get("password");

  if (!email) {
    throw new Error("--email is required");
  }

  if (!displayName) {
    throw new Error("--display-name is required");
  }

  if (!password) {
    throw new Error("--password is required");
  }

  return {
    email,
    displayName,
    password
  };
};

export const bootstrapAuthorAdmin = async (argv: string[] = process.argv.slice(2)): Promise<void> => {
  const parsed = parseArgs(argv);
  const user = await bootstrapAuthorAdminService.createAuthorAdmin(parsed);

  console.log(`Created AUTHOR_ADMIN user ${user.email}`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  bootstrapAuthorAdmin().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown bootstrap failure";

    console.error(message);
    process.exitCode = 1;
  });
}