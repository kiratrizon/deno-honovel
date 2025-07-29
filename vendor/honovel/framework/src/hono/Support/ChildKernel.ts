import Kernel from "../../../../../../app/Http/Kernel.ts";
import {
  MiddlewareLike,
  MiddlewareLikeClass,
} from "Illuminate/Foundation/Http/index.ts";

class ChildKernel extends Kernel {
  public get MiddlewareGroups(): Record<string, MiddlewareLike[]> {
    return this.middlewareGroups;
  }

  public get RouteMiddleware(): Record<string, MiddlewareLikeClass> {
    return this.routeMiddleware;
  }

  public get Middleware(): MiddlewareLikeClass[] {
    return this.middleware;
  }
}

export default ChildKernel;
