import IHonoRequest from "../../../@types/declaration/IHonoRequest.d.ts";
import { Database } from "Database";
import { Carbon } from "../framework-utils/index.ts";
import { CookieKeysCache } from "../hono/Http/HonoCookie.ts";
import HonoRequest from "../hono/Http/HonoRequest.ts";
import {
  SessionInitializer,
  SessionModifier,
} from "../hono/Http/HonoSession.ts";
import HonoView from "../hono/Http/HonoView.ts";
import { DB } from "Illuminate/Support/Facades/index.ts";

class Boot {
  /**
   * Boot class
   * This class is used to initialize the application
   * It is called when the application is started
   * Execute all the packages that need to be initialized
   */
  static async init() {
    //
    DB.init();
    SessionModifier.init();
    await Database.init();
    await SessionInitializer.init();
    CookieKeysCache.init();
    HonoView.init();

    HonoRequest.macro("expectsXml", function () {
      const accept = (this as IHonoRequest).header("accept") ?? "";
      return accept.includes("application/xml") || accept.includes("text/xml");
    });
    Carbon.setCarbonTimezone((staticConfig("app.timezone") as string) || "UTC");
  }
}

export default Boot;
