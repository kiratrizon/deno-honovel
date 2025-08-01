import { Database } from "Database";
import { Cache } from "Illuminate/Support/Facades/index.ts";
import { Carbon } from "honovel:helpers";
import {
  SessionInitializer,
  SessionModifier,
} from "../hono/Http/HonoSession.ts";
import { CookieKeysCache } from "../hono/Http/HonoCookie.ts";
import HonoView from "../hono/Http/HonoView.ts";

class Boot {
  /**
   * Boot class
   * This class is used to initialize the application
   * It is called when the application is started
   * Execute all the packages that need to be initialized
   */
  static async init() {
    //
    Carbon.setCarbonTimezone((staticConfig("app.timezone") as string) || "UTC");
    Cache.init();
    await Database.init();
  }

  static async finalInit() {
    SessionModifier.init();
    await SessionInitializer.init();
    CookieKeysCache.init();
    HonoView.init();
  }
}

export default Boot;
