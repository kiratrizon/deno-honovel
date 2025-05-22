import BaseController from "../../Base/BaseController.ts";

import {
  IRoute,
  IMethodRoute,
  IGroupParams,
  IEGroupRoute,
  IGroupInstance,
} from "../../@hono-types/declaration/IRoute.d.ts";
import MethodRoute from "./MethodRoute.ts";
import GR from "./GroupRoute.ts";

const GroupRoute = GR as typeof IEGroupRoute;
export type ICallback = (
  httpObj: HttpHono,
  ...args: unknown[]
) => Promise<unknown>;

type KeysWithICallback<T> = {
  [P in keyof T]: T[P] extends ICallback ? P : never;
}[keyof T];

interface IdefaultRoute {
  get: number[];
  post: number[];
  put: number[];
  delete: number[];
  patch: number[];
  options: number[];
  head: number[];
  all: number[];
}
class MyRoute {
  private static routeId = 0;
  private static storedControllers = {};
  private static groupPreference: Record<number, IEGroupRoute> = {};
  private static methodPreference: Record<
    number,
    InstanceType<typeof MethodRoute>
  > = {};
  private static defaultRoute: IdefaultRoute = {
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

  public static pushGroupReference(id: number, groupInstance: IEGroupRoute) {
    if (empty(this.groupPreference[id])) {
      this.groupPreference[id] = groupInstance;
    }
  }

  // Make `get` generic on controller T and method K
  public static get<T extends BaseController, K extends KeysWithICallback<T>>(
    uri: string,
    arg: ICallback | [new () => T, K]
  ): IMethodRoute {
    this.routeId++;
    const method = "get";
    const instancedRoute = new MethodRoute({
      id: this.routeId,
      uri,
      method,
      arg,
    });
    this.methodPreference[this.routeId] = instancedRoute;
    // console.log(GroupRoute.currGrp);
    if (empty(GroupRoute.currGrp)) {
      this.defaultRoute.get.push(this.routeId);
    } else {
      const groupId = GroupRoute.gID;
      if (empty(this.groupPreference[groupId])) {
        this.groupPreference[groupId] = GroupRoute.getGroupName(groupId)!;
      }
      this.groupPreference[groupId].pushChilds(method, this.routeId);
    }
    return instancedRoute;
  }
}

const Route: typeof IRoute = MyRoute;

export default Route;
