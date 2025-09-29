import Controller from "App/Http/Controllers/Controller.ts";
import User from "App/Models/User.ts";
import { Hash } from "Illuminate/Support/Facades/index.ts";

class UserController extends Controller {
  // GET /resource
  public index: HttpDispatch = async ({ request }) => {
    // List all resources
    return response().json({
      message: "index",
    });
  };
}

export default UserController;
