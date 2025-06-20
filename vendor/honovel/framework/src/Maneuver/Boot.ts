import IHonoRequest from "../@hono-types/declaration/IHonoRequest.d.ts";
import HonoRequest from "../hono/Http/HonoRequest.ts";
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
    HonoView.init();

    HonoRequest.macro("expectsXml", function () {
      const accept = (this as IHonoRequest).header("accept") ?? "";
      return accept.includes("application/xml") || accept.includes("text/xml");
    });
  }
}

export default Boot;
