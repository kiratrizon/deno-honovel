import { DB, Route } from "Illuminate/Support/Facades/index.ts";

// Route.resource("users", UserController).whereNumber("user");
Route.post("/", async ({ request }) => {
  return response().json({
    data: request.all(),
  });
});

Route.get("/", async () => {
  const data = await DB.table("users").get();
  return response().json({
    data,
  });
});
