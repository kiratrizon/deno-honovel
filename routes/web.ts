import { Route } from "Illuminate/Support/Facades/index.ts";
import HomeController from "App/Http/Controllers/HomeController.ts";
import ContentController from "App/Http/Controllers/ContentController.ts";
import AuthController from "App/Http/Controllers/AuthController.ts";
import { RuruClientConfig, ruruHTML } from "ruru/server";

Route.get("/", [HomeController, "index"]);

Route.get("/docs/{content}", [ContentController, "show"]).middleware(
  "bind_content",
);

// for "deno run -A https://honovel.deno.dev/create-project my-app@latest" setup
Route.get("/create-project", async ({ request }) => {
  return response().file(basePath("install.ts")).withHeaders({
    "Content-Type": "application/typescript", // Set the appropriate content type for TypeScript files
    "Cache-Control": "no-cache", // Optional: prevent caching of the file
  });
});

Route.get("/auth/google/{code?}", [AuthController, "google"]);

Route.get("/about", [HomeController, "about"]);

Route.get("/my-graphql", async ({ request }) => {
  const metaTags = [
    `<link rel="icon" href="/system-assets/logo/deno-honovel.png">`,
    `<script src="/main-assets/js/ruru-fetch.js"></script>`,
  ];
  const html = ruruHTML({
    endpoint: "/api/graphql",
    htmlParts: {
      metaTags: metaTags.join("\n"),
    },
  });
  return response().html(html);
});
