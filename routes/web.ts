import { Route } from "Illuminate/Support/Facades/index.ts";
import Content from "App/Models/Content.ts";

// create-project command

Route.get("/", async ({ request }) => {
  const content = await Content.first();
  let id = 1;
  if (content) {
    id = content.id!;
  }
  return view("welcome", { contentId: id });
});

Route.get("/create-project", async ({ request }) => {
  // for "deno run -A https://honovel.deno.dev/create-project my-app@latest" setup
  return response()
    .file(basePath("vendor/honovel/framework/install.ts"))
    .withHeaders({
      "Content-Type": "application/typescript", // Set the appropriate content type for TypeScript files
    });
});

Route.get("/docs/{content}", async ({ request }, content: Content) => {
  if (!content) {
    return view("welcome");
  }
  return "Hello";
});
