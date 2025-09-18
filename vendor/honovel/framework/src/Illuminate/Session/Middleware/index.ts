export class StartSession {
  public handle: HttpMiddleware = async ({ request }, next) => {
    await request.sessionStart();
    if (!request.session.has("_token")) {
      // Regenerate CSRF token if it exists in the session
      request.session.regenerateToken();
    }
    const method = request.method.toUpperCase();
    if (method === "GET" && !request.ajax()) {
      request.session.put(
        "_previousUrl",
        request.session.get("_newUrl") || "/"
      );
      request.session.put("_newUrl", request.url);
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
}
