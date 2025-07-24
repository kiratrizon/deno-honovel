import { DB, Route } from "Illuminate/Support/Facades/index.ts";

// Route.resource("users", UserController).whereNumber("user");
Route.post("/", async ({ request }) => {
  return response().json({
    data: request.all(),
  });
});

Route.get("/", async () => {
  return response().json({
    message: "Hello, World!",
  });
});
