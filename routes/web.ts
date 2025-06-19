import Route from "Illuminate/Support/Facades/Route";
import UserController from "../app/Http/Controllers/UserController.ts";

Route.resource("users", UserController).where({ user: /^\d+$/ });
export default Route;
