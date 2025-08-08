import User from "App/Models/User.ts";
import { AuthConfig } from "configs/@types/index.d.ts";

const constant: AuthConfig = {
  default: {
    guard: "user",
  },
  guards: {
    user: {
      driver: "jwt",
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
