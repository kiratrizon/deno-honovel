import { Database } from "Database";
import { Auth, Cache } from "Illuminate/Support/Facades/index.ts";
import { Carbon } from "honovel:helpers";
import { SessionInitializer, SessionModifier } from "HonoHttp/HonoSession.ts";
import { CookieKeysCache } from "HonoHttp/HonoCookie.ts";
import HonoView from "HonoHttp/HonoView.ts";

class Boot {
  /**
   * Boot class
   * This class is used to initialize the application
   * It is called when the application is started
   * Execute all the packages that need to be initialized
   */
  static async init() {
    //
    Carbon.setCarbonTimezone((config("app.timezone") as string) || "UTC");
    Cache.init();
    await Database.init();
    Auth.setAuth();
  }

  static async finalInit() {
    SessionModifier.init();
    await SessionInitializer.init();
    CookieKeysCache.init();
    HonoView.init();
  }
}

export default Boot;
