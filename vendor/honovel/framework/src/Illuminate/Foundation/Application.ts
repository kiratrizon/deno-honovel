import Middleware from "./Configuration/Middleware.ts";
import Exception from "./Execptions/Exception.ts";
import Exceptions, { IExceptionCallback } from "./Execptions/Exceptions.ts";
import HttpException from "./HttpExecptions/HttpException.ts";

type RouterLoader = () => Promise<any>;

export interface RoutingConfig {
  web?: RouterLoader;
  api?: RouterLoader;
  commands?: RouterLoader;
  health?: string;
}
export type ExceptionConstructor = new (...args: any[]) => Exception;
export default class Application {
  private static middleware: typeof Middleware = Middleware;

  private static routers: RoutingConfig = {};

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
      routers: Application.routers
    }
    return data;
  }

  private static exceptions: Record<string, { exception: ExceptionConstructor, cb: IExceptionCallback }> = {};
  protected static addException(exception: ExceptionConstructor, cb: IExceptionCallback) {
    if (!Application.exceptions[exception.name]) {
      Application.exceptions[exception.name] = {
        exception,
        cb
      };
    }
  }

  protected static getException(exception: Exception) {
    return Application.exceptions[exception.name];
  }
}
