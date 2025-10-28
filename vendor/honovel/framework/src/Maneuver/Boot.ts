import { Database } from "Database";
import { Auth, Cache } from "Illuminate/Support/Facades/index.ts";
import { Carbon } from "helpers";
import { SessionInitializer, SessionModifier } from "HonoHttp/HonoSession.ts";
import { CookieKeysCache } from "HonoHttp/HonoCookie.ts";

class Boot {
  /**
   * Boot class
   * This class is used to initialize the application
   * It is called when the application is started
   * Execute all the packages that need to be initialized
   */
  static async init() {
    //
    try {
      Carbon.setCarbonTimezone((config("app.timezone") as string) || "UTC");
      Cache.init();
      await Database.init();
      Auth.setAuth();
    } catch (e) {
      consoledeno.error(e);
      Deno.exit(1);
    }
  }

  static async finalInit() {
    try {
      await SessionModifier.init();
      await SessionInitializer.init();
      CookieKeysCache.init();
    } catch (e) {
      consoledeno.error(e);
      Deno.exit(1);
    }
  }
}

export default Boot;
