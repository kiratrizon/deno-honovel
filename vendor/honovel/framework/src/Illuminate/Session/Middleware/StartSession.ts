export default class StartSession {
  public handle: HttpMiddleware = async ({ request }, next) => {
    await request.sessionStart();
    if (!request.session.has("_token")) {
      // Regenerate CSRF token if it exists in the session
      request.session.regenerateToken();
    }
    const currentFlash = request.session.get("_flash");
    if (currentFlash && typeof currentFlash === "object") {
      request.session.put("_flash", {
        // @ts-ignore //
        old: currentFlash.new || {
          data: {},
          error: {},
        },
        new: {
          data: {},
          error: {},
        },
      });
    }

    return next();
  };

  public fallback: HttpMiddleware = async ({ request }, next) => {
    if (request.method == "GET" && !request.ajax()) {
      request.session.put("_previous.url", request.url);
    }

    return next();
  };
}
