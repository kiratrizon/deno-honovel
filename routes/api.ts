import { Route } from "Illuminate/Support/Facades/index.ts";
import UserController from "App/Http/Controllers/UserController.ts";
import User from "App/Models/User.ts";

Route.get("/entry", async () => {
  const data = await User.with("posts:id.comments:id.replies:id").get();
  return response().json({
    data,
  });
});
