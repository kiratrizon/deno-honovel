import UserController from "../app/Http/Controllers/UserController.ts";
import Route from "../main/hono/Support/Route.ts";

Route.get("/test", async ({ request }) => {
  await request.whenHas("email", async (email) => {
    console.log(email);
  });
});

Route.get("/test2", [UserController, "index"]);

export default Route;
