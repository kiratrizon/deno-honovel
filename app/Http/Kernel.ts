import { SessionStarter } from "Illuminate/Session/Middleware/index.ts";
import { ConvertEmptyStringsToNull, VerifyCsrfToken } from "Illuminate/Foundation/Http/Middleware/index.ts";
import { HttpKernel } from "Illuminate/Foundation/Http/index.ts";
import PayloadParser from "Middlewares/PayloadParser.ts";
import { ThrottleRequests } from "Illuminate/Routing/Middleware/index.ts";
class Kernel extends HttpKernel {
  protected override middleware = [
    PayloadParser, // always in the first position to avoid issues with other middlewares
    ConvertEmptyStringsToNull
  ];

  protected override middlewareGroups = {
    web: [SessionStarter, VerifyCsrfToken],
    api: [],
  };

  protected override routeMiddleware = {
    throttle: ThrottleRequests,
  };
}

export default Kernel;