import { Route } from "Illuminate/Support/Facades/index.ts";
import ProjectController from "App/Http/Controllers/ProjectController.ts";

Route.prefix("/portfolio")
  .middleware(["ensure_accepts_json"])
  .group(() => {
    Route.post("/projects", [ProjectController, "projects"]);
  });

Route.prefix("/portfolio").group(() => {
  Route.get("/my-resume", async () => {
    return response().download(basePath("genesis-troy-torrecampo.pdf"));
  });
});
