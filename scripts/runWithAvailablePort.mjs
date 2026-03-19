import net from "node:net";
import { spawn } from "node:child_process";

const maxPortProbeCount = 20;

const parseArgs = (argv) => {
  const separatorIndex = argv.indexOf("--");

  if (separatorIndex === -1) {
    throw new Error("Usage: node runWithAvailablePort.mjs --preferred-port <port> -- <command> [args...]");
  }

  const optionArgs = argv.slice(0, separatorIndex);
  const commandArgs = argv.slice(separatorIndex + 1);
  const preferredPortIndex = optionArgs.indexOf("--preferred-port");

  if (preferredPortIndex === -1 || optionArgs[preferredPortIndex + 1] === undefined) {
    throw new Error("Missing required --preferred-port option");
  }

  if (commandArgs.length === 0) {
    throw new Error("A command is required after --");
  }

  const preferredPort = Number(optionArgs[preferredPortIndex + 1]);

  if (!Number.isInteger(preferredPort) || preferredPort <= 0) {
    throw new Error("--preferred-port must be a positive integer");
  }

  return {
    preferredPort,
    command: commandArgs[0],
    args: commandArgs.slice(1)
  };
};

const canListenOnPort = async (port) =>
  new Promise((resolve, reject) => {
    const probe = net.createServer();

    probe.once("error", (error) => {
      probe.close();

      if (error && typeof error === "object" && "code" in error && error.code === "EADDRINUSE") {
        resolve(false);
        return;
      }

      reject(error);
    });

    probe.once("listening", () => {
      probe.close(() => resolve(true));
    });

    probe.listen(port);
  });

const findAvailablePort = async (preferredPort) => {
  for (let port = preferredPort; port < preferredPort + maxPortProbeCount; port += 1) {
    if (await canListenOnPort(port)) {
      return port;
    }
  }

  throw new Error(`Unable to find an available port in range ${preferredPort}-${preferredPort + maxPortProbeCount - 1}`);
};

const logPortSelection = ({ command, preferredPort, port }) => {
  console.log(
    `[port-fallback] command=${command} preferred=${preferredPort} selected=${port} fallbackUsed=${String(port !== preferredPort)}`
  );
};

const main = async () => {
  const { preferredPort, command, args } = parseArgs(process.argv.slice(2));
  const port = await findAvailablePort(preferredPort);
  const commandArgs = args.map((argument) => argument.replaceAll("{PORT}", String(port)));

  logPortSelection({
    command,
    preferredPort,
    port
  });

  const child = spawn(command, commandArgs, {
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: String(port)
    }
  });

  child.once("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });

  child.once("error", (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});