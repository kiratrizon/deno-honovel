import User from "App/Models/User.ts";
import { AuthConfig } from "./@types/index.d.ts";

const constant: AuthConfig = {
  default: {
    guard: "user",
  },
  guards: {
    user_ses: {
      driver: "session",
      provider: "users",
    },
    jwt_admin: {
      driver: "jwt",
      provider: "admins",
    },
    user: {
      driver: "token",
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
