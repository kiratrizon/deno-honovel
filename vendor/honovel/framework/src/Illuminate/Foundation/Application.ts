import Middleware from "./Configuration/Middleware.ts";

export default class Application {
  private static base: string;
  private static middleware: typeof Middleware = Middleware;

  private static routers: Record<string, () => Promise<any>> = {};

  static withMiddleware(cb: (middleware: typeof Middleware) => void) {
    const mw = this.middleware;
    cb(mw);
    return this;
  }

  static withRouting(obj: Record<string, () => Promise<any>>) {
    for (const [key, value] of Object.entries(obj)) {
      this.routers[key] = value;
    }
    return this;
  }

  static create(){
    const app = new this();
    return app;
  }

  public getRouter() {
    const data = {
      middleware: new Application.middleware(),
      routers: Application.routers,
      base: Application.base,
    }
    return data;
  }
}
