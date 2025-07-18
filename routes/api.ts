import { Route } from "Illuminate/Support/Facades/index.ts";

Route.post("/", async ({ request }) => {
  return response().json({
    data: request.all(),
  });
});
