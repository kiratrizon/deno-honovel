import Server from "./main.ts";

const app = Server.app;

const PORT = Number(env("PORT", 2000));

Deno.serve(
  {
    port: Number(PORT),
  },
  app.fetch
);
