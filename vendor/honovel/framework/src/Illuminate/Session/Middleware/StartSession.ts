import { SessionDataTypes } from "../../../../../@types/declaration/imain.d.ts";

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
    const sessionFlash = (request.session.get("_flash") ??
      defaultFlash) as SessionDataTypes["_flash"];

    // Move new flashes → old for this request
    request.session.put("_flash", {
      old: sessionFlash.new, // now readable in controller
      new: [], // reset for new flashes
    });
    // then flash
    request.flash();

    return next();
  };

  public fallback: HttpMiddleware = async ({ request }, next) => {
    const sessionFlash = request.session.get(
      "_flash"
    ) as SessionDataTypes["_flash"];
    if (sessionFlash && isArray(sessionFlash.old)) {
      for (const key of sessionFlash.old) {
        if (sessionFlash.new.includes(key)) {
          // keep it for another request
          continue;
        } else {
          // remove it
          request.session.forget(key);
        }
      }
    } // then flash only if there is input

    return next();
  };
}
