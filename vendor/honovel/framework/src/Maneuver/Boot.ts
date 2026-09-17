import { Database } from "Database";
import { Auth, Cache } from "Illuminate/Support/Facades/index.ts";
import { Carbon } from "helpers";
import { CookieKeysCache } from "HonoHttp/HonoCookie.ts";
import Exceptions from "Illuminate/Foundation/Exceptions/Exceptions.ts";
import ValidationException from "Illuminate/Validation/ValidationException.ts";

class Boot {
  /**
   * Boot class
   * This class is used to initialize the application
   * It is called when the application is started
   * Execute all the packages that need to be initialized
   */
  static async init(fromCli: boolean = false) {
    //
    try {
      Carbon.setCarbonTimezone((config("app.timezone") as string) || "UTC");
      Cache.init();

      if (!fromCli) {
        await Database.init(true);
        Auth.setAuth();
        Exceptions.render(ValidationException, async ({ request }, e) => {
          if (request.expectsJson() || request.ajax()) {
            return response().json({
              message: e.message,
              errors: e.errors,
              input: e.input,
            });
          } else {
            return redirect().back().withInput().withErrors(e.errors);
          }
        });
      }
    } catch (e) {
      console.error(e);
      Deno.exit(1);
    }
  }

  static async finalInit() {
    try {
      CookieKeysCache.init();
    } catch (e) {
      console.error(e);
    }
  }
}

export default Boot;
