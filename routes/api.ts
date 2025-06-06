import Route from "Illuminate/Support/Facades/Route";

Route.get("/", async function ({ request }) {
  return response().json({
    message: "Welcome to the API",
  });
});

Route.domain("{domain}").group(() => {
  Route.get("/", async function ({ request }, domain) {
    return domain;
  });
});

export default Route;
