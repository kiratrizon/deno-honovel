import Route from "Illuminate/Support/Facades/Route";
import UserController from "../app/Http/Controllers/UserController.ts";

Route.get("/", [UserController, "view"]);

export default Route;
