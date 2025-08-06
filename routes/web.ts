import { Hash, Route } from "Illuminate/Support/Facades/index.ts";

Route.get("/", async () => {
  return response("Welcome to the API").withHeaders({
    Hello: "World",
  });
}).middleware(async ({ request }, next) => {
  request.cookie("api_version", "1.0");
  const resp = next(request);
  resp.headers.set("X-API-Version", "1.0");
  return resp;
});
