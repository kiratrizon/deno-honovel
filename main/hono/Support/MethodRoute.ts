import { IMethodRoute } from "../../@hono-types/declaration/IRoute.d.ts";

class MethodRoute implements IMethodRoute {
  middleware: any;
  where: (...args: any[]) => IMethodRoute;
  whereNumber: (...args: any[]) => IMethodRoute;
  whereAlpha: (...args: any[]) => IMethodRoute;
  whereAlphaNumeric: (...args: any[]) => IMethodRoute;

  constructor() {
    // Provide default implementations or initial values
    this.middleware = null;
    this.where = (...args: any[]) => this;
    this.whereNumber = (...args: any[]) => this;
    this.whereAlpha = (...args: any[]) => this;
    this.whereAlphaNumeric = (...args: any[]) => this;
  }

  public name(name: string): IMethodRoute {
    // Implementation for naming the route
    return this;
  }
}

export default MethodRoute;
