import { spawn } from "node:child_process";

const parsePortFallbackLine = (line) => {
  const match = line.match(/\[port-fallback\]\s+(.*)$/);

  if (!match?.[1]) {
    return null;
  }

  const fields = Object.fromEntries(
    match[1]
      .split(/\s+/)
      .map((part) => part.split("="))
      .filter((pair) => pair.length === 2)
  );

  const selectedPort = Number(fields.selected);
  const preferredPort = Number(fields.preferred);

  if (!Number.isInteger(selectedPort) || !Number.isInteger(preferredPort)) {
    return null;
  }

  if (fields.service === "book-worm-api") {
    return {
      target: "api",
      preferredPort,
      selectedPort
    };
  }

  if (fields.command === "next") {
    return {
      target: "web",
      preferredPort,
      selectedPort
    };
  }

  return null;
};

const children = [];
const selectedPorts = {
  api: null,
  web: null
};

let didPrintSummary = false;
let isShuttingDown = false;

const printCombinedSummary = () => {
  if (didPrintSummary || selectedPorts.api === null || selectedPorts.web === null) {
    return;
  }

  didPrintSummary = true;

  console.log(
    `[dev-summary] api=http://localhost:${selectedPorts.api.selectedPort} preferred=${selectedPorts.api.preferredPort} web=http://localhost:${selectedPorts.web.selectedPort} preferred=${selectedPorts.web.preferredPort}`
  );
};

const pipeStream = (stream, writer) => {
  let buffered = "";

  stream.on("data", (chunk) => {
    const text = String(chunk);
    writer.write(text);
    buffered += text;

    const lines = buffered.split(/\r?\n/);
    buffered = lines.pop() ?? "";

    for (const line of lines) {
      const parsed = parsePortFallbackLine(line);

      if (!parsed) {
        continue;
      }

      selectedPorts[parsed.target] = parsed;
      printCombinedSummary();
    }
  });

  stream.on("end", () => {
    if (buffered.length === 0) {
      return;
    }

    const parsed = parsePortFallbackLine(buffered);

    if (parsed) {
      selectedPorts[parsed.target] = parsed;
      printCombinedSummary();
    }
  });
};

const stopChildren = (signal = "SIGTERM") => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
};

const attachChildLifecycle = (child) => {
  child.once("error", (error) => {
    console.error(error instanceof Error ? error.message : error);
    stopChildren();
    process.exitCode = 1;
  });

  child.once("exit", (code, signal) => {
    if (signal && !isShuttingDown) {
      console.error(`[dev-summary] child terminated by signal ${signal}`);
      stopChildren();
      process.exitCode = 1;
      return;
    }

    if (!isShuttingDown && code && code !== 0) {
      stopChildren();
      process.exitCode = code;
      return;
    }

    if (!isShuttingDown) {
      stopChildren();
      process.exitCode = code ?? 0;
    }
  });
};

const spawnDevChild = (filterName) => {
  const child = spawn("pnpm", ["--filter", filterName, "dev"], {
    stdio: ["inherit", "pipe", "pipe"],
    env: process.env
  });

  children.push(child);
  pipeStream(child.stdout, process.stdout);
  pipeStream(child.stderr, process.stderr);
  attachChildLifecycle(child);
};

process.once("SIGINT", () => {
  stopChildren("SIGINT");
});

process.once("SIGTERM", () => {
  stopChildren("SIGTERM");
});

spawnDevChild("@book-worm/api");
spawnDevChild("@book-worm/web");