import Test from "../Middlewares/Test.ts";
import HttpKernel from "Illuminate/Foundation/Http/HttpKernel";
class Kernel extends HttpKernel {
  protected override middlewareGroups = {
    web: [],
    api: [],
  };

  protected override routeMiddleware = {
    test: Test,
  };
}

export default Kernel;
