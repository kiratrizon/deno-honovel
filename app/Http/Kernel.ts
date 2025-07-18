import { SessionStarter } from "Illuminate/Session/Middleware/index.ts";
import { VerifyCsrf } from "Illuminate/Foundation/Http/Middleware/index.ts";
import { HttpKernel } from "Illuminate/Foundation/Http/index.ts";
class Kernel extends HttpKernel {
  protected override middleware = [];

  protected override middlewareGroups = {
    web: [SessionStarter, VerifyCsrf],
    api: [],
  };

  protected override routeMiddleware = {
    // jwt
  };
}

export default Kernel;
