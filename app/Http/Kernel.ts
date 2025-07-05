import Session from "../Middlewares/Session.ts";
import HttpKernel from "Illuminate/Foundation/Http/HttpKernel";
import VerifyCsrf from "../Middlewares/VerifyCsrf.ts";
class Kernel extends HttpKernel {
  protected override middlewareGroups = {
    web: [Session, VerifyCsrf],
    api: [],
  };

  protected override routeMiddleware = {
    // session: Session,
  };
}

export default Kernel;
