import { Database } from "Database";
import { Auth, Cache } from "Illuminate/Support/Facades/index.ts";
import { Carbon } from "helpers";
import { SessionInitializer, SessionModifier } from "HonoHttp/HonoSession.ts";
import { CookieKeysCache } from "HonoHttp/HonoCookie.ts";
import Exceptions from "Illuminate/Foundation/Execptions/Exceptions.ts";
import ValidationException from "Illuminate/Validation/ValidationException.ts";

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
      await Database.init(true);
      Auth.setAuth();

      Exceptions.render<typeof ValidationException>(ValidationException, async ({ request }, e) => {
        if (request.expectsJson() || request.is("api/*") || request.ajax()) {
          return response().json({ message: e.message, errors: e.errors, input: e.input })
        } else {
          // save errors to session
          request.flash();
          request.session.flash("errors", e.errors);
          return redirect().back();
        }
      });
    } catch (e) {
      console.error(e);
      Deno.exit(1);
    }
  }

  static async finalInit() {
    try {
      await SessionModifier.init();
      await SessionInitializer.init();
      CookieKeysCache.init();
    } catch (e) {
      console.error(e);
    }
  }
}

export default Boot;
