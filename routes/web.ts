import Route from "Illuminate/Support/Facades/Route";

Route.view("/", "welcome");

Route.domain("{domain}.hello").group(() => {
  Route.get("/", async function ({ request }, domain: string) {
    return domain;
  });
});

export default Route;
