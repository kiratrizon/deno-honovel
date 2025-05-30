import UserController from "../app/Http/Controllers/UserController.ts";
import Route from "Route";

// Route.get("/user", [UserController, "index"]);
Route.as("hello")
  .prefix("{lang?}")
  .middleware("test")
  .group(() => {
    Route.get("/user/{myid?}/test", [UserController, "index"]);
  });
export default Route;
