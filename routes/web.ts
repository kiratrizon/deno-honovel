import { Cache, DB, Route } from "Illuminate/Support/Facades/index.ts";

// Route.resource("users", UserController).whereNumber("user");
Route.post("/", async ({ request }) => {
  return response().json({
    data: request.all(),
  });
});

Route.get("/", async () => {
  let data = await Cache.store("mydb").get("users");
  if (!data) {
    console.log("Cache miss, fetching from database...");
    data = await DB.table("users").get();
    await Cache.store("mydb").put("users", data, 60 * 60); // Cache for 1 hour
  }
  return response().json({
    data,
  });
});
