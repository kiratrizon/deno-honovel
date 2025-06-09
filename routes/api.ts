import Route from "Illuminate/Support/Facades/Route";

let myDeployedUrl;
if (env("DENO_DEPLOYMENT_ID")) {
  myDeployedUrl = "kiratrizon-express-lar-37.deno.dev";
} else {
  myDeployedUrl = "localhost:2000";
}
Route.domain(`{test}.${myDeployedUrl}`).group(() => {
  Route.get("/{id}", async function ({ request }, domain) {
    return domain;
  });
});

Route.get("/", async function ({ request }) {
  return response().json({
    message: "Welcome to the API",
  });
});

export default Route;
