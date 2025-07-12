import Route from "Illuminate/Support/Facades/Route";
import UserController from "../app/Http/Controllers/UserController.ts";
import { Carbon } from "../vendor/honovel/framework/src/framework-utils/index.ts";

// Route.resource("users", UserController).whereNumber("user");
Route.post("/", async ({ request }) => {
  return date("Y-m-d H:i:s");
});
Route.get("/", async ({ request }) => {
  return request.session.get("user");
});
