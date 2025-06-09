import Server from "./main.ts";

const app = Server.app;

const PORT = Number(env("PORT", 2000));

Deno.env.set("APP_URL", `http://localhost:${PORT}`);
Deno.serve(
  {
    port: Number(PORT),
  },
  app.fetch
);
console.log(
  `Server is running at http://localhost:${PORT} in ${env("APP_ENV")} mode.`
);
