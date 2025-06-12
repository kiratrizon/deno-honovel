import Route from "Illuminate/Support/Facades/Route";
import UserController from "../app/Http/Controllers/UserController.ts";
import AdminController from "../app/Http/Controllers/AdminController.ts";

Route.get("/", [UserController, "view"]);

Route.resource("admins", AdminController);
export default Route;
