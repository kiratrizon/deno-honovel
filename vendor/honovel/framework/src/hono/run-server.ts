import Server from "./main.ts";

const app = Server.app;

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

serveObj.port = env("PORT", 80);

if (env("OTEL_DENO") === "true") {
  consoledeno.info("OpenTelemetry is enabled");
}

Deno.serve(serveObj, app.fetch);

try {
  // await json
  const filePath = basePath("storage/honovel/warmup.json"); // path to your JSON file

  // Read the file as a string
  const jsonString = await Deno.readTextFile(filePath);

  // Parse it into an object
  const warmups = JSON.parse(jsonString) || [];

  for (const warmup of warmups) {
    const test = await fetch(warmup);
    // consoledeno.info(`Warmup URL: ${warmup} - Status: ${test.status}`);
  }
} catch {
  //
}

import { dbCloser } from "Database";

Deno.addSignalListener("SIGINT", dbCloser);
