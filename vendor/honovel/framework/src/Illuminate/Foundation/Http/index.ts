export interface MiddlewareLikeInstance {
  handle: HttpMiddleware;
}

export interface MiddlewareLikeClass {
  new (): MiddlewareLikeInstance;
}

export type MiddlewareLike = string | MiddlewareLikeClass;

export class HttpKernel {
  protected middlewareGroups: Record<string, MiddlewareLike[]> = {};

  protected routeMiddleware: Record<string, MiddlewareLikeClass> = {};
}
