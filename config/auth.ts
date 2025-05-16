// import User from "../models/User.ts";

const constant = {
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
      model: "User",
    },
    admins: {
      driver: "eloquent",
    },
  },
};

export default constant;
