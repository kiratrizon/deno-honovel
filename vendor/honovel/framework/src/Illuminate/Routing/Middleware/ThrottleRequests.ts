import { Cache } from "../../Support/Facades/index.ts";

type Throttling = {
  [key: string]: {
    timestamp: number; // in seconds
    count: number;
  };
};

export default class ThrottleRequests {
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

  public fallback: HttpMiddleware = async ({}, next) => {
    return next();
  };
}
