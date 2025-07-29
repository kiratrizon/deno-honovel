import { StartSession } from "Illuminate/Session/Middleware/index.ts";
import { ConvertEmptyStringsToNull } from "Illuminate/Foundation/Http/Middleware/index.ts";
import { HttpKernel } from "Illuminate/Foundation/Http/index.ts";
import PayloadParser from "Middlewares/PayloadParser.ts";
import { ThrottleRequests } from "Illuminate/Routing/Middleware/index.ts";
import VerifyCsrfToken from "Middlewares/VerifyCsrfToken.ts";
class Kernel extends HttpKernel {
  protected override middleware = [
    PayloadParser, // always in the first position to avoid issues with other middlewares
    ConvertEmptyStringsToNull,
  ];

  protected override middlewareGroups = {
    web: [StartSession, VerifyCsrfToken],
    api: [],
  };

  protected override routeMiddleware = {
    throttle: ThrottleRequests,
  };
}

export default Kernel;
