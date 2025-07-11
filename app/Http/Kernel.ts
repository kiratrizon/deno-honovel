import { SessionStarter } from "Illuminate/Session/Middleware";
import { VerifyCsrf } from "Illuminate/Foundation/Http/Middleware";
import { HttpKernel } from "Illuminate/Foundation/Http";
class Kernel extends HttpKernel {
  protected override middlewareGroups = {
    web: [SessionStarter, VerifyCsrf],
    api: [],
  };

  protected override routeMiddleware = {};
}

export default Kernel;
