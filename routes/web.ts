import { Route } from "Illuminate/Support/Facades/index.ts";
import UserController from "../app/Http/Controllers/UserController.ts";
import User from "../app/Models/User.ts";

// Route.resource("users", UserController).whereNumber("user");
Route.post("/", async ({ request }) => {
  return response().json({
    data: request.all(),
  });
});
Route.get("/", async ({ request }) => {
  // await User.find(1);
  return response().json({
    data: request.all(),
  });
});
