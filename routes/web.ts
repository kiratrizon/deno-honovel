import { Route } from "Illuminate/Support/Facades/index.ts";
import HomeController from "App/Http/Controllers/HomeController.ts";
import ContentController from "App/Http/Controllers/ContentController.ts";

Route.get("/", [HomeController, "index"]);

Route.get("/docs/{content}", [ContentController, "show"]);

Route.get("/create-project", async ({ request }) => {
  // for "deno run -A https://honovel.deno.dev/create-project my-app@latest" setup
  return response()
    .file(basePath("vendor/honovel/framework/install.ts"))
    .withHeaders({
      "Content-Type": "application/typescript", // Set the appropriate content type for TypeScript files
    });
});
