import { DB } from "Illuminate/Support/Facades";
import Controller from "./Controller.ts";
import User, { UserSchema } from "../../Models/User.ts";

class UserController extends Controller {
  // GET /resource
  public index: HttpDispatch = async (myHono) => {
    const data = DB.table("users")
      .select("users.id", "users.name", "users.email")
      .join("profiles", "users.id", "profiles.user_id")
      .join("roles as R", (join) => {
        join.on("users.role_id", "=", "R.id").where("R.status", 1);
      })
      .join("permissions as P", (join) => {
        join
          .on("roles.id", "=", "P.role_id")
          .using("is_active", "is_default", "not_admin")
          .where("P.status", 1);
      })
      .useIndex("users_index", "users_email")
      .forceIndex("users_force_index", "users_name")
      .ignoreIndex("users_ignore_index", "users_id")
      .where("id", ">", 0)
      .where("status", 1)
      .where((query) => {
        query
          .where("name", "LIKE", "%John%")
          .orWhere("email", "LIKE", "%gmail%");
      })
      .orWhere((query) => {
        query
          .where("name", "LIKE", "%Doe%")
          .orWhere("email", "LIKE", "%yahoo%")
          .where((query2) => {
            query2
              .where("id", ">", 0)
              .where("status", 1)
              .orWhereBetween("id", [1, 10])
              .orWhereNotNull("name");
          });
      })
      .where("id", "<", 100)
      .whereIn("id", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      .whereBetween("id", [1, 10])
      .whereNotNull("name")
      .toSql();

    dd(data);
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
