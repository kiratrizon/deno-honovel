import Route from "Illuminate/Support/Facades/Route";
import UserController from "../app/Http/Controllers/UserController.ts";
import { Carbon } from "../vendor/honovel/framework/src/framework-utils/index.ts";

// Route.resource("users", UserController).whereNumber("user");
Route.post("/", async ({ request }) => {
  return response().json({
    data: request.all(),
  });
});
Route.get("/", async ({ request }) => {
  const timeNow = Carbon.yesterday();
  return timeNow;
});
