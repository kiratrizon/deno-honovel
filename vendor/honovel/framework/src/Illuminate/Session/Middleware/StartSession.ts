export default class StartSession {
  public handle: HttpMiddleware = async ({ request }, next) => {
    await request.sessionStart();

    if (!request.session.has("_token")) {
      request.session.regenerateToken();
    }

    if (request.method == "GET" && !request.ajax()) {
      request.session.put("_previous.url", request.url);
    }
    const defaultFlash = { old: [], new: [] };
    const sessionFlash = (request.session.get("_flash") ||
      defaultFlash) as typeof defaultFlash;

    // Move new flashes → old for this request
    request.session.put("_flash", {
      old: sessionFlash.new, // now readable in controller
      new: [], // reset for new flashes
    });

    return next();
  };

  public fallback: HttpMiddleware = async ({ request }, next) => {
    const sessionFlash = request.session.get("_flash");
    // @ts-ignore //
    if (sessionFlash && isArray(sessionFlash.old)) {
      // @ts-ignore //
      for (const key of sessionFlash.old) {
        request.session.forget(key);
      }
    } // then flash only if there is input
    if (Object.keys(request.input() || {}).length > 0) {
      request.flash(); // flashes _old_input
    }

    return next();
  };
}
