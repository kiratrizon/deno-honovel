import { Route } from "Illuminate/Support/Facades/index.ts";
import UserController from "App/Http/Controllers/UserController.ts";

Route.post("/", async ({ request }) => {
  return response().json({
    data: request.all(),
  });
});

Route.resource("users", UserController).whereNumber("user");

Route.post("/users/login", async ({ request, Auth }) => {
  const { email, password } = await request.validate({
    email: "required|email",
    password: "required|min:6",
  });
  const token = await Auth.attempt({ email, password });
  if (!token) {
    return response().json(
      {
        message: "Invalid credentials",
      },
      401
    );
  }
  return response().json({
    message: "Login successful",
    token,
  });
});

Route.middleware("auth").group(() => {
  Route.post("/users/authenticated", async ({ request }) => {
    return response().json({
      message: "You are authenticated",
      user: request.user()?.toObject(),
    });
  });
});
