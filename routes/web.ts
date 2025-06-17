import Route from "Illuminate/Support/Facades/Route";
import UserController from "../app/Http/Controllers/UserController.ts";
import AdminController from "../app/Http/Controllers/AdminController.ts";

Route.prefix("{hello?}")
  .whereNumber("hello")
  .group(() => {
    Route.resource("users", UserController);
    Route.get("/admin/{id?}", [AdminController, "index"]);
  });
export default Route;
