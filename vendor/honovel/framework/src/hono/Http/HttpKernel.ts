export interface MiddlewareLikeInstance {
  handle: HttpMiddleware;
}

export interface MiddlewareLikeClass {
  new (): MiddlewareLikeInstance;
}

export type MiddlewareLike = string | MiddlewareLikeClass;

class HttpKernel {
  protected middlewareGroups: Record<string, MiddlewareLike[]> = {};

  protected routeMiddleware: Record<string, MiddlewareLikeClass> = {};
}

export default HttpKernel;
