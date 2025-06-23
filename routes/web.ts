import Route from "Illuminate/Support/Facades/Route";
import UserController from "../app/Http/Controllers/UserController.ts";

Route.resource("users", UserController).whereNumber("user");
Route.get("/", async () => {
  return response().json({
    id: env("DENO_DEPLOYMENT_ID"),
    region: env("DENO_REGION"),
  });
});
export default Route;
