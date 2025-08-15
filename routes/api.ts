import { Route } from "Illuminate/Support/Facades/index.ts";
import UserController from "App/Http/Controllers/UserController.ts";
import User from "App/Models/User.ts";

Route.get("/entry", async () => {
  const user = await User.find<User>(1);
  if (user) {
    console.log(await user.posts().get());
  }

  const data = await User.with("posts.comments.replies");
  return response().json({
    data,
  });
});
