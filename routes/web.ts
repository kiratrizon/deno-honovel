import { Hash, Route } from "Illuminate/Support/Facades/index.ts";
import UserController from "App/Http/Controllers/UserController.ts";
import User from "App/Models/User.ts";

// For my portfolio routes
Route.prefix("/portfolio").group(() => {
  Route.get("/my-resume", async () => {
    return response().download(basePath("genesis-troy-torrecampo.pdf"));
  });
});
