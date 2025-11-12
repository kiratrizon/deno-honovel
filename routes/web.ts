import { Route } from "Illuminate/Support/Facades/index.ts";

// create-project command

Route.match(["get", "post"], "/", async ({ request }) => {
  if (request.method === "POST") {
    const file = request.file("uploadFile");
    if (file) {
      if (file.valid()) {
        const savedPath = await file.store(
          "public",
          `uploads/${file.filename}`
        );
        request.session.flash("success", `File uploaded to ${savedPath}`);
      }
    }
  }
  return view("welcome", { hello: "world" });
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
