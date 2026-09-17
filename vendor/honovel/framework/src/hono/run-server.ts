import Honovel from "Honovel";

const app = Honovel.app;

// @ts-ignore //
const HOSTNAME = String(env("HOSTNAME", ""));

let serveObj:
  (Deno.ServeTcpOptions & Deno.TlsCertifiedKeyPem) | Deno.ServeTcpOptions = {};

if (!empty(HOSTNAME)) {
  serveObj.hostname = HOSTNAME;
}

const key = getFileContents(storagePath("ssl/key.pem"));
const cert = getFileContents(storagePath("ssl/cert.pem"));

if (!empty(key) && !empty(cert)) {
  serveObj = {
    ...serveObj,
    key,
    cert,
    keyFormat: "pem",
  };
} else if (!empty(key) || !empty(cert)) {
  console.warn("SSL key or certificate not found, running without SSL.");
}

serveObj.port = env("APP_PORT", !empty(key) && !empty(cert) ? 443 : 80);

if (env("OTEL_DENO") === "true") {
  console.info("OpenTelemetry is enabled");
}

const isAddrInUse = (error: unknown): boolean =>
  error instanceof Deno.errors.AddrInUse ||
  (error instanceof Error && error.name === "AddrInUse");

// kill port
// more os needs to be implemented
const killPortOwner = async (port: number): Promise<void> => {
  try {
    const pids = new Set<string>();
    if (Deno.build.os === "windows") {
      const { stdout } = await new Deno.Command("netstat", {
        args: ["-ano"],
        stdout: "piped",
        stderr: "null",
      }).output();
      for (const line of new TextDecoder().decode(stdout).split("\n")) {
        if (!line.includes(`:${port} `) || !/LISTENING/i.test(line)) continue;
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (/^\d+$/.test(pid)) pids.add(pid);
      }
      for (const pid of pids) {
        if (pid === String(Deno.pid)) continue;
        await new Deno.Command("taskkill", {
          args: ["/PID", pid, "/F"],
          stdout: "null",
          stderr: "null",
        }).output();
      }
    } else {
      // macOS ("darwin"), Linux, and other unix-likes
      const { stdout } = await new Deno.Command("lsof", {
        args: ["-ti", `tcp:${port}`],
        stdout: "piped",
        stderr: "null",
      }).output();
      for (const line of new TextDecoder().decode(stdout).split("\n")) {
        const pid = line.trim();
        if (/^\d+$/.test(pid)) pids.add(pid);
      }
      for (const pid of pids) {
        if (pid === String(Deno.pid)) continue;
        await new Deno.Command("kill", {
          args: ["-9", pid],
          stdout: "null",
          stderr: "null",
        }).output();
      }
    }
    if (pids.size > 0) {
      console.warn(
        `Freed port ${port} (killed PID(s): ${[...pids].join(", ")}).`,
      );
    }
  } catch (error) {
    console.warn(`Could not free port ${port} automatically:`, error);
  }
};

let retriedAfterKill = false;

const handleStartupFailure = async (error: unknown) => {
  if (!retriedAfterKill && isAddrInUse(error)) {
    retriedAfterKill = true;
    const port = serveObj.port as number;
    console.warn(`Port ${port} is already in use - attempting to free it...`);
    await killPortOwner(port);
    // stopper for 300ms to release the socket
    await new Promise((resolve) => setTimeout(resolve, 300));
    try {
      Deno.serve(serveObj, app.fetch);
    } catch (retryError) {
      console.error(
        "Fatal: server failed to start even after freeing the port.",
        retryError,
      );
      Deno.exit(1);
    }
    return;
  }
  console.error("Fatal: server failed to start.", error);
  Deno.exit(1);
};

globalThis.addEventListener("unhandledrejection", (event) => {
  event.preventDefault();
  handleStartupFailure(event.reason);
});

try {
  Deno.serve(serveObj, app.fetch);
} catch (error) {
  handleStartupFailure(error);
}

// import { dbCloser } from "Database";

// Deno.addSignalListener("SIGINT", dbCloser);
