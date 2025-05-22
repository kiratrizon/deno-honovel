import { IMethodRoute } from "../../@hono-types/declaration/IRoute.d.ts";

type argType = "function" | "controller";

interface IMyConfig {
  id: number;
  uri: string;
  method: string;
  callback: unknown;
}
class MethodRoute implements IMethodRoute {
  private flags: Record<string, boolean> = {};

  private type: argType;

  private myConfig: IMyConfig;
  constructor({
    id,
    uri,
    method,
    arg,
  }: {
    id: number;
    uri: string;
    method: string;
    arg: unknown;
    match?: string[];
  }) {
    let myFunc;
    if (is_function(arg)) {
      this.type = "function";
      myFunc = arg;
    } else if (is_array(arg) && arg.length === 2) {
      const [controller, method] = arg;
      const controllerInstance = new controller();
      if (!method_exist(controllerInstance, method)) {
        throw new Error(
          `Method ${method} does not exist in controller ${controller.name}`
        );
      }
      myFunc = controllerInstance[method].bind(controllerInstance);
      this.type = "controller";
    } else {
      throw new Error("Invalid argument type");
    }

    this.myConfig = {
      id,
      uri,
      method: method.toLowerCase(),
      callback: myFunc,
    };
  }
  public name(name: string): this {
    this.validateConfigs("name");
    return this;
  }

  public whereNumber(key: string): this {
    this.validateConfigs("whereNumber");
    return this;
  }

  public where(key: string, regex: string): this {
    this.validateConfigs("where");
    return this;
  }

  public middleware(middleware: unknown): this {
    this.validateConfigs("middleware");
    return this;
  }

  private processMiddleware(): void {}

  public whereAlphaNumeric(key: string): this {
    this.validateConfigs("whereAlphaNumeric");
    return this;
  }

  public whereAlpha(key: string): this {
    this.validateConfigs("whereAlpha");
    return this;
  }

  private validateConfigs(type: string): void {
    if (this.flags[type]) {
      throw new Error(`Route ${type} already set`);
    }
    this.flags[type] = true;
  }
}

export default MethodRoute;
