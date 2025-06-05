import Test from "../Middlewares/Test.ts";
import HttpKernel from "Illuminate/Foundation/Http/HttpKernel";
import VerifyCsrf from "../Middlewares/VerifyCsrf.ts";
class Kernel extends HttpKernel {
  protected override middlewareGroups = {
    web: [VerifyCsrf],
    api: [],
  };

  protected override routeMiddleware = {
    test: Test,
  };
}

export default Kernel;
