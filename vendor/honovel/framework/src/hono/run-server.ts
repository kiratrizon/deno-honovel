import Server from "./main.ts";

const app = Server.app;

const port = env("PORT", 80);
// @ts-ignore //
const HOSTNAME = String(env("HOSTNAME", ""));

let serveObj:
  | (Deno.ServeTcpOptions & Deno.TlsCertifiedKeyPem)
  | Deno.ServeTcpOptions = {
  port,
};

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

async function isPortAvailable(port: number): Promise<boolean> {
  try {
    const listener = Deno.listen({ port });
    listener.close();
    return true; // Port is available
  } catch (error) {
    if (error instanceof Deno.errors.AddrInUse) {
      return false; // Port is already in use
    }
    throw error; // Unexpected error
  }
}

if (!(await isPortAvailable(port))) {
  console.error(
    `Port ${port} is already in use. Please choose a different port.`
  );
  Deno.exit(1);
}
function buildAppUrl(
  hostname: string,
  port: number,
  hasCert: boolean,
  path: string = "/__warmup"
): string {
  const protocol = hasCert ? "https" : "http";
  const host = hostname || "localhost";

  const defaultPort = hasCert ? 443 : 80;
  const portPart = port === defaultPort ? "" : `:${port}`;

  return `${protocol}://${host}${portPart}${path}`;
}
const hasCert = !empty(key) && !empty(cert);

const baseWarmup = (path: string) => buildAppUrl(HOSTNAME, port, hasCert, path);

const warmups = ["/__warmup", "/api/__warmup"];

for (const path of warmups) {
  const url = baseWarmup(path);
  // console.log("🔥 Warming up:", url);
  await Server.app.fetch(new Request(url));
}

Deno.serve(serveObj, app.fetch);
