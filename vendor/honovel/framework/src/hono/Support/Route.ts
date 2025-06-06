import BaseController from "../../Base/BaseController.ts";

import {
  IRoute,
  IMethodRoute,
  IGroupParams,
  IEGroupRoute,
  IReferencesRoute,
  HonoNext,
  IChildRoutes,
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

class MyRoute {
  private static routeId = 0;
  private static groupPreference: IReferencesRoute["groups"] = {};
  private static methodPreference: IReferencesRoute["methods"] = {};
  private static defaultRoute: IReferencesRoute["defaultRoute"] = {};

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
    handler:
      | string
      | (string | ((obj: HttpHono, next: HonoNext) => Promise<unknown>))[]
      | ((obj: HttpHono, next: HonoNext) => Promise<unknown>)
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
  public static where(obj: Record<string, RegExp[] | RegExp>) {
    const groupInstance = new GroupRoute();
    groupInstance.where(obj);
    return groupInstance;
  }

  public static whereNumber(key: string) {
    const groupInstance = new GroupRoute();
    groupInstance.whereNumber(key);
    return groupInstance;
  }
  public static whereAlpha(key: string) {
    const groupInstance = new GroupRoute();
    groupInstance.whereAlpha(key);
    return groupInstance;
  }
  public static whereAlphaNumeric(key: string) {
    const groupInstance = new GroupRoute();
    groupInstance.whereAlphaNumeric(key);
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
    MyRoute.routeId++;
    const id = MyRoute.routeId;
    const method = ["get"] as (keyof IChildRoutes)[];
    const instancedRoute = new MethodRoute({
      id,
      uri,
      method,
      arg,
    });
    this.methodPreference[id] = instancedRoute;
    if (empty(GroupRoute.currGrp)) {
      this.defaultRoute[id] = method;
    } else {
      const groupId = GroupRoute.gID;
      if (empty(this.groupPreference[groupId])) {
        this.groupPreference[groupId] = GroupRoute.getGroupName(groupId);
      }
      this.groupPreference[groupId].pushChildren(method, id);
    }
    return this.methodPreference[id];
  }

  public static post<T extends BaseController, K extends KeysWithICallback<T>>(
    uri: string,
    arg: ICallback | [new () => T, K]
  ): IMethodRoute {
    MyRoute.routeId++;
    const id = MyRoute.routeId;
    const method = ["post"] as (keyof IChildRoutes)[];
    const instancedRoute = new MethodRoute({
      id,
      uri,
      method,
      arg,
    });
    this.methodPreference[id] = instancedRoute;
    if (empty(GroupRoute.currGrp)) {
      this.defaultRoute[id] = method;
    } else {
      const groupId = GroupRoute.gID;
      if (empty(this.groupPreference[groupId])) {
        this.groupPreference[groupId] = GroupRoute.getGroupName(groupId);
      }
      this.groupPreference[groupId].pushChildren(method, id);
    }
    return this.methodPreference[id];
  }

  public static put<T extends BaseController, K extends KeysWithICallback<T>>(
    uri: string,
    arg: ICallback | [new () => T, K]
  ): IMethodRoute {
    MyRoute.routeId++;
    const id = MyRoute.routeId;
    const method = ["put"] as (keyof IChildRoutes)[];
    const instancedRoute = new MethodRoute({
      id,
      uri,
      method,
      arg,
    });
    this.methodPreference[id] = instancedRoute;
    if (empty(GroupRoute.currGrp)) {
      this.defaultRoute[id] = method;
    } else {
      const groupId = GroupRoute.gID;
      if (empty(this.groupPreference[groupId])) {
        this.groupPreference[groupId] = GroupRoute.getGroupName(groupId);
      }
      this.groupPreference[groupId].pushChildren(method, id);
    }
    return this.methodPreference[id];
  }

  public static delete<
    T extends BaseController,
    K extends KeysWithICallback<T>
  >(uri: string, arg: ICallback | [new () => T, K]): IMethodRoute {
    MyRoute.routeId++;
    const id = MyRoute.routeId;
    const method = ["delete"] as (keyof IChildRoutes)[];
    const instancedRoute = new MethodRoute({
      id,
      uri,
      method,
      arg,
    });
    this.methodPreference[id] = instancedRoute;
    if (empty(GroupRoute.currGrp)) {
      this.defaultRoute[id] = method;
    } else {
      const groupId = GroupRoute.gID;
      if (empty(this.groupPreference[groupId])) {
        this.groupPreference[groupId] = GroupRoute.getGroupName(groupId);
      }
      this.groupPreference[groupId].pushChildren(method, id);
    }
    return this.methodPreference[id];
  }

  public static patch<T extends BaseController, K extends KeysWithICallback<T>>(
    uri: string,
    arg: ICallback | [new () => T, K]
  ): IMethodRoute {
    MyRoute.routeId++;
    const id = MyRoute.routeId;
    const method = ["patch"] as (keyof IChildRoutes)[];
    const instancedRoute = new MethodRoute({
      id,
      uri,
      method,
      arg,
    });
    this.methodPreference[id] = instancedRoute;
    if (empty(GroupRoute.currGrp)) {
      this.defaultRoute[id] = method;
    } else {
      const groupId = GroupRoute.gID;
      if (empty(this.groupPreference[groupId])) {
        this.groupPreference[groupId] = GroupRoute.getGroupName(groupId);
      }
      this.groupPreference[groupId].pushChildren(method, id);
    }
    return this.methodPreference[id];
  }

  public static options<
    T extends BaseController,
    K extends KeysWithICallback<T>
  >(uri: string, arg: ICallback | [new () => T, K]): IMethodRoute {
    MyRoute.routeId++;
    const id = MyRoute.routeId;
    const method = ["options"] as (keyof IChildRoutes)[];
    const instancedRoute = new MethodRoute({
      id,
      uri,
      method,
      arg,
    });
    this.methodPreference[id] = instancedRoute;
    if (empty(GroupRoute.currGrp)) {
      this.defaultRoute[id] = method;
    } else {
      const groupId = GroupRoute.gID;
      if (empty(this.groupPreference[groupId])) {
        this.groupPreference[groupId] = GroupRoute.getGroupName(groupId);
      }
      this.groupPreference[groupId].pushChildren(method, id);
    }
    return this.methodPreference[id];
  }

  public static any<T extends BaseController, K extends KeysWithICallback<T>>(
    uri: string,
    arg: ICallback | [new () => T, K]
  ): IMethodRoute {
    MyRoute.routeId++;
    const id = MyRoute.routeId;
    const method = [
      "get",
      "post",
      "put",
      "delete",
      "patch",
      "options",
    ] as (keyof IChildRoutes)[];
    const instancedRoute = new MethodRoute({
      id,
      uri,
      method,
      arg,
    });
    this.methodPreference[id] = instancedRoute;
    if (empty(GroupRoute.currGrp)) {
      this.defaultRoute[id] = method;
    } else {
      const groupId = GroupRoute.gID;
      if (empty(this.groupPreference[groupId])) {
        this.groupPreference[groupId] = GroupRoute.getGroupName(groupId);
      }
      this.groupPreference[groupId].pushChildren(method, id);
    }
    return this.methodPreference[id];
  }

  public static match<T extends BaseController, K extends KeysWithICallback<T>>(
    match: (keyof IChildRoutes)[],
    uri: string,
    arg: ICallback | [new () => T, K]
  ): IMethodRoute {
    MyRoute.routeId++;
    const id = MyRoute.routeId;
    const instancedRoute = new MethodRoute({
      id,
      uri,
      method: match as (keyof IChildRoutes)[],
      arg,
    });
    this.methodPreference[id] = instancedRoute;
    if (empty(GroupRoute.currGrp)) {
      this.defaultRoute[id] = match;
    } else {
      const groupId = GroupRoute.gID;
      if (empty(this.groupPreference[groupId])) {
        this.groupPreference[groupId] = GroupRoute.getGroupName(groupId);
      }
      this.groupPreference[groupId].pushChildren(match, id);
    }
    return this.methodPreference[id];
  }

  public static view(
    uri: string,
    viewName: string,
    data: Record<string, unknown> = {}
  ): void {
    MyRoute.routeId++;
    const id = MyRoute.routeId;
    const method = ["get"] as (keyof IChildRoutes)[];
    const instancedRoute = new MethodRoute({
      id,
      uri,
      method,
      arg: async () => {
        return view(viewName, data);
      },
    });
    this.methodPreference[id] = instancedRoute;
    if (empty(GroupRoute.currGrp)) {
      this.defaultRoute[id] = method;
    } else {
      const groupId = GroupRoute.gID;
      if (empty(this.groupPreference[groupId])) {
        this.groupPreference[groupId] = GroupRoute.getGroupName(groupId);
      }
      this.groupPreference[groupId].pushChildren(method, id);
    }
  }

  public getAllGroupsAndMethods(): IReferencesRoute {
    const myData = {
      groups: MyRoute.groupPreference,
      methods: MyRoute.methodPreference,
      defaultRoute: MyRoute.defaultRoute,
    };

    // Reset the static properties after fetching
    MyRoute.groupPreference = {};
    MyRoute.methodPreference = {};
    MyRoute.defaultRoute = {};

    return myData;
  }
}

const Route: typeof IRoute = MyRoute;

export default Route;
