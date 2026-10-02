import Middleware from "./Configuration/Middleware.ts";
import Exception from "./Exceptions/Exception.ts";
import Exceptions, { IExceptionCallback } from "./Exceptions/Exceptions.ts";
import HttpException from "./HttpExceptions/HttpException.ts";

export type RouterLoader = () => Promise<any>;

export interface RoutingConfig {
  /**
   * The `web` property has a default prefix of `/` and a default middleware of `web`.
   */
  web?: RouterLoader;
  /**
   * The `api` property has a default prefix of `/api` and a default middleware of `api`.
   */
  api?: RouterLoader;
  /**
   * The `commands` property is used to load console commands for the application.
   */
  commands?: RouterLoader;
  /**
   * The `health` property is used to load a health check route for the application.
   */
  health?: string;
}
export type ExceptionConstructor = new (...args: any[]) => Exception;
export default class Application {
  private static middleware: typeof Middleware = Middleware;

  private static routers: RoutingConfig = {};

  private static groupRoutes: Record<string, RouterLoader> = {};
  static withMiddleware(cb: (middleware: typeof Middleware) => void) {
    const mw = this.middleware;
    cb(mw);
    return this;
  }

  static withRouting(obj: RoutingConfig) {
    for (const [key, value] of Object.entries(obj)) {
      this.routers[key as keyof RoutingConfig] = value;
    }
    return this;
  }

  static groupRoutingAlias(
    cb: (routeLoader: Record<string, RouterLoader>) => void,
  ) {
    cb(this.groupRoutes);
    return this;
  }

  static create() {
    return new this();
  }

  static withExceptions(cb: (exceptions: typeof Exceptions) => void) {
    cb(Exceptions);
    return this;
  }

  public getRouter() {
    const data = {
      middleware: new Application.middleware(),
      routers: Application.routers,
      groupRoutes: Application.groupRoutes,
    };
    return data;
  }

  private static exceptions: Record<
    string,
    { exception: ExceptionConstructor; cb: IExceptionCallback }
  > = {};
  protected static addException(
    exception: ExceptionConstructor,
    cb: IExceptionCallback,
  ) {
    if (!Application.exceptions[exception.name]) {
      Application.exceptions[exception.name] = {
        exception,
        cb,
      };
    }
  }

  protected static getException(exception: Exception) {
    return Application.exceptions[exception.name];
  }
}
