import { Gate } from "../../Support/Facades/index.ts";

/**
 * Authorize the user based on the provided credentials.
 */
export default class Authorize {
  public handle: HttpMiddleware = async (
    { request },
    next,
    ability,
    ...args
  ) => {
    const user = request.user();

    if (!ability) {
      abort(400, "Ability not specified");
    }

    if (!user) {
      abort(401, "Unauthorized");
    }

    // Resolve route parameters
    const newArgs = args.map((arg) => request.route(arg));

    // Check via Gate
    if (await Gate.allows(ability, user, ...newArgs)) {
      return next();
    }

    abort(403, "Forbidden");
  };
}
