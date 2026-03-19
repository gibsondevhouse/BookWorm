import { type Server } from "node:http";

import { createApp } from "./app/createApp.js";
import { env } from "./config/env.js";
import { searchIndexService } from "./services/searchIndexService.js";

const maxPortProbeCount = 20;

const isErrorWithCode = (error: unknown): error is NodeJS.ErrnoException => error instanceof Error && "code" in error;

const logStartupPort = (input: { preferredPort: number; port: number }): void => {
  console.log(
    `[port-fallback] service=book-worm-api preferred=${input.preferredPort} selected=${input.port} fallbackUsed=${String(
      input.port !== input.preferredPort
    )}`
  );
};

const listenOnPort = (port: number): Promise<Server> => {
  const app = createApp();

  return new Promise<Server>((resolve, reject) => {
    const server = app.listen(port);

    server.once("listening", () => {
      resolve(server);
    });

    server.once("error", (error) => {
      reject(error);
    });
  });
};

export const startServer = async (input?: { preferredPort?: number }): Promise<{ server: Server; port: number }> => {
  const preferredPort = input?.preferredPort ?? env.port;

  for (let port = preferredPort; port < preferredPort + maxPortProbeCount; port += 1) {
    try {
      const server = await listenOnPort(port);

      logStartupPort({
        preferredPort,
        port
      });

      searchIndexService.rebuildIndex().catch((error) => {
        console.error("[search] initial rebuild failed:", error);
      });

      return {
        server,
        port
      };
    } catch (error) {
      if (isErrorWithCode(error) && error.code === "EADDRINUSE") {
        continue;
      }

      throw error;
    }
  }

  throw new Error(`Unable to bind API server after probing ports ${preferredPort}-${preferredPort + maxPortProbeCount - 1}`);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
