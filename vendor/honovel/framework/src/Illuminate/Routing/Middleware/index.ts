import User from "App/Models/User.ts";
import { ModelAttributes } from "../../../../../@types/declaration/Base/IBaseModel.d.ts";
import { Model } from "../../Database/Eloquent/index.ts";
import { Cache, URL } from "../../Support/Facades/index.ts";

type Throttling = {
  [key: string]: {
    timestamp: number; // in seconds
    count: number;
  };
};

export class ThrottleRequests {
  public handle: HttpMiddleware = async (
    { request },
    next,
    max = "60",
    interval = "1"
  ) => {
    const key = `throttle:${request.ip()}:${request.method}`;
    const limit = parseInt(max, 10);
    const intervalSeconds = parseInt(interval, 10) * 60;

    const cache = Cache.store(); // Uses default store (memcached, redis, etc.)

    let entry = (await cache.get(key)) as Throttling[string] | null;
    const now = Math.floor(time() / 1000);

    if (!entry) {
      entry = { timestamp: now, count: 0 };
    }

    if (now - entry.timestamp > intervalSeconds) {
      entry.timestamp = now;
      entry.count = 0;
    } else {
      entry.count++;
    }

    if (entry.count >= limit) {
      abort(429, "Too Many Requests");
    }

    await cache.put(key, entry, intervalSeconds);

    return next();
  };
}

export class EnsureAcceptsJson {
  public handle: HttpMiddleware = async ({ request }, next) => {
    if (!request.expectsJson()) {
      abort(406, "Not Acceptable");
    }
    return next();
  };
}

export class ValidateSignature {
  public handle: HttpMiddleware = async ({ request }, next) => {
    if (URL.verify(request.url)) {
      return next();
    }
    abort(403, "Invalid or Expired Signature");
  };
}

export class SubstituteBindings {
  /**
   * This is to mimic Laravel's route model binding feature.
   * It binds route parameters to model instances based on the parameter name.
   * For example, if a route has a parameter {user}, it will bind it to a User model instance.
   * If the model instance is not found, it will abort with a 404 error.
   */
  private readonly routerBindings: Record<
    string,
    typeof Model<ModelAttributes>
  > = {
    // route parameter name => Model class
    user: User,
  };

  public handle: HttpMiddleware = async ({ request }, next) => {
    request.bindRoute(this.routerBindings);

    return next();
  };
}
