import BaseController from "../../Base/BaseController.ts";

import {
  IRoute,
  IGroupRoute,
  IMethodRoute,
  IGroupParams,
} from "../../@hono-types/declaration/IRoute.d.ts";
import MethodRoute from "./MethodRoute.ts";
import GroupRoute from "./GroupRoute.ts";

export type ICallback = (
  httpObj: HttpHono,
  ...args: unknown[]
) => Promise<unknown>;

type KeysWithICallback<T> = {
  [P in keyof T]: T[P] extends ICallback ? P : never;
}[keyof T];

class MyRoute {
  private static routeId = 0;
  private static storedControllers = {};
  private static groupPreference = {};
  private static methodPreference: Record<
    number,
    InstanceType<typeof MethodRoute>
  > = {};
  private static defaultRoute = {
    get: [],
    post: [],
    put: [],
    delete: [],
    patch: [],
    options: [],
    head: [],
    all: [],
  };

  public static group(config: IGroupParams, callback: () => void): void {
    if (!is_object(config)) {
      throw new Error("Group config must be an object");
    }
    const groupInstance = new GroupRoute();

    const keys = Object.keys(config) as (keyof IGroupParams)[];
    keys.forEach((key) => {
      if (method_exist(groupInstance, key) && isset(config[key])) {
        // deno-lint-ignore no-explicit-any
        groupInstance[key]((config as any)[key]);
      }
    });
    groupInstance.group(callback); // Call the group method
  }

  public static middleware(
    handler: string | string[] | (() => Promise<unknown>)
  ) {
    const groupInstance = new GroupRoute();
    groupInstance.middleware(handler);
    return groupInstance;
  }

  public static prefix(uri: string) {
    const groupInstance = new GroupRoute();
    groupInstance.prefix(uri);
    return groupInstance;
  }
  public static domain(domain: string) {
    const groupInstance = new GroupRoute();
    groupInstance.domain(domain);
    return groupInstance;
  }
  public static as(name: string) {
    const groupInstance = new GroupRoute();
    groupInstance.as(name);
    return groupInstance;
  }

  // Make `get` generic on controller T and method K
  public static get<T extends BaseController, K extends KeysWithICallback<T>>(
    uri: string,
    arg: ICallback | [new () => T, K]
  ): IMethodRoute {
    this.routeId++;
    const instancedRoute = new MethodRoute({
      id: this.routeId,
      uri,
      method: "get",
      arg,
    });
    this.methodPreference[this.routeId] = instancedRoute;
    return instancedRoute;
  }
}

const Route: typeof IRoute = MyRoute;

export default Route;
