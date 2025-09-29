import { Route } from "Illuminate/Support/Facades/index.ts";

// create-project command

Route.get("/", async () => {
  return "Welcome to Honovel Framework!";
});

Route.get("/create-project", async ({ request }) => {
  // for "deno run -A https://honovel.deno.dev/create-project my-app@latest" setup
  return response()
    .file(basePath("vendor/honovel/framework/install.ts"))
    .withHeaders({
      "Content-Type": "application/typescript", // Set the appropriate content type for TypeScript files
    });
});

// For my portfolio routes
Route.prefix("/portfolio").group(() => {
  Route.get("/my-resume", async () => {
    return response().download(basePath("genesis-troy-torrecampo.pdf"));
  });
});
