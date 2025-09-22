import { Hash, Route } from "Illuminate/Support/Facades/index.ts";
import UserController from "App/Http/Controllers/UserController.ts";
import User from "App/Models/User.ts";

Route.get("/", async ({ request }) => {
  dd("hello world");
}).middleware(async ({ request }, next) => {
  return next();
});
