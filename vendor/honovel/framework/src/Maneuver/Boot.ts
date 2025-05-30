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
  }
}

export default Boot;
