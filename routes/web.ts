import Route from "Illuminate/Support/Facades/Route";
import UserController from "../app/Http/Controllers/UserController.ts";

// Route.get("/", [UserController, "view"]);

Route.middleware([]).group(() => {
  Route.resource('users', UserController);
  Route.get("/{id}", [UserController, "test"]).whereNumber('id');
})
export default Route;
