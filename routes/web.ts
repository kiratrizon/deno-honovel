import Route from "Illuminate/Support/Facades/Route";

let myDeployedUrl;
if (env("DENO_DEPLOYMENT_ID")) {
  myDeployedUrl = "kiratrizon-express-lar-37.deno.dev";
} else {
  myDeployedUrl = "localhost:2000";
}
Route.view("/", "welcome", {
  hello: "world",
});

Route.domain(`{domain}.${myDeployedUrl}`).group(() => {
  Route.get("/", async function ({ request }, domain: string) {
    return domain;
  });
});

export default Route;
