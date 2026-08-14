import Honovel from "Honovel";

const app = Honovel.app;

// @ts-ignore //
const HOSTNAME = String(env("HOSTNAME", ""));

let serveObj:
  | (Deno.ServeTcpOptions & Deno.TlsCertifiedKeyPem)
  | Deno.ServeTcpOptions = {};

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

Deno.serve(serveObj, app.fetch);

import { dbCloser } from "Database";

Deno.addSignalListener("SIGINT", dbCloser);
