import { Route } from "Illuminate/Support/Facades/index.ts";
import ProjectController from "App/Http/Controllers/ProjectController.ts";

Route.prefix("/portfolio").group(() => {
  Route.post("/projects", [ProjectController, "projects"]);
});
