import UserController from "../app/Http/Controllers/UserController.ts";
import Route from "Route";

Route.get("/user", [UserController, "index"]);
export default Route;
