import { DB } from "Illuminate/Support/Facades";
import Controller from "./Controller.ts";
import User, { UserSchema } from "../../Models/User.ts";

class UserController extends Controller {
  // GET /resource
  public index: HttpDispatch = async ({ request }) => {
    const data = DB.table("users")
      .select("users.id", "users.name", "users.email")
      .join("profiles", "users.id", "profiles.user_id")
      .join("roles", (join) => {
        join.on("users.role_id", "=", "roles.id").where("roles.status", 1);
      })
      .join("permissions", (join) => {
        join
          .on("roles.id", "=", "permissions.role_id")
          .where("permissions.status", 1);
      })
      .where("id", ">", 0)
      .where("status", 1)
      .where((query) => {
        query
          .where("name", "LIKE", "%John%")
          .orWhere("email", "LIKE", "%gmail%");
      })
      .where("id", "<", 100)
      .whereIn("id", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      .whereBetween("id", [1, 10])
      .whereNotNull("name")
      .toSqlWithValues();

    // dd(data);
    const user = new User();
    user.setAttribute("password", "password123");
    return "test";
  };

  // GET /resource/{id}
  public show: HttpDispatch = async ({ request }, id: string) => {
    // Show a single resource by ID
    return response().json({
      message: `show ${id}`,
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
    return response().json({
      message: `store`,
    });
  };

  // GET /resource/{id}/edit
  public edit: HttpDispatch = async ({ request }, user) => {
    const id = (
      await DB.table("users").insert({
        name: "John Doe",
        email: "tgenesistroy@gmail.com",
        password: "password123",
        remember_token: "ageawfaewcrwavf",
      })
    ).lastInsertRowId;
    return response().json({
      id,
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
