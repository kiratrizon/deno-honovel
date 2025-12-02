import { Route } from "Illuminate/Support/Facades/index.ts";
import HomeController from "App/Http/Controllers/HomeController.ts";
import ContentController from "App/Http/Controllers/ContentController.ts";
import AuthController from "App/Http/Controllers/AuthController.ts";
import { ruruHTML } from "ruru/server";

Route.get("/", [HomeController, "index"]);

Route.get("/docs/{content}", [ContentController, "show"]).middleware(
  "bind_content"
);

// for "deno run -A https://honovel.deno.dev/create-project my-app@latest" setup
Route.get("/create-project", async ({ request }) => {
  return response()
    .file(basePath("vendor/honovel/framework/install.ts"))
    .withHeaders({
      "Content-Type": "application/typescript", // Set the appropriate content type for TypeScript files
    });
});

Route.get("/auth/google/{code?}", [AuthController, "google"]);

Route.get("/about", [HomeController, "about"]);

Route.get("/my-graphql", async () => {
  let html = ruruHTML({
    endpoint: "/api/graphql",
  });

  // Inject favicon
  html = html.replace(
    "</head>",
    `
      <link rel="icon" type="image/x-icon" href="/system-assets/logo/deno-honovel.png" />
    </head>
    `
  );

  return response().html(html);
});
