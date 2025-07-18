import { Route } from "Illuminate/Support/Facades/index.ts";

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
