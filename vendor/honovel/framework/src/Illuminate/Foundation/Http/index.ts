export interface MiddlewareLikeInstance {
  handle?: HttpMiddleware;
  fallback?: HttpMiddleware;
}

export interface MiddlewareLikeClass {
  new (): MiddlewareLikeInstance;
}

export type MiddlewareLike = string | MiddlewareLikeClass;

export class HttpKernel {
  protected middleware: MiddlewareLikeClass[] = [];

  protected middlewareGroups: Record<string, MiddlewareLike[]> = {};

  protected routeMiddleware: Record<string, MiddlewareLikeClass> = {};
}
