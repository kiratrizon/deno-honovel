import environment from "../../../../../environment.ts";
import IHonoRequest from "../../../@types/declaration/IHonoRequest.d.ts";
import { Carbon } from "../framework-utils/index.ts";
import { MyCachedHashedApp } from "../hono/Http/HonoCookie.ts";
import HonoRequest from "../hono/Http/HonoRequest.ts";
import HonoView from "../hono/Http/HonoView.ts";
import RedisClient from "./RedisClient.ts";

class Boot {
  /**
   * Boot class
   * This class is used to initialize the application
   * It is called when the application is started
   * Execute all the packages that need to be initialized
   */
  static async init() {
    //
    HonoView.init();

    HonoRequest.macro("expectsXml", function () {
      const accept = (this as IHonoRequest).header("accept") ?? "";
      return accept.includes("application/xml") || accept.includes("text/xml");
    });

    MyCachedHashedApp.init();
    if (env("SESSION_DRIVER", "redis") === "redis") {
      await RedisClient.init();
    }

    Carbon.setCarbonTimezone((staticConfig("app.timezone") as string) || "UTC");
  }
}

export default Boot;
