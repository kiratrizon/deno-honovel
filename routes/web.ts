import { Hash, Route } from "Illuminate/Support/Facades/index.ts";
import UserController from "App/Http/Controllers/UserController.ts";

Route.resource("users", UserController);
