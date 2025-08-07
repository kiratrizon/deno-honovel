export default class Authenticate {
  public handle: HttpMiddleware = async ({ Configure, Auth }, next, guard) => {
    const authConf = Configure.read("auth");
    if (!isset(guard)) {
      if (isset(authConf.default)) {
        guard = authConf.default.guard;
      }
    }
    if (!isset(guard)) {
      abort(500, "No guard specified for authentication.");
    }

    if (!(await Auth.guard(guard).check())) {
      abort(401, "Unauthorized.");
    }

    // Proceed to the next middleware or request handler
    return next();
  };
}
