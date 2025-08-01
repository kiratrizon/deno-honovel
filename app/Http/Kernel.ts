import { StartSession } from "Illuminate/Session/Middleware/index.ts";
import {
  ConvertEmptyStringsToNull,
  PayloadParser,
  PreventRequestDuringMaintenance,
} from "Illuminate/Foundation/Http/Middleware/index.ts";
import { HttpKernel } from "Illuminate/Foundation/Http/index.ts";
import { ThrottleRequests } from "Illuminate/Routing/Middleware/index.ts";
import VerifyCsrfToken from "App/Http/Middlewares/VerifyCsrfToken.ts";
class Kernel extends HttpKernel {
  protected override middleware = [
    PreventRequestDuringMaintenance,
    PayloadParser,
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
