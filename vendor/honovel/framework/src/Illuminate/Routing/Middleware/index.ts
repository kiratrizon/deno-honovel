type Throttling = {
    [key: string]: {
        timestamp: number; // in seconds
        count: number;
    };
};

export class ThrottleRequests {
    private static store: Throttling = {};
    public handle: HttpMiddleware = async ({ request }, next, max = "60", interval = "1") => {
        const key = `${request.ip()}:${request.method}`;
        const limit = parseInt(max, 10);
        const now = Math.floor(time() / 1000);
        if (!keyExist(ThrottleRequests.store, key)) {
            ThrottleRequests.store[key] = {
                timestamp: now,
                count: 0,
            }
        }

        const entry = ThrottleRequests.store[key];
        const parsedInterval = parseInt(interval, 10);
        const makeIntoSeconds = (parsedInterval * 60);
        if (now - entry.timestamp > makeIntoSeconds) {
            entry.timestamp = now;
            entry.count = 0;
        } else {
            entry.count++;
        }
        if (entry.count > limit) {
            abort(429, "Too Many Requests");
        }

        return next();
    };
}
