import Server from "./main.ts";

const app = Server.app;

const PORT = Number(env("PORT", 2000));
// @ts-ignore //
const HOSTNAME = String(env("HOSTNAME", "0.0.0.0"));

Deno.serve(
  {
    hostname: HOSTNAME,
    port: Number(PORT),
  },
  app.fetch
);
console.log(
  `Server is running at http://localhost:${PORT} in ${env("APP_ENV")} mode.`
);
