import Route from "Illuminate/Support/Facades/Route";
import UserController from "../app/Http/Controllers/UserController.ts";

Route.resource("users", UserController).whereNumber("user");
export default Route;
