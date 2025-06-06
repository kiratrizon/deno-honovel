import Controller from "../../../../../../app/Http/Controllers/Controller.ts";
import {
  IMethodRoute,
  IMFlagConfig,
} from "../../@hono-types/declaration/IRoute.d.ts";
import { regexObj } from "./FunctionRoute.ts";

type argType = "function" | "controller";

export interface IMyConfig {
  id: number;
  uri: string;
  method: string[];
  callback: HttpDispatch;
}
class MethodRoute implements IMethodRoute {
  private flag: Record<string, unknown> = {
    where: {} satisfies Record<string, RegExp[]>,
  };

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
    method: string[];
    arg: unknown;
    match?: string[];
  }) {
    let myFunc;
    if (is_function(arg)) {
      this.type = "function";
      myFunc = arg;
    } else if (is_array(arg) && arg.length === 2) {
      const [controller, method] = arg as [new () => Controller, string];
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
      method: method.map((m) => m.toLowerCase()),
      callback: myFunc as HttpDispatch,
    };
  }
  public name(name: string): this {
    this.validateConfig("name", name);
    return this;
  }

  public whereNumber(key: string): this {
    this.validateConfig("where", { [key]: regexObj.number });
    return this;
  }

  public where(ojb: Record<string, RegExp[] | RegExp>): this {
    this.validateConfig("where", ojb);
    return this;
  }

  public middleware(middleware: unknown): this {
    this.validateConfig("middleware", middleware);
    return this;
  }

  public whereAlphaNumeric(key: string): this {
    this.validateConfig("where", { [key]: regexObj.alphanumeric });
    return this;
  }

  public whereAlpha(key: string): this {
    this.validateConfig("where", { [key]: regexObj.alpha });
    return this;
  }
  private validateConfig(methodName: string, value: unknown) {
    if (this.flag[methodName] && methodName !== "where") {
      throw new Error(`Method ${methodName} already exists`);
    }
    if (methodName === "middleware") {
      if (!is_array(value)) {
        this.flag[methodName] = [value];
        return;
      }
    }
    if (methodName !== "where") {
      this.flag[methodName] = value;
    } else {
      if (!is_object(value)) {
        throw new Error("Where must be an object");
      }
      const newValue = value as Record<string, RegExp | RegExp[]>;
      for (const key in newValue) {
        const v = newValue[key];
        if (!key_exist(this.flag["where"] as Record<string, RegExp[]>, key)) {
          (this.flag["where"] as Record<string, RegExp[]>)[key] = [];
        }
        if (is_array(v)) {
          if (v.some((item) => !(item instanceof RegExp)) || v.length === 0) {
            throw new Error("Where value must be an array of RegExp");
          }
          (this.flag["where"] as Record<string, RegExp[]>)[key].push(...v);
        } else {
          if (!(v instanceof RegExp)) {
            throw new Error(
              "Where value must be a RegExp or an array of RegExp"
            );
          }
          (this.flag["where"] as Record<string, RegExp[]>)[key].push(v);
        }
      }
    }
    return;
  }
  public get config(): IMyConfig {
    return this.myConfig;
  }

  public get myFlag(): IMFlagConfig {
    return this.flag;
  }
}

export default MethodRoute;
