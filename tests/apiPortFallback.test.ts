import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";

import { getRootStatus } from "../apps/api/src/lib/rootStatus.js";
import { startServer } from "../apps/api/src/startServer.js";

test("api startup falls back to the next available port when the preferred port is occupied", async () => {
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

  const startedServer = await startServer({ preferredPort: address.port });
  const expectedRootStatus = await getRootStatus();

  try {
    assert.notEqual(startedServer.port, address.port);

    const response = await fetch(`http://127.0.0.1:${startedServer.port}/`);
    assert.equal(response.status, 200);

    const payload = (await response.json()) as Awaited<ReturnType<typeof getRootStatus>>;
    assert.equal(payload.name, "book-worm-api");
    assert.deepEqual(payload, expectedRootStatus);
  } finally {
    await new Promise<void>((resolve, reject) => {
      startedServer.server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    await new Promise<void>((resolve, reject) => {
      occupiedServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
});