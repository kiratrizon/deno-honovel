import User from "../app/Models/User.ts";
import { AuthConfig } from "./@types/index.d.ts";

const constant: AuthConfig = {
  default: {
    guard: "jwt_user",
  },
  guards: {
    jwt_user: {
      driver: "jwt",
      provider: "users",
    },
    jwt_admin: {
      driver: "jwt",
      provider: "admins",
    },
    user: {
      driver: "session",
      provider: "users",
    },
  },
  providers: {
    users: {
      driver: "eloquent",
      model: User,
    },
  },
};

export default constant;
