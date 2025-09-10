import { Hash, Route } from "Illuminate/Support/Facades/index.ts";
import UserController from "App/Http/Controllers/UserController.ts";
import User from "App/Models/User.ts";

Route.get("/{user}", async ({ request }, user: User) => {
  return response().json({ user: user.toObject() });
}).whereNumber("user");
