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

  // GET /resource/{id}
  public show: HttpDispatch = async ({ request }, id) => {
    // Show a single resource by ID
    const user = await User.where("id", id).first();
    return response().json({
      user,
    });
  };

  // GET /resource/create
  public create: HttpDispatch = async ({ request }) => {
    // Return form or data for creating resource
    return response().json({
      message: `create`,
    });
  };

  // POST /resource
  public store: HttpDispatch = async ({ request }) => {
    // Create a new resource
    const creds = await request.validate({
      email: "required|email|unique:users,email",
      password: "required|min:6|confirmed",
      name: "required|min:6",
    });
    creds["password"] = Hash.make(creds["password"]);

    const newCreds: Record<string, string> = { ...creds };
    newCreds["api_token"] = crypto.randomUUID();

    await User.on().insert(newCreds);
    return response().json({
      user: newCreds,
    });
  };

  // GET /resource/{id}/edit
  public edit: HttpDispatch = async ({ request }, id) => {
    // Return form or data for editing resource
    return response().json({
      message: `edit ${id}`,
    });
  };

  // PUT or PATCH /resource/{id}
  public update: HttpDispatch = async ({ request }, id) => {
    // Update a resource by ID
    return response().json({
      message: `update ${id}`,
    });
  };

  // DELETE /resource/{id}
  public destroy: HttpDispatch = async ({ request }, id) => {
    // Delete a resource by ID
    return response().json({
      message: `delete ${id}`,
    });
  };
}

export default UserController;
