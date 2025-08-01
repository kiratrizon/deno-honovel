import { Cache, DB, Route } from "Illuminate/Support/Facades/index.ts";

// Route.resource("users", UserController).whereNumber("user");
Route.post("/", async ({ request }) => {
  return response().json({
    data: request.all(),
  });
}).middleware("throttle:10,1");

Route.get("/", async ({ csrfToken }) => {
  const token = csrfToken();
  return response().json({
    token,
  });
});
