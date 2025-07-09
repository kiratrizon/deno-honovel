import Route from "Illuminate/Support/Facades/Route";
import UserController from "../app/Http/Controllers/UserController.ts";

Route.post("/", async ({ request }) => {
  return response().json({
    data: request.all(),
  });
});
